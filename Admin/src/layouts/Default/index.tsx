import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// actions
import { changelayoutMode, setSettingsFromAuthUser, changeTab, setGithubStatus } from "../../redux/actions";

// components
import SideMenu from "./SideMenu";
import { FriendRequestsProvider } from "../../contexts/FriendRequestsContext";
import { useDispatch, useSelector } from "react-redux";
import { TABS } from "../../constants";
import { createSelector } from "reselect";
import { getLoggedinUser } from "../../api/apiCore";

interface IndexProps {
  children: any;
}
const Index = (props: IndexProps) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const layoutData = createSelector(
    (state: any) => state.Layout,
    (state: any) => ({
      layoutMode: state.layoutMode,
    })
  );
  const settingsData = createSelector(
    (state: any) => state.Settings,
    (state: any) => ({ settings: state.settings })
  );
  const { layoutMode } = useSelector(layoutData);
  const { settings } = useSelector(settingsData);

  /* Hydrate profile from localStorage on dashboard load (so saved edits survive refresh) */
  useEffect(() => {
    try {
      const authUser = getLoggedinUser();
      const saved = localStorage.getItem("devflow_profile_basicDetails");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          if (authUser?.photoURL) {
            const isDefaultAvatar = !parsed.profile || /avatar-?1|avatar1\.(jpg|jpeg|png)/i.test(String(parsed.profile));
            if (isDefaultAvatar) parsed.profile = authUser.profileImage || authUser.photoURL;
          }
          dispatch(setSettingsFromAuthUser(parsed));
          return;
        }
      }
      const hasAuthProfile = authUser && (authUser.firstName != null || authUser.photoURL);
      const settingsHasProfile = settings?.basicDetails?.firstName != null || settings?.basicDetails?.profile;
      if (hasAuthProfile && !settingsHasProfile) {
        dispatch(
          setSettingsFromAuthUser({
            firstName: authUser.firstName,
            lastName: authUser.lastName,
            fullName: authUser.displayName || (authUser.firstName && authUser.lastName ? `${authUser.firstName} ${authUser.lastName}` : undefined),
            profile: authUser.profileImage || authUser.photoURL,
            email: authUser.email,
          })
        );
      }
    } catch (_) {}
  }, [dispatch]);

  /*
  call dark/light mode
  */

  useEffect(() => {
    dispatch(changelayoutMode(layoutMode));
  }, [dispatch, layoutMode]);

  useEffect(() => {
    if (!location.search.includes("github=connected")) return;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
    if (!backendUrl) {
      dispatch(changeTab(TABS.GITHUB));
      navigate(location.pathname, { replace: true });
      return;
    }
    fetch(`${backendUrl}/auth/me.php`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && data.github_connected != null) {
          dispatch(setGithubStatus(!!data.github_connected, data.github_username ?? null));
        }
        dispatch(changeTab(TABS.GITHUB));
        navigate(location.pathname, { replace: true });
      })
      .catch(() => {
        dispatch(changeTab(TABS.GITHUB));
        navigate(location.pathname, { replace: true });
      });
  }, [location.search, location.pathname, dispatch, navigate]);

  const onChangeLayoutMode = (value: any) => {
    if (changelayoutMode) {
      dispatch(changelayoutMode(value));
    }
  };

  return (
    <FriendRequestsProvider>
      <div className="layout-wrapper d-lg-flex">
        {/* side menu */}
        <SideMenu onChangeLayoutMode={onChangeLayoutMode} />

        {props.children}
        <ToastContainer autoClose={2000} />
      </div>
    </FriendRequestsProvider>
  );
};

export default Index;
