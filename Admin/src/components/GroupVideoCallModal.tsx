import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, ModalBody } from "reactstrap";

import imagePlaceholder from "../assets/images/users/user-dummy-img.jpg";
import {
  createOutgoingGroupVideoCall,
  declineGroupVideoCall,
  IncomingGroupVideoCall,
  VideoCallStatus,
  WebRtcGroupVideoCallSession,
} from "../helpers/webrtc_video_call";

type RemoteTile = {
  peerId: string;
  stream: MediaStream;
};

interface GroupVideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: any | null;
  currentUser?: any | null;
  direction?: "outgoing" | "incoming";
  incomingCall?: IncomingGroupVideoCall | null;
}

const GroupVideoCallModal = ({
  isOpen,
  onClose,
  channel,
  currentUser,
  direction = "outgoing",
  incomingCall = null,
}: GroupVideoCallModalProps) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<WebRtcGroupVideoCallSession | null>(null);
  const startedRef = useRef(false);

  const [status, setStatus] = useState<VideoCallStatus>(
    direction === "incoming" ? "ringing" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [remoteTiles, setRemoteTiles] = useState<RemoteTile[]>([]);

  const channelName =
    String(channel?.name || incomingCall?.channelName || "Group call").trim() || "Group call";
  const caller = incomingCall?.caller || null;
  const myId = String(currentUser?.id || currentUser?.uid || "");

  const participantIds = useMemo(() => {
    const ids = new Set<string>();
    (channel?.members || []).forEach((m: any) => {
      const id = String(m?.id || "");
      if (id) ids.add(id);
    });
    if (myId) ids.add(myId);
    return Array.from(ids);
  }, [channel?.members, myId]);

  const closeModal = async () => {
    try {
      if (sessionRef.current) {
        await sessionRef.current.end();
        sessionRef.current = null;
      } else if (direction === "incoming" && incomingCall?.id && myId) {
        await declineGroupVideoCall(incomingCall.id, myId);
      }
    } finally {
      startedRef.current = false;
      setRemoteTiles([]);
      onClose();
    }
  };

  const upsertRemoteTile = (peerId: string, stream: MediaStream) => {
    setRemoteTiles(prev => {
      const next = [...prev];
      const idx = next.findIndex(t => t.peerId === peerId);
      if (idx >= 0) next[idx] = { peerId, stream };
      else next.push({ peerId, stream });
      return next;
    });
  };

  const createSession = (callId: string, channelId: string | number, isCaller: boolean) => {
    if (!localVideoRef.current) throw new Error("Video elements are not ready");
    if (!myId) {
      throw new Error("Current user id is missing. Please sign in again before starting a call.");
    }
    return new WebRtcGroupVideoCallSession({
      callId,
      channelId,
      myId,
      localVideo: localVideoRef.current,
      isCaller,
      onStatusChange: setStatus,
      onError: setError,
      onRemoteStream: update => upsertRemoteTile(update.peerId, update.stream),
    });
  };

  const startOutgoingCall = async () => {
    if (!currentUser || !channel || startedRef.current) return;
    startedRef.current = true;
    setError(null);
    setStatus("connecting");

    try {
      const { callId, channelId } = await createOutgoingGroupVideoCall({
        channelId: channel.id,
        channelName: channel.name,
        caller: currentUser,
        participants: participantIds,
      });
      const session = createSession(callId, channelId, true);
      sessionRef.current = session;
      await session.join();
    } catch (e: any) {
      setStatus("failed");
      setError(e?.message || "Could not start group video call");
    }
  };

  const acceptIncomingCall = async () => {
    if (!currentUser || !incomingCall || startedRef.current) return;
    startedRef.current = true;
    setError(null);
    setStatus("connecting");

    try {
      const session = createSession(incomingCall.id, incomingCall.channelId, false);
      sessionRef.current = session;
      await session.join();
    } catch (e: any) {
      setStatus("failed");
      setError(e?.message || "Could not join group video call");
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
    if (!isOpen) return;
    if (direction === "outgoing") {
      startOutgoingCall();
    }
    return () => {
      sessionRef.current?.cleanup(false);
      sessionRef.current = null;
      startedRef.current = false;
      setRemoteTiles([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, direction]);

  const statusText =
    error ||
    (status === "ringing"
      ? direction === "incoming"
        ? "Incoming group video call"
        : "Ringing..."
      : status === "connecting"
        ? "Connecting..."
        : status === "connected"
          ? "Connected"
          : status === "failed"
            ? "Call failed"
            : status === "ended"
              ? "Call ended"
              : "Preparing call...");

  const isIncomingPrompt =
    direction === "incoming" && status === "ringing" && !startedRef.current;

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
          <div className="w-100 h-100 d-flex flex-column">
            <div className="d-flex align-items-center justify-content-between px-4 pt-4">
              <div className="text-white" style={{ minWidth: 0 }}>
                <h5 className="mb-0 text-truncate">{channelName}</h5>
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
              <div className="d-flex align-items-center gap-2">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="d-block"
                  style={{
                    width: 180,
                    height: 110,
                    objectFit: "cover",
                    background: "#020617",
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,.22)",
                    boxShadow: "0 16px 44px rgba(0, 0, 0, .45)",
                  }}
                />
              </div>
            </div>

            <div className="flex-grow-1 px-4 pb-4 pt-3">
              <div
                className="h-100"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12,
                  alignContent: "start",
                }}
              >
                {remoteTiles.length === 0 ? (
                  <div
                    className="d-flex align-items-center justify-content-center text-center text-white"
                    style={{
                      gridColumn: "1 / -1",
                      borderRadius: 22,
                      background: "rgba(15, 23, 42, .45)",
                      border: "1px solid rgba(255, 255, 255, .1)",
                      padding: 28,
                    }}
                  >
                    <div style={{ maxWidth: 420 }}>
                      <img
                        src={caller?.profileImage || imagePlaceholder}
                        alt=""
                        className="rounded-circle mb-3"
                        style={{
                          width: 96,
                          height: 96,
                          objectFit: "cover",
                          border: "4px solid rgba(255, 255, 255, .16)",
                        }}
                      />
                      <h4 className="text-white mb-1">{channelName}</h4>
                      <p className="mb-0 text-white-50">
                        {isIncomingPrompt ? "Tap accept to join." : "Waiting for others to join…"}
                      </p>
                    </div>
                  </div>
                ) : (
                  remoteTiles.map(tile => (
                    <div
                      key={tile.peerId}
                      className="position-relative overflow-hidden"
                      style={{
                        borderRadius: 22,
                        background: "#050816",
                        border: "1px solid rgba(255, 255, 255, .12)",
                      }}
                    >
                      <video
                        autoPlay
                        playsInline
                        ref={el => {
                          if (!el) return;
                          if (el.srcObject !== tile.stream) {
                            el.srcObject = tile.stream;
                            el.play().catch(() => {});
                          }
                        }}
                        className="w-100 h-100 d-block"
                        style={{ objectFit: "cover", minHeight: 220 }}
                      />
                      <div
                        className="position-absolute bottom-0 start-0 end-0 px-3 py-2"
                        style={{
                          background:
                            "linear-gradient(0deg, rgba(2, 6, 23, .78), rgba(2, 6, 23, 0))",
                          color: "rgba(255,255,255,.85)",
                          fontSize: 12,
                        }}
                      >
                        {tile.peerId}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div
            className="position-absolute start-0 end-0 bottom-0"
            style={{
              padding: "18px 24px 24px",
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
                    aria-label="Accept group video call"
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
                    aria-label="Decline group video call"
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
                      background: micEnabled ? "rgba(255, 255, 255, .14)" : "#f59e0b",
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
                      background: cameraEnabled ? "rgba(255, 255, 255, .14)" : "#f59e0b",
                      color: "#fff",
                    }}
                    aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  >
                    <i
                      className={
                        cameraEnabled ? "bx bx-video font-size-22" : "bx bx-video-off font-size-22"
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
                    aria-label="End group video call"
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

export default GroupVideoCallModal;

