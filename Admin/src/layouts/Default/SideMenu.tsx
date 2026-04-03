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
  const pendingBell =
    item.tabId === TABS.NOTIFICATIONS && friendRequestPendingCount > 0;
  const iconEl =
    item.tabId === TABS.NOTIFICATIONS ? (
      <span className="position-relative d-inline-flex align-items-center justify-content-center">
        <NotificationSidebarIcon showDot={pendingBell} />
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
