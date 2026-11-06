import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { DEMO_CALLS_DISABLED_MESSAGE, isDemoMode } from "../demo";
import { firebaseConfig } from "../config/firebase";
import type { CallItem } from "../data/calls";

export type VideoCallStatus =
  | "idle"
  | "ringing"
  | "connecting"
  | "connected"
  | "failed"
  | "declined"
  | "ended";

export type VideoCallParticipant = {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profileImage?: string;
};

export type IncomingVideoCall = {
  id: string;
  callerId: string;
  receiverId: string;
  caller: VideoCallParticipant;
  receiver?: VideoCallParticipant;
  status: VideoCallStatus;
};

export type IncomingGroupVideoCall = {
  id: string;
  channelId: string;
  channelName?: string;
  callerId: string;
  caller: VideoCallParticipant;
  participants: string[];
  status: VideoCallStatus;
};

type SessionRole = "caller" | "receiver";
type Unsubscribe = () => void;

/** Fallback when Twilio ICE API is unavailable (no session / no backend / misconfigured). */
function buildFallbackIceServers(): RTCIceServer[] {
  const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  const turnUrl = (import.meta.env.VITE_TURN_URL || "").trim();
  const turnUsername = (import.meta.env.VITE_TURN_USERNAME || "").trim();
  const turnCredential = (import.meta.env.VITE_TURN_CREDENTIAL || "").trim();

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return iceServers;
}

async function fetchTwilioIceFromBackend(): Promise<RTCIceServer[]> {
  const base = (import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");
  if (!base) return [];
  try {
    const res = await fetch(`${base}/api/webrtc/twilio-ice.php`, {
      method: "GET",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as {
      ice_servers?: RTCIceServer[];
      error?: string;
    } | null;
    if (!res.ok) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[VideoCall] twilio-ice.php", res.status, data?.error ?? data);
      }
      return [];
    }
    if (!data?.ice_servers || !Array.isArray(data.ice_servers) || data.ice_servers.length === 0) {
      return [];
    }
    return data.ice_servers as RTCIceServer[];
  } catch {
    return [];
  }
}

async function resolveRtcConfiguration(): Promise<RTCConfiguration> {
  const twilioServers = await fetchTwilioIceFromBackend();
  const iceServers = twilioServers.length > 0 ? twilioServers : buildFallbackIceServers();
  return { iceServers, iceTransportPolicy: "all" };
}

function normalizeId(id: string | number) {
  return String(id);
}

function serializeParticipant(user: any): VideoCallParticipant {
  return {
    id: normalizeId(user?.id || user?.uid || ""),
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    displayName:
      user?.displayName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    profileImage: user?.profileImage || user?.photoURL || "",
  };
}

function ensureFirebaseApp() {
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig as any);
  }
}

export async function ensureVideoCallAuth() {
  ensureFirebaseApp();
  try {
    const auth = firebase.auth();
    if (!auth.currentUser) {
      await auth.signInAnonymously();
    }
  } catch (error) {
    // Firestore test rules may allow access without auth. Let Firestore surface
    // the final permission error if this project has anonymous auth disabled.
    // eslint-disable-next-line no-console
    console.warn("[VideoCall] Firebase anonymous auth failed", error);
  }
}

function callsCollection() {
  ensureFirebaseApp();
  return firebase.firestore().collection("webrtcCalls");
}

function groupCallsCollection() {
  ensureFirebaseApp();
  return firebase.firestore().collection("webrtcGroupCalls");
}

export function makeVideoCallId(myId: string | number, peerId: string | number) {
  const pair = [normalizeId(myId), normalizeId(peerId)].sort().join("__");
  return `call_${pair}_${Date.now()}`;
}

export function makeGroupVideoCallId(channelId: string | number) {
  const chan = normalizeId(channelId);
  return `groupcall_${chan}_${Date.now()}`;
}

export async function createOutgoingVideoCall(opts: {
  caller: any;
  receiver: any;
}) {
  if (isDemoMode) throw new Error(DEMO_CALLS_DISABLED_MESSAGE);
  await ensureVideoCallAuth();
  const caller = serializeParticipant(opts.caller);
  const receiver = serializeParticipant(opts.receiver);
  const callId = makeVideoCallId(caller.id, receiver.id);

  if (!caller.id || !receiver.id) {
    throw new Error("Missing caller or receiver id for video call");
  }

  await callsCollection()
    .doc(callId)
    .set({
      caller,
      receiver,
      callerId: caller.id,
      receiverId: receiver.id,
      participants: [caller.id, receiver.id],
      type: "video",
      status: "ringing",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

  return { callId, caller, receiver };
}

export async function createOutgoingGroupVideoCall(opts: {
  channelId: string | number;
  channelName?: string;
  caller: any;
  participants: Array<any | string | number>;
}) {
  if (isDemoMode) throw new Error(DEMO_CALLS_DISABLED_MESSAGE);
  await ensureVideoCallAuth();
  const caller = serializeParticipant(opts.caller);
  const channelId = normalizeId(opts.channelId);
  const callId = makeGroupVideoCallId(channelId);

  if (!caller.id || !channelId) {
    throw new Error("Missing caller id or channel id for group video call");
  }

  const participantIds = Array.from(
    new Set(
      (opts.participants || [])
        .map((p: any) => (typeof p === "object" ? normalizeId(p?.id || p?.uid || "") : normalizeId(p)))
        .filter(Boolean),
    ),
  );

  if (!participantIds.includes(caller.id)) participantIds.push(caller.id);

  await groupCallsCollection()
    .doc(callId)
    .set({
      caller,
      callerId: caller.id,
      channelId,
      channelName: String(opts.channelName || "").trim(),
      participants: participantIds,
      type: "video",
      status: "ringing",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

  // Mark caller as joined immediately.
  await groupCallsCollection()
    .doc(callId)
    .collection("members")
    .doc(caller.id)
    .set(
      {
        state: "joined",
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    .catch(() => {});

  return { callId, caller, participants: participantIds, channelId };
}

export function subscribeToIncomingVideoCalls(
  myId: string | number,
  onIncoming: (call: IncomingVideoCall) => void,
  onError?: (message: string) => void,
) {
  if (isDemoMode) return () => {};
  const userId = normalizeId(myId);
  if (!userId) return () => {};

  ensureVideoCallAuth();

  return callsCollection()
    .where("receiverId", "==", userId)
    .where("status", "==", "ringing")
    .onSnapshot(
      snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === "removed") return;
          const data: any = change.doc.data();
          if (!data || data.type !== "video") return;
          onIncoming({
            id: change.doc.id,
            callerId: data.callerId,
            receiverId: data.receiverId,
            caller: data.caller || { id: data.callerId },
            receiver: data.receiver,
            status: data.status,
          });
        });
      },
      error => {
        // eslint-disable-next-line no-console
        console.error("[VideoCall] incoming listener failed", error);
        onError?.(error.message || "Unable to listen for incoming calls");
      },
    );
}

export function subscribeToIncomingGroupVideoCalls(
  myId: string | number,
  onIncoming: (call: IncomingGroupVideoCall) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  if (isDemoMode) return () => {};
  const userId = normalizeId(myId);
  if (!userId) return () => {};

  ensureVideoCallAuth();

  return groupCallsCollection()
    .where("participants", "array-contains", userId)
    .where("status", "==", "ringing")
    .onSnapshot(
      snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === "removed") return;
          const data: any = change.doc.data();
          if (!data || data.type !== "video") return;
          if (normalizeId(data.callerId) === userId) return; // don't ring caller
          onIncoming({
            id: change.doc.id,
            channelId: normalizeId(data.channelId),
            channelName: String(data.channelName || "").trim() || undefined,
            callerId: normalizeId(data.callerId),
            caller: data.caller || { id: normalizeId(data.callerId) },
            participants: Array.isArray(data.participants) ? data.participants.map(String) : [],
            status: data.status,
          });
        });
      },
      error => {
        // eslint-disable-next-line no-console
        console.error("[GroupVideoCall] incoming listener failed", error);
        onError?.(error.message || "Unable to listen for incoming group calls");
      },
    );
}

function formatCallDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "—";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = (displayName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "User", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** A call that has said "ringing" for longer than this was abandoned, such as by a closed tab. */
const UNANSWERED_AFTER_MS = 2 * 60 * 1000;

export function firestoreDocToCallItem(docId: string, data: any, myUserId: string): CallItem | null {
  if (!data) return null;
  if (data.type && data.type !== "video") return null;
  const callerId = normalizeId(data.callerId);
  const receiverId = normalizeId(data.receiverId);
  const isIncoming = receiverId === myUserId;
  const peerId = isIncoming ? callerId : receiverId;
  const peerRaw = isIncoming ? data.caller : data.receiver;
  const peer = peerRaw && typeof peerRaw === "object" ? peerRaw : {};

  let firstName = String((peer as any).firstName || "").trim();
  let lastName = String((peer as any).lastName || "").trim();
  const displayName = String((peer as any).displayName || "").trim();
  if (!firstName && !lastName && displayName) {
    const split = splitDisplayName(displayName);
    firstName = split.firstName;
    lastName = split.lastName;
  }
  if (!firstName && !lastName) {
    firstName = "User";
  }

  const profileImage = String((peer as any).profileImage || (peer as any).photoURL || "").trim();
  const updatedAt = data.updatedAt;
  const createdAt = data.createdAt;
  const ts =
    updatedAt && typeof updatedAt.toDate === "function"
      ? updatedAt.toDate()
      : createdAt && typeof createdAt.toDate === "function"
        ? createdAt.toDate()
        : null;
  const callDate = ts ? ts.toISOString() : new Date().toISOString();

  // Calls store when they connected, and their last update is when they ended.
  const connectedAt =
    data.connectedAt && typeof data.connectedAt.toDate === "function"
      ? data.connectedAt.toDate()
      : null;
  let durationSeconds: number | null =
    typeof data.durationSeconds === "number" && Number.isFinite(data.durationSeconds)
      ? data.durationSeconds
      : null;
  if (durationSeconds === null && connectedAt && ts && data.status === "ended") {
    durationSeconds = Math.max(0, (ts.getTime() - connectedAt.getTime()) / 1000);
  }
  const mayStillConnect =
    !connectedAt &&
    ["ringing", "accepted", "active"].includes(data.status) &&
    (!ts || Date.now() - ts.getTime() < UNANSWERED_AFTER_MS);

  return {
    callId: docId,
    firstName,
    lastName,
    profileImage: profileImage || undefined,
    callDuration: formatCallDuration(durationSeconds),
    isIncomming: isIncoming,
    callDate,
    isGrouped: false,
    hasVideoCall: true,
    peoplesAvailableOnCall: 2,
    peerUserId: peerId,
    wasConnected: mayStillConnect ? undefined : !!connectedAt,
    wasDeclined: data.status === "declined",
  };
}

/**
 * Live list of past video calls for the Calls sidebar (Firestore webrtcCalls).
 * Requires a composite index: participants (array-contains) + updatedAt (desc).
 */
export function subscribeVideoCallHistory(
  myId: string | number,
  onCalls: (calls: CallItem[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  if (isDemoMode) {
    import("../demo/demoData").then(({ demoCalls }) => onCalls(demoCalls()));
    return () => {};
  }
  const userId = normalizeId(myId);
  if (!userId) return () => {};

  ensureVideoCallAuth();

  return callsCollection()
    .where("participants", "array-contains", userId)
    .orderBy("updatedAt", "desc")
    .limit(50)
    .onSnapshot(
      snapshot => {
        const items: CallItem[] = [];
        snapshot.forEach(doc => {
          const row = firestoreDocToCallItem(doc.id, doc.data(), userId);
          if (row) items.push(row);
        });
        onCalls(items);
      },
      error => {
        // eslint-disable-next-line no-console
        console.error("[VideoCall] history listener failed", error);
        onError?.(error.message || "Unable to load call history");
      },
    );
}

export async function declineVideoCall(callId: string, userId?: string | number) {
  if (!callId) return;
  await ensureVideoCallAuth();
  await callsCollection()
    .doc(callId)
    .set(
      {
        status: "declined",
        endedBy: userId ? normalizeId(userId) : null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function declineGroupVideoCall(callId: string, userId?: string | number) {
  const me = userId ? normalizeId(userId) : "";
  if (!callId || !me) return;
  await ensureVideoCallAuth();
  await groupCallsCollection()
    .doc(callId)
    .collection("members")
    .doc(me)
    .set(
      {
        state: "declined",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    .catch(() => {});
}

type GroupMemberState = "ringing" | "joined" | "declined" | "left";

type RemoteStreamUpdate = {
  peerId: string;
  stream: MediaStream;
};

export class WebRtcGroupVideoCallSession {
  private callId: string;
  private myId: string;
  private channelId: string;
  private localVideo: HTMLVideoElement;
  private pcs = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private localStream: MediaStream | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private closed = false;
  private isCaller = false;

  onStatusChange?: (status: VideoCallStatus) => void;
  onError?: (message: string) => void;
  onRemoteStream?: (update: RemoteStreamUpdate) => void;

  constructor(opts: {
    callId: string;
    myId: string | number;
    channelId: string | number;
    localVideo: HTMLVideoElement;
    onStatusChange?: (status: VideoCallStatus) => void;
    onError?: (message: string) => void;
    onRemoteStream?: (update: RemoteStreamUpdate) => void;
    isCaller?: boolean;
  }) {
    this.callId = opts.callId;
    this.myId = normalizeId(opts.myId);
    this.channelId = normalizeId(opts.channelId);
    this.localVideo = opts.localVideo;
    this.onStatusChange = opts.onStatusChange;
    this.onError = opts.onError;
    this.onRemoteStream = opts.onRemoteStream;
    this.isCaller = !!opts.isCaller;
  }

  private get callRef() {
    return groupCallsCollection().doc(this.callId);
  }

  private setStatus(status: VideoCallStatus) {
    this.onStatusChange?.(status);
  }

  private setError(message: string) {
    this.setStatus("failed");
    this.onError?.(message);
  }

  private async createLocalStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera and microphone are not available in this browser");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    this.localStream = stream;
    this.localVideo.srcObject = stream;
    this.localVideo.muted = true;
    await this.localVideo.play().catch(() => {});
    return stream;
  }

  private pairId(peerId: string) {
    const a = [this.myId, peerId].sort()[0];
    const b = [this.myId, peerId].sort()[1];
    return `${a}__${b}`;
  }

  private roleForPeer(peerId: string): { a: string; b: string; iAmA: boolean } {
    const [a, b] = [this.myId, peerId].sort();
    return { a, b, iAmA: this.myId === a };
  }

  private async createPeerConnection(peerId: string) {
    const rtcConfig = await resolveRtcConfiguration();
    const pc = new RTCPeerConnection(rtcConfig);
    const remoteStream = new MediaStream();
    this.remoteStreams.set(peerId, remoteStream);
    this.onRemoteStream?.({ peerId, stream: remoteStream });

    pc.ontrack = event => {
      event.streams[0]?.getTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
    };

    pc.onicecandidate = event => {
      if (!event.candidate) return;
      const { iAmA } = this.roleForPeer(peerId);
      const myCol = iAmA ? "aCandidates" : "bCandidates";
      this.callRef
        .collection("connections")
        .doc(this.pairId(peerId))
        .collection(myCol)
        .add({
          from: this.myId,
          candidate: event.candidate.toJSON(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        this.setStatus("connected");
      }
      if (pc.connectionState === "failed") {
        this.setError("WebRTC connection failed. A TURN server may be required for this network.");
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
    }

    this.pcs.set(peerId, pc);
    return pc;
  }

  private async flushPending(peerId: string) {
    const pc = this.pcs.get(peerId);
    if (!pc?.remoteDescription) return;
    const queued = this.pendingCandidates.get(peerId) || [];
    this.pendingCandidates.set(peerId, []);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[GroupVideoCall] failed to add queued ICE candidate", e);
      }
    }
  }

  private listenForPeerCandidates(peerId: string) {
    const { iAmA } = this.roleForPeer(peerId);
    const peerCol = iAmA ? "bCandidates" : "aCandidates";
    const unsubscribe = this.callRef
      .collection("connections")
      .doc(this.pairId(peerId))
      .collection(peerCol)
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
          if (change.type !== "added") return;
          const data: any = change.doc.data();
          if (!data?.candidate || data.from === this.myId) return;
          const pc = this.pcs.get(peerId);
          if (!pc) return;
          if (!pc.remoteDescription) {
            const existing = this.pendingCandidates.get(peerId) || [];
            existing.push(data.candidate);
            this.pendingCandidates.set(peerId, existing);
            return;
          }
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("[GroupVideoCall] failed to add ICE candidate", e);
          }
        });
      });
    this.unsubscribers.push(unsubscribe);
  }

  private listenForOfferAnswer(peerId: string) {
    const pairId = this.pairId(peerId);
    const connRef = this.callRef.collection("connections").doc(pairId);
    const { iAmA, a, b } = this.roleForPeer(peerId);
    const isInitiator = iAmA; // "a" initiates to prevent glare

    const unsubscribe = connRef.onSnapshot(async snap => {
      const data: any = snap.data();
      const pc = this.pcs.get(peerId);
      if (!pc) return;

      // Non-initiator waits for offer
      if (!isInitiator && data?.offer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        await this.flushPending(peerId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await connRef.set(
          {
            a,
            b,
            answer: { type: answer.type, sdp: answer.sdp },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      // Initiator waits for answer after sending offer
      if (isInitiator && data?.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        await this.flushPending(peerId);
      }
    });
    this.unsubscribers.push(unsubscribe);
  }

  private async ensureConnection(peerId: string) {
    if (peerId === this.myId) return;
    if (this.pcs.has(peerId)) return;
    if (!this.localStream) await this.createLocalStream();
    const pc = await this.createPeerConnection(peerId);
    this.listenForPeerCandidates(peerId);
    this.listenForOfferAnswer(peerId);

    const connRef = this.callRef.collection("connections").doc(this.pairId(peerId));
    const { iAmA, a, b } = this.roleForPeer(peerId);
    const isInitiator = iAmA;

    if (isInitiator) {
      const snap = await connRef.get();
      const data: any = snap.data();
      if (!data?.offer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await connRef.set(
          {
            a,
            b,
            offer: { type: offer.type, sdp: offer.sdp },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    }
  }

  private listenForMembers() {
    const unsubscribe = this.callRef.collection("members").onSnapshot(snapshot => {
      snapshot.forEach(doc => {
        const peerId = doc.id;
        const data: any = doc.data();
        if (!data || data.state !== "joined") return;
        if (peerId === this.myId) return;
        void this.ensureConnection(peerId);
      });
    });
    this.unsubscribers.push(unsubscribe);
  }

  private listenForCallEnd() {
    const unsubscribe = this.callRef.onSnapshot(snapshot => {
      const data: any = snapshot.data();
      if (!data) return;
      if (data.status === "ended" && !this.closed) {
        this.cleanup(false);
        this.setStatus("ended");
      }
    });
    this.unsubscribers.push(unsubscribe);
  }

  async join() {
    await ensureVideoCallAuth();
    if (!this.myId || !this.callId || !this.channelId) {
      throw new Error("Missing call metadata for group call");
    }
    this.setStatus("connecting");

    await this.callRef.collection("members").doc(this.myId).set(
      {
        state: "joined" as GroupMemberState,
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await this.callRef.set(
      { status: "active", updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );

    await this.createLocalStream();
    this.listenForMembers();
    this.listenForCallEnd();
  }

  setMicrophoneEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach(track => (track.enabled = enabled));
  }

  setCameraEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach(track => (track.enabled = enabled));
  }

  async end() {
    await ensureVideoCallAuth();
    if (this.isCaller) {
      await this.callRef
        .set(
          { status: "ended", endedBy: this.myId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
          { merge: true },
        )
        .catch(() => {});
    }
    await this.callRef
      .collection("members")
      .doc(this.myId)
      .set(
        {
          state: "left",
          leftAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      .catch(() => {});
    this.cleanup(true);
  }

  cleanup(updateStatus: boolean) {
    this.closed = true;
    this.unsubscribers.forEach(unsub => {
      try {
        unsub();
      } catch {
        // ignore
      }
    });
    this.unsubscribers = [];
    this.pendingCandidates.clear();
    this.pcs.forEach(pc => {
      try {
        pc.close();
      } catch {
        // ignore
      }
    });
    this.pcs.clear();
    this.remoteStreams.forEach(stream => stream.getTracks().forEach(t => t.stop()));
    this.remoteStreams.clear();
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.localVideo.srcObject = null;
    if (updateStatus) this.setStatus("ended");
  }
}

export class WebRtcVideoCallSession {
  private callId: string;
  private myId: string;
  private peerId: string;
  private role: SessionRole;
  private localVideo: HTMLVideoElement;
  private remoteVideo: HTMLVideoElement;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private closed = false;
  /** Wall-clock ms when WebRTC reached "connected" (for duration on hangup). */
  private connectedAtMs: number | null = null;

  onStatusChange?: (status: VideoCallStatus) => void;
  onError?: (message: string) => void;

  constructor(opts: {
    callId: string;
    myId: string | number;
    peerId: string | number;
    role: SessionRole;
    localVideo: HTMLVideoElement;
    remoteVideo: HTMLVideoElement;
    onStatusChange?: (status: VideoCallStatus) => void;
    onError?: (message: string) => void;
  }) {
    this.callId = opts.callId;
    this.myId = normalizeId(opts.myId);
    this.peerId = normalizeId(opts.peerId);
    this.role = opts.role;
    this.localVideo = opts.localVideo;
    this.remoteVideo = opts.remoteVideo;
    this.onStatusChange = opts.onStatusChange;
    this.onError = opts.onError;
  }

  private get callRef() {
    return callsCollection().doc(this.callId);
  }

  private setStatus(status: VideoCallStatus) {
    this.onStatusChange?.(status);
  }

  private setError(message: string) {
    this.setStatus("failed");
    this.onError?.(message);
  }

  private ownCandidatesCollection() {
    return this.role === "caller" ? "callerCandidates" : "receiverCandidates";
  }

  private peerCandidatesCollection() {
    return this.role === "caller" ? "receiverCandidates" : "callerCandidates";
  }

  private async createLocalStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera and microphone are not available in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    this.localStream = stream;
    this.localVideo.srcObject = stream;
    this.localVideo.muted = true;
    await this.localVideo.play().catch(() => {});
    return stream;
  }

  private async createPeerConnection() {
    const rtcConfig = await resolveRtcConfiguration();
    const pc = new RTCPeerConnection(rtcConfig);
    this.remoteStream = new MediaStream();
    this.remoteVideo.srcObject = this.remoteStream;

    pc.ontrack = event => {
      event.streams[0]?.getTracks().forEach(track => {
        this.remoteStream?.addTrack(track);
      });
      this.remoteVideo.play().catch(() => {});
    };

    pc.onicecandidate = event => {
      if (!event.candidate) return;
      this.callRef.collection(this.ownCandidatesCollection()).add({
        from: this.myId,
        candidate: event.candidate.toJSON(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        this.setStatus("connected");
        if (this.connectedAtMs === null) {
          this.connectedAtMs = Date.now();
          void this.callRef.set(
            {
              connectedAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }
      }
      if (pc.connectionState === "failed") {
        this.setError("WebRTC connection failed. A TURN server may be required for this network.");
      }
      if (pc.connectionState === "closed" && !this.closed) this.setStatus("ended");
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected") this.setStatus("connecting");
      if (pc.iceConnectionState === "failed") {
        this.setError("Could not establish media path between devices.");
      }
    };

    this.pc = pc;
    return pc;
  }

  private async setupPeerConnection() {
    await ensureVideoCallAuth();
    this.setStatus("connecting");
    const localStream = await this.createLocalStream();
    const pc = await this.createPeerConnection();
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    this.listenForPeerCandidates();
    this.listenForCallEnd();
    return pc;
  }

  private async flushPendingCandidates() {
    if (!this.pc?.remoteDescription) return;
    const candidates = [...this.pendingCandidates];
    this.pendingCandidates = [];
    for (const candidate of candidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[VideoCall] failed to add queued ICE candidate", error);
      }
    }
  }

  private listenForPeerCandidates() {
    const unsubscribe = this.callRef
      .collection(this.peerCandidatesCollection())
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
          if (change.type !== "added") return;
          const data: any = change.doc.data();
          if (!data?.candidate || data.from === this.myId) return;

          if (!this.pc?.remoteDescription) {
            this.pendingCandidates.push(data.candidate);
            return;
          }

          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn("[VideoCall] failed to add ICE candidate", error);
          }
        });
      });
    this.unsubscribers.push(unsubscribe);
  }

  private listenForCallEnd() {
    const unsubscribe = this.callRef.onSnapshot(snapshot => {
      const data: any = snapshot.data();
      if (!data) return;
      if (["ended", "declined"].includes(data.status) && !this.closed) {
        this.cleanup(false);
        this.setStatus("ended");
      }
    });
    this.unsubscribers.push(unsubscribe);
  }

  async startOutgoing() {
    try {
      const pc = await this.setupPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await this.callRef.set(
        {
          offer: {
            type: offer.type,
            sdp: offer.sdp,
          },
          status: "ringing",
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const unsubscribe = this.callRef.onSnapshot(async snapshot => {
        const data: any = snapshot.data();
        if (!data?.answer || pc.currentRemoteDescription) return;
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        await this.flushPendingCandidates();
      });
      this.unsubscribers.push(unsubscribe);
    } catch (error: any) {
      this.setError(error?.message || "Unable to start video call");
      await this.end();
    }
  }

  async acceptIncoming() {
    try {
      const pc = await this.setupPeerConnection();
      const snapshot = await this.callRef.get();
      const data: any = snapshot.data();
      if (!data?.offer) {
        throw new Error("Incoming call offer is missing");
      }

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      await this.flushPendingCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await this.callRef.set(
        {
          answer: {
            type: answer.type,
            sdp: answer.sdp,
          },
          status: "accepted",
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error: any) {
      this.setError(error?.message || "Unable to accept video call");
      await this.end();
    }
  }

  setMicrophoneEnabled(enabled: boolean) {
    this.localStream
      ?.getAudioTracks()
      .forEach(track => {
        track.enabled = enabled;
      });
  }

  setCameraEnabled(enabled: boolean) {
    this.localStream
      ?.getVideoTracks()
      .forEach(track => {
        track.enabled = enabled;
      });
  }

  async end() {
    const durationSeconds =
      this.connectedAtMs !== null
        ? Math.max(0, Math.floor((Date.now() - this.connectedAtMs) / 1000))
        : undefined;
    await this.callRef
      .set(
        {
          status: "ended",
          endedBy: this.myId,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          ...(durationSeconds !== undefined ? { durationSeconds } : {}),
        },
        { merge: true },
      )
      .catch(() => {});
    this.cleanup(true);
  }

  cleanup(updateStatus: boolean) {
    this.closed = true;
    this.unsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch {
        // ignore cleanup failures
      }
    });
    this.unsubscribers = [];
    this.pendingCandidates = [];
    this.localStream?.getTracks().forEach(track => track.stop());
    this.remoteStream?.getTracks().forEach(track => track.stop());
    this.localVideo.srcObject = null;
    this.remoteVideo.srcObject = null;
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    if (updateStatus) this.setStatus("ended");
  }
}
