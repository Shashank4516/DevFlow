import React, { useCallback, useEffect, useState } from "react";
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
import Github from "./Github/index";
import VideoCallModal from "../../components/VideoCallModal";
import GroupVideoCallModal from "../../components/GroupVideoCallModal";
import FriendSearchPanel from "../../components/FriendSearchPanel";
import { toggleUserDetailsTab } from "../../redux/actions";
import { useProfile } from "../../hooks";
import {
  IncomingVideoCall,
  IncomingGroupVideoCall,
  subscribeToIncomingVideoCalls,
  subscribeToIncomingGroupVideoCalls,
} from "../../helpers/webrtc_video_call";

interface IndexProps {}
const Index = (props: IndexProps) => {
  // global store
  const { dispatch, useAppSelector } = useRedux();
  const { userProfile } = useProfile();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingVideoCall | null>(null);
  const [incomingGroupCall, setIncomingGroupCall] = useState<IncomingGroupVideoCall | null>(null);

  // const { selectedChat } = useAppSelector(state => ({
  //   selectedChat: state.Chats.selectedChat,
  // }));
  const errorData = createSelector(
    (state : any) => state.Chats,
    (state) => ({
      selectedChat: state.selectedChat,
      isOpenUserDetails: state.isOpenUserDetails,
    })
  );
  const layoutData = createSelector(
    (state: any) => state.Layout,
    (state) => ({
      activeTab: state.activeTab,
    })
  );
  // Inside your component
  const { selectedChat, isOpenUserDetails } = useAppSelector(errorData);
  const { activeTab } = useAppSelector(layoutData);


  const { isChannel } = useConversationUserType();
  const currentUserId = userProfile?.id || userProfile?.uid || "";

  const onCloseSearch = useCallback(() => setIsSearchOpen(false), []);
  const onOpenSearch = () => {
    // Both panels live on the right, so only one is open at a time.
    dispatch(toggleUserDetailsTab(false));
    setIsSearchOpen(true);
  };
  useEffect(() => {
    if (isOpenUserDetails) setIsSearchOpen(false);
  }, [isOpenUserDetails]);
  useEffect(() => {
    if (activeTab === TABS.STACK || activeTab === TABS.GITHUB) setIsSearchOpen(false);
  }, [activeTab]);

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

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToIncomingGroupVideoCalls(
      currentUserId,
      call => {
        setIncomingGroupCall(prev => prev || call);
      },
      message => {
        // eslint-disable-next-line no-console
        console.error("[GroupVideoCall] incoming listener error:", message);
      },
    );
    return unsubscribe;
  }, [currentUserId]);

  return (
    <>
      <Leftbar onOpenSearch={onOpenSearch} />

      <div
        className={classnames("user-chat", "w-100", "overflow-hidden", {
          // GitHub has no left sidebar, so its pane must stay visible on small screens.
          "user-chat-show": selectedChat || activeTab === TABS.GITHUB,
          "user-chat--github": activeTab === TABS.GITHUB,
          "is-search-open": isSearchOpen,
        })}
        id="user-chat"
      >
        <div className="user-chat-overlay" id="user-chat-overlay"></div>
        {activeTab === TABS.STACK ? (
          <div className="tm-main-wrapper">
            <KanbanBoard />
          </div>
        ) : activeTab === TABS.GITHUB ? (
          <Github />
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
      <FriendSearchPanel isOpen={isSearchOpen} onClose={onCloseSearch} />
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
      {incomingGroupCall && (
        <GroupVideoCallModal
          isOpen={!!incomingGroupCall}
          onClose={() => setIncomingGroupCall(null)}
          channel={null}
          currentUser={userProfile}
          direction="incoming"
          incomingCall={incomingGroupCall}
        />
      )}
    </>
  );
};

export default Index;
