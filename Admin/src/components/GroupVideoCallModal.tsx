import React, { useEffect, useMemo, useRef, useState } from "react";
import { createSelector } from "reselect";

import { isDemoMode } from "../demo";
import { useRedux } from "../hooks";
import VideoCallScreen, { createCallVideo, VideoCallTile } from "./VideoCallScreen";
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
  if (!isDemoMode && !localVideoRef.current) {
    localVideoRef.current = createCallVideo();
  }
  const sessionRef = useRef<WebRtcGroupVideoCallSession | null>(null);
  const startedRef = useRef(false);

  const [status, setStatus] = useState<VideoCallStatus>(
    direction === "incoming" ? "ringing" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [remoteTiles, setRemoteTiles] = useState<RemoteTile[]>([]);
  const [startedAt] = useState(() => new Date());
  const [demoFeedFor, setDemoFeedFor] = useState<((id: string | number) => any) | null>(null);

  const { useAppSelector } = useRedux();
  const friendData = createSelector(
    (state: any) => state.Chats,
    chats => ({ directMessages: chats.directMessages, favourites: chats.favourites }),
  );
  const { directMessages, favourites } = useAppSelector(friendData);

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
    if (isDemoMode) {
      // Live calling is off in the demo, so the screen shows sample feeds instead.
      const samples = await import("../demo/videoCallSamples");
      setDemoFeedFor(() => samples.demoFeedFor);
      setStatus("connected");
      return;
    }
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

  const friendsById = useMemo(() => {
    const byId = new Map<string, any>();
    [...(directMessages || []), ...(favourites || [])].forEach((friend: any) =>
      byId.set(String(friend.id), friend),
    );
    return byId;
  }, [directMessages, favourites]);

  const personTile = (id: string, stream?: MediaStream): VideoCallTile => {
    const member = (channel?.members || []).find((m: any) => String(m.id) === id);
    const friend = friendsById.get(id);
    const feed = demoFeedFor?.(id);
    return {
      id,
      name: fullNameOf(member || friend, caller && String(caller.id) === id ? fullNameOf(caller) : "Member"),
      avatar: friend?.profileImage || member?.profileImage,
      stream,
      sampleImage: feed?.image,
      sampleCrop: feed?.crop,
      sampleZoom: feed?.zoom,
      // Live calls only announce a stream, so these two show as on by default.
      micOn: isDemoMode ? (Number(id) + 1) % 3 !== 0 : true,
      cameraOn: isDemoMode ? !!feed : true,
    };
  };

  const myFeed = demoFeedFor?.(myId);
  const myTile: VideoCallTile = {
    id: myId || "me",
    name: fullNameOf(currentUser, "You"),
    avatar: currentUser?.profileImage,
    videoElement: localVideoRef.current,
    sampleImage: myFeed?.image,
    sampleCrop: myFeed?.crop,
    isLocal: true,
    micOn: micEnabled,
    cameraOn: cameraEnabled,
  };

  // Everyone else in the channel: those with a stream first, then the rest of the group.
  const remoteIds = remoteTiles.map(tile => tile.peerId);
  const otherTiles: VideoCallTile[] = isDemoMode
    ? participantIds
        .filter(id => id !== myId)
        .map(id => personTile(id))
        .sort((a, b) => Number(!!b.sampleImage) - Number(!!a.sampleImage))
    : remoteTiles.map(tile => personTile(tile.peerId, tile.stream));

  // The feed made for the big frame goes there first, when someone has it.
  const mainIndex = Math.max(
    0,
    otherTiles.findIndex(tile => demoFeedFor?.(tile.id)?.isMainFeed),
  );
  const mainTile = otherTiles[mainIndex] || null;
  const stripTiles = [
    myTile,
    ...otherTiles
      .filter((_, index) => index !== mainIndex)
      // Someone else matched to the big feed joins with their camera off, not as a double.
      .map(tile =>
        demoFeedFor?.(tile.id)?.isMainFeed
          ? { ...tile, sampleImage: undefined, sampleCrop: undefined, cameraOn: false }
          : tile,
      ),
  ];

  const title = channelName;
  const statusLine =
    status === "connected"
      ? remoteIds.length === 0 && !isDemoMode
        ? "Waiting for others to join"
        : undefined
      : statusText;

  if (!isOpen) return null;

  return (
    <VideoCallScreen
      title={title}
      startedAt={startedAt}
      roomCode={roomCodeFrom(`${channel?.id ?? incomingCall?.channelId ?? ""}${channelName}`)}
      meName={myTile.name}
      meRole={direction === "incoming" ? "Participant" : "Moderator"}
      meAvatar={currentUser?.profileImage}
      mainTile={mainTile}
      stripTiles={stripTiles}
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      isConnected={status === "connected"}
      statusText={mainTile ? statusLine : status === "connected" ? undefined : statusText}
      incomingPrompt={
        isIncomingPrompt ? { onAccept: acceptIncomingCall, onDecline: closeModal } : null
      }
      chat={{
        channelId: channel?.id ?? incomingCall?.channelId,
        personalUserId: mainTile?.id,
      }}
      onToggleMic={toggleMic}
      onToggleCamera={toggleCamera}
      onEnd={closeModal}
    />
  );
};

export default GroupVideoCallModal;

