import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { authLoginApiResponseSuccess } from "../../redux/auth/login/actions";
import { AuthLoginActionTypes } from "../../redux/auth/login/types";
import { setSettingsFromAuthUser, setGithubStatus } from "../../redux/actions";
import { setLoggeedInUser } from "../../helpers/firebase_helper";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

const LoginCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!BACKEND_URL) {
        setStatus("error");
        setError("Backend URL not set");
        navigate("/auth-login", { replace: true });
        return;
      }
      try {
        const res = await fetch(`${BACKEND_URL}/auth/me.php`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          setStatus("error");
          setError("Not logged in");
          navigate("/auth-login", { replace: true });
          return;
        }
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
        setStatus("ok");
        const hasGitHub = data.github_connected === true;
        navigate(hasGitHub ? "/?github=connected" : "/", { replace: true });
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Request failed");
        navigate("/auth-login", { replace: true });
      }
    };
    run();
  }, [dispatch, navigate]);

  if (status === "loading") {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center text-danger">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return null;
};

export default LoginCallback;
