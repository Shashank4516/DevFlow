import React from "react";
import classNames from "classnames";

import { showSuccessNotification } from "../../../helpers/notifications";
import { BasicDetailsTypes } from "../../../data/myProfile";

export const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    showSuccessNotification(`${label} copied.`);
  } catch {
    // Some browsers block the clipboard. The text is still on screen to select by hand.
  }
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "?";

interface MyProfileProps {
  basicDetails: BasicDetailsTypes;
  status?: string;
  friendCount: number;
  groupCount: number;
  onEdit: () => void;
}

const MyProfile = ({ basicDetails, status, friendCount, groupCount, onEdit }: MyProfileProps) => {
  const fullName =
    `${basicDetails?.firstName || ""} ${basicDetails?.lastName || ""}`.trim() ||
    basicDetails?.fullName ||
    "Your name";
  const photo = basicDetails?.avatar || basicDetails?.profile;
  const tag = basicDetails?.profileTag;
  const about = basicDetails?.description?.trim();

  return (
    <>
      <div className="my-profile__cover">
        {basicDetails?.coverImage && <img src={basicDetails.coverImage} alt="" />}
        <div className="my-profile__cover-bar">
          <h4>My Profile</h4>
          <button type="button" onClick={onEdit}>
            <i className="bx bx-pencil" /> Edit
          </button>
        </div>
      </div>

      <div className="my-profile__identity">
        {photo ? (
          <img src={photo} alt="" className="my-profile__photo" />
        ) : (
          <span className="my-profile__photo my-profile__photo--initials">
            {initialsOf(fullName)}
          </span>
        )}
        <h5 className="my-profile__name">{fullName}</h5>
        {tag && (
          <button
            type="button"
            className="my-profile__tag"
            title="Copy your tag"
            onClick={() => copyToClipboard(tag, "Tag")}
          >
            {tag} <i className="bx bx-copy" />
          </button>
        )}
        {status && (
          <span
            className={classNames("my-profile__status", {
              "is-away": status === "Away",
              "is-busy": status === "Do not disturb",
            })}
          >
            <i />
            {status}
          </span>
        )}
        {about && <p className="my-profile__about">{about}</p>}
      </div>

      <div className="my-profile__stats">
        <div>
          <strong>{friendCount}</strong>
          <span>{friendCount === 1 ? "Friend" : "Friends"}</span>
        </div>
        <div>
          <strong>{groupCount}</strong>
          <span>{groupCount === 1 ? "Group" : "Groups"}</span>
        </div>
      </div>
    </>
  );
};

export default MyProfile;
