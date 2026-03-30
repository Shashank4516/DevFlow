import React, { useEffect, useState } from "react";
import { Spinner } from "reactstrap";
import AppSimpleBar from "../../../components/AppSimpleBar";
import LeftbarTitle from "../../../components/LeftbarTitle";
import avatar1 from "../../../assets/images/users/avatar-1.jpg";
import {
  showErrorNotification,
  showSuccessNotification,
} from "../../../helpers/notifications";
import { useFriendRequests } from "../../../contexts/FriendRequestsContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

const Notifications = () => {
  const { pending, loading, refresh, removeRequest } = useFriendRequests();
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const respond = async (requestId: number, action: "accept" | "reject") => {
    if (!BACKEND_URL) {
      showErrorNotification("Backend URL is not configured.");
      return;
    }
    setActingId(requestId);
    try {
      const res = await fetch(
        `${BACKEND_URL.replace(/\/$/, "")}/api/friends/respond.php`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: requestId, action }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorNotification(
          (data as { error?: string })?.error || "Failed to update request"
        );
        return;
      }
      removeRequest(requestId);
      showSuccessNotification(
        action === "accept"
          ? "Request accepted. You can chat now."
          : "Friend request rejected."
      );
    } catch {
      showErrorNotification("Network error while updating request");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="position-relative">
      <LeftbarTitle title="Notification" />
      <AppSimpleBar className="chat-message-list chat-bookmark-list">
        <ul className="list-unstyled chat-list px-2">
          {loading && pending.length === 0 ? (
            <li className="py-5 text-center text-muted">
              <Spinner size="sm" className="me-2" />
              Loading…
            </li>
          ) : pending.length === 0 ? (
            <li className="py-5 text-center text-muted small">
              No pending friend requests.
            </li>
          ) : (
            pending.map((item) => (
              <li key={item.request_id} className="py-2 border-bottom border-light border-opacity-10">
                <div className="d-flex align-items-center gap-2">
                  <img
                    src={item.profile_image || avatar1}
                    alt=""
                    className="rounded-circle flex-shrink-0"
                    width={44}
                    height={44}
                    style={{ objectFit: "cover" }}
                  />
                  <div className="flex-grow-1 min-w-0">
                    <div className="text-truncate fw-medium">
                      {item.name || "Someone"}
                    </div>
                    <div className="text-muted small">
                      Sent you a friend request
                    </div>
                  </div>
                  <div className="d-flex flex-column flex-sm-row gap-1 flex-shrink-0">
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      disabled={actingId === item.request_id}
                      onClick={() => respond(item.request_id, "accept")}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={actingId === item.request_id}
                      onClick={() => respond(item.request_id, "reject")}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </AppSimpleBar>
    </div>
  );
};

export default Notifications;
