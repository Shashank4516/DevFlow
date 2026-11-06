import React from "react";

import { BasicDetailsTypes } from "../../../data/myProfile";
import { copyToClipboard } from "./MyProfile";

interface UserDescriptionProps {
  basicDetails: BasicDetailsTypes;
  onEdit: () => void;
}

const UserDescription = ({ basicDetails, onEdit }: UserDescriptionProps) => {
  const email = basicDetails?.email?.trim();
  const location = basicDetails?.location?.trim();
  const title = basicDetails?.title?.trim();

  return (
    <section className="my-profile__section">
      <h6>Details</h6>
      <div className="my-profile__group">
        {title && (
          <div className="my-profile__row">
            <span className="my-profile__row-icon">
              <i className="bx bx-briefcase" />
            </span>
            <span className="my-profile__row-text">
              <small>Role</small>
              <span>{title}</span>
            </span>
          </div>
        )}
        <button
          type="button"
          className="my-profile__row"
          disabled={!email}
          title={email ? "Copy your email" : undefined}
          onClick={() => email && copyToClipboard(email, "Email")}
        >
          <span className="my-profile__row-icon">
            <i className="bx bx-envelope" />
          </span>
          <span className="my-profile__row-text">
            <small>Email</small>
            <span>{email || "Not set"}</span>
          </span>
          {email && <i className="bx bx-copy my-profile__row-end" />}
        </button>
        {location ? (
          <div className="my-profile__row">
            <span className="my-profile__row-icon">
              <i className="bx bx-map" />
            </span>
            <span className="my-profile__row-text">
              <small>Location</small>
              <span>{location}</span>
            </span>
          </div>
        ) : (
          <button type="button" className="my-profile__row" onClick={onEdit}>
            <span className="my-profile__row-icon">
              <i className="bx bx-map" />
            </span>
            <span className="my-profile__row-text">
              <small>Location</small>
              <span className="is-link">Add your location</span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
};

export default UserDescription;
