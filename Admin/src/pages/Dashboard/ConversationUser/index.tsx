import React, { useEffect, useMemo, useRef, useState } from "react";

import { useRedux } from "../../../hooks/index";
import { createSelector } from "reselect";
import {
  toggleUserDetailsTab,
  deleteMessage,
  deleteUserMessages,
  toggleArchiveContact,
  setChatUserConversations,
  createBookmark,
  getChannels,
  getDirectMessages,
  getFavourites,
} from "../../../redux/actions";

import { useProfile } from "../../../hooks";
import { isDemoMode } from "../../../demo";

import UserHead from "./UserHead";
import Conversation, { TypingUser } from "./Conversation";
import ChatInputSection from "./ChatInputSection/index";

import { MessagesTypes } from "../../../data/messages";
import {
  isChatPeerMuted,
  toggleMuteChatPeer,
} from "../../../helpers/chatMute";
import { showSuccessNotification } from "../../../helpers/notifications";
import {
  getChatUserConversations as getChatUserConversationsApi,
  sendMessage as sendMessageApi,
  uploadMessageAttachment,
  getChannelMessages as getChannelMessagesApi,
  sendChannelMessage as sendChannelMessageApi,
  toggleMessagePin as toggleMessagePinApi,
  toggleChannelMessagePin as toggleChannelMessagePinApi,
} from "../../../api/chats";

interface IndexProps {
  isChannel: boolean;
}

// Often enough in the demo for its typing bubble to appear promptly.
const POLL_MS = isDemoMode ? 700 : 2000;

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
  const lastCountRef = useRef<{ chat: string | null; count: number }>({ chat: null, count: 0 });
  const [chatError, setChatError] = useState<string | null>(null);
  const [peerMutedNotify, setPeerMutedNotify] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

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

  const pinnedMessages = useMemo(() => {
    const msgs = chatUserConversations?.messages;
    if (!Array.isArray(msgs)) return [];
    return msgs.filter((m: MessagesTypes) => m.isPinned);
  }, [chatUserConversations?.messages]);

  const conversationId = useMemo(() => {
    if (isChannel) {
      if (!peerIdStr) return null;
      return `channel_${peerIdStr}`;
    }
    if (!myUid || !peerIdStr) return null;
    return `dm_${[myUid, peerIdStr].sort().join("__")}`;
  }, [isChannel, myUid, peerIdStr]);

  const [replyData, setReplyData] = useState<
    null | MessagesTypes | undefined
  >();
  const onSetReplyData = (reply: null | MessagesTypes | undefined) => {
    setReplyData(reply);
  };

  const onSend = async (data: any) => {
    if (!conversationId || !myUid || !peerIdStr) return;
    const text = String(data?.text || "").trim();
    const attachments: Array<any> = [];

    try {
      for (const image of data?.images || []) {
        const uploaded: any = await uploadMessageAttachment({
          file: image,
          kind: "image",
          name: image.name,
        });
        if (uploaded?.attachment) attachments.push(uploaded.attachment);
      }

      for (const file of data?.files || []) {
        const uploaded: any = await uploadMessageAttachment({
          file,
          kind: "file",
          name: file.name,
        });
        if (uploaded?.attachment) attachments.push(uploaded.attachment);
      }

      if (data?.voice?.blob) {
        const uploaded: any = await uploadMessageAttachment({
          file: data.voice.blob,
          kind: "voice",
          name: `voice-message-${Date.now()}.webm`,
          duration: data.voice.duration,
        });
        if (uploaded?.attachment) attachments.push(uploaded.attachment);
      }

      if (!text && attachments.length === 0) return;
      if (isChannel) {
        await sendChannelMessageApi({
          channel_id: peerIdStr,
          text,
          attachments,
        });
      } else {
        await sendMessageApi({
          to_user_id: peerIdStr,
          text,
          attachments,
        });
      }
      setChatError(null);
      setReplyData(null);
      await loadMessages();
    } catch (e: any) {
      const msg = e?.message || "Failed to send message";
      setChatError(msg);
      // Also surface immediately since users expect feedback on send.
      // eslint-disable-next-line no-alert
      alert(msg);
      throw e;
    }
  };

  const loadMessages = async () => {
    if (!conversationId || !myUid || !peerIdStr) return;
    try {
      const data: any = isChannel
        ? await getChannelMessagesApi(peerIdStr)
        : await getChatUserConversationsApi(peerIdStr);
      // A new message changes this chat's preview and time in the list.
      const count = Array.isArray(data?.messages) ? data.messages.length : 0;
      const known = lastCountRef.current;
      lastCountRef.current = { chat: conversationId, count };
      if (known.chat === conversationId && count > known.count) {
        dispatch(isChannel ? getChannels() : getDirectMessages());
        if (!isChannel) dispatch(getFavourites());
      }
      dispatch(
        setChatUserConversations({
          conversationId: data?.conversationId || conversationId,
          userId: peerIdStr,
          messages: Array.isArray(data?.messages) ? data.messages : [],
        }),
      );
      // Optional in the response. Nothing shows until the backend sends it.
      setTypingUsers(Array.isArray(data?.typing) ? data.typing : []);
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
    setTypingUsers([]);
    loadMessages();

    pollRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMessages();
      }
    }, POLL_MS);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, myUid, peerIdStr, isChannel]);

  useEffect(() => {
    setPeerMutedNotify(isChatPeerMuted(peerIdStr));
  }, [peerIdStr]);

  const onDeleteMessage = (messageId: string | number) => {
    dispatch(deleteMessage(chatUserDetails.id, messageId));
  };

  const onTogglePinMessage = async (messageId: string | number) => {
    if (!peerIdStr) return;
    const existingMessages = Array.isArray(chatUserConversations?.messages)
      ? chatUserConversations.messages
      : [];
    const previous = existingMessages.find(
      (message: MessagesTypes) => String(message.mId) === String(messageId),
    );
    const nextPinned = !previous?.isPinned;

    // Optimistically reflect pin state so user sees it instantly.
    dispatch(
      setChatUserConversations({
        ...chatUserConversations,
        messages: existingMessages.map((message: MessagesTypes) =>
          String(message.mId) === String(messageId)
            ? {
                ...message,
                isPinned: nextPinned,
                pinnedAt: nextPinned ? new Date().toISOString() : null,
              }
            : message,
        ),
      }),
    );

    try {
      if (isChannel) {
        await toggleChannelMessagePinApi({
          channel_id: peerIdStr,
          message_id: messageId,
        });
      } else {
        await toggleMessagePinApi({
          with_user_id: peerIdStr,
          message_id: messageId,
        });
      }
      await loadMessages();
    } catch (e: any) {
      // Roll back optimistic update if server rejects toggle.
      dispatch(
        setChatUserConversations({
          ...chatUserConversations,
          messages: existingMessages,
        }),
      );
      const msg = e?.message || "Failed to toggle pin";
      setChatError(msg);
      // eslint-disable-next-line no-alert
      alert(msg);
    }
  };

  const onDeleteUserMessages = () => {
    if (chatUserDetails?.id == null) return;
    // eslint-disable-next-line no-alert
    if (
      !window.confirm(
        "Delete all messages in this chat from your device? This cannot be undone.",
      )
    ) {
      return;
    }
    dispatch(deleteUserMessages(chatUserDetails.id));
  };

  const onToggleArchive = () => {
    dispatch(toggleArchiveContact(chatUserDetails.id));
  };

  const onToggleMute = () => {
    if (!peerIdStr) return;
    const next = toggleMuteChatPeer(peerIdStr);
    setPeerMutedNotify(next);
    showSuccessNotification(
      next
        ? "Notifications muted for this chat"
        : "Notifications unmuted for this chat",
    );
  };

  const onAddBookmarkFromMessage = (message: MessagesTypes) => {
    const attachments = Array.isArray(message.attachments)
      ? message.attachments
      : [];
    const firstFile = attachments.find((a: any) => (a?.type || "file") !== "voice");
    if (!firstFile) return;

    dispatch(
      createBookmark({
        icon: "bx bx-file",
        title: firstFile.name || `File from message #${message.mId}`,
        desc:
          firstFile.downloadLink ||
          firstFile.desc ||
          `Saved from chat message #${message.mId}`,
      })
    );
  };

  return (
    <>
      <UserHead
        chatUserDetails={chatUserDetails}
        currentUser={userProfile}
        pinnedMessages={pinnedMessages}
        onTogglePinMessage={onTogglePinMessage}
        onOpenUserDetails={onOpenUserDetails}
        onDelete={onDeleteUserMessages}
        isChannel={isChannel}
        onToggleArchive={onToggleArchive}
        isMuted={peerMutedNotify}
        onToggleMute={onToggleMute}
      />
      <Conversation
        typingUsers={typingUsers}
        chatUserConversations={chatUserConversations}
        chatUserDetails={chatUserDetails}
        onDelete={onDeleteMessage}
        onTogglePin={onTogglePinMessage}
        onSetReplyData={onSetReplyData}
        isChannel={isChannel}
        onAddBookmark={onAddBookmarkFromMessage}
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
