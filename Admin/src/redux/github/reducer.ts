import { GithubActionTypes, GithubState } from "./types";
import { isDemoMode } from "../../demo";

export const INIT_STATE: GithubState = {
  // The demo has sample repositories, so it skips the "Connect to GitHub" redirect.
  connected: isDemoMode,
  username: isDemoMode ? "shashank-m" : null,
};

export default function GithubReducer(state = INIT_STATE, action: any): GithubState {
  switch (action.type) {
    case GithubActionTypes.SET_GITHUB_STATUS:
      return {
        ...state,
        connected: action.payload.connected,
        username: action.payload.username,
      };
    default:
      return state;
  }
}
