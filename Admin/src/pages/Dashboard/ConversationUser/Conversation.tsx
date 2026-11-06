import React, { useEffect, useLayoutEffect, useRef, useCallback, useState } from "react";
import { differenceInCalendarDays, format, isToday, isYesterday } from "date-fns";

// hooks
import { useRedux } from "../../../hooks/index";

// hooks
import { useProfile } from "../../../hooks";
import { createSelector } from "reselect";
// components
import AppSimpleBar from "../../../components/AppSimpleBar";
import Loader from "../../../components/Loader";
import Message from "./Message";
import { isChatPeerMuted } from "../../../helpers/chatMute";
import { playReceiveSound, playSendSound } from "../../../helpers/chatSounds";
import imagePlaceholder from "../../../assets/images/users/user-dummy-img.jpg";
import {
  animateMessageIn,
  animateTypingIn,
  settleList,
  slideListUp,
} from "./messageAnimations";
// import Day from "./Day";

// interface
import { MessagesTypes } from "../../../data/messages";
import ForwardModal from "../../../components/ForwardModal";

// actions
import { forwardMessage, deleteImage } from "../../../redux/actions";
/** Like iMessage: a new time label and bubble group after an hour of silence. */
const TIME_LABEL_GAP_MS = 60 * 60 * 1000;

const formatTimeLabel = (time: string | number | Date) => {
  const date = new Date(time);
  if (isToday(date)) return `Today ${format(date, "h:mm a")}`;
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  if (differenceInCalendarDays(new Date(), date) < 7) {
    return format(date, "EEEE h:mm a");
  }
  return format(date, "MMM d, h:mm a");
};

const gapIsLong = (earlier?: MessagesTypes, later?: MessagesTypes) =>
  !earlier ||
  !later ||
  new Date(later.time).getTime() - new Date(earlier.time).getTime() >= TIME_LABEL_GAP_MS;

export type TypingUser = {
  id: string | number;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
};

/** The three pulsing dots, in a bubble with iMessage's two little tail circles. */
const TypingIndicator = ({ user, showSender }: { user: TypingUser; showSender: boolean }) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (bubbleRef.current) animateTypingIn(bubbleRef.current);
  }, []);
  const name = `${user.firstName} ${user.lastName}`.trim();
  return (
    <li className="imsg-typing-row" aria-live="polite">
      <div className="conversation-list">
        {showSender && (
          <div className="chat-avatar">
            <img src={user.profileImage || imagePlaceholder} alt="" />
          </div>
        )}
        <div className="user-chat-content">
          {showSender && <div className="imsg-sender">{name}</div>}
          <div ref={bubbleRef} className="imsg-typing" role="status" aria-label={`${name} is typing`}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </li>
  );
};

interface ConversationProps {
  typingUsers?: TypingUser[];
  chatUserConversations: any;
  chatUserDetails: any;
  onDelete: (messageId: string | number) => any;
  onTogglePin: (messageId: string | number) => void;
  onSetReplyData: (reply: null | MessagesTypes | undefined) => void;
  isChannel: boolean;
  onAddBookmark: (message: MessagesTypes) => void;
}
const Conversation = ({
  typingUsers = [],
  chatUserDetails,
  chatUserConversations,
  onDelete,
  onTogglePin,
  onSetReplyData,
  isChannel,
  onAddBookmark,
}: ConversationProps) => {
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

  // Only messages that arrive while a chat is open animate. Everything present when
  // the chat first loads (or when switching chats) is marked as already seen.
  const seenMessagesRef = useRef<{ chatId: unknown; ids: Set<unknown> }>({
    chatId: null,
    ids: new Set(),
  });
  const listRef = useRef<HTMLUListElement>(null);
  // New messages from this render, plus where the last old row sat on screen before
  // React updated the DOM, so the layout effect can spring the list from that spot.
  const pendingEntranceRef = useRef<{
    messages: MessagesTypes[];
    anchor: Element | null;
    anchorTop: number;
  } | null>(null);
  const entranceHandledRef = useRef(false);
  const chatId = chatUserConversations.userId ?? null;
  if (seenMessagesRef.current.chatId !== chatId || seenMessagesRef.current.ids.size === 0) {
    seenMessagesRef.current = {
      chatId,
      ids: new Set(messages.map((m: MessagesTypes) => m.mId)),
    };
  } else {
    const arrived = messages.filter(
      (m: MessagesTypes) => !seenMessagesRef.current.ids.has(m.mId),
    );
    if (arrived.length) {
      arrived.forEach((m: MessagesTypes) => seenMessagesRef.current.ids.add(m.mId));
      const anchor = listRef.current?.querySelector("li.chat-list:last-of-type") ?? null;
      pendingEntranceRef.current = {
        messages: arrived,
        anchor,
        anchorTop: anchor?.getBoundingClientRect().top ?? 0,
      };
    }
  }

  const myUserId = userProfile?.id ?? userProfile?.uid;
  const isMine = (message?: MessagesTypes) =>
    !!message && myUserId != null && message.meta.sender + "" === myUserId + "";
  const lastMineIndex = messages.reduce(
    (last: number, message: MessagesTypes, index: number) => (isMine(message) ? index : last),
    -1,
  );

  const ref = useRef<any>();
  const shouldStickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);

  const getScrollHost = useCallback(() => {
    return ref?.current?.getScrollElement?.() as HTMLElement | undefined;
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
    if (ref && ref.current) {
      ref.current.recalculate();
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

  // Runs before the browser paints, so the new row never flashes in its final spot.
  useLayoutEffect(() => {
    const pending = pendingEntranceRef.current;
    pendingEntranceRef.current = null;
    const host = getScrollHost();
    const list = listRef.current;
    if (!pending || !host || !list) return;

    const newest = pending.messages[pending.messages.length - 1];

    // Plays even if someone has scrolled up, as the message has still arrived.
    if (isMine(newest)) playSendSound();
    else if (!isChatPeerMuted(chatId)) playReceiveSound();

    if (!shouldStickToBottomRef.current && !isMine(newest)) return;

    // Jump to the final position, then animate from where things visibly were.
    settleList(list);
    host.scrollTop = host.scrollHeight;
    const anchorMoved = pending.anchor
      ? pending.anchorTop - pending.anchor.getBoundingClientRect().top
      : 0;

    pending.messages.forEach(message => {
      const row = list.querySelector<HTMLElement>(
        `li[data-mid="${CSS.escape(String(message.mId))}"]`,
      );
      if (row) animateMessageIn(row, isMine(message));
    });
    entranceHandledRef.current = true;
    slideListUp(list, anchorMoved, () => {
      // The offset briefly inflates the scroll height, which reads as "scrolled up".
      shouldStickToBottomRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Keeps the typing bubble in view, unless someone has scrolled up to read.
  const isSomeoneTyping = typingUsers.length > 0;
  useEffect(() => {
    if (isSomeoneTyping && shouldStickToBottomRef.current) scrollToBottom("smooth");
  }, [isSomeoneTyping, scrollToBottom]);

  useEffect(() => {
    if (!chatUserConversations.messages) return;
    if (ref?.current) {
      ref.current.recalculate();
    }

    const currentCount = messages.length;
    const hasNewMessage = currentCount > previousMessageCountRef.current;
    const lastMessage = currentCount > 0 ? messages[currentCount - 1] : null;
    const myId = userProfile?.id ?? userProfile?.uid;
    const lastMessageFromMe =
      !!lastMessage && myId != null && String(lastMessage.meta.sender) === String(myId);

    const entranceHandled = entranceHandledRef.current;
    entranceHandledRef.current = false;
    if (
      !entranceHandled &&
      (previousMessageCountRef.current === 0 ||
        (hasNewMessage && (shouldStickToBottomRef.current || lastMessageFromMe)))
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
      scrollRef={ref}
      className="chat-conversation p-3 p-lg-4 positin-relative"
    >
      {getUserConversationsLoading && <Loader />}
      {pinnedMessages.length > 0 && (
        <div className="mb-3 pinned-messages-wrap">
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
        ref={listRef}
        className="list-unstyled chat-conversation-list"
        id="chat-conversation-list"
      >
        {(messages || []).map((message: MessagesTypes, index: number) => {
          const previous: MessagesTypes | undefined = messages[index - 1];
          const next: MessagesTypes | undefined = messages[index + 1];
          const showTimeLabel = gapIsLong(previous, message);
          return (
            <React.Fragment key={message.mId}>
              {showTimeLabel && (
                <li className="imsg-time-label">{formatTimeLabel(message.time)}</li>
              )}
              <Message
                message={message}
                chatUserDetails={chatUserDetails}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                onSetReplyData={onSetReplyData}
                isFromMe={isMine(message)}
                onOpenForward={onOpenForward}
                isChannel={isChannel}
                onDeleteImage={onDeleteImage}
                onAddBookmark={onAddBookmark}
                isGroupStart={
                  showTimeLabel || previous?.meta.sender !== message.meta.sender
                }
                isGroupEnd={
                  !next ||
                  next.meta.sender !== message.meta.sender ||
                  gapIsLong(message, next)
                }
                isLatestFromMe={index === lastMineIndex}
              />
            </React.Fragment>
          );
        })}
        {typingUsers[0] && <TypingIndicator user={typingUsers[0]} showSender={isChannel} />}
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
};

export default Conversation;
