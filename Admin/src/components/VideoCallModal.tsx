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
  const isIncomingPrompt =
    direction === "incoming" && status === "ringing" && !startedRef.current;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <Modal
      isOpen={isOpen}
      toggle={closeModal}
      tabIndex={-1}
      centered
      className="videocallModal video-call-meet-modal"
      contentClassName="border-0 bg-transparent shadow-none"
      size="xl"
    >
      <ModalBody className="p-0">
        <div
          className="position-relative overflow-hidden"
          style={{
            height: "min(82vh, 760px)",
            minHeight: 560,
            borderRadius: 28,
            background:
              "radial-gradient(circle at top, #1f2937 0, #111827 42%, #020617 100%)",
            boxShadow: "0 28px 90px rgba(0, 0, 0, .55)",
          }}
        >
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-100 h-100 d-block"
            style={{
              objectFit: "contain",
              background: "#050816",
            }}
          />

          <div
            className="position-absolute top-0 start-0 end-0"
            style={{
              height: 136,
              background:
                "linear-gradient(180deg, rgba(2, 6, 23, .82), rgba(2, 6, 23, 0))",
              pointerEvents: "none",
            }}
          />

          <div
            className="position-absolute d-flex align-items-center gap-3"
            style={{
              top: 20,
              left: 22,
              right: 270,
              minWidth: 0,
            }}
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-circle text-white fw-semibold"
              style={{
                width: 44,
                height: 44,
                background: "linear-gradient(135deg, #5865f2, #22c55e)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, .35)",
              }}
            >
              {initials || <i className="bx bx-user"></i>}
            </div>
            <div style={{ minWidth: 0 }}>
              <h5 className="text-white mb-0 text-truncate">{displayName}</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span
                  className="rounded-circle"
                  style={{
                    width: 8,
                    height: 8,
                    background: status === "connected" ? "#22c55e" : "#f59e0b",
                    boxShadow:
                      status === "connected"
                        ? "0 0 0 4px rgba(34, 197, 94, .18)"
                        : "0 0 0 4px rgba(245, 158, 11, .16)",
                  }}
                />
                <span className="text-white-50 small">{statusText}</span>
              </div>
            </div>
          </div>

          {status !== "connected" && (
            <div className="position-absolute top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center px-4">
              <div
                className="text-center text-white"
                style={{
                  maxWidth: 420,
                  padding: "34px 38px",
                  borderRadius: 28,
                  background: "rgba(15, 23, 42, .68)",
                  border: "1px solid rgba(255, 255, 255, .1)",
                  boxShadow: "0 24px 70px rgba(0, 0, 0, .36)",
                  backdropFilter: "blur(18px)",
                }}
              >
                <img
                  src={peer?.profileImage || imagePlaceholder}
                  alt=""
                  className="rounded-circle mb-4"
                  style={{
                    width: 112,
                    height: 112,
                    objectFit: "cover",
                    border: "4px solid rgba(255, 255, 255, .16)",
                  }}
                />
                <h4 className="text-white mb-2">{displayName}</h4>
                <p className="mb-0 text-white-50">{statusText}</p>
              </div>
            </div>
          )}

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="position-absolute d-block"
            style={{
              width: "min(24vw, 236px)",
              height: "min(15vw, 148px)",
              minWidth: 164,
              minHeight: 106,
              right: 22,
              top: 20,
              objectFit: "cover",
              background: "#020617",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,.22)",
              boxShadow: "0 16px 44px rgba(0, 0, 0, .45)",
            }}
          />

          <div
            className="position-absolute start-0 end-0 bottom-0"
            style={{
              padding: "84px 24px 28px",
              background:
                "linear-gradient(0deg, rgba(2, 6, 23, .88), rgba(2, 6, 23, 0))",
            }}
          >
            <div className="d-flex justify-content-center">
              {isIncomingPrompt ? (
                <div
                  className="d-flex align-items-center gap-3 px-3 py-3"
                  style={{
                    borderRadius: 999,
                    background: "rgba(15, 23, 42, .74)",
                    border: "1px solid rgba(255, 255, 255, .12)",
                    backdropFilter: "blur(16px)",
                    boxShadow: "0 20px 50px rgba(0, 0, 0, .38)",
                  }}
                >
                  <Button
                    color="success"
                    type="button"
                    className="rounded-circle border-0 d-flex align-items-center justify-content-center"
                    onClick={acceptIncomingCall}
                    style={{
                      width: 62,
                      height: 62,
                      background: "#22c55e",
                      boxShadow: "0 10px 28px rgba(34, 197, 94, .34)",
                    }}
                    aria-label="Accept video call"
                  >
                    <i className="mdi mdi-phone font-size-26"></i>
                  </Button>
                  <Button
                    color="danger"
                    type="button"
                    className="rounded-circle border-0 d-flex align-items-center justify-content-center"
                    onClick={closeModal}
                    style={{
                      width: 62,
                      height: 62,
                      background: "#ef4444",
                      boxShadow: "0 10px 28px rgba(239, 68, 68, .34)",
                    }}
                    aria-label="Decline video call"
                  >
                    <i className="mdi mdi-phone-hangup font-size-26"></i>
                  </Button>
                </div>
              ) : (
                <div
                  className="d-flex align-items-center gap-3 px-3 py-3"
                  style={{
                    borderRadius: 999,
                    background: "rgba(15, 23, 42, .74)",
                    border: "1px solid rgba(255, 255, 255, .12)",
                    backdropFilter: "blur(16px)",
                    boxShadow: "0 20px 50px rgba(0, 0, 0, .38)",
                  }}
                >
                  <Button
                    type="button"
                    className="rounded-circle border-0 d-flex align-items-center justify-content-center"
                    onClick={toggleMic}
                    style={{
                      width: 54,
                      height: 54,
                      background: micEnabled
                        ? "rgba(255, 255, 255, .14)"
                        : "#f59e0b",
                      color: "#fff",
                    }}
                    aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
                  >
                    <i
                      className={
                        micEnabled
                          ? "bx bx-microphone font-size-22"
                          : "bx bx-microphone-off font-size-22"
                      }
                    ></i>
                  </Button>
                  <Button
                    type="button"
                    className="rounded-circle border-0 d-flex align-items-center justify-content-center"
                    onClick={toggleCamera}
                    style={{
                      width: 54,
                      height: 54,
                      background: cameraEnabled
                        ? "rgba(255, 255, 255, .14)"
                        : "#f59e0b",
                      color: "#fff",
                    }}
                    aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  >
                    <i
                      className={
                        cameraEnabled
                          ? "bx bx-video font-size-22"
                          : "bx bx-video-off font-size-22"
                      }
                    ></i>
                  </Button>
                  <Button
                    type="button"
                    className="rounded-circle border-0 d-flex align-items-center justify-content-center"
                    onClick={closeModal}
                    style={{
                      width: 66,
                      height: 66,
                      background: "#ef4444",
                      color: "#fff",
                      boxShadow: "0 12px 30px rgba(239, 68, 68, .36)",
                    }}
                    aria-label="End video call"
                  >
                    <i className="mdi mdi-phone-hangup font-size-28"></i>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default VideoCallModal;
