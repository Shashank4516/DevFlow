import React from "react";
import { Link } from "react-router-dom";
import classnames from "classnames";

// interface
import { ChannelTypes } from "../../../data/chat";
import { ChatLastMessage, chatPreviewText, shortChatTime } from "./chatRow";

interface ChannelProps {
  channel: ChannelTypes;
  selectedChat: string | number;
  onSelectChat: (id: number | string, isChannel?: boolean) => void;
}
const ChatChannel = ({ channel, selectedChat, onSelectChat }: ChannelProps) => {
  const unRead = Number(channel.meta?.unRead || 0);
  const isSelectedChat = !!selectedChat && selectedChat === channel.id;
  const lastMessage: ChatLastMessage | undefined = (channel as any).lastMessage;
  const subtitle =
    chatPreviewText(lastMessage) || (channel as any).description || "Group chat";

  return (
    <li
      className={classnames("chat-row", { active: isSelectedChat, "is-unread": unRead > 0 })}
      onClick={() => onSelectChat(channel.id, true)}
    >
      <Link to="#" className="chat-row__link">
        <span className="chat-row__avatar">
          <span className="chat-row__initials chat-row__initials--channel">#</span>
        </span>
        <span className="chat-row__body">
          <span className="chat-row__top">
            <span className="chat-row__name">{channel.name}</span>
            <span className="chat-row__time">{shortChatTime(lastMessage?.time)}</span>
          </span>
          <span className="chat-row__bottom">
            <span className="chat-row__preview">{subtitle}</span>
            {unRead > 0 && <span className="chat-row__unread">{unRead}</span>}
          </span>
        </span>
      </Link>
    </li>
  );
};

export default ChatChannel;
