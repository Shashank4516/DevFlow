import { takeEvery, fork, put, all, call } from "redux-saga/effects";

// Login Redux States
import { SettingsActionTypes } from "./types";
import {
  settingsApiResponseSuccess,
  settingsApiResponseError,
} from "./actions";

import {
  getSettings as getSettingsApi,
  updateSettings as updateSettingsApi,
} from "../../api/index";
import { getLoggedinUser } from "../../api/apiCore";

const PROFILE_STORAGE_KEY = "devflow_profile_basicDetails";

function* getSettings(): Generator<any, void, any> {
  try {
    let response: any = yield call(getSettingsApi);
    const apiBasicDetails = (response && response.basicDetails) || {};
    let basicDetails: any = { ...apiBasicDetails };
    try {
      const authUser = getLoggedinUser();
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          basicDetails = { ...apiBasicDetails, ...parsed };
        }
      } else {
        if (authUser && (authUser.firstName != null || authUser.photoURL)) {
          basicDetails = {
            ...basicDetails,
            firstName: authUser.firstName ?? basicDetails.firstName,
            lastName: authUser.lastName ?? basicDetails.lastName,
            profile: authUser.profileImage || authUser.photoURL || basicDetails.profile,
            email: authUser.email ?? basicDetails.email,
            fullName: authUser.displayName || (authUser.firstName && authUser.lastName ? `${authUser.firstName} ${authUser.lastName}` : basicDetails.fullName),
          };
        }
      }
      if (authUser?.photoURL) {
        const isDefaultAvatar = !basicDetails.profile || /avatar-?1|avatar1\.(jpg|jpeg|png)/i.test(basicDetails.profile);
        if (isDefaultAvatar) {
          basicDetails.profile = authUser.profileImage || authUser.photoURL;
        }
      }
    } catch (_) {}
    response = { ...response, basicDetails };
    yield put(
      settingsApiResponseSuccess(
        SettingsActionTypes.GET_USER_SETTINGS,
        response
      )
    );
  } catch (error: any) {
    yield put(
      settingsApiResponseError(SettingsActionTypes.GET_USER_SETTINGS, error)
    );
  }
}

function* updateSettings({ payload: { field, value } }: any): Generator<any, void, any> {
  try {
    const response: any = yield call(updateSettingsApi, field, value);
    yield put(
      settingsApiResponseSuccess(
        SettingsActionTypes.UPDATE_USER_SETTINGS,
        response,
        { field, value }
      )
    );
  } catch (error: any) {
    yield put(
      settingsApiResponseError(SettingsActionTypes.UPDATE_USER_SETTINGS, error)
    );
  }
}

export function* watchGetSettings() {
  yield takeEvery(SettingsActionTypes.GET_USER_SETTINGS, getSettings);
}
export function* watchUpdateSettings() {
  yield takeEvery(SettingsActionTypes.UPDATE_USER_SETTINGS, updateSettings);
}

function* settingsSaga() {
  yield all([fork(watchGetSettings), fork(watchUpdateSettings)]);
}

export default settingsSaga;
