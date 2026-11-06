import React from "react";
import { Link } from "react-router-dom";
import classnames from "classnames";
import {
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";

// interface
import { UserTypes } from "../../../data/chat";
import { STATUS_TYPES } from "../../../constants";
import { ChatLastMessage, chatPreviewText, shortChatTime } from "./chatRow";

interface ChatUserProps {
  user: UserTypes;
  selectedChat: string | number;
  onSelectChat: (id: number | string) => void;
  onToggleFavourite?: (id: number | string) => void;
  isFavourite?: boolean;
}

const ChatUser = ({
  user,
  selectedChat,
  onSelectChat,
  onToggleFavourite,
  isFavourite = false,
}: ChatUserProps) => {
  const fullName = `${user.firstName} ${user.lastName}`;
  const shortName = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;

  const isOnline = user.status === STATUS_TYPES.ACTIVE;
  const unRead = Number(user.meta?.unRead || 0);
  const isSelectedChat = !!selectedChat && selectedChat === user.id;

  const lastMessage: ChatLastMessage | undefined = (user as any).lastMessage;
  const subtitle = chatPreviewText(lastMessage) || user.status || "Offline";

  return (
    <li
      className={classnames("chat-user-item chat-row", {
        active: isSelectedChat,
        "is-unread": unRead > 0,
      })}
    >
      <Link to="#" className="chat-row__link" onClick={() => onSelectChat(user.id)}>
        <span className="chat-row__avatar">
          {user.profileImage ? (
            <img src={user.profileImage} alt="" />
          ) : (
            <span className="chat-row__initials">{shortName.toUpperCase()}</span>
          )}
          {isOnline && <span className="chat-row__online" aria-label="Online" />}
        </span>
        <span className="chat-row__body">
          <span className="chat-row__top">
            <span className="chat-row__name">{fullName}</span>
            <span className="chat-row__time">{shortChatTime(lastMessage?.time)}</span>
          </span>
          <span className="chat-row__bottom">
            <span className="chat-row__preview">{subtitle}</span>
            {unRead > 0 && <span className="chat-row__unread">{unRead}</span>}
          </span>
        </span>
      </Link>

      {/* 3-dot context menu — only rendered when a favourite handler is provided */}
      {onToggleFavourite && (
        <UncontrolledDropdown className="chat-user-menu">
          <DropdownToggle
            tag="button"
            className="btn btn-ghost-secondary btn-icon btn-sm"
            onClick={e => e.stopPropagation()}
          >
            <i className="bx bx-dots-vertical-rounded" />
          </DropdownToggle>
          <DropdownMenu end>
            <DropdownItem
              onClick={e => {
                e.stopPropagation();
                onToggleFavourite(user.id);
              }}
            >
              <i
                className={classnames(
                  "me-2",
                  isFavourite ? "bx bxs-star text-warning" : "bx bx-star"
                )}
              />
              {isFavourite ? "Remove from Favourites" : "Add to Favourites"}
            </DropdownItem>
          </DropdownMenu>
        </UncontrolledDropdown>
      )}
    </li>
  );
};

export default ChatUser;
