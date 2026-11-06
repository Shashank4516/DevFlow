import React, { useEffect, useMemo } from "react";

// hooks
import { useRedux } from "../../../hooks/index";
import { createSelector } from "reselect";
// components
import Loader from "../../../components/Loader";
import AppSimpleBar from "../../../components/AppSimpleBar";
import MyProfile from "./MyProfile";
import UserDescription from "./UserDescription";
import { ProfileFiles, ProfileMedia } from "./ProfileLibrary";
import { TABS } from "../../../constants";

// actions
import { changeTab, getProfileDetails } from "../../../redux/actions";

import { getLoggedinUser } from "../../../api/apiCore";

const PROFILE_STORAGE_KEY = "devflow_profile_basicDetails";
function getBasicDetailsWithSaved(reduxBasicDetails: any) {
  try {
    const authUser = getLoggedinUser();
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        const merged = { ...(reduxBasicDetails || {}), ...parsed };
        if (merged.profile && !merged.avatar) merged.avatar = merged.profile;
        if (authUser?.photoURL) {
          const gmailAvatar = authUser.profileImage || authUser.photoURL;
          const isDefault = !merged.profile || /avatar-?1|avatar1\.(jpg|jpeg|png)/i.test(String(merged.profile));
          if (isDefault) {
            merged.profile = gmailAvatar;
            merged.avatar = gmailAvatar;
          }
        }
        return merged;
      }
    }
  } catch (_) {}
  return reduxBasicDetails || {};
}

interface IndexProps {}
const Index = (props: IndexProps) => {
  // global store
  const { dispatch, useAppSelector } = useRedux();

  const errorData = createSelector(
    (state: any) => state.Profile,
    (state: any) => state.Settings,
    (state: any) => state.Chats,
    (profile, settings, chats) => ({
      status: settings?.settings?.status as string | undefined,
      directMessages: chats.directMessages,
      favourites: chats.favourites,
      archiveContacts: chats.archiveContacts,
      channels: chats.channels,
      profileDetails: profile.profileDetails,
      getProfileLoading: profile.getProfileLoading,
      isProfileFetched: profile.isProfileFetched,
      /** From /auth/me.php — mock GET_PROFILE_DETAILS does not include this */
      profileTagFromSession: settings?.settings?.basicDetails?.profileTag as string | undefined,
    })
  );
  const {
    status,
    directMessages,
    favourites,
    archiveContacts,
    channels,
    profileDetails,
    getProfileLoading,
    isProfileFetched,
    profileTagFromSession,
  } = useAppSelector(errorData);

  const basicDetails = useMemo(() => {
    const merged = getBasicDetailsWithSaved(profileDetails?.basicDetails);
    if (profileTagFromSession) {
      return { ...merged, profileTag: profileTagFromSession };
    }
    return merged;
  }, [profileDetails?.basicDetails, profileTagFromSession]);

  useEffect(() => {
    dispatch(getProfileDetails());
  }, [dispatch]);

  const onEdit = () => dispatch(changeTab(TABS.SETTINGS));

  const friendIds = new Set(
    [...(directMessages || []), ...(favourites || []), ...(archiveContacts || [])].map(
      (friend: any) => String(friend.id),
    ),
  );

  return (
    <div className="my-profile position-relative">
      {getProfileLoading && !isProfileFetched && <Loader />}
      <AppSimpleBar className="my-profile__scroll">
        <MyProfile
          basicDetails={basicDetails}
          status={status}
          friendCount={friendIds.size}
          groupCount={(channels || []).length}
          onEdit={onEdit}
        />
        <UserDescription basicDetails={basicDetails} onEdit={onEdit} />
        <ProfileMedia media={profileDetails?.media} />
        <ProfileFiles attachedFiles={profileDetails?.attachedFiles} />
      </AppSimpleBar>
    </div>
  );
};

export default Index;
