import React, {
  forwardRef,
  useEffect,
  useRef,
  useCallback,
  useState,
  useImperativeHandle,
} from "react";

// hooks
import { useRedux } from "../../../hooks/index";

// hooks
import { useProfile } from "../../../hooks";
import { createSelector } from "reselect";
// components
import AppSimpleBar from "../../../components/AppSimpleBar";
import Loader from "../../../components/Loader";
import Message from "./Message";
// import Day from "./Day";

// interface
import { MessagesTypes } from "../../../data/messages";
import ForwardModal from "../../../components/ForwardModal";

// actions
import { forwardMessage, deleteImage } from "../../../redux/actions";
export type ConversationHandle = {
  scrollToPinnedMessages: () => void;
};

interface ConversationProps {
  chatUserConversations: any;
  chatUserDetails: any;
  onDelete: (messageId: string | number) => any;
  onTogglePin: (messageId: string | number) => void;
  onSetReplyData: (reply: null | MessagesTypes | undefined) => void;
  isChannel: boolean;
  onAddBookmark: (message: MessagesTypes) => void;
}

const Conversation = forwardRef<ConversationHandle, ConversationProps>(function Conversation(
  {
  chatUserDetails,
  chatUserConversations,
  onDelete,
  onTogglePin,
  onSetReplyData,
  isChannel,
  onAddBookmark,
},
  ref,
) {
  // global store
  const { dispatch, useAppSelector } = useRedux();

  const { userProfile } = useProfile();

  const errorData = createSelector(
    (state : any) => state.Chats,
    (state) => ({
      getUserConversationsLoading: state.getUserConversationsLoading,
      isMessageForwarded: state.isMessageForwarded,
    })
  );
  // Inside your component
  const { getUserConversationsLoading,isMessageForwarded } = useAppSelector(errorData);

  const messages =
    chatUserConversations.messages && chatUserConversations.messages.length
      ? chatUserConversations.messages
      : [];
  const pinnedMessages = messages.filter((message: MessagesTypes) => message.isPinned);

  const pinnedWrapRef = useRef<HTMLDivElement | null>(null);

  const scrollRef = useRef<any>();

  useImperativeHandle(ref, () => ({
    scrollToPinnedMessages: () => {
      const el = pinnedWrapRef.current;
      if (!el) return;
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
  }));
  const shouldStickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);

  const getScrollHost = useCallback(() => {
    return scrollRef?.current?.getScrollElement?.() as HTMLElement | undefined;
  }, []);

  const isNearBottom = useCallback((el: HTMLElement, threshold = 100) => {
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= threshold;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const host = getScrollHost();
    if (!host) return;
    host.scrollTo({ top: host.scrollHeight, behavior });
  }, [getScrollHost]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.recalculate();
    }
  }, []);

  useEffect(() => {
    const host = getScrollHost();
    if (!host) return;

    const onScroll = () => {
      shouldStickToBottomRef.current = isNearBottom(host);
    };

    // Initialize from current viewport position.
    onScroll();
    host.addEventListener("scroll", onScroll);
    return () => {
      host.removeEventListener("scroll", onScroll);
    };
  }, [getScrollHost, isNearBottom]);

  useEffect(() => {
    if (!chatUserConversations.messages) return;
    if (scrollRef.current) {
      scrollRef.current.recalculate();
    }

    const currentCount = messages.length;
    const hasNewMessage = currentCount > previousMessageCountRef.current;
    const lastMessage = currentCount > 0 ? messages[currentCount - 1] : null;
    const myId = userProfile?.id ?? userProfile?.uid;
    const lastMessageFromMe =
      !!lastMessage && myId != null && String(lastMessage.meta.sender) === String(myId);

    if (
      previousMessageCountRef.current === 0 ||
      (hasNewMessage && (shouldStickToBottomRef.current || lastMessageFromMe))
    ) {
      scrollToBottom(previousMessageCountRef.current === 0 ? "auto" : "smooth");
    }

    previousMessageCountRef.current = currentCount;
  }, [chatUserConversations.messages, messages, scrollToBottom, userProfile?.id, userProfile?.uid]);

  /*
  forward message
  */
  const [forwardData, setForwardData] = useState<
    null | MessagesTypes | undefined
  >();
  const [isOpenForward, setIsOpenForward] = useState<boolean>(false);
  const onOpenForward = (message: MessagesTypes) => {
    setForwardData(message);
    setIsOpenForward(true);
  };
  const onCloseForward = () => {
    setIsOpenForward(false);
  };

  const onForwardMessage = (data: any) => {
    const params = {
      contacts: data.contacts,
      message: data.message,
      forwardedMessage: forwardData,
    };
    dispatch(forwardMessage(params));
  };
  useEffect(() => {
    if (isMessageForwarded) {
      setIsOpenForward(false);
    }
  }, [isMessageForwarded]);

  /*
  image delete
  */
  const onDeleteImage = (
    messageId: string | number,
    imageId: string | number
  ) => {
    dispatch(deleteImage(chatUserDetails.id, messageId, imageId));
  };
  return (
    <AppSimpleBar
      scrollRef={scrollRef}
      className="chat-conversation p-3 p-lg-4 positin-relative"
    >
      {getUserConversationsLoading && <Loader />}
      {pinnedMessages.length > 0 && (
        <div
          id="pinned-messages-anchor"
          ref={pinnedWrapRef}
          className="mb-3 pinned-messages-wrap"
          role="region"
          aria-label="Pinned messages"
        >
          <h6 className="text-uppercase text-muted font-size-11 mb-2">
            <i className="ri-pushpin-2-line me-1"></i>
            Pinned Messages
          </h6>
          <div className="d-flex flex-column gap-2">
            {pinnedMessages.map((message: MessagesTypes) => (
              <div key={`pin-${message.mId}`} className="border rounded px-3 py-2 bg-light-subtle">
                <div className="font-size-13 text-muted">#{message.mId}</div>
                <div className="font-size-13 text-truncate">
                  {message.text || (message.image?.length ? "Image message" : "Attachment message")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <ul
        className="list-unstyled chat-conversation-list"
        id="chat-conversation-list"
      >
        {(messages || []).map((message: MessagesTypes, key: number) => {
          const myId = userProfile?.id ?? userProfile?.uid;
          const isFromMe = myId != null && message.meta.sender + "" === myId + "";
          return (
            <Message
              message={message}
              key={key}
              chatUserDetails={chatUserDetails}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              onSetReplyData={onSetReplyData}
              isFromMe={isFromMe}
              onOpenForward={onOpenForward}
              isChannel={isChannel}
              onDeleteImage={onDeleteImage}
              onAddBookmark={onAddBookmark}
            />
          );
        })}
        {/*  <Day /> */}
      </ul>
      {isOpenForward && (
        <ForwardModal
          isOpen={isOpenForward}
          onClose={onCloseForward}
          forwardData={forwardData}
          chatUserDetails={chatUserDetails}
          onForward={onForwardMessage}
        />
      )}
    </AppSimpleBar>
  );
});

export default Conversation;
