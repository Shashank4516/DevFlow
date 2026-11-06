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
      <h5 className="chat-section-title">Direct Messages</h5>

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
