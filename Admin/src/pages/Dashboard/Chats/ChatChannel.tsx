import React from "react";
import { Link } from "react-router-dom";
import classnames from "classnames";

// interface
import { ChannelTypes } from "../../../data/chat";

interface ChannelProps {
  channel: ChannelTypes;
  selectedChat: string | number;
  onSelectChat: (id: number | string, isChannel?: boolean) => void;
}
const ChatChannel = ({ channel, selectedChat, onSelectChat }: ChannelProps) => {
  const unRead = channel.meta && channel.meta.unRead;
  const avatars = (channel.memberAvatars || []).filter(Boolean).slice(0, 3);
  const fallbackLetter = (channel.name || "#").trim().charAt(0).toUpperCase() || "#";
  const isSelectedChat: boolean =
    selectedChat && selectedChat === channel.id ? true : false;
  const onClick = () => {
    onSelectChat(channel.id, true);
  };

  return (
    <li className={classnames({ active: isSelectedChat })} onClick={onClick}>
      <Link to="#" className={classnames({ "unread-msg-user": unRead })}>
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0 avatar-xs me-2">
            {avatars.length > 0 ? (
              <div className="d-flex align-items-center">
                {avatars.map((src, index) => (
                  <img
                    key={`${channel.id}-avatar-${index}`}
                    src={src}
                    alt="member"
                    className="rounded-circle border border-light bg-light"
                    style={{
                      width: 20,
                      height: 20,
                      objectFit: "cover",
                      marginLeft: index === 0 ? 0 : -8,
                    }}
                  />
                ))}
              </div>
            ) : (
              <span className="avatar-title rounded-circle bg-soft-light text-dark">
                {fallbackLetter}
              </span>
            )}
          </div>
          <div className="flex-grow-1 overflow-hidden">
            <p className="text-truncate mb-0">{channel.name}</p>
          </div>
          {unRead && unRead !== 0 ? (
            <div className="flex-shrink-0 ms-2">
              <span className="badge badge-soft-dark rounded p-1">
                {unRead}
              </span>
            </div>
          ) : null}
        </div>
      </Link>
    </li>
  );
};

export default ChatChannel;
