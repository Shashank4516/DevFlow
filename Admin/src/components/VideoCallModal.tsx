import React, { useEffect, useRef, useState } from "react";
import { Button, Modal, ModalBody } from "reactstrap";

//images
import imagePlaceholder from "../assets/images/users/user-dummy-img.jpg";
import {
  createOutgoingVideoCall,
  declineVideoCall,
  IncomingVideoCall,
  VideoCallStatus,
  WebRtcVideoCallSession,
} from "../helpers/webrtc_video_call";

interface VideoCallModalProps {
  user: any | null;
  currentUser?: any | null;
  isOpen: boolean;
  onClose: () => void;
  direction?: "outgoing" | "incoming";
  incomingCall?: IncomingVideoCall | null;
}

const VideoCallModal = ({
  isOpen,
  onClose,
  user,
  currentUser,
  direction = "outgoing",
  incomingCall = null,
}: VideoCallModalProps) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<WebRtcVideoCallSession | null>(null);
  const startedRef = useRef(false);
  const [status, setStatus] = useState<VideoCallStatus>(
    direction === "incoming" ? "ringing" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const peer = user || incomingCall?.caller || null;
  const displayName =
    peer?.displayName ||
    [peer?.firstName, peer?.lastName].filter(Boolean).join(" ") ||
    "Video call";

  const closeModal = async () => {
    if (sessionRef.current) {
      await sessionRef.current.end();
      sessionRef.current = null;
    } else if (direction === "incoming" && incomingCall?.id) {
      await declineVideoCall(incomingCall.id, currentUser?.id || currentUser?.uid);
    }
    onClose();
  };

  const createSession = (callId: string, peerId: string | number, role: "caller" | "receiver") => {
    if (!localVideoRef.current || !remoteVideoRef.current) {
      throw new Error("Video elements are not ready");
    }
    const myId = currentUser?.id || currentUser?.uid;
    if (!myId) {
      throw new Error("Current user id is missing. Please sign in again before starting a call.");
    }

    return new WebRtcVideoCallSession({
      callId,
      myId,
      peerId,
      role,
      localVideo: localVideoRef.current,
      remoteVideo: remoteVideoRef.current,
      onStatusChange: setStatus,
      onError: setError,
    });
  };

  const startOutgoingCall = async () => {
    if (!currentUser || !peer || startedRef.current) return;
    startedRef.current = true;
    setError(null);
    setStatus("connecting");

    try {
      const { callId, receiver } = await createOutgoingVideoCall({
        caller: currentUser,
        receiver: peer,
      });
      const session = createSession(callId, receiver.id, "caller");
      sessionRef.current = session;
      await session.startOutgoing();
    } catch (e: any) {
      setStatus("failed");
      setError(e?.message || "Could not start video call");
    }
  };

  const acceptIncomingCall = async () => {
    if (!currentUser || !incomingCall || startedRef.current) return;
    startedRef.current = true;
    setError(null);
    setStatus("connecting");

    try {
      const session = createSession(incomingCall.id, incomingCall.callerId, "receiver");
      sessionRef.current = session;
      await session.acceptIncoming();
    } catch (e: any) {
      setStatus("failed");
      setError(e?.message || "Could not accept video call");
    }
  };

  const toggleMic = () => {
    const enabled = !micEnabled;
    setMicEnabled(enabled);
    sessionRef.current?.setMicrophoneEnabled(enabled);
  };

  const toggleCamera = () => {
    const enabled = !cameraEnabled;
    setCameraEnabled(enabled);
    sessionRef.current?.setCameraEnabled(enabled);
  };

  useEffect(() => {
    if (!isOpen || direction !== "outgoing") return;
    startOutgoingCall();
    return () => {
      sessionRef.current?.cleanup(false);
      sessionRef.current = null;
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, direction]);

  const statusText =
    error ||
    (status === "ringing"
      ? direction === "incoming"
        ? "Incoming video call"
        : "Ringing..."
      : status === "connecting"
        ? "Connecting..."
        : status === "connected"
          ? "Connected"
          : status === "failed"
            ? "Call failed"
              : status === "declined"
                ? "Call declined"
                : status === "ended"
                  ? "Call ended"
                  : "Preparing call...");

  return (
    <Modal
      isOpen={isOpen}
      toggle={closeModal}
      tabIndex={-1}
      centered
      className="videocallModal"
      contentClassName="shadow-lg border-0"
      size="lg"
    >
      <ModalBody className="p-0 bg-dark">
        <div className="position-relative" style={{ minHeight: 520 }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-100 h-100"
            style={{ minHeight: 520, objectFit: "cover", background: "#111827" }}
          />

          {status !== "connected" && (
            <div className="position-absolute top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center">
              <div className="text-center text-white">
                <img
                  src={peer?.profileImage || imagePlaceholder}
                  alt=""
                  className="rounded-circle mb-3"
                  style={{ width: 96, height: 96, objectFit: "cover" }}
                />
                <h5 className="text-white mb-1">{displayName}</h5>
                <p className="mb-0 text-white-50">{statusText}</p>
              </div>
            </div>
          )}

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="position-absolute rounded shadow"
            style={{
              width: 160,
              height: 110,
              right: 16,
              top: 16,
              objectFit: "cover",
              background: "#000",
              border: "2px solid rgba(255,255,255,.5)",
            }}
          />

          <div className="position-absolute start-0 end-0 bottom-0">
            <div className="text-center pb-4">
              <div className="mb-3">
                <span className="badge bg-light text-dark">{statusText}</span>
              </div>
              {direction === "incoming" && status === "ringing" && !startedRef.current ? (
                <div className="d-flex justify-content-center align-items-center text-center">
                  <div className="avatar-md h-auto">
                    <Button
                      color="success"
                      type="button"
                      className="avatar-md rounded-circle"
                      onClick={acceptIncomingCall}
                    >
                      <span className="avatar-title bg-transparent font-size-24">
                        <i className="mdi mdi-phone"></i>
                      </span>
                    </Button>
                  </div>
                  <div className="avatar-md h-auto">
                    <Button
                      color="danger"
                      type="button"
                      className="avatar-md rounded-circle"
                      onClick={closeModal}
                    >
                      <span className="avatar-title bg-transparent font-size-24">
                        <i className="mdi mdi-phone-hangup"></i>
                      </span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="d-flex justify-content-center align-items-center text-center">
                  <div className="avatar-md h-auto">
                    <Button
                      color={micEnabled ? "light" : "warning"}
                      type="button"
                      className="avatar-sm rounded-circle"
                      onClick={toggleMic}
                    >
                      <span className="avatar-title bg-transparent text-muted font-size-20">
                        <i className={micEnabled ? "bx bx-microphone" : "bx bx-microphone-off"}></i>
                      </span>
                    </Button>
                  </div>
                  <div className="avatar-md h-auto">
                    <Button
                      color={cameraEnabled ? "light" : "warning"}
                      type="button"
                      className="avatar-sm rounded-circle"
                      onClick={toggleCamera}
                    >
                      <span className="avatar-title bg-transparent text-muted font-size-20">
                        <i className={cameraEnabled ? "bx bx-video" : "bx bx-video-off"}></i>
                      </span>
                    </Button>
                  </div>
                  <div className="avatar-md h-auto">
                    <Button
                      color="danger"
                      type="button"
                      className="avatar-md call-close-btn rounded-circle"
                      onClick={closeModal}
                    >
                      <span className="avatar-title bg-transparent font-size-24">
                        <i className="mdi mdi-phone-hangup"></i>
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-primary">
              <div className="text-white text-center">
                <h5 className="font-size-18 text-truncate mb-0 text-white">
                  {displayName}
                </h5>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default VideoCallModal;
