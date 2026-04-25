import React, { useEffect, useState } from "react";
import classnames from "classnames";

// hooks
import { useRedux } from "../../hooks/index";

// hooks
import { useConversationUserType } from "../../hooks/index";
import { createSelector } from "reselect";
import { TABS } from "../../constants";
// component
import Leftbar from "./Leftbar";
import ConversationUser from "./ConversationUser/index";
import UserProfileDetails from "./UserProfileDetails/index";
import Welcome from "./ConversationUser/Welcome";
import KanbanBoard from "./Stack/KanbanBoard";
import VideoCallModal from "../../components/VideoCallModal";
import { useProfile } from "../../hooks";
import {
  IncomingVideoCall,
  subscribeToIncomingVideoCalls,
} from "../../helpers/webrtc_video_call";

interface IndexProps {}
const Index = (props: IndexProps) => {
  // global store
  const { useAppSelector } = useRedux();
  const { userProfile } = useProfile();
  const [incomingCall, setIncomingCall] = useState<IncomingVideoCall | null>(null);

  // const { selectedChat } = useAppSelector(state => ({
  //   selectedChat: state.Chats.selectedChat,
  // }));
  const errorData = createSelector(
    (state : any) => state.Chats,
    (state) => ({
      selectedChat: state.selectedChat,
    })
  );
  const layoutData = createSelector(
    (state: any) => state.Layout,
    (state) => ({
      activeTab: state.activeTab,
    })
  );
  // Inside your component
  const { selectedChat} = useAppSelector(errorData);
  const { activeTab } = useAppSelector(layoutData);


  const { isChannel } = useConversationUserType();
  const currentUserId = userProfile?.id || userProfile?.uid || "";

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToIncomingVideoCalls(
      currentUserId,
      call => {
        setIncomingCall(prev => prev || call);
      },
      message => {
        // eslint-disable-next-line no-console
        console.error("[VideoCall] incoming listener error:", message);
      },
    );
    return unsubscribe;
  }, [currentUserId]);

  return (
    <>
      <Leftbar />

      <div
        className={classnames("user-chat", "w-100", "overflow-hidden", {
          "user-chat-show": selectedChat,
        })}
        id="user-chat"
      >
        <div className="user-chat-overlay" id="user-chat-overlay"></div>
        {activeTab === TABS.STACK ? (
          <div className="tm-main-wrapper">
            <KanbanBoard />
          </div>
        ) : selectedChat !== null ? (
          <div className="chat-content d-lg-flex">
            <div className="w-100 overflow-hidden position-relative">
              <ConversationUser isChannel={isChannel} />
            </div>
            <UserProfileDetails isChannel={isChannel} />
          </div>
        ) : (
          <Welcome />
        )}
      </div>
      {incomingCall && (
        <VideoCallModal
          isOpen={!!incomingCall}
          onClose={() => setIncomingCall(null)}
          user={incomingCall.caller}
          currentUser={userProfile}
          direction="incoming"
          incomingCall={incomingCall}
        />
      )}
    </>
  );
};

export default Index;
