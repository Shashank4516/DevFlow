import React, { useState } from "react";
import classNames from "classnames";

import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";

// interface
import { BasicDetailsTypes } from "../../../data/myProfile";

interface MyProfileProps {
  basicDetails: BasicDetailsTypes;
}

const ProfileHeaderMenu = ({
  lightOnDark,
}: {
  lightOnDark?: boolean;
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggle = () => setDropdownOpen(!dropdownOpen);
  return (
    <Dropdown isOpen={dropdownOpen} toggle={toggle}>
      <DropdownToggle
        color="none"
        className={classNames(
          "btn nav-btn p-1",
          lightOnDark ? "text-white" : "text-muted"
        )}
        type="button"
        aria-label="Profile menu"
      >
        <i className="bx bx-dots-vertical-rounded font-size-20"></i>
      </DropdownToggle>
      <DropdownMenu className="dropdown-menu-end">
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          href="#"
        >
          Info <i className="bx bx-info-circle ms-2 text-muted"></i>
        </DropdownItem>
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          href="#"
        >
          Setting <i className="bx bx-cog text-muted ms-2"></i>
        </DropdownItem>
        <DropdownItem divider />
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          href="#"
        >
          Help <i className="bx bx-help-circle ms-2 text-muted"></i>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

const MyProfile = ({ basicDetails }: MyProfileProps) => {
  const hasCover = Boolean(basicDetails?.coverImage);

  const fullName = basicDetails
    ? `${basicDetails.firstName} ${basicDetails.lastName}`
    : "-";
  return (
    <>
      {hasCover ? (
        <div className="user-profile-img">
          <img
            src={basicDetails.coverImage}
            className="profile-img"
            style={{ height: "160px" }}
            alt=""
          />
          <div className="overlay-content">
            <div className="user-chat-nav p-2 px-3 w-100">
              <div className="d-flex w-100 align-items-center">
                <div className="flex-grow-1">
                  <h5 className="text-white mb-0">My Profile</h5>
                </div>
                <div className="flex-shrink-0">
                  <ProfileHeaderMenu lightOnDark />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="profile-sidebar-header px-3 pt-3 pb-2 border-bottom">
          <div className="d-flex w-100 align-items-center">
            <div className="flex-grow-1 min-w-0">
              <h5 className="mb-0 text-truncate">My Profile</h5>
            </div>
            <div className="flex-shrink-0 ms-2">
              <ProfileHeaderMenu />
            </div>
          </div>
        </div>
      )}

      <div
        className={classNames(
          "text-center border-bottom position-relative",
          hasCover
            ? "p-3 p-lg-4 pt-2 mt-n5"
            : "px-3 pt-4 pb-4"
        )}
      >
        <div className={classNames(hasCover ? "mb-lg-3 mb-2" : "mb-3")}>
          {(basicDetails?.avatar || basicDetails?.profile) && (
            <img
              src={basicDetails.avatar || basicDetails.profile}
              className="rounded-circle avatar-lg img-thumbnail"
              alt=""
            />
          )}
        </div>

        <h5 className="font-size-16 mb-1 text-truncate">{fullName}</h5>
        <p className="text-muted font-size-14 text-truncate mb-0">
          {basicDetails && basicDetails.title ? basicDetails.title : "-"}
        </p>
      </div>
    </>
  );
};
export default MyProfile;
