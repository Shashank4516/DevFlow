import React, { useEffect, useState } from "react";

import { Link } from "react-router-dom";
import {
  Nav,
  NavItem,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  DropdownMenu,
  NavLink,
  UncontrolledTooltip,
} from "reactstrap";
import { createSelector } from "reselect";
// hooks
import { useRedux, useProfile } from "../../hooks/index";

// actions
import { changeTab } from "../../redux/actions";

// costants
import { TABS } from "../../constants/index";
import LightDarkMode from "../../components/LightDarkMode";

//images
import avatar1 from "../../assets/images/users/avatar-1.jpg";
import devflowLogo from "../../assets/login-icons/Devflow-Logo.png";

// menu
import { MENU_ITEMS, MenuItemType } from "./menu";
import ConnectGitHubModal from "../../components/ConnectGitHubModal";
import { useFriendRequests } from "../../contexts/FriendRequestsContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

/** Bell from notification.svg: inherits `currentColor` (blue when nav active); dot only when `showDot`. */
const NotificationSidebarIcon = ({ showDot }: { showDot: boolean }) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="side-menu-icon-img"
    aria-hidden
  >
    <path
      d="M14.2667 7.425C14.2667 5.08925 12.3525 3.17506 10.0167 3.175C7.67261 3.175 5.76673 5.08088 5.76673 7.425V9.83321C5.76673 10.1776 5.69608 10.5695 5.59876 10.9201C5.50135 11.271 5.3601 11.6412 5.18567 11.9338L5.18372 11.9367L4.22571 13.5285C4.03608 13.8438 4.03158 14.1253 4.10852 14.3332C4.18564 14.5415 4.37336 14.7539 4.72083 14.8723L5.36829 15.0734C8.62064 16.0156 12.0812 15.9489 15.3038 14.8723L15.3058 14.8713C15.855 14.6897 16.103 14.0346 15.799 13.5275V13.5285L14.8409 11.9367L14.8331 11.925V11.924C14.6662 11.6345 14.5286 11.2678 14.4327 10.9182C14.337 10.569 14.2667 10.1775 14.2667 9.83321V7.425ZM15.7667 9.83321C15.7667 9.99723 15.804 10.2479 15.879 10.5217C15.9524 10.789 16.0464 11.0218 16.1281 11.1662L17.0841 12.7551L17.0851 12.7561C17.8802 14.0818 17.2445 15.8083 15.7784 16.2941C12.0327 17.5455 7.99096 17.5466 4.24524 16.2951L4.24329 16.2941C3.50921 16.0457 2.95203 15.5282 2.70227 14.8537C2.45232 14.1784 2.53879 13.4229 2.94055 12.7551L3.89954 11.1633C3.98301 11.0223 4.07847 10.7888 4.15344 10.5188C4.22892 10.2467 4.26673 9.99692 4.26673 9.83321V7.425C4.26673 4.25246 6.84418 1.675 10.0167 1.675C13.1809 1.67506 15.7667 4.26082 15.7667 7.425V9.83321Z"
      fill="currentColor"
    />
    <path
      d="M10.017 0.866669C11.034 0.866803 11.9052 1.49724 12.2563 2.39304C12.3605 2.65901 12.3052 2.96129 12.1127 3.17233C11.9201 3.38338 11.6235 3.46685 11.3491 3.38718C11.1235 3.32168 10.897 3.27233 10.6684 3.2446H10.6655C9.96107 3.15655 9.29714 3.20895 8.68403 3.38718C8.40969 3.46675 8.11398 3.38327 7.92134 3.17233C7.7286 2.96128 7.67252 2.65915 7.77681 2.39304C8.12792 1.49709 8.9999 0.866669 10.017 0.866669Z"
      fill="currentColor"
    />
    <path
      d="M8.26672 15.8833C8.26672 16.3592 8.46487 16.8041 8.7804 17.1197C9.09592 17.4352 9.54087 17.6333 10.0167 17.6333C10.9775 17.6333 11.7667 16.8441 11.7667 15.8833H13.2667C13.2667 17.6726 11.8059 19.1333 10.0167 19.1333C9.12591 19.1333 8.30432 18.7647 7.71985 18.1802C7.13537 17.5957 6.76672 16.7742 6.76672 15.8833H8.26672Z"
      fill="currentColor"
    />
    {showDot && (
      <circle
        cx="15"
        cy="4"
        r="3"
        fill="#FC736F"
        className="notification-sidebar-dot"
      />
    )}
  </svg>
);

const Logo = () => {
  return (
    <div className="navbar-brand-box">
      <Link to="#" className="logo logo-dark">
        <span className="logo-sm">
          <img src={devflowLogo} alt="DevFlow" width={30} height={30} />
        </span>
      </Link>

      <Link to="#" className="logo logo-light">
        <span className="logo-sm">
          <img src={devflowLogo} alt="DevFlow" width={30} height={30} />
        </span>
      </Link>
    </div>
  );
};

type SideTabId =
  | TABS.BOOKMARK
  | TABS.CALLS
  | TABS.CHAT
  | TABS.CONTACTS
  | TABS.GITHUB
  | TABS.NOTIFICATIONS
  | TABS.SETTINGS
  | TABS.USERS;

interface MenuNavItemProps {
  item: MenuItemType;
  selectedTab: SideTabId;
  onChangeTab: (id: SideTabId) => void;
  friendRequestPendingCount?: number;
}
const MenuNavItem = ({
  item,
  selectedTab,
  onChangeTab,
  friendRequestPendingCount = 0,
}: MenuNavItemProps) => {
  const isExternal = Boolean(item.externalHref);
  const onClick = (e: React.MouseEvent) => {
    if (isExternal) return;
    e.preventDefault();
    if (item.tabId) onChangeTab(item.tabId);
  };
  const pendingBell =
    item.tabId === TABS.NOTIFICATIONS && friendRequestPendingCount > 0;
  const iconEl =
    item.tabId === TABS.NOTIFICATIONS ? (
      <span className="position-relative d-inline-flex align-items-center justify-content-center">
        <NotificationSidebarIcon showDot={pendingBell} />
      </span>
    ) : item.iconImage ? (
      <img src={item.iconImage} alt={item.tooltipTitle} className="side-menu-icon-img" width={24} height={24} />
    ) : (
      <i className={item.icon}></i>
    );
  const tooltipText =
    item.tabId === TABS.NOTIFICATIONS && friendRequestPendingCount > 0
      ? `${item.tooltipTitle} (${friendRequestPendingCount} pending)`
      : item.tooltipTitle;
  return (
    <>
      <NavItem className={item.className} id={`${item.key}-container`}>
        {isExternal ? (
          <NavLink
            href={item.externalHref}
            target="_blank"
            rel="noopener noreferrer"
            id={item.key}
            className="nav-link"
          >
            {iconEl}
          </NavLink>
        ) : (
          <NavLink
            href="#"
            active={item.tabId ? selectedTab === item.tabId : false}
            id={item.key}
            role="tab"
            onClick={onClick}
          >
            {iconEl}
          </NavLink>
        )}
      </NavItem>
      <UncontrolledTooltip target={`${item.key}-container`} placement="right">
        {tooltipText}
      </UncontrolledTooltip>
    </>
  );
};

interface ProfileDropdownMenuProps {
  onChangeTab: (id: SideTabId) => void;
}
const ProfileDropdownMenu = ({ onChangeTab }: ProfileDropdownMenuProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggle = () => setDropdownOpen(!dropdownOpen);
  const { userProfile } = useProfile();
  const resolvedProfileImage =
    typeof userProfile?.profileImage === "string" ? userProfile.profileImage.trim() : "";
  const [profileImage, setProfileImage] = useState<string>(
    resolvedProfileImage || avatar1
  );
  useEffect(() => {
    setProfileImage(resolvedProfileImage || avatar1);
  }, [resolvedProfileImage]);
  const displayName =
    userProfile?.displayName ||
    (userProfile?.firstName && userProfile?.lastName
      ? `${userProfile.firstName} ${userProfile.lastName}`
      : userProfile?.email) ||
    "Profile";

  return (
    <Dropdown
      nav
      isOpen={dropdownOpen}
      className="profile-user-dropdown"
      toggle={toggle}
    >
      <DropdownToggle nav className="bg-transparent">
        <img
          src={profileImage}
          alt=""
          className="profile-user rounded-circle"
          title={displayName}
          onError={() => setProfileImage(avatar1)}
          referrerPolicy="no-referrer"
        />
      </DropdownToggle>
      <DropdownMenu>
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          onClick={() => onChangeTab(TABS.USERS)}
        >
          Profile <i className="bx bx-user-circle text-muted ms-1"></i>
        </DropdownItem>
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          onClick={() => onChangeTab(TABS.SETTINGS)}
        >
          Setting <i className="bx bx-cog text-muted ms-1"></i>
        </DropdownItem>
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          href="/auth-changepassword"
        >
          Change Password <i className="bx bx-lock-open text-muted ms-1"></i>
        </DropdownItem>

        <DropdownItem />
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          tag="a"
          href="/logout"
        >
          Log out <i className="bx bx-log-out-circle text-muted ms-1"></i>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

const SideMenu = ({ onChangeLayoutMode }: any) => {
  // global store
  const { dispatch, useAppSelector } = useRedux();

  const menuItems: MenuItemType[] = MENU_ITEMS;
  // const { activeTab, layoutMode } = useAppSelector(state => ({
  //   activeTab: state.Layout.activeTab,
  //   layoutMode: state.Layout.layoutMode,
  // }));

  const errorData = createSelector(
    (state : any) => state.Layout,
    (state) => ({
      activeTab: state.activeTab,
      layoutMode: state.layoutMode,
    })
  );
  const githubData = createSelector(
    (state: any) => state.Github,
    (state) => ({ githubConnected: state.connected })
  );
  const { activeTab, layoutMode } = useAppSelector(errorData);
  const { githubConnected } = useAppSelector(githubData);
  const { pending: friendRequestsPending } = useFriendRequests();

  const [connectGitHubModalOpen, setConnectGitHubModalOpen] = useState(false);

  const [selectedTab, setSelectedTab] = useState<SideTabId>(TABS.CHAT);
  const onChangeTab = (id: SideTabId) => {
    if (id === TABS.GITHUB && !githubConnected) {
      setConnectGitHubModalOpen(true);
      return;
    }
    setSelectedTab(id);
    dispatch(changeTab(id));
  };

  useEffect(() => {
    setSelectedTab(activeTab);
  }, [activeTab]);

  return (
    <div className="side-menu flex-lg-column">
      {/* LOGO */}
      <Logo />
      {/* end navbar-brand-box */}

      {/* Start side-menu nav */}
      <div className="flex-lg-column my-0 sidemenu-navigation">
        <Nav pills className="side-menu-nav" role="tablist">
          {(menuItems || []).map((item: MenuItemType, key: number) => (
            <MenuNavItem
              item={item}
              key={key}
              selectedTab={selectedTab}
              onChangeTab={onChangeTab}
              friendRequestPendingCount={
                item.tabId === TABS.NOTIFICATIONS
                  ? friendRequestsPending.length
                  : undefined
              }
            />
          ))}

          {/* change mode */}
          <LightDarkMode
            layoutMode={layoutMode}
            onChangeLayoutMode={onChangeLayoutMode}
          />

          {/* profile menu dropdown */}
          <ProfileDropdownMenu onChangeTab={onChangeTab} />
        </Nav>
      </div>
      <ConnectGitHubModal
        isOpen={connectGitHubModalOpen}
        toggle={() => setConnectGitHubModalOpen(false)}
      />
      {/* end side-menu nav */}
    </div>
  );
};

export default SideMenu;
