import React from "react";
import { Modal, ModalBody, ModalHeader, Button } from "reactstrap";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

interface ConnectGitHubModalProps {
  isOpen: boolean;
  toggle: () => void;
}

const ConnectGitHubModal = ({ isOpen, toggle }: ConnectGitHubModalProps) => {
  const handleConnect = () => {
    if (!BACKEND_URL) return;
    window.location.href = `${BACKEND_URL.replace(/\/$/, "")}/auth/github/index.php`;
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered>
      <ModalHeader toggle={toggle}>Connect to GitHub</ModalHeader>
      <ModalBody className="text-center py-4">
        {!BACKEND_URL && (
          <p className="text-danger small mb-3">
            Backend URL is not set. Add VITE_BACKEND_URL to your .env (e.g. http://localhost/devflow-backend/backend).
          </p>
        )}
        <p className="text-muted mb-4">
          Connect your GitHub account to view your repositories, branches, and files in the dashboard.
        </p>
        <Button color="primary" onClick={handleConnect} className="px-4" disabled={!BACKEND_URL}>
          <i className="bx bxl-github me-2" />
          Connect with GitHub
        </Button>
      </ModalBody>
    </Modal>
  );
};

export default ConnectGitHubModal;
