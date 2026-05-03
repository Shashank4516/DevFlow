import React, { useEffect, useState } from "react";

// hooks
import { useProfile } from "../../../hooks";
// components
import AppSimpleBar from "../../../components/AppSimpleBar";
import LeftbarTitle from "../../../components/LeftbarTitle";
import Call from "./Call";

import { subscribeVideoCallHistory } from "../../../helpers/webrtc_video_call";

// interface
import { CallItem } from "../../../data/calls";

interface IndexProps {}
const Index = (props: IndexProps) => {
  const { userProfile } = useProfile();
  const currentUserId = userProfile?.id || userProfile?.uid || "";

  const [callsList, setCallsList] = useState<CallItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) {
      setCallsList([]);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    const unsubscribe = subscribeVideoCallHistory(
      currentUserId,
      calls => {
        setCallsList(calls);
        setHistoryLoading(false);
      },
      message => {
        setHistoryError(message);
        setHistoryLoading(false);
      },
    );
    return unsubscribe;
  }, [currentUserId]);

  return (
    <div className="position-relative">
      <LeftbarTitle title="Calls" />
      {historyLoading && (
        <div className="px-4 py-2 text-muted font-size-13">Loading call history…</div>
      )}
      {historyError && !historyLoading && (
        <div className="px-4 py-2 text-danger font-size-13">
          {historyError}
          <div className="text-muted small mt-1">
            Create the Firestore composite index suggested in the browser console (or deploy{" "}
            <code className="small">Admin/firestore.indexes.json</code>).
          </div>
        </div>
      )}
      {!historyLoading && !historyError && callsList.length === 0 && (
        <div className="px-4 py-3 text-muted font-size-13">No video calls yet.</div>
      )}

      {/* Start contact lists */}
      <AppSimpleBar className="chat-message-list chat-call-list">
        <ul className="list-unstyled chat-list">
          {callsList.map(call => (
            <Call call={call} key={String(call.callId)} currentUser={userProfile} />
          ))}
        </ul>
      </AppSimpleBar>
      {/* end contact lists */}
    </div>
  );
};

export default Index;
