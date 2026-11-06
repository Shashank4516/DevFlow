import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createSelector } from "reselect";

import { isDemoMode } from "../demo";
import { useProfile, useRedux } from "../hooks";
import { useFriendRequests } from "./FriendRequestsContext";

const BACKEND = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

/**
 * Friend requests and unread messages come from the real backend. Everything else
 * needs a notifications endpoint that the backend does not have yet, so until then
 * that feed exists only in demo mode. To go live: add the endpoint, enable this.
 */
const HAS_NOTIFICATION_FEED = isDemoMode;
const FEED_POLL_MS = 4000;

export type NotificationType =
  | "friend_request"
  | "message"
  | "mention"
  | "task_assigned"
  | "review_requested"
  | "missed_call"
  | "github_push"
  | "channel_added";

export type NotificationActor = { id: number; name: string; image?: string | null };

export type NotificationItem = {
  id: string;
  type: NotificationType;
  actor: NotificationActor;
  /** The sentence after the person's name. */
  text: string;
  /** ISO time. Unread-message rows don't have one, as the API only returns a count. */
  time?: string;
  isRead: boolean;
  quote?: string;
  task?: { code: string; title: string; status: string };
  commit?: { sha: string; message: string };
  channelId?: string;
  projectId?: number;
  requestId?: number;
  /** A feed item that was already read when it arrived. */
  readByDefault?: boolean;
};

type NotificationsContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const readSavedIds = (key: string): string[] => {
  if (isDemoMode) return []; // Demo state resets on refresh, like everything else there.
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { useAppSelector } = useRedux();
  const { userProfile } = useProfile();
  const { pending } = useFriendRequests();

  const friendData = createSelector(
    (state: any) => state.Chats,
    chats => ({ directMessages: chats.directMessages, favourites: chats.favourites }),
  );
  const { directMessages, favourites } = useAppSelector(friendData);

  const storageKey = `devflow_read_notifications_${userProfile?.id ?? userProfile?.uid ?? "me"}`;
  const [readIds, setReadIds] = useState<string[]>(() => readSavedIds(storageKey));
  const [feed, setFeed] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!HAS_NOTIFICATION_FEED) return undefined;
    const load = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/notifications/list.php`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setFeed(Array.isArray(data?.notifications) ? data.notifications : []);
        }
      } catch {
        // Keeps showing what it has. The next poll tries again.
      }
    };
    load();
    const id = window.setInterval(load, FEED_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  const items = useMemo(() => {
    const isRead = (id: string, byDefault = false) => byDefault || readIds.includes(id);

    const requests: NotificationItem[] = pending.map(request => {
      const id = `request-${request.request_id}`;
      return {
        id,
        type: "friend_request",
        actor: { id: request.user_id, name: request.name || "Someone", image: request.profile_image },
        text: "sent you a friend request",
        time: (request as any).created_at,
        requestId: request.request_id,
        isRead: isRead(id),
      };
    });

    const seen = new Set<number>();
    const messages: NotificationItem[] = [];
    [...(favourites || []), ...(directMessages || [])].forEach((friend: any) => {
      const count = Number(friend?.meta?.unRead || 0);
      if (!friend?.id || count <= 0 || seen.has(Number(friend.id))) return;
      seen.add(Number(friend.id));
      // The count is part of the id, so that a newer message counts as unread again.
      const id = `message-${friend.id}-${count}`;
      messages.push({
        id,
        type: "message",
        actor: {
          id: Number(friend.id),
          name: `${friend.firstName || ""} ${friend.lastName || ""}`.trim(),
          image: friend.profileImage,
        },
        text: count === 1 ? "sent you a message" : `sent you ${count} messages`,
        isRead: isRead(id),
      });
    });

    const feedItems = feed.map(item => ({ ...item, isRead: isRead(item.id, item.readByDefault) }));

    const timeOf = (item: NotificationItem) => (item.time ? new Date(item.time).getTime() : Infinity);
    return [...requests, ...messages, ...feedItems].sort((a, b) => timeOf(b) - timeOf(a));
  }, [pending, directMessages, favourites, feed, readIds]);

  const saveReadIds = useCallback(
    (next: string[]) => {
      setReadIds(next);
      if (isDemoMode) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next.slice(-300)));
      } catch {
        // Read state falls back to this session only.
      }
    },
    [storageKey],
  );

  const markRead = useCallback(
    (id: string) => {
      if (!readIds.includes(id)) saveReadIds([...readIds, id]);
    },
    [readIds, saveReadIds],
  );

  const markAllRead = useCallback(() => {
    saveReadIds(Array.from(new Set([...readIds, ...items.map(item => item.id)])));
  }, [items, readIds, saveReadIds]);

  const value = useMemo(
    () => ({
      items,
      unreadCount: items.filter(item => !item.isRead).length,
      markRead,
      markAllRead,
    }),
    [items, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within NotificationsProvider");
  return context;
}
