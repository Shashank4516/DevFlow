// constants
import { TABS, LAYOUT_MODES } from "../../constants/index";

import { LayoutActionTypes, LayoutState } from "./types";

function getDeviceLayoutMode(): LayoutState["layoutMode"] {
  if (typeof window === "undefined") return LAYOUT_MODES.LIGHT;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? LAYOUT_MODES.DARK
      : LAYOUT_MODES.LIGHT;
  } catch {
    return LAYOUT_MODES.LIGHT;
  }
}

export const INIT_STATE: LayoutState = {
  activeTab: TABS.CHAT,
  layoutMode: getDeviceLayoutMode(),
  stackProjectId: null,
};

const Layout = (state = INIT_STATE, action: any) => {
  switch (action.type) {
    case LayoutActionTypes.CHANGE_TAB:
      return {
        ...state,
        activeTab: action.payload,
      };

    case LayoutActionTypes.CHANGE_LAYOUT_MODE:
      return {
        ...state,
        layoutMode: action.payload.layoutMode,
      };

    case LayoutActionTypes.SET_STACK_PROJECT:
      return {
        ...state,
        stackProjectId: action.payload,
      };

    default:
      return { ...state };
  }
};

export default Layout;
