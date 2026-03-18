import React, { useEffect, useMemo } from "react";

// hooks
import { useRedux } from "../../../hooks/index";
import { createSelector } from "reselect";
// components
import Loader from "../../../components/Loader";
import AppSimpleBar from "../../../components/AppSimpleBar";
import MyProfile from "./MyProfile";
import UserDescription from "./UserDescription";
import Media from "../../../components/Media";
import AttachedFiles from "../../../components/AttachedFiles";

// actions
import { getProfileDetails } from "../../../redux/actions";

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
    (state) => ({
      profileDetails: state.profileDetails,
      getProfileLoading: state.getProfileLoading,
      isProfileFetched: state.isProfileFetched,
    })
  );
  const { profileDetails, getProfileLoading, isProfileFetched } = useAppSelector(errorData);

  const basicDetails = useMemo(
    () => getBasicDetailsWithSaved(profileDetails?.basicDetails),
    [profileDetails?.basicDetails]
  );

  useEffect(() => {
    dispatch(getProfileDetails());
  }, [dispatch]);

  return (
    <div className="position-relative">
      {getProfileLoading && !isProfileFetched && <Loader />}
      <MyProfile basicDetails={basicDetails} />

      <AppSimpleBar className="p-4 profile-desc">
        <UserDescription basicDetails={basicDetails} />
        <hr className="my-4" />

        <Media media={profileDetails?.media} limit={2} />

        <hr className="my-4" />

        <AttachedFiles attachedFiles={profileDetails?.attachedFiles} />
      </AppSimpleBar>
    </div>
  );
};

export default Index;
