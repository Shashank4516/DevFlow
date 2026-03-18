import React from "react";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}
const AuthHeader = ({ title, subtitle }: AuthHeaderProps) => {
  return (
    <div className="auth-header text-center mb-5">
      <h3 className="auth-header-title">{title}</h3>
      {subtitle && <p className="auth-header-subtitle text-muted">{subtitle}</p>}
    </div>
  );
};

export default AuthHeader;
