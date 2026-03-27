import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import { firebaseConfig } from "../config/firebase";

export type DmMessage = {
  id?: string;
  text: string;
  from: string;
  time: string;
  createdAt?: any;
};

export type MessageListener = (msg: DmMessage) => void;
export type MessagesListener = (msgs: DmMessage[]) => void;

/** Canonical conversation ID — same regardless of which user opens it. */
export function dmConversationId(a: string | number, b: string | number) {
  return `dm_${[String(a), String(b)].sort().join("__")}`;
}

/** Attempt anonymous Firebase auth if not already signed in. */
async function ensureAuth() {
  // In this codebase we also initialize Firebase via the modular SDK.
  // The compat SDK used here still needs its own initializeApp call.
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig as any);
  }
  try {
    const auth = firebase.auth();
    if (auth.currentUser) return;
    await auth.signInAnonymously();
  } catch (e) {
    // Firestore rules may allow unauthenticated access; but if not, we want the caller to see the error.
    // eslint-disable-next-line no-console
    console.error("[Firestore chat] auth error:", (e as any)?.message || e);
  }
}

/** Send a message into the shared Firestore conversation. */
export async function sendDmMessage(opts: {
  conversationId: string;
  text: string;
  from: string;
}): Promise<DmMessage> {
  await ensureAuth();
  const msg: DmMessage = {
    text: opts.text,
    from: opts.from,
    time: new Date().toISOString(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  const ref = firebase
    .firestore()
    .collection("dmConversations")
    .doc(opts.conversationId)
    .collection("messages");
  const doc = await ref.add(msg);
  return { ...msg, id: doc.id };
}

/** Subscribe to the full message list for a conversation.
 *  Calls onMessages with the complete sorted list on every change.
 *  Returns an unsubscribe function. */
export function subscribeDmMessages(
  conversationId: string,
  onMessages: MessagesListener,
  onError?: (msg: string) => void,
): () => void {
  ensureAuth();

  const ref = firebase
    .firestore()
    .collection("dmConversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limitToLast(200);

  const unsub = ref.onSnapshot(
    snap => {
      const msgs: DmMessage[] = snap.docs.map(d => ({
        ...(d.data() as DmMessage),
        id: d.id,
      }));
      onMessages(msgs);
    },
    err => {
      console.error("[Firestore chat] snapshot error:", err.code, err.message);
      onError?.(err.message || "Firestore error");
    },
  );

  return unsub;
}

/** Load the last N messages (for history on open). */
export async function loadRecentMessages(
  conversationId: string,
  limit = 50,
): Promise<DmMessage[]> {
  await ensureAuth();
  const snap = await firebase
    .firestore()
    .collection("dmConversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limitToLast(limit)
    .get();

  return snap.docs.map(d => ({ ...(d.data() as DmMessage), id: d.id }));
}
