import React from "react";
import { UncontrolledTooltip } from "reactstrap";

// interface
import { ChannelTypes } from "../../../data/chat";

// components
import ChatChannel from "./ChatChannel";

interface ChanelsProps {
  channels: Array<ChannelTypes>;
  openCreateChannel: () => void;
  selectedChat: string | number;
  onSelectChat: (id: number | string, isChannel?: boolean) => void;
}
const Chanels = ({
  channels,
  openCreateChannel,
  selectedChat,
  onSelectChat,
}: ChanelsProps) => {
  return (
    <>
      <div className="chat-section-title chat-section-title--action">
        <span>Channels</span>
        <button
          type="button"
          id="create-group"
          className="chat-section-add"
          aria-label="Create group"
          onClick={openCreateChannel}
        >
          <i className="bx bx-plus" />
        </button>
        <UncontrolledTooltip target="create-group" placement="bottom">
          Create group
        </UncontrolledTooltip>
      </div>
      <div className="chat-message-list">
        <ul className="list-unstyled chat-list chat-user-list mb-3">
          {(channels || []).map((channel: ChannelTypes, key: number) => (
            <ChatChannel
              channel={channel}
              key={key}
              selectedChat={selectedChat}
              onSelectChat={onSelectChat}
            />
          ))}
        </ul>
      </div>
    </>
  );
};

export default Chanels;
