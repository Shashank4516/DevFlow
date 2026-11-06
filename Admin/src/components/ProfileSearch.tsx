import React from "react";

interface ProfileSearchProps {
  onOpen: () => void;
}

/** Looks like a search box. Searching itself happens in FriendSearchPanel. */
const ProfileSearch = ({ onOpen }: ProfileSearchProps) => (
  <div className="profile-search-wrapper position-relative px-3 pt-3 pb-2">
    <button type="button" className="profile-search-trigger" onClick={onOpen}>
      <span>Search people…</span>
      <i className="bx bx-search" />
    </button>
  </div>
);

export default ProfileSearch;
