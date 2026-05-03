import React from "react";

import { Button } from "reactstrap";
interface EndButtonsProps {
  onSubmit: () => void;
  disabled: boolean;
  onToggleRecording: () => void;
  isRecording: boolean;
  recordingDisabled?: boolean;
}
const EndButtons = ({
  onSubmit,
  disabled,
  onToggleRecording,
  isRecording,
  recordingDisabled,
}: EndButtonsProps) => {
  return (
    <div className="chat-input-links ms-2 gap-md-1">
      <div className="links-list-item d-none d-sm-block">
        <Button
          color={isRecording ? "danger" : "none"}
          type="button"
          className={
            isRecording
              ? "btn btn-danger btn-lg waves-effect rounded-circle"
              : "btn btn-link text-decoration-none btn-lg waves-effect"
          }
          onClick={onToggleRecording}
          disabled={!!recordingDisabled}
          title={isRecording ? "Stop voice recording" : "Record voice message"}
        >
          <i className={isRecording ? "bx bx-stop align-middle" : "bx bx-microphone align-middle"}></i>
        </Button>
      </div>
      <div className="links-list-item">
        <Button
          color="primary"
          type="submit"
          disabled={disabled}
          className="btn btn-primary btn-lg chat-send waves-effect waves-light"
          onClick={onSubmit}
        >
          <i className="bx bxs-send align-middle"></i>
        </Button>
      </div>
    </div>
  );
};

export default EndButtons;
