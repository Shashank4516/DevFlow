import { GithubActionTypes } from "./types";

export const setGithubStatus = (connected: boolean, username: string | null) => ({
  type: GithubActionTypes.SET_GITHUB_STATUS,
  payload: { connected, username },
});
