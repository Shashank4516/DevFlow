import React from "react";
import { Navigate } from "react-router-dom";

import { useProfile } from "../hooks/index";
import { useSessionRestore } from "../contexts/SessionRestore.Context";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

const AuthProtected = (props: any) => {
  const { userProfile, loading } = useProfile();
  const { sessionCheckDone } = useSessionRestore();

  if (BACKEND_URL && !sessionCheckDone) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userProfile && loading) {
    return <Navigate to={{ pathname: "/auth-login" }} />;
  }

  return <>{props.children}</>;
};

export { AuthProtected };
