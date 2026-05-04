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

export type TaskAssignee = {
  user_id: number;
  name: string;
  firstName: string;
  lastName: string;
  profileImage: string;
  initials: string;
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
  /** Present when board API includes assignee (added with task assignee column). */
  assignee?: TaskAssignee | null;
};

export type StackTaskTodo = {
  id: string;
  text: string;
  is_done: boolean;
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
  assignee_user_id?: number | null;
}): Promise<{ task: StackBoardTask }> => {
  return asData(api.create(url.POST_PROJECT_TASK_CREATE, payload));
};

export const updateProjectTask = (payload: {
  project_id: number;
  task_id: number;
  assignee_user_id?: number | null;
  title?: string;
  description?: string;
}): Promise<{ ok: boolean; task: StackBoardTask }> => {
  return asData(api.create(url.POST_PROJECT_TASK_UPDATE, payload));
};

export const getSuggestedAssignee = (
  projectId: number
): Promise<{
  suggested_user_id: number | null;
  open_counts: Record<string, number>;
  reason: string;
}> => {
  return asData(
    api.get(url.GET_PROJECT_SUGGEST_ASSIGNEE, { params: { project_id: projectId } })
  );
};

export const getTaskTodos = (payload: {
  project_id: number;
  task_id: number;
}): Promise<{ todos: StackTaskTodo[]; progress: { done: number; total: number } }> => {
  return asData(
    api.get(url.GET_PROJECT_TASK_TODOS, {
      params: { project_id: payload.project_id, task_id: payload.task_id },
    })
  );
};

export const createTaskTodo = (payload: {
  project_id: number;
  task_id: number;
  text: string;
}): Promise<{ todo: StackTaskTodo; progress: { done: number; total: number } }> => {
  return asData(api.create(url.POST_PROJECT_TASK_TODO_CREATE, payload));
};

export const toggleTaskTodo = (payload: {
  project_id: number;
  task_id: number;
  todo_id: number;
  is_done: boolean;
}): Promise<{ ok: boolean; progress: { done: number; total: number } }> => {
  return asData(api.create(url.POST_PROJECT_TASK_TODO_TOGGLE, payload));
};

export type ProjectRepoLink = {
  id: number;
  repo_full_name: string;
  default_branch: string;
  sort_order?: number;
};

export const getProjectReposConfig = (
  projectId: number
): Promise<{ repos: ProjectRepoLink[]; can_edit: boolean; github_connected: boolean }> => {
  return asData(
    api.get(url.GET_PROJECT_REPOS_CONFIG, { params: { project_id: projectId } })
  );
};

export const saveProjectReposConfig = (payload: {
  project_id: number;
  repos: { repo_full_name: string; default_branch: string }[];
}): Promise<{ ok: boolean; repos: ProjectRepoLink[] }> => {
  return asData(api.create(url.GET_PROJECT_REPOS_CONFIG, payload));
};

export type WorkgraphCommit = {
  sha: string;
  short_sha: string;
  title: string;
  author_date: string;
  github_login: string;
  html_url: string;
};

export type WorkgraphPr = {
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  user_login: string;
  updated_at: string;
};

export type WorkgraphDiff = {
  base?: string;
  head?: string;
  base_short?: string;
  head_short?: string;
  file_count: number;
  additions: number;
  deletions: number;
  compare_url?: string;
  message?: string;
} | null;

export type WorkgraphCi = {
  name: string;
  conclusion: string | null;
  status: string;
  html_url: string;
  source?: string;
} | null;

export type WorkgraphRepoState = {
  repo_full_name: string;
  default_branch: string;
  error: string | null;
  commits: WorkgraphCommit[];
  open_prs: WorkgraphPr[];
  diff: WorkgraphDiff;
  ci: WorkgraphCi;
};

export const getProjectWorkgraph = (
  projectId: number
): Promise<{
  repos: { id: number; repo_full_name: string; default_branch: string }[];
  github_connected: boolean;
  by_repo: Record<string, WorkgraphRepoState>;
  can_edit: boolean;
}> => {
  return asData(
    api.get(url.GET_PROJECT_WORKGRAPH, { params: { project_id: projectId } })
  );
};
