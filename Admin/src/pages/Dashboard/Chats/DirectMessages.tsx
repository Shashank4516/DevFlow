import React from "react";

// interface
import { UserTypes } from "../../../data/chat";

// component
import ChatUser from "./ChatUser";

interface DirectMessagesProps {
  users: Array<UserTypes>;
  selectedChat: string | number;
  onSelectChat: (id: number | string) => void;
  onToggleFavourite: (id: number | string) => void;
  favouriteIds: Set<string>;
}

const DirectMessages = ({
  users,
  selectedChat,
  onSelectChat,
  onToggleFavourite,
  favouriteIds,
}: DirectMessagesProps) => {
  return (
    <>
      <div className="d-flex align-items-center px-4 mt-5 mb-2">
        <div className="flex-grow-1">
          <h4 className="mb-0 font-size-11 text-muted text-uppercase">
            Direct Messages
          </h4>
        </div>
      </div>

      <div className="chat-message-list">
        <ul className="list-unstyled chat-list chat-user-list">
          {(users || []).map((user: UserTypes, key: number) => (
            <ChatUser
              user={user}
              key={key}
              selectedChat={selectedChat}
              onSelectChat={onSelectChat}
              onToggleFavourite={onToggleFavourite}
              isFavourite={favouriteIds.has(String(user.id))}
            />
          ))}
        </ul>
      </div>
    </>
  );
};

export default DirectMessages;
