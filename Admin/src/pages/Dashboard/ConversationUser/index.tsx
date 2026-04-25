import React, { useEffect, useMemo, useRef } from "react";

import { useRedux } from "../../../hooks/index";
import { createSelector } from "reselect";
import {
  toggleUserDetailsTab,
  deleteMessage,
  deleteUserMessages,
  toggleArchiveContact,
  setChatUserConversations,
} from "../../../redux/actions";

import { useProfile } from "../../../hooks";

import UserHead from "./UserHead";
import Conversation from "./Conversation";
import ChatInputSection from "./ChatInputSection/index";

import { MessagesTypes } from "../../../data/messages";
import { pinnedTabs } from "../../../data/index";
import { useState } from "react";
import {
  getChatUserConversations as getChatUserConversationsApi,
  sendMessage as sendMessageApi,
} from "../../../api/chats";

interface IndexProps {
  isChannel: boolean;
}

const Index = ({ isChannel }: IndexProps) => {
  const { dispatch, useAppSelector } = useRedux();

  const errorData = createSelector(
    (state: any) => state.Chats,
    state => ({
      chatUserDetails: state.chatUserDetails,
      chatUserConversations: state.chatUserConversations,
      isUserMessageSent: state.isUserMessageSent,
      isMessageDeleted: state.isMessageDeleted,
      isMessageForwarded: state.isMessageForwarded,
      isUserMessagesDeleted: state.isUserMessagesDeleted,
      isImageDeleted: state.isImageDeleted,
    }),
  );

  const { chatUserDetails, chatUserConversations } = useAppSelector(errorData);

  const onOpenUserDetails = () => {
    dispatch(toggleUserDetailsTab(true));
  };

  const { userProfile } = useProfile();

  const pollRef = useRef<number | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  // IMPORTANT: use stable MySQL numeric ids for Firestore conversation ids.
  // Firebase auth uid can differ per login method and will cause each side
  // to talk in a different room.
  const myUid = useMemo(
    () => String(userProfile?.id || userProfile?.uid || ""),
    [userProfile?.id, userProfile?.uid],
  );

  const peerIdStr = useMemo(
    () => String(chatUserDetails?.id || chatUserDetails?.uid || ""),
    [chatUserDetails?.id, chatUserDetails?.uid],
  );

  const conversationId = useMemo(() => {
    if (isChannel || !myUid || !peerIdStr) return null;
    return `dm_${[myUid, peerIdStr].sort().join("__")}`;
  }, [isChannel, myUid, peerIdStr]);

  const [replyData, setReplyData] = useState<
    null | MessagesTypes | undefined
  >();
  const onSetReplyData = (reply: null | MessagesTypes | undefined) => {
    setReplyData(reply);
  };

  const onSend = (data: any) => {
    if (!data?.text || !conversationId || !myUid || !peerIdStr) return;
    const text = String(data.text).trim();
    if (!text) return;

    sendMessageApi({ to_user_id: peerIdStr, text }).catch((e: any) => {
      const msg = e?.message || "Failed to send message";
      setChatError(msg);
      // Also surface immediately since users expect feedback on send.
      // eslint-disable-next-line no-alert
      alert(msg);
    });
    setChatError(null);
    setReplyData(null);
  };

  const loadMessages = async () => {
    if (!conversationId || !myUid || !peerIdStr) return;
    try {
      const data: any = await getChatUserConversationsApi(peerIdStr);
      dispatch(
        setChatUserConversations({
          conversationId: data?.conversationId || conversationId,
          userId: peerIdStr,
          messages: Array.isArray(data?.messages) ? data.messages : [],
        }),
      );
      setChatError(null);
    } catch (e: any) {
      setChatError(e?.message || String(e) || "Failed to load messages");
    }
  };

  // Poll backend for conversation updates.
  useEffect(() => {
    if (!conversationId || !myUid || !peerIdStr) return;

    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setChatError(null);
    loadMessages();

    pollRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMessages();
      }
    }, 2000);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myUid, peerIdStr]);

  const onDeleteMessage = (messageId: string | number) => {
    dispatch(deleteMessage(chatUserDetails.id, messageId));
  };

  const onDeleteUserMessages = () => {
    dispatch(deleteUserMessages(chatUserDetails.id));
  };

  const onToggleArchive = () => {
    dispatch(toggleArchiveContact(chatUserDetails.id));
  };

  return (
    <>
      <UserHead
        chatUserDetails={chatUserDetails}
        currentUser={userProfile}
        pinnedTabs={pinnedTabs}
        onOpenUserDetails={onOpenUserDetails}
        onDelete={onDeleteUserMessages}
        isChannel={isChannel}
        onToggleArchive={onToggleArchive}
      />
      <Conversation
        chatUserConversations={chatUserConversations}
        chatUserDetails={chatUserDetails}
        onDelete={onDeleteMessage}
        onSetReplyData={onSetReplyData}
        isChannel={isChannel}
      />
      <ChatInputSection
        onSend={onSend}
        replyData={replyData}
        onSetReplyData={onSetReplyData}
        chatUserDetails={chatUserDetails}
        disabled={!!chatError}
        disabledReason={chatError || undefined}
      />
    </>
  );
};

export default Index;
