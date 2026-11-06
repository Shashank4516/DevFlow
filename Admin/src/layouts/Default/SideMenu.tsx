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
import { useNotifications } from "../../contexts/NotificationsContext";
import NotificationBell from "./NotificationBell";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

/** Bell from notification.svg: inherits `currentColor` (blue when nav active); dot only when `showDot`. */
/** Stack icon: inline SVG so it inherits nav link `color` like Boxicons (e.g. GitHub). */
const StackSidebarIcon = () => (
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
      d="M18.3098 13.2776C18.3718 13.384 18.4123 13.5015 18.4289 13.6235C18.4455 13.7455 18.438 13.8695 18.4066 13.9886C18.3753 14.1076 18.3208 14.2194 18.2463 14.3174C18.1718 14.4154 18.0787 14.4977 17.9724 14.5598L10.4724 18.9348C10.329 19.0184 10.166 19.0625 10 19.0625C9.83401 19.0625 9.671 19.0184 9.52763 18.9348L2.02763 14.5598C1.81302 14.4344 1.65698 14.229 1.5938 13.9886C1.53063 13.7482 1.56549 13.4926 1.69072 13.2779C1.81595 13.0632 2.0213 12.9071 2.26164 12.8437C2.50197 12.7804 2.75762 12.8151 2.97237 12.9402L10 17.0396L17.0276 12.9402C17.2424 12.8149 17.4981 12.7801 17.7386 12.8434C17.979 12.9067 18.1845 13.0629 18.3098 13.2776ZM17.0276 9.19022L10 13.2896L2.97237 9.19022C2.75762 9.06512 2.50197 9.03042 2.26164 9.09374C2.0213 9.15707 1.81595 9.31323 1.69072 9.52792C1.56549 9.7426 1.53063 9.99822 1.5938 10.2386C1.65698 10.479 1.81302 10.6844 2.02763 10.8098L9.52763 15.1848C9.671 15.2684 9.83401 15.3125 10 15.3125C10.166 15.3125 10.329 15.2684 10.4724 15.1848L17.9724 10.8098C18.0788 10.7478 18.172 10.6654 18.2465 10.5674C18.3211 10.4694 18.3757 10.3577 18.4071 10.2386C18.4384 10.1195 18.446 9.99536 18.4294 9.87332C18.4128 9.75129 18.3723 9.63372 18.3103 9.52733C18.2482 9.42095 18.1658 9.32783 18.0678 9.25331C17.9697 9.17879 17.8579 9.12432 17.7388 9.09301C17.6197 9.0617 17.4956 9.05417 17.3735 9.07085C17.2515 9.08753 17.134 9.12809 17.0276 9.19022ZM1.5625 6.25C1.56249 6.08614 1.60543 5.92515 1.68705 5.78306C1.76866 5.64098 1.88609 5.52277 2.02763 5.44022L9.52763 1.06522C9.671 0.981574 9.83401 0.9375 10 0.9375C10.166 0.9375 10.329 0.981574 10.4724 1.06522L17.9724 5.44022C18.1139 5.52277 18.2313 5.64099 18.3129 5.78307C18.3946 5.92515 18.4375 6.08615 18.4375 6.25C18.4375 6.41385 18.3946 6.57484 18.3129 6.71693C18.2313 6.85901 18.1139 6.97722 17.9724 7.05978L10.4724 11.4348C10.329 11.5184 10.166 11.5625 10 11.5625C9.83401 11.5625 9.671 11.5184 9.52763 11.4348L2.02763 7.05978C1.88609 6.97723 1.76866 6.85902 1.68705 6.71693C1.60543 6.57485 1.56249 6.41385 1.5625 6.25ZM4.36058 6.25L10 9.53964L15.6394 6.25L10 2.96036L4.36058 6.25Z"
      fill="currentColor"
    />
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
  | TABS.STACK
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
  const iconEl =
    item.tabId === TABS.NOTIFICATIONS ? (
      <span className="position-relative d-inline-flex align-items-center justify-content-center">
        <NotificationBell count={friendRequestPendingCount} />
      </span>
    ) : item.key === "pills-stack-tab" ? (
      <StackSidebarIcon />
    ) : item.iconImage ? (
      <img src={item.iconImage} alt={item.tooltipTitle} className="side-menu-icon-img" width={24} height={24} />
    ) : (
      <i className={item.icon}></i>
    );
  const tooltipText =
    item.tabId === TABS.NOTIFICATIONS && friendRequestPendingCount > 0
      ? `${item.tooltipTitle} (${friendRequestPendingCount} new)`
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
  const { unreadCount } = useNotifications();

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
                  ? unreadCount
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
