import React from "react";

interface PinnedChatBannerProps {
  count: number;
  onJump: () => void;
}

const PinnedChatBanner = ({ count, onJump }: PinnedChatBannerProps) => {
  if (count <= 0) return null;

  return (
    <button
      type="button"
      className="pinned-chat-banner w-100 btn border-0 rounded-0 d-flex align-items-center justify-content-center gap-2 py-2 px-3"
      onClick={onJump}
    >
      <i className="ri-pushpin-fill" aria-hidden />
      <span className="small fw-medium">
        {count} pinned message{count === 1 ? "" : "s"}
        <span className="text-muted fw-normal ms-1">· View in chat</span>
      </span>
    </button>
  );
};

export default PinnedChatBanner;
