import { takeEvery, fork, put, all, call } from "redux-saga/effects";

// Login Redux States
import { ProfileActionTypes } from "./types";
import { profileApiResponseSuccess, profileApiResponseError } from "./actions";

import { getProfileDetails as getProfileDetailsApi } from "../../api/index";
import { getLoggedinUser } from "../../api/apiCore";

const PROFILE_STORAGE_KEY = "devflow_profile_basicDetails";

function* getProfileDetails() {
  try {
    let response: any = yield call(getProfileDetailsApi);
    const apiBasicDetails = (response && response.basicDetails) || {};
    let basicDetails: any = { ...apiBasicDetails };
    try {
      const authUser = getLoggedinUser();
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          basicDetails = { ...apiBasicDetails, ...parsed };
          if (basicDetails.profile && !basicDetails.avatar) basicDetails.avatar = basicDetails.profile;
        }
      } else {
        if (authUser && (authUser.firstName != null || authUser.photoURL)) {
          basicDetails = {
            ...basicDetails,
            firstName: authUser.firstName ?? basicDetails.firstName,
            lastName: authUser.lastName ?? basicDetails.lastName,
            profile: authUser.profileImage || authUser.photoURL || basicDetails.profile,
            avatar: authUser.profileImage || authUser.photoURL || basicDetails.avatar,
            email: authUser.email ?? basicDetails.email,
            fullName: authUser.displayName || (authUser.firstName && authUser.lastName ? `${authUser.firstName} ${authUser.lastName}` : basicDetails.fullName),
          };
        }
      }
      if (authUser?.photoURL) {
        const gmailAvatar = authUser.profileImage || authUser.photoURL;
        const isDefaultAvatar = !basicDetails.profile || !basicDetails.avatar || /avatar-?1|avatar1\.(jpg|jpeg|png)/i.test(basicDetails.profile) || /avatar-?1|avatar1\.(jpg|jpeg|png)/i.test(basicDetails.avatar);
        if (isDefaultAvatar) {
          basicDetails.profile = gmailAvatar;
          basicDetails.avatar = gmailAvatar;
        }
      }
    } catch (_) {}
    response = { ...response, basicDetails };
    yield put(
      profileApiResponseSuccess(
        ProfileActionTypes.GET_PROFILE_DETAILS,
        response
      )
    );
  } catch (error: any) {
    yield put(
      profileApiResponseError(ProfileActionTypes.GET_PROFILE_DETAILS, error)
    );
  }
}

export function* watchGetProfileDetails() {
  yield takeEvery(ProfileActionTypes.GET_PROFILE_DETAILS, getProfileDetails);
}

function* profileSaga() {
  yield all([fork(watchGetProfileDetails)]);
}

export default profileSaga;
