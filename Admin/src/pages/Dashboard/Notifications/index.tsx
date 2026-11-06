import React, { useMemo, useState } from "react";
import classnames from "classnames";
import { formatDistanceToNowStrict } from "date-fns";
import { useDispatch } from "react-redux";

import AppSimpleBar from "../../../components/AppSimpleBar";
import VideoCallModal from "../../../components/VideoCallModal";
import { TABS } from "../../../constants";
import { useFriendRequests } from "../../../contexts/FriendRequestsContext";
import {
  NotificationItem,
  NotificationType,
  useNotifications,
} from "../../../contexts/NotificationsContext";
import {
  showErrorNotification,
  showSuccessNotification,
} from "../../../helpers/notifications";
import { useProfile } from "../../../hooks";
import {
  changeSelectedChat,
  changeTab,
  getChannelDetails,
  getChatUserConversations,
  getChatUserDetails,
  getDirectMessages,
  readConversation,
} from "../../../redux/actions";
import { setStackProjectId } from "../../../redux/layout/actions";

const BACKEND = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

const TYPE_ICONS: Record<NotificationType, string> = {
  friend_request: "bx bxs-user-plus",
  message: "bx bxs-message-rounded-dots",
  mention: "bx bx-at",
  task_assigned: "bx bx-task",
  review_requested: "bx bx-git-pull-request",
  missed_call: "mdi mdi-phone-missed",
  github_push: "bx bxl-github",
  channel_added: "bx bx-hash",
};

type Filter = "all" | "unread" | "requests";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "requests", label: "Requests" },
];

const EMPTY_TEXT: Record<Filter, { title: string; body: string }> = {
  all: { title: "You're all caught up", body: "New activity will show up here." },
  unread: { title: "Nothing unread", body: "You've seen everything so far." },
  requests: { title: "No requests", body: "Friend requests will show up here." },
};

const shortTime = (time?: string) => {
  if (!time) return "";
  const text = formatDistanceToNowStrict(new Date(time));
  const [amount, unit] = text.split(" ");
  return `${amount}${unit.startsWith("mo") ? "mo" : unit.charAt(0)}`;
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "?";

const Notifications = () => {
  const dispatch = useDispatch();
  const { userProfile } = useProfile();
  const { removeRequest } = useFriendRequests();
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [actingId, setActingId] = useState<number | null>(null);
  const [callingUser, setCallingUser] = useState<any>(null);

  const shown = useMemo(() => {
    if (filter === "unread") return items.filter(item => !item.isRead);
    if (filter === "requests") return items.filter(item => item.type === "friend_request");
    return items;
  }, [items, filter]);
  const newItems = shown.filter(item => !item.isRead);
  const earlierItems = shown.filter(item => item.isRead);

  const openChat = (userId: number) => {
    dispatch(changeTab(TABS.CHAT));
    dispatch(getChatUserDetails(userId));
    dispatch(readConversation(userId));
    dispatch(getChatUserConversations(userId));
    dispatch(changeSelectedChat(userId));
  };

  const onOpen = (item: NotificationItem) => {
    markRead(item.id);
    switch (item.type) {
      case "message":
      case "missed_call":
        openChat(item.actor.id);
        break;
      case "mention":
      case "channel_added":
        if (item.channelId) {
          dispatch(changeTab(TABS.CHAT));
          dispatch(getChannelDetails(item.channelId));
          dispatch(changeSelectedChat(item.channelId));
        }
        break;
      case "task_assigned":
      case "review_requested":
        if (item.projectId != null) dispatch(setStackProjectId(item.projectId));
        dispatch(changeTab(TABS.STACK));
        break;
      case "github_push":
        dispatch(changeTab(TABS.GITHUB));
        break;
      default:
        break; // A friend request is answered with its own buttons.
    }
  };

  const respond = async (item: NotificationItem, action: "accept" | "reject") => {
    if (item.requestId == null) return;
    setActingId(item.requestId);
    try {
      const res = await fetch(`${BACKEND}/api/friends/respond.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: item.requestId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorNotification((data as { error?: string })?.error || "Could not update the request.");
        return;
      }
      removeRequest(item.requestId);
      if (action === "accept") dispatch(getDirectMessages());
      showSuccessNotification(
        action === "accept"
          ? `You and ${item.actor.name} are friends now.`
          : "Friend request declined.",
      );
    } catch {
      showErrorNotification("Network error while updating the request.");
    } finally {
      setActingId(null);
    }
  };

  const renderItem = (item: NotificationItem) => {
    const isOpenable = item.type !== "friend_request";
    const body = (
      <>
        <span className="notif__avatar-wrap">
          {item.actor.image ? (
            <img src={item.actor.image} alt="" className="notif__avatar" />
          ) : (
            <span className="notif__avatar notif__avatar--initials">{initialsOf(item.actor.name)}</span>
          )}
          <span className={`notif__type notif__type--${item.type}`}>
            <i className={TYPE_ICONS[item.type]} />
          </span>
        </span>
        <span className="notif__content">
          <span className="notif__text">
            <strong>{item.actor.name}</strong> {item.text}
          </span>
          {item.quote && <span className="notif__quote">{item.quote}</span>}
          {item.task && (
            <span className="notif__task">
              <span className="notif__task-code">{item.task.code}</span>
              <span className="notif__task-title">{item.task.title}</span>
              <span className="notif__task-status">{item.task.status}</span>
            </span>
          )}
          {item.commit && (
            <span className="notif__commit">
              <code>{item.commit.sha}</code> {item.commit.message}
            </span>
          )}
          {item.time && <span className="notif__time">{shortTime(item.time)}</span>}
        </span>
        {!item.isRead && <span className="notif__dot" aria-label="Unread" />}
      </>
    );
    return (
      <li key={item.id} className={classnames("notif", { "is-unread": !item.isRead })}>
        {isOpenable ? (
          <button type="button" className="notif__main" onClick={() => onOpen(item)}>
            {body}
          </button>
        ) : (
          <div className="notif__main">{body}</div>
        )}
        {item.type === "friend_request" && (
          <div className="notif__actions">
            <button
              type="button"
              className="notif__btn is-primary"
              disabled={actingId === item.requestId}
              onClick={() => respond(item, "accept")}
            >
              Accept
            </button>
            <button
              type="button"
              className="notif__btn"
              disabled={actingId === item.requestId}
              onClick={() => respond(item, "reject")}
            >
              Decline
            </button>
          </div>
        )}
        {item.type === "missed_call" && (
          <div className="notif__actions">
            <button
              type="button"
              className="notif__btn is-primary"
              onClick={() => {
                markRead(item.id);
                const [firstName, ...rest] = item.actor.name.split(" ");
                setCallingUser({
                  id: item.actor.id,
                  firstName,
                  lastName: rest.join(" "),
                  profileImage: item.actor.image,
                });
              }}
            >
              <i className="bx bxs-video" /> Call back
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="notif-panel">
      <div className="notif-panel__head">
        <h4 className="notif-panel__title">Notifications</h4>
        <button
          type="button"
          className="notif-panel__mark-all"
          disabled={unreadCount === 0}
          onClick={markAllRead}
        >
          Mark all read
        </button>
      </div>
      <div className="notif-panel__filters" role="tablist">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={classnames("notif-panel__filter", { "is-active": filter === key })}
            onClick={() => setFilter(key)}
          >
            {label}
            {key === "unread" && unreadCount > 0 && <span>{unreadCount}</span>}
          </button>
        ))}
      </div>
      <AppSimpleBar className="notif-panel__list">
        {shown.length === 0 && (
          <div className="notif-panel__empty">
            <i className="bx bx-bell" />
            <strong>{EMPTY_TEXT[filter].title}</strong>
            {EMPTY_TEXT[filter].body}
          </div>
        )}
        {newItems.length > 0 && (
          <>
            <div className="notif-panel__group">New</div>
            <ul>{newItems.map(renderItem)}</ul>
          </>
        )}
        {earlierItems.length > 0 && (
          <>
            <div className="notif-panel__group">Earlier</div>
            <ul>{earlierItems.map(renderItem)}</ul>
          </>
        )}
      </AppSimpleBar>
      {callingUser && (
        <VideoCallModal
          isOpen={!!callingUser}
          onClose={() => setCallingUser(null)}
          user={callingUser}
          currentUser={userProfile}
          direction="outgoing"
        />
      )}
    </div>
  );
};

export default Notifications;
