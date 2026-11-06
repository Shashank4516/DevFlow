import React, { useEffect, useMemo, useState } from "react";
import classnames from "classnames";
import { format, isThisYear, isToday, isYesterday } from "date-fns";
import { useDispatch } from "react-redux";

import { useProfile } from "../../../hooks";
import AppSimpleBar from "../../../components/AppSimpleBar";
import VideoCallModal from "../../../components/VideoCallModal";
import Call, { isMissedCall } from "./Call";
import { subscribeVideoCallHistory } from "../../../helpers/webrtc_video_call";
import { TABS } from "../../../constants";
import {
  changeSelectedChat,
  changeTab,
  getChatUserConversations,
  getChatUserDetails,
  readConversation,
} from "../../../redux/actions";
import { CallItem } from "../../../data/calls";

type Filter = "all" | "missed";

const dayLabel = (time: string) => {
  const date = new Date(time);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, isThisYear(date) ? "EEEE, MMM d" : "MMM d, yyyy");
};

const Index = () => {
  const dispatch = useDispatch();
  const { userProfile } = useProfile();
  const currentUserId = userProfile?.id || userProfile?.uid || "";

  const [callsList, setCallsList] = useState<CallItem[]>([]);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [callingUser, setCallingUser] = useState<any>(null);

  useEffect(() => {
    if (!currentUserId) {
      setCallsList([]);
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    setHasError(false);
    return subscribeVideoCallHistory(
      currentUserId,
      calls => {
        setCallsList(calls);
        setIsLoading(false);
      },
      message => {
        // The cause, such as a missing Firestore index, is for the developer's console.
        // eslint-disable-next-line no-console
        console.error("[Calls] Could not load call history:", message);
        setHasError(true);
        setIsLoading(false);
      },
    );
  }, [currentUserId]);

  const missedCount = callsList.filter(isMissedCall).length;
  const groups = useMemo(() => {
    const shown = filter === "missed" ? callsList.filter(isMissedCall) : callsList;
    const byDay: { label: string; calls: CallItem[] }[] = [];
    [...shown]
      .sort((a, b) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime())
      .forEach(call => {
        const label = dayLabel(call.callDate);
        const group = byDay.find(item => item.label === label);
        if (group) group.calls.push(call);
        else byDay.push({ label, calls: [call] });
      });
    return byDay;
  }, [callsList, filter]);

  const onOpenChat = (call: CallItem) => {
    if (!call.peerUserId) return;
    dispatch(changeTab(TABS.CHAT));
    dispatch(getChatUserDetails(call.peerUserId));
    dispatch(readConversation(call.peerUserId));
    dispatch(getChatUserConversations(call.peerUserId));
    dispatch(changeSelectedChat(Number(call.peerUserId) || call.peerUserId));
  };

  const onCall = (call: CallItem) => {
    if (!call.peerUserId) return;
    setCallingUser({
      id: call.peerUserId,
      firstName: call.firstName,
      lastName: call.lastName,
      displayName: `${call.firstName} ${call.lastName}`.trim() || "User",
      profileImage: call.profileImage,
    });
  };

  return (
    <div className="calls-panel">
      <h4 className="calls-panel__title">Calls</h4>
      <div className="calls-panel__filter" role="tablist">
        {(["all", "missed"] as Filter[]).map(key => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={classnames({ "is-active": filter === key })}
            onClick={() => setFilter(key)}
          >
            {key === "all" ? "All" : "Missed"}
            {key === "missed" && missedCount > 0 && <span>{missedCount}</span>}
          </button>
        ))}
      </div>

      <AppSimpleBar className="calls-panel__list">
        {isLoading && (
          <div aria-label="Loading call history" role="status">
            {[0, 1, 2, 3].map(key => (
              <div key={key} className="calls-panel__skeleton">
                <i />
                <span>
                  <b />
                  <b />
                </span>
              </div>
            ))}
          </div>
        )}
        {!isLoading && hasError && (
          <div className="calls-panel__empty is-error" role="alert">
            <i className="bx bx-error-circle" />
            <strong>Could not load your calls</strong>
            Please try again in a little while.
          </div>
        )}
        {!isLoading && !hasError && groups.length === 0 && (
          <div className="calls-panel__empty">
            <i className={filter === "missed" ? "bx bx-check-circle" : "bx bx-video"} />
            <strong>{filter === "missed" ? "No missed calls" : "No calls yet"}</strong>
            {filter === "missed"
              ? "You've answered everything."
              : "Start a video call from any chat."}
          </div>
        )}
        {!isLoading &&
          !hasError &&
          groups.map(group => (
            <section key={group.label}>
              <h5 className="calls-panel__day">{group.label}</h5>
              <ul>
                {group.calls.map(call => (
                  <Call
                    key={String(call.callId)}
                    call={call}
                    onOpenChat={onOpenChat}
                    onCall={onCall}
                  />
                ))}
              </ul>
            </section>
          ))}
      </AppSimpleBar>

      {callingUser && (
        <VideoCallModal
          isOpen
          onClose={() => setCallingUser(null)}
          user={callingUser}
          currentUser={userProfile}
          direction="outgoing"
        />
      )}
    </div>
  );
};

export default Index;
