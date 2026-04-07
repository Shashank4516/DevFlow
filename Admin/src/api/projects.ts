import { APIClient } from "./apiCore";
import * as url from "./urls";

const api = new APIClient();

/** Axios client types return `AxiosResponse`; runtime interceptor unwraps to `data`. */
const asData = <T>(p: Promise<unknown>): Promise<T> => p as Promise<T>;

export type StackProject = {
  id: number;
  name: string;
  owner_id: number;
};

export type StackBoardTask = {
  id: string;
  title: string;
  description: string;
  column_key: string;
  progress: { done: number; total: number };
  files: number;
  comments: number;
  badges: { label: string }[];
};

export const listProjects = (): Promise<{ projects: StackProject[] }> => {
  return asData(api.get(url.GET_PROJECTS_LIST));
};

export const createProject = (
  name: string
): Promise<{ project: StackProject }> => {
  return asData(api.create(url.POST_PROJECT_CREATE, { name }));
};

export const getProjectBoard = (
  projectId: number
): Promise<{ project: StackProject; tasks: StackBoardTask[] }> => {
  return asData(
    api.get(url.GET_PROJECT_BOARD, {
      params: { project_id: projectId },
    })
  );
};

export const getCategoryCounts = (
  projectId: number
): Promise<{ counts: Record<string, number> }> => {
  return asData(
    api.get(url.GET_PROJECT_CATEGORY_COUNTS, {
      params: { project_id: projectId },
    })
  );
};

export type StackMember = {
  user_id: number;
  role: string;
  name: string;
  firstName: string;
  lastName: string;
  profileImage: string;
  initials: string;
};

export const getProjectMembers = (
  projectId: number
): Promise<{ members: StackMember[] }> => {
  return asData(
    api.get(url.GET_PROJECT_MEMBERS, {
      params: { project_id: projectId },
    })
  );
};

export const inviteProjectMember = (
  projectId: number,
  friendUserId: number
): Promise<{ ok: boolean }> => {
  return asData(
    api.create(url.POST_PROJECT_INVITE, {
      project_id: projectId,
      friend_user_id: friendUserId,
    })
  );
};

export const moveProjectTask = (payload: {
  project_id: number;
  task_id: number;
  column_key: string;
}): Promise<{ ok: boolean }> => {
  return asData(api.create(url.POST_PROJECT_TASK_MOVE, payload));
};

export const createProjectTask = (payload: {
  project_id: number;
  title: string;
  description?: string;
  column_key?: string;
}): Promise<{ task: StackBoardTask }> => {
  return asData(api.create(url.POST_PROJECT_TASK_CREATE, payload));
};
