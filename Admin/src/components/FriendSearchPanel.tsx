import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import classnames from "classnames";
import { createSelector } from "reselect";

import { TABS } from "../constants/index";
import { useFriendRequests } from "../contexts/FriendRequestsContext";
import {
  showErrorNotification,
  showSuccessNotification,
} from "../helpers/notifications";
import { useProfile, useRedux } from "../hooks/index";
import {
  changeSelectedChat,
  changeTab,
  getChatUserConversations,
  getChatUserDetails,
  getDirectMessages,
  readConversation,
  setChatUserDetails,
} from "../redux/actions";

const BACKEND = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;
const MAX_RECENT = 10;
const MAX_SUGGESTED = 6;
const PENDING_POLL_MS = 3000;

type Person = {
  id: number;
  name: string;
  profile_image?: string | null;
  profile_tag?: string | null;
};

type RelationStatus =
  | "none"
  | "accepted"
  | "incoming_pending"
  | "outgoing_pending"
  | "incoming_rejected"
  | "outgoing_rejected";

type Relation = { status: RelationStatus; request_id: number | null };

type SearchError = "auth" | "server" | "network" | null;

const readRecent = (key: string): Person[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const writeRecent = (key: string, people: Person[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(people));
  } catch {
    // Recents are a convenience, so search keeps working without them.
  }
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "?";

const PersonAvatar = ({ person }: { person: Person }) =>
  person.profile_image ? (
    <img src={person.profile_image} alt="" className="friend-search__avatar" />
  ) : (
    <span className="friend-search__avatar friend-search__avatar--initials">
      {initialsOf(person.name)}
    </span>
  );

interface FriendSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Instagram-style people search, in a panel that slides in on the right of the chat. */
const FriendSearchPanel = ({ isOpen, onClose }: FriendSearchPanelProps) => {
  const { dispatch, useAppSelector } = useRedux();
  const { userProfile } = useProfile();
  const { refresh: refreshPending, removeRequest } = useFriendRequests();

  const friendData = createSelector(
    (state: any) => state.Chats,
    chats => ({ directMessages: chats.directMessages, favourites: chats.favourites }),
  );
  const { directMessages, favourites } = useAppSelector(friendData);

  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SearchError>(null);
  const [relations, setRelations] = useState<Record<number, Relation>>({});
  const relationsRef = useRef(relations);
  relationsRef.current = relations;
  const [busyId, setBusyId] = useState<number | null>(null);

  const recentKey = `devflow_recent_people_${userProfile?.id ?? userProfile?.uid ?? "me"}`;
  const [recent, setRecent] = useState<Person[]>(() => readRecent(recentKey));

  const friends = useMemo(() => {
    const byId = new Map<number, any>();
    [...(favourites || []), ...(directMessages || [])].forEach((friend: any) => {
      if (friend?.id) byId.set(Number(friend.id), friend);
    });
    return byId;
  }, [favourites, directMessages]);

  const isSearching = query.trim().length >= MIN_QUERY;
  const suggested: Person[] = useMemo(
    () =>
      Array.from(friends.values())
        .slice(0, MAX_SUGGESTED)
        .map(friend => ({
          id: Number(friend.id),
          name: `${friend.firstName || ""} ${friend.lastName || ""}`.trim(),
          profile_image: friend.profileImage,
        })),
    [friends],
  );
  const shownPeople = isSearching ? results : recent.length ? recent : suggested;

  const relationOf = useCallback(
    (person: Person): Relation =>
      relations[person.id] ||
      (friends.has(person.id)
        ? { status: "accepted", request_id: null }
        : { status: "none", request_id: null }),
    [relations, friends],
  );

  // Opening the panel.
  useEffect(() => {
    if (!isOpen) return undefined;
    setRecent(readRecent(recentKey));
    // Waits for the slide-in. Focusing a hidden input would do nothing.
    const focus = window.setTimeout(() => inputRef.current?.focus(), 60);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focus);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, recentKey]);

  // Searching.
  useEffect(() => {
    if (!isOpen || !isSearching) {
      setResults([]);
      setError(null);
      setLoading(false);
      return undefined;
    }
    let isCurrent = true;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `${BACKEND}/api/search/profiles.php?q=${encodeURIComponent(query.trim())}`,
          { credentials: "include" },
        );
        if (!isCurrent) return;
        if (!res.ok) {
          setResults([]);
          setError(res.status === 401 ? "auth" : "server");
          return;
        }
        const data = await res.json();
        if (!isCurrent) return;
        setResults(Array.isArray(data) ? data : []);
        setError(null);
      } catch {
        if (isCurrent) {
          setResults([]);
          setError("network");
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, isSearching, query]);

  const fetchRelations = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;
      try {
        const res = await fetch(`${BACKEND}/api/friends/statuses.php?ids=${ids.join(",")}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const statuses = data?.statuses || {};
        const next = { ...relationsRef.current };
        let someoneAccepted = false;
        Object.keys(statuses).forEach(key => {
          const id = Number(key);
          const updated: Relation = {
            status: statuses[key]?.status || "none",
            request_id: statuses[key]?.request_id ?? null,
          };
          if (next[id]?.status === "outgoing_pending" && updated.status === "accepted") {
            someoneAccepted = true;
          }
          next[id] = updated;
        });
        relationsRef.current = next;
        setRelations(next);
        // They accepted while the panel is open, so they can be messaged now.
        if (someoneAccepted) {
          dispatch(getDirectMessages());
          showSuccessNotification("Your friend request was accepted. You can chat now.");
        }
      } catch {
        // Rows fall back to what is already known. The next look will try again.
      }
    },
    [dispatch],
  );

  const shownIds = shownPeople.map(person => person.id).join(",");
  useEffect(() => {
    if (isOpen && shownIds) fetchRelations(shownIds.split(",").map(Number));
  }, [isOpen, shownIds, fetchRelations]);

  // Watches for a sent request being accepted while the panel is open.
  const hasOutgoing = shownPeople.some(person => relations[person.id]?.status === "outgoing_pending");
  useEffect(() => {
    if (!isOpen || !hasOutgoing) return undefined;
    const id = window.setInterval(
      () => fetchRelations(shownIds.split(",").map(Number)),
      PENDING_POLL_MS,
    );
    return () => window.clearInterval(id);
  }, [isOpen, hasOutgoing, shownIds, fetchRelations]);

  const remember = (person: Person) => {
    const next = [person, ...recent.filter(item => item.id !== person.id)].slice(0, MAX_RECENT);
    setRecent(next);
    writeRecent(recentKey, next);
  };

  const forget = (id: number) => {
    const next = recent.filter(item => item.id !== id);
    setRecent(next);
    writeRecent(recentKey, next);
  };

  const clearRecent = () => {
    setRecent([]);
    writeRecent(recentKey, []);
  };

  const openChat = (person: Person) => {
    remember(person);
    const friend = friends.get(person.id);
    dispatch(changeTab(TABS.CHAT));
    if (friend) dispatch(setChatUserDetails(friend));
    else dispatch(getChatUserDetails(person.id));
    dispatch(readConversation(person.id));
    dispatch(getChatUserConversations(person.id));
    dispatch(changeSelectedChat(person.id));
    setQuery("");
    onClose();
  };

  const sendRequest = async (person: Person) => {
    setBusyId(person.id);
    remember(person);
    try {
      const res = await fetch(`${BACKEND}/api/friends/request.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: person.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showErrorNotification(data?.error || "Could not send your request.");
        return;
      }
      const accepted = data?.status === "accepted";
      setRelations(current => ({
        ...current,
        [person.id]: {
          status: accepted ? "accepted" : "outgoing_pending",
          request_id: data?.request_id ?? null,
        },
      }));
      if (accepted) dispatch(getDirectMessages());
      showSuccessNotification(
        accepted ? "You are friends now. You can chat." : `Friend request sent to ${person.name}.`,
      );
      refreshPending();
    } catch {
      showErrorNotification("Network error while sending your request.");
    } finally {
      setBusyId(null);
    }
  };

  const acceptRequest = async (person: Person, requestId: number) => {
    setBusyId(person.id);
    remember(person);
    try {
      const res = await fetch(`${BACKEND}/api/friends/respond.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, action: "accept" }),
      });
      if (!res.ok) {
        showErrorNotification("Could not accept the request.");
        return;
      }
      setRelations(current => ({
        ...current,
        [person.id]: { status: "accepted", request_id: requestId },
      }));
      removeRequest(requestId);
      dispatch(getDirectMessages());
      showSuccessNotification(`You and ${person.name} are friends now.`);
    } catch {
      showErrorNotification("Network error while accepting the request.");
    } finally {
      setBusyId(null);
    }
  };

  const onRowClick = (person: Person) => {
    if (relationOf(person).status === "accepted") {
      openChat(person);
    } else {
      inputRef.current?.focus();
    }
  };

  const subtitleOf = (person: Person) => {
    const { status } = relationOf(person);
    const label =
      status === "accepted"
        ? "Friends"
        : status === "outgoing_pending"
          ? "Request sent"
          : status === "incoming_pending"
            ? "Wants to connect"
            : "";
    return [person.profile_tag, label].filter(Boolean).join(" · ");
  };

  const renderAction = (person: Person) => {
    const { status, request_id: requestId } = relationOf(person);
    const isBusy = busyId === person.id;
    if (status === "accepted") {
      return (
        <button type="button" className="friend-search__action is-quiet" onClick={() => openChat(person)}>
          Message
        </button>
      );
    }
    if (status === "outgoing_pending") {
      return (
        <button type="button" className="friend-search__action is-quiet" disabled>
          Requested
        </button>
      );
    }
    if (status === "incoming_pending" && requestId) {
      return (
        <button
          type="button"
          className="friend-search__action"
          disabled={isBusy}
          onClick={() => acceptRequest(person, requestId)}
        >
          Accept
        </button>
      );
    }
    return (
      <button
        type="button"
        className="friend-search__action"
        disabled={isBusy}
        onClick={() => sendRequest(person)}
      >
        Add
      </button>
    );
  };

  const renderRow = (person: Person, isRecent: boolean) => {
    const subtitle = subtitleOf(person);
    return (
      <li key={person.id} className="friend-search__row">
        <button type="button" className="friend-search__person" onClick={() => onRowClick(person)}>
          <PersonAvatar person={person} />
          <span className="friend-search__text">
            <span className="friend-search__name">{person.name || "Unknown"}</span>
            {subtitle && <span className="friend-search__subtitle">{subtitle}</span>}
          </span>
        </button>
        {renderAction(person)}
        {isRecent && (
          <button
            type="button"
            className="friend-search__remove"
            aria-label={`Remove ${person.name} from recent searches`}
            onClick={() => forget(person.id)}
          >
            <i className="bx bx-x" />
          </button>
        )}
      </li>
    );
  };

  return (
    <aside
      className={classnames("friend-search", { "is-open": isOpen })}
      aria-hidden={!isOpen}
      aria-label="Search people"
    >
      <div className="friend-search__head">
        <h2 className="friend-search__title">Search</h2>
        <button
          type="button"
          className="friend-search__close"
          aria-label="Close search"
          onClick={onClose}
        >
          <i className="bx bx-x" />
        </button>
      </div>

      <div className="friend-search__field">
        <i className="bx bx-search" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search by name, email, or tag"
          aria-label="Search people"
          autoComplete="off"
          onChange={event => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="friend-search__clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <i className="bx bx-x" />
          </button>
        )}
      </div>

      <div className="friend-search__divider" />

      <div className="friend-search__body">
        {isSearching ? (
          <>
            {loading && results.length === 0 && (
              <div className="friend-search__message" role="status">
                <span className="spinner-border spinner-border-sm" /> Searching…
              </div>
            )}
            {!loading && error && (
              <div className="friend-search__message is-error" role="alert">
                {error === "auth"
                  ? "Your session has expired. Please log in again."
                  : "Search is not available right now. Please try again."}
              </div>
            )}
            {!loading && !error && results.length === 0 && (
              <div className="friend-search__message">
                <strong>No people found</strong>
                Nobody matches “{query.trim()}”. Try a name, email, or tag.
              </div>
            )}
            <ul>{results.map(person => renderRow(person, false))}</ul>
          </>
        ) : recent.length > 0 ? (
          <>
            <div className="friend-search__section">
              <span>Recent</span>
              <button type="button" onClick={clearRecent}>
                Clear all
              </button>
            </div>
            <ul>{recent.map(person => renderRow(person, true))}</ul>
          </>
        ) : suggested.length > 0 ? (
          <>
            <div className="friend-search__section">
              <span>Suggested</span>
            </div>
            <ul>{suggested.map(person => renderRow(person, false))}</ul>
          </>
        ) : (
          <div className="friend-search__message">
            <strong>Find your friends</strong>
            Search for someone to start chatting.
          </div>
        )}
      </div>
    </aside>
  );
};

export default FriendSearchPanel;
