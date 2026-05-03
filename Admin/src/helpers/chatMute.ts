const STORAGE_KEY = "devflow_muted_chat_peer_ids";

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(id => String(id)));
  } catch {
    return new Set();
  }
}

function writeSet(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

export function isChatPeerMuted(peerId: string | number | null | undefined): boolean {
  if (peerId == null || peerId === "") return false;
  return readSet().has(String(peerId));
}

/** Returns whether the peer is muted after toggle. */
export function toggleMuteChatPeer(
  peerId: string | number | null | undefined,
): boolean {
  if (peerId == null || peerId === "") return false;
  const key = String(peerId);
  const next = readSet();
  const was = next.has(key);
  if (was) next.delete(key);
  else next.add(key);
  writeSet(next);
  return !was;
}
