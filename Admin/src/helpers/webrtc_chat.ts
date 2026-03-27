import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";

export type WebRtcChatState = "idle" | "connecting" | "connected" | "failed" | "closed";

export type WebRtcChatMessage = {
  text: string;
  time: string;
  from: string;
};

type Unsub = () => void;

const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

async function ensureFirebaseAuthForFirestore() {
  try {
    const auth = firebase.auth();
    if (auth.currentUser) return;
    // For PHP-session based logins, Firebase auth may not be established.
    // Anonymous auth is enough for Firestore signaling (rules should still restrict access).
    await auth.signInAnonymously();
  } catch (e) {
    // If auth isn't enabled, Firestore may still work in test mode rules.
  }
}

function asStringId(id: string | number) {
  return String(id);
}

function dmId(a: string | number, b: string | number) {
  const aS = asStringId(a);
  const bS = asStringId(b);
  return `dm_${[aS, bS].sort().join("__")}`;
}

export class WebRtcDmChat {
  private myUid: string;
  private peerUid: string;
  private signalDocId: string;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private unsubscribers: Unsub[] = [];
  private seenCandidateDocs = new Set<string>();
  private connectTimer: number | null = null;

  state: WebRtcChatState = "idle";
  lastError: string | null = null;

  onStateChange?: (s: WebRtcChatState) => void;
  onMessage?: (m: WebRtcChatMessage) => void;

  constructor(opts: { myUid: string | number; peerUid: string | number }) {
    this.myUid = asStringId(opts.myUid);
    this.peerUid = asStringId(opts.peerUid);
    this.signalDocId = dmId(this.myUid, this.peerUid);
  }

  private setState(s: WebRtcChatState, err?: string) {
    this.state = s;
    if (err) this.lastError = err;
    if (this.onStateChange) this.onStateChange(s);
  }

  private get db() {
    const db = firebase.firestore();
    if (!db) throw new Error("Firestore not initialized");
    return db;
  }

  private get signalRef() {
    return this.db.collection("webrtcSignals").doc(this.signalDocId);
  }

  private isInitiator() {
    // Deterministic initiator: smaller string id starts the offer.
    return this.myUid < this.peerUid;
  }

  private ensurePeerConnection() {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection(DEFAULT_RTC_CONFIG);
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") this.setState("connected");
      if (st === "failed") this.setState("failed", "Connection failed");
      if (st === "closed") this.setState("closed");
    };
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      this.signalRef.collection("candidates").add({
        from: this.myUid,
        candidate: ev.candidate.toJSON(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    };
    pc.ondatachannel = (ev) => {
      this.attachDataChannel(ev.channel);
    };
    this.pc = pc;
    return pc;
  }

  private attachDataChannel(channel: RTCDataChannel) {
    this.dc = channel;
    channel.onopen = () => this.setState("connected");
    channel.onclose = () => this.setState("closed");
    channel.onerror = () => this.setState("failed", "DataChannel error");
    channel.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload?.type === "msg" && typeof payload.text === "string") {
          this.onMessage?.({
            text: payload.text,
            time: payload.time || new Date().toISOString(),
            from: payload.from || this.peerUid,
          });
        }
      } catch {
        // ignore malformed
      }
    };
  }

  async connect(timeoutMs = 20000) {
    if (this.state === "connecting" || this.state === "connected") return;
    this.setState("connecting");
    this.lastError = null;

    await ensureFirebaseAuthForFirestore();

    // create doc with participants
    try {
      await this.signalRef.set(
        {
          participants: [this.myUid, this.peerUid],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e: any) {
      this.setState("failed", e?.message || "Failed to write signaling doc (Firestore)");
      throw e;
    }

    // Listen ICE candidates (both sides)
    const candUnsub = this.signalRef
      .collection("candidates")
      .orderBy("createdAt", "asc")
      .onSnapshot((snap) => {
        const pc = this.pc;
        if (!pc) return;
        snap.docChanges().forEach((ch) => {
          if (ch.type !== "added") return;
          if (this.seenCandidateDocs.has(ch.doc.id)) return;
          this.seenCandidateDocs.add(ch.doc.id);
          const data: any = ch.doc.data();
          if (!data || data.from === this.myUid) return;
          const c = data.candidate;
          if (!c) return;
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {
            // ignore
          });
        });
      }, (err) => {
        this.setState("failed", err?.message || "Failed to read ICE candidates (Firestore)");
      });
    this.unsubscribers.push(candUnsub);

    // Start offer/answer flow
    if (this.isInitiator()) {
      await this.startAsInitiator();
    } else {
      await this.startAsResponder();
    }

    // Timeout to fail (WebRTC-only mode)
    this.connectTimer = window.setTimeout(() => {
      if (this.state !== "connected") {
        this.setState("failed", "Timed out connecting to peer");
        this.close();
      }
    }, timeoutMs);
  }

  private async startAsInitiator() {
    const pc = this.ensurePeerConnection();
    const dc = pc.createDataChannel("chat", { ordered: true });
    this.attachDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const offerRef = this.signalRef.collection("offers").doc("offer");
    try {
      await offerRef.set({
        from: this.myUid,
        sdp: offer,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e: any) {
      this.setState("failed", e?.message || "Failed to write offer (Firestore)");
      throw e;
    }

    const answerRef = this.signalRef.collection("answers").doc("answer");
    const unsub = answerRef.onSnapshot(async (snap) => {
      const data: any = snap.data();
      if (!data?.sdp) return;
      if (data.from === this.myUid) return;
      if (pc.currentRemoteDescription) return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    }, (err) => {
      this.setState("failed", err?.message || "Failed to read answer (Firestore)");
    });
    this.unsubscribers.push(unsub);
  }

  private async startAsResponder() {
    const pc = this.ensurePeerConnection();
    const offerRef = this.signalRef.collection("offers").doc("offer");
    const answerRef = this.signalRef.collection("answers").doc("answer");

    const unsub = offerRef.onSnapshot(async (snap) => {
      const data: any = snap.data();
      if (!data?.sdp) return;
      if (data.from === this.myUid) return;
      if (pc.signalingState !== "stable" && pc.currentRemoteDescription) return;

      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      try {
        await answerRef.set({
          from: this.myUid,
          sdp: answer,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e: any) {
        this.setState("failed", e?.message || "Failed to write answer (Firestore)");
      }
    }, (err) => {
      this.setState("failed", err?.message || "Failed to read offer (Firestore)");
    });
    this.unsubscribers.push(unsub);
  }

  sendText(text: string) {
    if (!this.dc || this.dc.readyState !== "open") {
      throw new Error("DataChannel not connected");
    }
    const msg = { type: "msg", text, time: new Date().toISOString(), from: this.myUid };
    this.dc.send(JSON.stringify(msg));
    return msg;
  }

  close() {
    if (this.connectTimer) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.unsubscribers.forEach((u) => {
      try {
        u();
      } catch {
        // ignore
      }
    });
    this.unsubscribers = [];
    this.seenCandidateDocs.clear();
    try {
      this.dc?.close();
    } catch {}
    try {
      this.pc?.close();
    } catch {}
    this.dc = null;
    this.pc = null;
    if (this.state !== "failed") this.setState("closed");
  }
}

