// types
import { SettingsActionTypes, SettingsState } from "./types";

export const INIT_STATE: SettingsState = {
  settings: {},
};

const Settings = (state = INIT_STATE, action: any) => {
  switch (action.type) {
    case SettingsActionTypes.API_RESPONSE_SUCCESS:
      switch (action.payload.actionType) {
        case SettingsActionTypes.GET_USER_SETTINGS:
          return {
            ...state,
            settings: action.payload.data,
            isSettingsFetched: true,
            getSettingsLoading: false,
            isSettingsUpdated: false,
          };
        case SettingsActionTypes.UPDATE_USER_SETTINGS: {
          const next = { ...state, isSettingsUpdated: true };
          const field = action.payload.field;
          const value = action.payload.value;
          if (field != null && value !== undefined) {
            const settings = (state.settings as any) || {};
            if (field === "basicDetails" && typeof value === "object") {
              const basicDetails = { ...(settings.basicDetails || {}), ...value };
              next.settings = { ...settings, basicDetails };
              try {
                localStorage.setItem("devflow_profile_basicDetails", JSON.stringify(basicDetails));
                const raw = localStorage.getItem("authUser");
                if (raw) {
                  const authUser = JSON.parse(raw);
                  const updated = { ...authUser };
                  if (value.firstName !== undefined) updated.firstName = value.firstName;
                  if (value.lastName !== undefined) updated.lastName = value.lastName;
                  if (value.profile !== undefined) {
                    updated.profileImage = value.profile;
                    updated.photoURL = value.profile;
                  }
                  if (value.email !== undefined) updated.email = value.email;
                  if (value.fullName !== undefined) updated.displayName = value.fullName;
                  localStorage.setItem("authUser", JSON.stringify(updated));
                }
              } catch (_) {}
            } else {
              next.settings = { ...settings, [field]: value };
            }
          }
          return next;
        }
        default:
          return { ...state };
      }

    case SettingsActionTypes.API_RESPONSE_ERROR:
      switch (action.payload.actionType) {
        case SettingsActionTypes.GET_USER_SETTINGS:
          return {
            ...state,
            isSettingsFetched: false,
            getSettingsLoading: false,
          };
        case SettingsActionTypes.UPDATE_USER_SETTINGS:
          return {
            ...state,
            isSettingsUpdated: false,
          };
        default:
          return { ...state };
      }

    case SettingsActionTypes.GET_USER_SETTINGS: {
      return {
        ...state,
        getSettingsLoading: true,
        isSettingsFetched: false,
      };
    }
    case SettingsActionTypes.UPDATE_USER_SETTINGS:
      return {
        ...state,
        isSettingsUpdated: false,
      };

    case SettingsActionTypes.SET_BASIC_DETAILS_FROM_AUTH: {
      const basicDetails = {
        ...((state.settings as any).basicDetails || {}),
        ...action.payload,
      };
      try {
        localStorage.setItem("devflow_profile_basicDetails", JSON.stringify(basicDetails));
        if (action.payload?.profile !== undefined) {
          const raw = localStorage.getItem("authUser");
          if (raw) {
            const authUser = JSON.parse(raw);
            const updated = {
              ...authUser,
              profileImage: action.payload.profile,
              photoURL: action.payload.profile,
            };
            localStorage.setItem("authUser", JSON.stringify(updated));
          }
        }
      } catch (_) {}
      return {
        ...state,
        settings: {
          ...state.settings,
          basicDetails,
        },
      };
    }

    default:
      return { ...state };
  }
};

export default Settings;
