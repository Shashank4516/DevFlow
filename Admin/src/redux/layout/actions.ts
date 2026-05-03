import { LayoutActionTypes } from "./types";

export const changeTab = (layoutMode: any) => ({
  type: LayoutActionTypes.CHANGE_TAB,
  payload: layoutMode,
});

export const changelayoutMode = (layoutMode :any) => ({
  type: LayoutActionTypes.CHANGE_LAYOUT_MODE,
  payload: { layoutMode},
});

export const setStackProjectId = (projectId: number | null) => ({
  type: LayoutActionTypes.SET_STACK_PROJECT,
  payload: projectId,
});
