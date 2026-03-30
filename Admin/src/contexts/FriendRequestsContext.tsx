import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

export type FriendPendingItem = {
  request_id: number;
  user_id: number;
  name: string;
  profile_image: string;
};

type FriendRequestsContextValue = {
  pending: FriendPendingItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  removeRequest: (requestId: number) => void;
};

const FriendRequestsContext = createContext<FriendRequestsContextValue | null>(null);

export function FriendRequestsProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<FriendPendingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!BACKEND_URL) {
      setPending([]);
      return;
    }
    setLoading(true);
    try {
      const url = `${BACKEND_URL.replace(/\/$/, "")}/api/friends/pending.php`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setPending(Array.isArray(data?.pending) ? data.pending : []);
    } catch {
      // keep previous list on failure
    } finally {
      setLoading(false);
    }
  }, []);

  const removeRequest = useCallback((requestId: number) => {
    setPending((prev) => prev.filter((p) => p.request_id !== requestId));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo(
    () => ({ pending, loading, refresh, removeRequest }),
    [pending, loading, refresh, removeRequest]
  );

  return (
    <FriendRequestsContext.Provider value={value}>{children}</FriendRequestsContext.Provider>
  );
}

export function useFriendRequests() {
  const ctx = useContext(FriendRequestsContext);
  if (!ctx) {
    throw new Error("useFriendRequests must be used within FriendRequestsProvider");
  }
  return ctx;
}
