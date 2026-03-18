export enum GithubActionTypes {
  SET_GITHUB_STATUS = "SET_GITHUB_STATUS",
}

export interface GithubState {
  connected: boolean;
  username: string | null;
}
