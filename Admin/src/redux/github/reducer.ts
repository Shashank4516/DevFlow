import { GithubActionTypes, GithubState } from "./types";

export const INIT_STATE: GithubState = {
  connected: false,
  username: null,
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
