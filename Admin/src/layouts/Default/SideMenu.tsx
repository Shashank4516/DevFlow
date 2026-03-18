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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

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

interface MenuNavItemProps {
  item: MenuItemType;
  selectedTab:
    | TABS.BOOKMARK
    | TABS.CALLS
    | TABS.CHAT
    | TABS.CONTACTS
    | TABS.GITHUB
    | TABS.SETTINGS
    | TABS.USERS;
  onChangeTab: (
    id:
      | TABS.BOOKMARK
      | TABS.CALLS
      | TABS.CHAT
      | TABS.CONTACTS
      | TABS.GITHUB
      | TABS.SETTINGS
      | TABS.USERS
  ) => void;
}
const MenuNavItem = ({ item, selectedTab, onChangeTab }: MenuNavItemProps) => {
  const isExternal = Boolean(item.externalHref);
  const onClick = (e: React.MouseEvent) => {
    if (isExternal) return;
    e.preventDefault();
    if (item.tabId) onChangeTab(item.tabId);
  };
  const iconEl = item.iconImage ? (
    <img src={item.iconImage} alt={item.tooltipTitle} className="side-menu-icon-img" width={24} height={24} />
  ) : (
    <i className={item.icon}></i>
  );
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
        {item.tooltipTitle}
      </UncontrolledTooltip>
    </>
  );
};

interface ProfileDropdownMenuProps {
  onChangeTab: (
    id:
      | TABS.BOOKMARK
      | TABS.CALLS
      | TABS.CHAT
      | TABS.CONTACTS
      | TABS.GITHUB
      | TABS.SETTINGS
      | TABS.USERS
  ) => void;
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

  const [connectGitHubModalOpen, setConnectGitHubModalOpen] = useState(false);

  const [selectedTab, setSelectedTab] = useState<
    | TABS.BOOKMARK
    | TABS.CALLS
    | TABS.CHAT
    | TABS.CONTACTS
    | TABS.GITHUB
    | TABS.SETTINGS
    | TABS.USERS
  >(TABS.CHAT);
  const onChangeTab = (
    id:
      | TABS.BOOKMARK
      | TABS.CALLS
      | TABS.CHAT
      | TABS.CONTACTS
      | TABS.GITHUB
      | TABS.SETTINGS
      | TABS.USERS
  ) => {
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
