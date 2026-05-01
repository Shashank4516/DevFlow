// costants
import { TABS } from "../../constants/index";

export interface MenuItemType {
  id: number;
  key: string;
  icon: string;
  tooltipTitle: string;
  className?: string;
  tabId?:
    | TABS.BOOKMARK
    | TABS.CALLS
    | TABS.CHAT
    | TABS.CONTACTS
    | TABS.GITHUB
    | TABS.NOTIFICATIONS
    | TABS.SETTINGS
    | TABS.STACK
    | TABS.USERS;
  /** Optional image src for icon (e.g. GitHub); same size as other nav icons */
  iconImage?: string;
  /** If set, opens in new tab instead of switching panel */
  externalHref?: string;
}
const MENU_ITEMS: MenuItemType[] = [
  {
    id: 1,
    key: "pills-user-tab",
    icon: "bx bx-user-circle",
    tooltipTitle: "Profile",
    className: "d-none d-lg-block",
    tabId: TABS.USERS,
  },
  {
    id: 2,
    key: "pills-chat-tab",
    icon: "bx bx-conversation",
    tooltipTitle: "Chats",
    tabId: TABS.CHAT,
  },
  {
    id: 3,
    key: "pills-calls-tab",
    icon: "bx bx-phone-call",
    tooltipTitle: "Calls",
    tabId: TABS.CALLS,
  },
  {
    id: 4,
    key: "pills-notifications-tab",
    icon: "bx bx-bell",
    tooltipTitle: "Notifications",
    tabId: TABS.NOTIFICATIONS,
  },
  {
    id: 5,
    key: "pills-bookmark-tab",
    icon: "bx bx-bookmarks",
    tooltipTitle: "Bookmark",
    tabId: TABS.BOOKMARK,
  },
  {
    id: 6,
    key: "pills-github-tab",
    icon: "bx bxl-github",
    tooltipTitle: "GitHub",
    tabId: TABS.GITHUB,
  },
  {
    id: 7,
    key: "pills-stack-tab",
    icon: "bx bx-layer",
    tooltipTitle: "Stack",
    tabId: TABS.STACK,
  },
  {
    id: 8,
    key: "pills-setting-tab",
    icon: "bx bx-cog",
    tooltipTitle: "Settings",
    tabId: TABS.SETTINGS,
  },
];

export { MENU_ITEMS };
