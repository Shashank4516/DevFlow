import React, { useMemo, useRef, useState } from "react";
import classnames from "classnames";
import { Modal } from "reactstrap";

// interfaces
import { CreateChannelPostData } from "../redux/actions";
import { UserTypes } from "../data/chat";
import { STATUS_TYPES } from "../constants";

interface GroupSelectableFriend {
  id: string | number;
  name: string;
  image?: string;
  isOnline: boolean;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "?";

const FriendAvatar = ({ friend, size }: { friend: GroupSelectableFriend; size: number }) =>
  friend.image ? (
    <img
      src={friend.image}
      alt=""
      className="group-modal__avatar"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="group-modal__avatar group-modal__avatar--initials"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initialsOf(friend.name)}
    </span>
  );

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (params: CreateChannelPostData) => void;
  friends: Array<UserTypes>;
}

const AddGroupModal = ({ isOpen, onClose, onCreateChannel, friends }: AddGroupModalProps) => {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);

  const selectableFriends = useMemo<GroupSelectableFriend[]>(
    () =>
      (friends || [])
        .filter(friend => friend.id !== undefined && friend.id !== null)
        .map(friend => ({
          id: friend.id,
          name: `${friend.firstName || ""} ${friend.lastName || ""}`.trim() || "Unknown",
          image: friend.profileImage,
          isOnline: friend.status === STATUS_TYPES.ACTIVE,
        })),
    [friends],
  );

  const isSelected = (id: string | number) => selectedIds.some(item => item + "" === id + "");

  const onToggleMember = (id: string | number) => {
    setSelectedIds(current =>
      current.some(item => item + "" === id + "")
        ? current.filter(item => item + "" !== id + "")
        : [...current, id],
    );
  };

  const searchTerm = memberSearch.trim().toLowerCase();
  const shownFriends = selectableFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm),
  );
  const selectedFriends = selectedIds
    .map(id => selectableFriends.find(friend => friend.id + "" === id + ""))
    .filter((friend): friend is GroupSelectableFriend => !!friend);

  const hasName = name.trim().length > 0;
  const isValid = hasName && selectedIds.length > 0;
  const hint = !hasName
    ? selectedIds.length === 0
      ? "Add a group name and at least one member"
      : "Add a group name"
    : selectedIds.length === 0
      ? "Add at least one member"
      : "";

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    onCreateChannel({
      id: "",
      name: name.trim(),
      members: selectedIds,
      description: description.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      centered
      scrollable
      autoFocus={false}
      onOpened={() => nameRef.current?.focus()}
      className="group-modal"
      contentClassName="group-modal__card"
      id="addgroup-exampleModal"
      labelledBy="group-modal-title"
    >
      <form className="group-modal__form" onSubmit={onSubmit}>
        <div className="group-modal__head">
          <div>
            <h2 id="group-modal-title" className="group-modal__title">
              New group
            </h2>
            <p className="group-modal__subtitle">Name your group and choose who to add.</p>
          </div>
          <button type="button" className="group-modal__close" aria-label="Close" onClick={onClose}>
            <i className="bx bx-x" />
          </button>
        </div>

        <div className="group-modal__body">
          <div className="group-modal__identity">
            <span className="group-modal__group-avatar" aria-hidden="true">
              #
            </span>
            <div className="group-modal__field">
              <label htmlFor="addgroupname-input">Group name</label>
              <input
                ref={nameRef}
                id="addgroupname-input"
                type="text"
                placeholder="e.g. Design team"
                autoComplete="off"
                value={name}
                onChange={event => setName(event.target.value)}
              />
            </div>
          </div>

          <div className="group-modal__section-head">
            <span id="group-members-label">Members</span>
            <span className="group-modal__count">
              {selectedIds.length === 0 ? "None selected" : `${selectedIds.length} selected`}
            </span>
          </div>

          {selectedFriends.length > 0 && (
            <ul className="group-modal__chips">
              {selectedFriends.map(friend => (
                <li key={friend.id} className="group-modal__chip">
                  <FriendAvatar friend={friend} size={22} />
                  <span>{friend.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${friend.name}`}
                    onClick={() => onToggleMember(friend.id)}
                  >
                    <i className="bx bx-x" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectableFriends.length > 0 && (
            <div className="group-modal__search">
              <i className="bx bx-search" />
              <input
                type="text"
                placeholder="Search friends"
                aria-label="Search friends"
                autoComplete="off"
                value={memberSearch}
                onChange={event => setMemberSearch(event.target.value)}
              />
            </div>
          )}

          <ul className="group-modal__members" aria-labelledby="group-members-label">
            {shownFriends.map(friend => {
              const selected = isSelected(friend.id);
              return (
                <li key={friend.id}>
                  <label className={classnames("group-modal__member", { "is-selected": selected })}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleMember(friend.id)}
                    />
                    <FriendAvatar friend={friend} size={40} />
                    <span className="group-modal__member-text">
                      <span className="group-modal__member-name">{friend.name}</span>
                      <span className="group-modal__member-status">
                        {friend.isOnline ? "Online" : "Offline"}
                      </span>
                    </span>
                    <span className="group-modal__check" aria-hidden="true">
                      <i className="bx bx-check" />
                    </span>
                  </label>
                </li>
              );
            })}
            {selectableFriends.length === 0 && (
              <li className="group-modal__empty">
                You have no friends to add yet. Search for people to connect with first.
              </li>
            )}
            {selectableFriends.length > 0 && shownFriends.length === 0 && (
              <li className="group-modal__empty">No friends match “{memberSearch.trim()}”.</li>
            )}
          </ul>

          <div className="group-modal__field group-modal__field--description">
            <label htmlFor="addgroupdescription-input">
              Description <span>Optional</span>
            </label>
            <textarea
              id="addgroupdescription-input"
              rows={2}
              placeholder="What is this group for?"
              value={description}
              onChange={event => setDescription(event.target.value)}
            />
          </div>
        </div>

        <div className="group-modal__foot">
          <span className="group-modal__hint">{hint}</span>
          <button type="button" className="group-modal__btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="group-modal__btn is-primary" disabled={!isValid}>
            Create group
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddGroupModal;
