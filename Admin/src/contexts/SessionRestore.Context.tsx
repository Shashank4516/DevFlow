import React, { createContext, useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { authLoginApiResponseSuccess } from "../redux/auth/login/actions";
import { AuthLoginActionTypes } from "../redux/auth/login/types";
import { setSettingsFromAuthUser, setGithubStatus } from "../redux/actions";
import { setLoggeedInUser } from "../helpers/firebase_helper";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

type SessionRestoreContextType = {
  sessionCheckDone: boolean;
};

const SessionRestoreContext = createContext<SessionRestoreContextType>({
  sessionCheckDone: false,
});

export const useSessionRestore = () => useContext(SessionRestoreContext);

export const SessionRestoreProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const [sessionCheckDone, setSessionCheckDone] = useState(!BACKEND_URL);

  useEffect(() => {
    if (!BACKEND_URL) {
      setSessionCheckDone(true);
      return;
    }
    const restore = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/me.php`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const user = data.user;
          const basicDetails = data.basicDetails;
          if (user) {
            setLoggeedInUser(user);
            if (basicDetails) {
              dispatch(setSettingsFromAuthUser(basicDetails));
            }
            dispatch(
              authLoginApiResponseSuccess(AuthLoginActionTypes.LOGIN_USER, user)
            );
            if (data.github_connected != null) {
              dispatch(setGithubStatus(!!data.github_connected, data.github_username ?? null));
            }
          }
        } else {
          localStorage.removeItem("authUser");
        }
      } catch {
        localStorage.removeItem("authUser");
      } finally {
        setSessionCheckDone(true);
      }
    };
    restore();
  }, [dispatch]);

  return (
    <SessionRestoreContext.Provider value={{ sessionCheckDone }}>
      {children}
    </SessionRestoreContext.Provider>
  );
};