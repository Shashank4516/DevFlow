// constants
import { TABS ,LAYOUT_MODES} from "../../constants/index";

export enum LayoutActionTypes {
  CHANGE_TAB = "@@layout/CHANGE_TAB",
  CHANGE_LAYOUT_MODE = "@@layout/CHANGE_LAYOUT_MODE",
  SET_STACK_PROJECT = "@@layout/SET_STACK_PROJECT",
}
export interface LayoutState {
  layoutMode:
    | LAYOUT_MODES.LIGHT
    | LAYOUT_MODES.DARK,
  activeTab:
    | TABS.BOOKMARK
    | TABS.CALLS
    | TABS.CHAT
    | TABS.CONTACTS
    | TABS.GITHUB
    | TABS.STACK
    | TABS.NOTIFICATIONS
    | TABS.SETTINGS
    | TABS.USERS;
  /** Selected project for Stack / Kanban (numeric DB id). */
  stackProjectId: number | null;
}
