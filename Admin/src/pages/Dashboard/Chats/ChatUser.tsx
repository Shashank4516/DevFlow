import React, { useState } from "react";
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

  const colors = [
    "bg-primary",
    "bg-danger",
    "bg-info",
    "bg-warning",
    "bg-secondary",
    "bg-pink",
    "bg-purple",
  ];
  const [color] = useState(Math.floor(Math.random() * colors.length));
  const isOnline = user.status && user.status === STATUS_TYPES.ACTIVE;
  const unRead = user.meta && user.meta.unRead;

  const isSelectedChat: boolean =
    selectedChat && selectedChat === user.id ? true : false;

  return (
    <li
      className={classnames({ active: isSelectedChat }, "chat-user-item")}
      style={{ position: "relative" }}
    >
      <Link
        to="#"
        className={classnames({ "unread-msg-user": unRead })}
        onClick={() => onSelectChat(user.id)}
      >
        <div className="d-flex align-items-center">
          <div
            className={classnames(
              "chat-user-img",
              "align-self-center",
              "me-2",
              "ms-0",
              { online: isOnline }
            )}
          >
            {user.profileImage ? (
              <>
                <img
                  src={user.profileImage}
                  className="rounded-circle avatar-xs"
                  alt=""
                />
                {isOnline && <span className="user-status"></span>}
              </>
            ) : (
              <div className="avatar-xs">
                <span
                  className={classnames(
                    "avatar-title",
                    "rounded-circle",
                    "text-uppercase",
                    "text-white",
                    colors[color]
                  )}
                >
                  <span className="username">{shortName}</span>
                  <span className="user-status"></span>
                </span>
              </div>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-truncate mb-0">{fullName}</p>
          </div>
          {unRead && unRead !== 0 ? (
            <div className="ms-auto">
              <span className="badge badge-soft-dark rounded p-1">
                {unRead}
              </span>
            </div>
          ) : null}
        </div>
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
