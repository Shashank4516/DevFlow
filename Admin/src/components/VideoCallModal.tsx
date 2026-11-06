import React, { useEffect, useMemo, useRef, useState } from "react";

import { isDemoMode } from "../demo";
import VideoCallScreen, { createCallVideo, VideoCallTile } from "./VideoCallScreen";
import {
  createOutgoingVideoCall,
  declineVideoCall,
  IncomingVideoCall,
  VideoCallStatus,
  WebRtcVideoCallSession,
} from "../helpers/webrtc_video_call";


const fullNameOf = (person: any, fallback = "Unknown") =>
  person?.displayName ||
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
  fallback;

const roomCodeFrom = (seed: string) => {
  // Always the same code for the same call, in the design's xxx-xxxx-xxx form.
  let hash = 0;
  const letters = Array.from({ length: 10 }, (_, index) => {
    for (const char of `${seed}${index}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return String.fromCharCode(97 + (hash % 26));
  }).join("");
  return `${letters.slice(0, 3)}-${letters.slice(3, 7)}-${letters.slice(7)}`;
};

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
  if (!isDemoMode && !localVideoRef.current) {
    localVideoRef.current = createCallVideo();
    remoteVideoRef.current = createCallVideo();
  }
  const sessionRef = useRef<WebRtcVideoCallSession | null>(null);
  const startedRef = useRef(false);
  const [status, setStatus] = useState<VideoCallStatus>(
    direction === "incoming" ? "ringing" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [startedAt] = useState(() => new Date());
  const [demoFeeds, setDemoFeeds] = useState<{ peer: any; me: any } | null>(null);

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
    if (isDemoMode) {
      // Live calling is off in the demo, so the screen shows sample feeds instead.
      const { demoFeedFor } = await import("../demo/videoCallSamples");
      setDemoFeeds({
        peer: demoFeedFor(peer.id ?? peer.uid),
        me: demoFeedFor(currentUser.id ?? currentUser.uid),
      });
      setStatus("connected");
      return;
    }
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

  const mainTile = useMemo<VideoCallTile | null>(
    () =>
      peer && {
        id: String(peer.id ?? peer.uid ?? "peer"),
        name: displayName,
        avatar: peer.profileImage,
        videoElement: remoteVideoRef.current,
        sampleImage: demoFeeds?.peer?.image,
        sampleCrop: demoFeeds?.peer?.crop,
        sampleZoom: demoFeeds?.peer?.zoom,
        micOn: true,
        cameraOn: !isDemoMode || !!demoFeeds?.peer,
      },
    [peer, displayName, demoFeeds],
  );
  const myTile = useMemo<VideoCallTile>(
    () => ({
      id: String(currentUser?.id ?? currentUser?.uid ?? "me"),
      name: fullNameOf(currentUser, "You"),
      avatar: currentUser?.profileImage,
      videoElement: localVideoRef.current,
      sampleImage: demoFeeds?.me?.image,
      sampleCrop: demoFeeds?.me?.crop,
      isLocal: true,
      micOn: micEnabled,
      cameraOn: cameraEnabled,
    }),
    [currentUser, demoFeeds, micEnabled, cameraEnabled],
  );

  if (!isOpen) return null;

  return (
    <VideoCallScreen
      title={`Video call with ${displayName}`}
      startedAt={startedAt}
      roomCode={roomCodeFrom(`${myTile.id}${peer?.id ?? peer?.uid ?? ""}${incomingCall?.id ?? ""}`)}
      meName={myTile.name}
      meRole={direction === "incoming" ? "Participant" : "Moderator"}
      meAvatar={currentUser?.profileImage}
      mainTile={mainTile}
      stripTiles={[myTile]}
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      isConnected={status === "connected"}
      statusText={status === "connected" ? undefined : statusText}
      incomingPrompt={
        isIncomingPrompt ? { onAccept: acceptIncomingCall, onDecline: closeModal } : null
      }
      chat={{ personalUserId: peer?.id ?? peer?.uid }}
      onToggleMic={toggleMic}
      onToggleCamera={toggleCamera}
      onEnd={closeModal}
    />
  );
};

export default VideoCallModal;
