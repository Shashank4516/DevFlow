import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "reactstrap";
import { useRedux } from "../hooks/index";
import {
  changeTab,
  getChatUserDetails,
  getChatUserConversations,
  changeSelectedChat,
  readConversation,
} from "../redux/actions";
import { TABS } from "../constants/index";
import avatar1 from "../assets/images/users/avatar-1.jpg";
import {
  showErrorNotification,
  showSuccessNotification,
} from "../helpers/notifications";
import { useFriendRequests } from "../contexts/FriendRequestsContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
const DEBOUNCE_MS = 300;

export interface SearchProfile {
  id: number;
  name: string;
  profile_image: string;
}

type ApiError = "auth" | "server" | "network" | null;
type RelationStatus =
  | "none"
  | "accepted"
  | "incoming_pending"
  | "outgoing_pending"
  | "incoming_rejected"
  | "outgoing_rejected";

const ProfileSearch = () => {
  const { dispatch } = useRedux();
  const { refresh: refreshPending, removeRequest } = useFriendRequests();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [apiError, setApiError] = useState<ApiError>(null);
  const [relationByUser, setRelationByUser] = useState<
    Record<number, { status: RelationStatus; request_id: number | null }>
  >({});
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [lastAttemptedUrl, setLastAttemptedUrl] = useState<string | null>(null);

  const fetchStatuses = useCallback(async (ids: number[]) => {
    if (!BACKEND_URL || ids.length === 0) {
      setRelationByUser({});
      return;
    }
    try {
      const url = `${BACKEND_URL.replace(/\/$/, "")}/api/friends/statuses.php?ids=${ids.join(",")}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const next: Record<number, { status: RelationStatus; request_id: number | null }> = {};
      const statuses = data?.statuses || {};
      Object.keys(statuses).forEach((k) => {
        const id = Number(k);
        const s = statuses[k];
        next[id] = {
          status: (s?.status || "none") as RelationStatus,
          request_id: s?.request_id ?? null,
        };
      });
      setRelationByUser(next);
    } catch {
      // keep UI usable even if status API fails
    }
  }, []);

  const fetchProfiles = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      setApiError(null);
      return;
    }
    if (!BACKEND_URL) {
      setResults([]);
      setApiError("network");
      setLastAttemptedUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setApiError(null);
    const url = `${BACKEND_URL.replace(/\/$/, "")}/api/search/profiles.php?q=${encodeURIComponent(q.trim())}`;
    setLastAttemptedUrl(url);
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        setResults([]);
        if (res.status === 401) setApiError("auth");
        else setApiError("server");
        return;
      }
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
      setApiError("network");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setApiError(null);
      setDropdownOpen(false);
      return;
    }
    const t = setTimeout(() => {
      fetchProfiles(query);
      setDropdownOpen(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, fetchProfiles]);

  useEffect(() => {
    if (results.length === 0) return;
    fetchStatuses(results.map((r) => r.id));
  }, [results, fetchStatuses]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSelectProfile = (profile: SearchProfile) => {
    const relation = relationByUser[profile.id]?.status || "none";
    if (relation !== "accepted") {
      showErrorNotification("Send a friend request first. Chat unlocks after they accept.");
      return;
    }
    dispatch(changeTab(TABS.CHAT));
    dispatch(getChatUserDetails(profile.id));
    dispatch(readConversation(profile.id));
    dispatch(getChatUserConversations(profile.id));
    dispatch(changeSelectedChat(profile.id));
    setDropdownOpen(false);
    setQuery("");
    setResults([]);
  };

  const sendFriendRequest = async (profileId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/api/friends/request.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: profileId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showErrorNotification(data?.error || "Failed to send request");
        return;
      }
      setRelationByUser((prev) => ({
        ...prev,
        [profileId]: {
          status: (data?.status || "outgoing_pending") as RelationStatus,
          request_id: data?.request_id ?? null,
        },
      }));
      if (data?.status === "accepted") {
        showSuccessNotification("Friend request accepted. You can chat now.");
      } else {
        showSuccessNotification("Friend request sent.");
      }
      refreshPending();
    } catch {
      showErrorNotification("Network error while sending request");
    }
  };

  const respondToRequest = async (requestId: number, action: "accept" | "reject", userId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/api/friends/respond.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        showErrorNotification(data?.error || "Failed to update request");
        return;
      }
      const nextStatus = action === "accept" ? "accepted" : "incoming_rejected";
      setRelationByUser((prev) => ({
        ...prev,
        [userId]: { status: nextStatus as RelationStatus, request_id: requestId },
      }));
      removeRequest(requestId);
      showSuccessNotification(action === "accept" ? "Request accepted. Chat enabled." : "Request rejected.");
    } catch {
      showErrorNotification("Network error while updating request");
    }
  };

  return (
    <div className="profile-search-wrapper position-relative px-3 pt-3 pb-2" ref={wrapperRef}>
      <div className="input-group">
        <Input
          type="text"
          className="form-control bg-light border-0"
          placeholder="Search profiles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setDropdownOpen(true)}
        />
        <span className="input-group-text bg-light border-0">
          <i className="bx bx-search text-muted"></i>
        </span>
      </div>

      {dropdownOpen && (results.length > 0 || loading || apiError) && (
        <div
          className="dropdown-menu show w-100 position-absolute start-0 mt-1 shadow-sm"
          style={{ maxHeight: "280px", overflowY: "auto" }}
        >
          {loading ? (
            <div className="px-3 py-3 text-center text-muted">
              <span className="spinner-border spinner-border-sm me-2" />
              Searching...
            </div>
          ) : apiError === "auth" ? (
            <div className="px-3 py-3 text-warning text-center small">
              Session expired. Please log in again.
            </div>
          ) : apiError === "server" ? (
            <div className="px-3 py-3 text-danger text-center small">
              Backend error. Check that the API and database are running.
            </div>
          ) : apiError === "network" ? (
            <div className="px-3 py-3 text-danger text-center small">
              Could not reach backend. Check VITE_BACKEND_URL and network.
              {!BACKEND_URL && (
                <div className="mt-2">Set VITE_BACKEND_URL in your .env (e.g. http://localhost:8080 or http://localhost/devflow-backend/backend).</div>
              )}
              {BACKEND_URL && (
                <div className="mt-2">
                  Ensure the PHP backend is running (XAMPP Apache or <code>php -S localhost:8080 -t backend</code>) and <code>frontend_base_url</code> in backend config matches this app (e.g. http://localhost:5173).
                </div>
              )}
              {BACKEND_URL && lastAttemptedUrl && import.meta.env.DEV && (
                <div className="mt-2 text-muted font-monospace" style={{ fontSize: "0.7rem", wordBreak: "break-all" }}>
                  Tried: {lastAttemptedUrl}
                </div>
              )}
            </div>
          ) : (
            results.map((profile) => {
              const relation = relationByUser[profile.id]?.status || "none";
              const reqId = relationByUser[profile.id]?.request_id || null;
              return (
                <div
                  key={profile.id}
                  className="dropdown-item d-flex align-items-center justify-content-between gap-2 py-2"
                >
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-2 flex-grow-1 text-start"
                    onClick={() => onSelectProfile(profile)}
                  >
                    <img
                      src={profile.profile_image || avatar1}
                      alt=""
                      className="rounded-circle flex-shrink-0"
                      width={36}
                      height={36}
                      style={{ objectFit: "cover" }}
                    />
                    <span className="text-truncate">{profile.name || "Unknown"}</span>
                  </button>

                  {relation === "accepted" ? (
                    <span className="badge bg-success-subtle text-success">Friends</span>
                  ) : relation === "outgoing_pending" ? (
                    <span className="badge bg-warning-subtle text-warning">Pending</span>
                  ) : relation === "incoming_pending" && reqId ? (
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => respondToRequest(reqId, "accept", profile.id)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => respondToRequest(reqId, "reject", profile.id)}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => sendFriendRequest(profile.id)}
                    >
                      Request
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {dropdownOpen && !loading && !apiError && query.length >= 2 && results.length === 0 && (
        <div
          className="dropdown-menu show w-100 position-absolute start-0 mt-1 shadow-sm"
        >
          <div className="px-3 py-3 text-muted text-center">
            No profiles found. The database was searched; no name or email matches &quot;{query}&quot;.
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSearch;
