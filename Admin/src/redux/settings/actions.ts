import { SettingsActionTypes } from "./types";

// common success (optionally pass field/value to merge into settings after update)
export const settingsApiResponseSuccess = (
  actionType: string,
  data: any,
  merge?: { field: string; value: any }
) => ({
  type: SettingsActionTypes.API_RESPONSE_SUCCESS,
  payload: { actionType, data, ...(merge && { field: merge.field, value: merge.value }) },
});
// common error
export const settingsApiResponseError = (
  actionType: string,
  error: string
) => ({
  type: SettingsActionTypes.API_RESPONSE_ERROR,
  payload: { actionType, error },
});

export const getSettings = () => ({
  type: SettingsActionTypes.GET_USER_SETTINGS,
});

export const updateSettings = (field: string, value: any) => ({
  type: SettingsActionTypes.UPDATE_USER_SETTINGS,
  payload: { field, value },
});

export const setSettingsFromAuthUser = (basicDetails: {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profile?: string;
  email?: string;
  location?: string;
  profileTag?: string;
}) => ({
  type: SettingsActionTypes.SET_BASIC_DETAILS_FROM_AUTH,
  payload: basicDetails,
});
