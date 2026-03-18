import React from "react";
import { Container, Row, Col } from "reactstrap";
import { Link } from "react-router-dom";

import devflowLogo from "../assets/login-icons/Devflow-Logo.png";

const LogoIcon = () => (
  <img src={devflowLogo} alt="DevFlow" width={36} height={36} className="auth-logo-img me-2" />
);

interface NonAuthLayoutWrapperProps {
  children: any;
}

const NonAuthLayoutWrapper = (props: NonAuthLayoutWrapperProps) => {
  return (
    <div className="auth-bg auth-page-full-white">
      <Container fluid className="p-0 h-100">
        <Row className="g-0 justify-content-center min-vh-100">
          <Col xs={12} className="d-flex flex-column">
            <div className="authentication-page-content flex-grow-1 d-flex flex-column justify-content-center px-4 py-5">
              <div className="auth-page-logo text-start mb-4">
                <Link to="/" className="d-inline-flex align-items-center text-decoration-none text-dark auth-logo-link">
                  <LogoIcon />
                  <span className="fw-semibold fs-4 auth-logo-text">DevFlow</span>
                </Link>
              </div>
              {props.children}
              <div className="text-center text-muted mt-auto pt-4">
                <p className="mb-0">
                  &copy; {new Date().getFullYear()} DevFlow. Crafted with{" "}
                  <i className="mdi mdi-heart text-danger"></i>
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default NonAuthLayoutWrapper;
