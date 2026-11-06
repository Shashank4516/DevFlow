import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import classnames from "classnames";
import { format } from "date-fns";
import { toast } from "react-toastify";

// Bundled so that the screen keeps its exact font without an internet connection.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";

import {
  getChannelMessages,
  getChatUserConversations,
  sendChannelMessage,
  sendMessage,
  uploadMessageAttachment,
} from "../api/chats";

import logo from "../assets/login-icons/Devflow-Logo.png";
import placeholderAvatar from "../assets/images/users/user-dummy-img.jpg";
import chevronIcon from "../assets/images/video-call/chevron.svg";
import headerLine from "../assets/images/video-call/header-line.svg";
import kebabIcon from "../assets/images/video-call/kebab.svg";
import linkIcon from "../assets/images/video-call/link.svg";
import maximizeIcon from "../assets/images/video-call/maximize.svg";
import messageIcon from "../assets/images/video-call/message.svg";
import micIcon from "../assets/images/video-call/mic.svg";
import micPartIcon from "../assets/images/video-call/mic-part.svg";
import micSlashSmallIcon from "../assets/images/video-call/mic-slash-small.svg";
import micSmallIcon from "../assets/images/video-call/mic-small.svg";
import moreIcon from "../assets/images/video-call/more.svg";
import paperclipIcon from "../assets/images/video-call/paperclip.svg";
import plusCircle from "../assets/images/video-call/plus-circle.svg";
import recDot from "../assets/images/video-call/rec-dot.svg";
import recordCircleIcon from "../assets/images/video-call/record-circle.svg";
import recordDotIcon from "../assets/images/video-call/record-dot.svg";
import ringInner from "../assets/images/video-call/ring-inner.svg";
import ringOuter from "../assets/images/video-call/ring-outer.svg";
import rowMicIcon from "../assets/images/video-call/row-mic.svg";
import rowMicOffIcon from "../assets/images/video-call/row-mic-off.svg";
import rowVideoIcon from "../assets/images/video-call/row-video.svg";
import rowVideoOffIcon from "../assets/images/video-call/row-video-off.svg";
import sendIcon from "../assets/images/video-call/send.svg";
import shareIcon from "../assets/images/video-call/share.svg";
import soundIcon from "../assets/images/video-call/sound.svg";
import typingDots from "../assets/images/video-call/typing.svg";
import userAddIcon from "../assets/images/video-call/user-add.svg";
import videoIcon from "../assets/images/video-call/video.svg";

const DESIGN_WIDTH = 1728;
const DESIGN_HEIGHT = 1117;
const COMPACT_BELOW = 992;

export type VideoCallCrop = { left: number; top: number; width: number; height: number };

export type VideoCallTile = {
  id: string;
  name: string;
  /** Profile photo, shown whenever there is no video to show. */
  avatar?: string;
  /** The live video element that the WebRTC session plays into. See createCallVideo. */
  videoElement?: HTMLVideoElement | null;
  /** A live remote stream. */
  stream?: MediaStream;
  /** A still sample feed, used in demo mode. */
  sampleImage?: string;
  /** Position of the sample feed, in percent of the tile. */
  sampleCrop?: VideoCallCrop;
  /** Zoom for the small window, for a sample whose edges shouldn't show. */
  sampleZoom?: number;
  isLocal?: boolean;
  micOn: boolean;
  cameraOn: boolean;
};

export type VideoCallChat = {
  channelId?: string | number;
  personalUserId?: string | number;
};

interface VideoCallScreenProps {
  title: string;
  startedAt: Date;
  roomCode: string;
  meName: string;
  meRole: string;
  meAvatar?: string;
  mainTile: VideoCallTile | null;
  stripTiles: VideoCallTile[];
  micEnabled: boolean;
  cameraEnabled: boolean;
  isConnected: boolean;
  /** Shown over the main video while the call is not connected yet. */
  statusText?: string;
  incomingPrompt?: { onAccept: () => void; onDecline: () => void } | null;
  chat: VideoCallChat;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
}

const useScreenFit = () => {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isCompact = size.width < COMPACT_BELOW;
  const scale = isCompact
    ? 1
    : Math.min(size.width / DESIGN_WIDTH, size.height / DESIGN_HEIGHT);
  return {
    isCompact,
    canvasStyle: isCompact
      ? undefined
      : {
          // The canvas fills the window, in design pixels, and is scaled down to fit.
          width: size.width / scale,
          height: size.height / scale,
          transform: `scale(${scale})`,
        },
  };
};

const useElapsedTime = (from: Date, isRunning: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isRunning) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);
  if (!isRunning) return "00:00:00";
  const seconds = Math.max(0, Math.floor((now - from.getTime()) / 1000));
  return [seconds / 3600, (seconds % 3600) / 60, seconds % 60]
    .map(part => String(Math.floor(part)).padStart(2, "0"))
    .join(":");
};

/**
 * The session holds on to its video element for the whole call, so the element is made
 * once and moved between the floating window and the full screen. Re-creating it would
 * cut the picture off every time the view changes.
 */
export const createCallVideo = () => {
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  return video;
};

const VideoSlot = ({
  video,
  muted,
  hidden,
  mirrored,
}: {
  video: HTMLVideoElement;
  muted: boolean;
  hidden: boolean;
  mirrored: boolean;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    video.className = "vc-tile__video";
    hostRef.current?.appendChild(video);
    // Moving a video element in the page pauses it.
    video.play().catch(() => {});
  }, [video]);
  useEffect(() => {
    video.muted = muted;
    video.classList.toggle("is-hidden", hidden);
    video.classList.toggle("is-mirrored", mirrored);
  }, [video, muted, hidden, mirrored]);
  return <div ref={hostRef} className="vc-tile__video-slot" />;
};

const StreamVideo = ({ stream, muted }: { stream: MediaStream; muted: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className="vc-tile__video" />;
};

const TileMedia = ({
  tile,
  speakerMuted,
  useCrop = true,
}: {
  tile: VideoCallTile;
  speakerMuted: boolean;
  /** Sample feeds are framed for the full screen. The window just fills its tile. */
  useCrop?: boolean;
}) => {
  const muted = !!tile.isLocal || speakerMuted;
  const showVideo = tile.cameraOn;
  const hasSample = !!tile.sampleImage && showVideo;
  const crop = useCrop ? tile.sampleCrop : undefined;
  return (
    <>
      {tile.videoElement && (
        <VideoSlot
          video={tile.videoElement}
          muted={muted}
          hidden={!showVideo}
          mirrored={!!tile.isLocal}
        />
      )}
      {tile.stream && showVideo && <StreamVideo stream={tile.stream} muted={muted} />}
      {hasSample && (
        <img
          src={tile.sampleImage}
          alt=""
          className="vc-tile__sample"
          style={
            crop
              ? {
                  left: `${crop.left}%`,
                  top: `${crop.top}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`,
                }
              : tile.sampleZoom
                ? { transform: `scale(${tile.sampleZoom})` }
                : undefined
          }
        />
      )}
      {((!tile.videoElement && !tile.stream && !hasSample) ||
        (!showVideo && (tile.videoElement || tile.stream))) && (
        <div className="vc-tile__no-video">
          <img src={tile.avatar || placeholderAvatar} alt="" />
        </div>
      )}
    </>
  );
};

type ChatTab = "group" | "personal";

const useCallChat = (chat: VideoCallChat, tab: ChatTab) => {
  const [messages, setMessages] = useState<any[]>([]);
  const channelId = tab === "group" ? chat.channelId : undefined;
  const userId = tab === "personal" ? chat.personalUserId : undefined;

  const load = useCallback(async () => {
    try {
      let data: any = null;
      if (channelId != null) data = await getChannelMessages(channelId);
      else if (userId != null) data = await getChatUserConversations(userId);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch {
      // The next poll tries again. The call itself must not be affected.
    }
  }, [channelId, userId]);

  useEffect(() => {
    setMessages([]);
    load();
    const id = window.setInterval(load, 2500);
    return () => window.clearInterval(id);
  }, [load]);

  const send = useCallback(
    async (text: string, attachments: any[] = []) => {
      if (channelId != null) {
        await sendChannelMessage({ channel_id: channelId, text, attachments });
      } else if (userId != null) {
        await sendMessage({ to_user_id: userId, text, attachments });
      }
      await load();
    },
    [channelId, userId, load],
  );

  return { messages, send, canChat: channelId != null || userId != null };
};

type FullScreenProps = VideoCallScreenProps & {
  speakerMuted: boolean;
  onToggleSpeaker: () => void;
  onMinimize: () => void;
};

const VideoCallFullScreen = ({
  title,
  startedAt,
  roomCode,
  meName,
  meRole,
  meAvatar,
  mainTile,
  stripTiles,
  micEnabled,
  cameraEnabled,
  isConnected,
  statusText,
  incomingPrompt,
  chat,
  onToggleMic,
  onToggleCamera,
  onEnd,
  speakerMuted,
  onToggleSpeaker,
  onMinimize,
}: FullScreenProps) => {
  const { isCompact, canvasStyle } = useScreenFit();
  const elapsed = useElapsedTime(startedAt, isConnected);

  const [participantsOpen, setParticipantsOpen] = useState(true);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isRecording] = useState(false);

  const [chatTab, setChatTab] = useState<ChatTab>(chat.channelId != null ? "group" : "personal");
  const { messages, send, canChat } = useCallChat(chat, chatTab);
  const [draft, setDraft] = useState("");
  const [awaitingReply, setAwaitingReply] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(0);

  const participants = useMemo(
    () => [...(mainTile ? [mainTile] : []), ...stripTiles],
    [mainTile, stripTiles],
  );
  const peopleById = useMemo(() => {
    const byId = new Map<string, VideoCallTile>();
    participants.forEach(person => byId.set(String(person.id), person));
    return byId;
  }, [participants]);

  // Participant strip: the bar under it shows how far it has been scrolled.
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripBar, setStripBar] = useState({ show: false, left: 0, width: 100 });
  const updateStripBar = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const { scrollWidth, clientWidth, scrollLeft } = strip;
    setStripBar({
      show: scrollWidth > clientWidth + 1,
      left: (scrollLeft / scrollWidth) * 100,
      width: (clientWidth / scrollWidth) * 100,
    });
  }, []);
  useEffect(updateStripBar, [updateStripBar, stripTiles.length, canvasStyle?.width]);

  // Participants list: same idea, with the vertical bar beside it.
  const listRef = useRef<HTMLDivElement>(null);
  const [listBar, setListBar] = useState({ show: false, top: 0, height: 100 });
  const updateListBar = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const { scrollHeight, clientHeight, scrollTop } = list;
    setListBar({
      show: scrollHeight > clientHeight + 1,
      top: (scrollTop / scrollHeight) * 100,
      height: (clientHeight / scrollHeight) * 100,
    });
  }, []);
  useEffect(updateListBar, [updateListBar, participants.length, participantsOpen]);

  useEffect(() => {
    if (chatListRef.current && messages.length !== previousCount.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
    if (messages.length > previousCount.current) {
      const newest = messages[messages.length - 1];
      if (newest && !peopleById.get(String(newest.meta.sender))?.isLocal) setAwaitingReply(false);
    }
    previousCount.current = messages.length;
  }, [messages, peopleById]);

  const notAvailable = (feature: string) => toast.info(`${feature} is not available yet.`);

  const onCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toast.success("Room code copied.");
    } catch {
      toast.info(`Room code: ${roomCode}`);
    }
  };

  const onSubmitChat = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !canChat) return;
    setDraft("");
    try {
      await send(text);
      setAwaitingReply(true);
      window.setTimeout(() => setAwaitingReply(false), 8000);
    } catch {
      setDraft(text);
      toast.error("Could not send your message.");
    }
  };

  const onAttachFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canChat) return;
    try {
      const kind = file.type.startsWith("image/") ? "image" : "file";
      const uploaded: any = await uploadMessageAttachment({ file, kind, name: file.name });
      await send("", uploaded?.attachment ? [uploaded.attachment] : []);
    } catch {
      toast.error("Could not send your file.");
    }
  };

  const headerAvatars = participants.slice(0, 4);
  const hiddenCount = participants.length - headerAvatars.length;

  return createPortal(
    <div
      className={classnames("vc-screen", { "is-compact": isCompact })}
      role="dialog"
      aria-modal="true"
      aria-label={`Video call: ${title}`}
    >
      <div className="vc-canvas" style={canvasStyle}>
        <header className="vc-header">
          <img src={logo} alt="DevFlow" className="vc-header__logo" />
          <img src={headerLine} alt="" className="vc-header__line" />
          <div className="vc-header__meeting">
            <h1 className="vc-header__title">{title}</h1>
            <p className="vc-header__date">{format(startedAt, "MMMM do, yyyy | h:mm a")}</p>
          </div>
          <div className="vc-header__people">
            <div className="vc-header__avatars">
              {headerAvatars.map(person => (
                <img key={person.id} src={person.avatar || placeholderAvatar} alt={person.name} />
              ))}
              {hiddenCount > 0 && (
                <span className="vc-header__more">
                  <img src={plusCircle} alt="" />
                  <span>+{hiddenCount}</span>
                </span>
              )}
            </div>
            <button
              type="button"
              className="vc-header__room"
              onClick={onCopyRoomCode}
              title="Copy room code"
            >
              <img src={linkIcon} alt="" />
              <span className="vc-header__room-divider" />
              <span className="vc-header__room-code">{roomCode}</span>
            </button>
          </div>
          <div className="vc-header__me">
            <img src={meAvatar || placeholderAvatar} alt="" className="vc-header__me-avatar" />
            <div className="vc-header__me-name">{meName}</div>
            <div className="vc-header__me-role">{meRole}</div>
            <button
              type="button"
              className="vc-header__kebab"
              aria-label="More options"
              onClick={() => notAvailable("More options")}
            >
              <img src={kebabIcon} alt="" />
            </button>
          </div>
        </header>

        <main className={classnames("vc-stage", { "is-full": !sidebarOpen })}>
          <section className="vc-main-tile">
            {mainTile ? (
              <TileMedia tile={mainTile} speakerMuted={speakerMuted} />
            ) : (
              <div className="vc-tile__no-video">
                <span className="vc-main-tile__waiting">Waiting for others to join</span>
              </div>
            )}

            <div className="vc-main-tile__timer">
              <img src={recDot} alt="" />
              <span>{elapsed}</span>
            </div>
            <button
              type="button"
              className="vc-round-glass vc-main-tile__maximize"
              aria-label="Back to the small window"
              onClick={onMinimize}
            >
              <img src={maximizeIcon} alt="" />
            </button>
            {mainTile && <div className="vc-name-pill vc-name-pill--main">{mainTile.name}</div>}
            <button
              type="button"
              className={classnames("vc-round-glass vc-main-tile__sound", {
                "is-off": speakerMuted,
              })}
              aria-label={speakerMuted ? "Turn sound on" : "Turn sound off"}
              aria-pressed={speakerMuted}
              onClick={onToggleSpeaker}
            >
              <img src={soundIcon} alt="" />
            </button>

            {(statusText || incomingPrompt) && (
              <div className="vc-main-tile__status">
                {statusText && <p>{statusText}</p>}
                {incomingPrompt && (
                  <div className="vc-main-tile__prompt">
                    <button type="button" className="is-accept" onClick={incomingPrompt.onAccept}>
                      Accept
                    </button>
                    <button type="button" className="is-decline" onClick={incomingPrompt.onDecline}>
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="vc-strip" ref={stripRef} onScroll={updateStripBar}>
            {stripTiles.map(tile => (
              <article key={tile.id} className="vc-thumb">
                <TileMedia tile={tile} speakerMuted={speakerMuted} />
                <div className="vc-thumb__fade" />
                <div className="vc-name-pill">{tile.isLocal ? `${tile.name} (You)` : tile.name}</div>
                <div className={classnames("vc-thumb__mic", { "is-off": !tile.micOn })}>
                  <img src={tile.micOn ? micSmallIcon : micSlashSmallIcon} alt={tile.micOn ? "Microphone on" : "Muted"} />
                </div>
              </article>
            ))}
          </div>
          <div className={classnames("vc-strip-bar", { "is-hidden": !stripBar.show })}>
            <span style={{ left: `${stripBar.left}%`, width: `${stripBar.width}%` }} />
          </div>
        </main>

        <footer className={classnames("vc-controls", { "is-full": !sidebarOpen })}>
          <div className="vc-controls__group">
            <button
              type="button"
              className={classnames("vc-control is-primary", { "is-off": !micEnabled })}
              aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
              aria-pressed={!micEnabled}
              onClick={onToggleMic}
            >
              <span className="vc-control__icon">
                <img src={micEnabled ? micIcon : micSlashSmallIcon} alt="" />
                {micEnabled && <img src={micPartIcon} alt="" className="vc-control__mic-part" />}
              </span>
            </button>
            <button
              type="button"
              className={classnames("vc-control is-primary", { "is-off": !cameraEnabled })}
              aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
              aria-pressed={!cameraEnabled}
              onClick={onToggleCamera}
            >
              <span className="vc-control__icon">
                <img src={videoIcon} alt="" />
                {!cameraEnabled && <span className="vc-control__slash" />}
              </span>
            </button>
            <button
              type="button"
              className="vc-control"
              aria-label="Share screen"
              onClick={() => notAvailable("Screen sharing")}
            >
              <span className="vc-control__icon">
                <img src={shareIcon} alt="" />
              </span>
            </button>
            <div className={classnames("vc-record", { "is-recording": isRecording })}>
              <img src={ringOuter} alt="" className="vc-record__ring-outer" />
              <button
                type="button"
                className="vc-control is-record"
                aria-label="Record call"
                onClick={() => notAvailable("Call recording")}
              >
                <span className="vc-control__icon">
                  <img src={recordCircleIcon} alt="" />
                  <img src={recordDotIcon} alt="" className="vc-control__record-dot" />
                </span>
              </button>
              <img src={ringInner} alt="" className="vc-record__ring-inner" />
            </div>
            <button
              type="button"
              className={classnames("vc-control", { "is-active": !sidebarOpen })}
              aria-label={sidebarOpen ? "Hide chat and participants" : "Show chat and participants"}
              aria-pressed={sidebarOpen}
              onClick={() => setSidebarOpen(value => !value)}
            >
              <span className="vc-control__icon">
                <img src={messageIcon} alt="" />
              </span>
            </button>
            <button
              type="button"
              className="vc-control"
              aria-label="More"
              onClick={() => notAvailable("More options")}
            >
              <span className="vc-control__icon">
                <img src={moreIcon} alt="" />
              </span>
            </button>
          </div>
          <button type="button" className="vc-end-call" onClick={onEnd}>
            End Call
          </button>
        </footer>

        {sidebarOpen && (
          <aside className="vc-sidebar">
            <div className="vc-panel-head vc-panel-head--participants">
              <h2>Participants</h2>
              <button
                type="button"
                className="vc-add-participant"
                onClick={() => notAvailable("Adding people to a call")}
              >
                Add Participant
                <img src={userAddIcon} alt="" />
              </button>
              <button
                type="button"
                className={classnames("vc-panel-head__chevron", { "is-closed": !participantsOpen })}
                aria-label={participantsOpen ? "Collapse participants" : "Expand participants"}
                aria-expanded={participantsOpen}
                onClick={() => setParticipantsOpen(value => !value)}
              >
                <img src={chevronIcon} alt="" />
              </button>
            </div>
            {participantsOpen && (
              <div className="vc-participants">
                <div className="vc-participants__list" ref={listRef} onScroll={updateListBar}>
                  {participants.map(person => (
                    <div key={person.id} className="vc-participant">
                      <img src={person.avatar || placeholderAvatar} alt="" className="vc-participant__avatar" />
                      <span className="vc-participant__name">
                        {person.isLocal ? `${person.name} (You)` : person.name}
                      </span>
                      <img
                        src={person.micOn ? rowMicIcon : rowMicOffIcon}
                        alt={person.micOn ? "Microphone on" : "Muted"}
                      />
                      <img
                        src={person.cameraOn ? rowVideoIcon : rowVideoOffIcon}
                        alt={person.cameraOn ? "Camera on" : "Camera off"}
                      />
                    </div>
                  ))}
                </div>
                <div className={classnames("vc-participants__bar", { "is-hidden": !listBar.show })}>
                  <span style={{ top: `${listBar.top}%`, height: `${listBar.height}%` }} />
                </div>
              </div>
            )}

            <div className="vc-panel-head vc-panel-head--chats">
              <h2>Chats</h2>
              <div className="vc-chat-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={chatTab === "group"}
                  className={classnames("vc-chat-tabs__group", { "is-active": chatTab === "group" })}
                  onClick={() => setChatTab("group")}
                >
                  Group
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={chatTab === "personal"}
                  className={classnames("vc-chat-tabs__personal", { "is-active": chatTab === "personal" })}
                  onClick={() => setChatTab("personal")}
                >
                  Personal
                </button>
              </div>
              <button
                type="button"
                className={classnames("vc-panel-head__chevron", { "is-closed": !chatsOpen })}
                aria-label={chatsOpen ? "Collapse chats" : "Expand chats"}
                aria-expanded={chatsOpen}
                onClick={() => setChatsOpen(value => !value)}
              >
                <img src={chevronIcon} alt="" />
              </button>
            </div>
            <div className={classnames("vc-chat", { "is-hidden": !chatsOpen })}>
              <div className="vc-chat__list" ref={chatListRef}>
                {!canChat && (
                  <p className="vc-chat__empty">
                    {chatTab === "group" ? "This call has no group chat." : "This call has no personal chat."}
                  </p>
                )}
                {canChat && messages.length === 0 && <p className="vc-chat__empty">No messages yet.</p>}
                {messages.map((message, index) => {
                  const previous = messages[index - 1];
                  const next = messages[index + 1];
                  const senderId = String(message.meta.sender);
                  const continues = previous && String(previous.meta.sender) === senderId;
                  const continuesNext = next && String(next.meta.sender) === senderId;
                  const person = peopleById.get(senderId);
                  const data = message.meta.userData;
                  const name = person?.isLocal
                    ? "You"
                    : person?.name ||
                      (data ? `${data.firstName} ${data.lastName}`.trim() : "Member");
                  const avatar = person?.avatar || data?.profileImage || placeholderAvatar;
                  const files = [
                    ...(message.attachments || []).map((file: any) => file.name),
                    ...(message.image || []).map(() => "Image"),
                  ];
                  return (
                    <div
                      key={message.mId}
                      className={classnames("vc-message", {
                        "is-continued": continues,
                        "has-more": continuesNext,
                      })}
                    >
                      {!continues && <img src={avatar} alt="" className="vc-message__avatar" />}
                      <div className="vc-message__bubble">
                        {!continues && <div className="vc-message__sender">{name}</div>}
                        {message.text && <div className="vc-message__text">{message.text}</div>}
                        {files.map((file: string, fileIndex: number) => (
                          <div key={fileIndex} className="vc-message__text vc-message__file">
                            {file}
                          </div>
                        ))}
                      </div>
                      {!continues && (
                        <time className="vc-message__time">
                          {format(new Date(message.time), "hh:mm a")}
                        </time>
                      )}
                    </div>
                  );
                })}
              </div>
              {awaitingReply && <img src={typingDots} alt="Typing" className="vc-chat__typing" />}
            </div>
            <form className="vc-chat-input" onSubmit={onSubmitChat}>
              <div className="vc-chat-input__pill">
                <button
                  type="button"
                  className="vc-chat-input__attach"
                  aria-label="Attach a file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img src={paperclipIcon} alt="" />
                </button>
                <input
                  type="text"
                  value={draft}
                  placeholder="Type Something..."
                  aria-label="Message"
                  onChange={event => setDraft(event.target.value)}
                />
                <button type="submit" className="vc-chat-input__send" aria-label="Send message">
                  <img src={sendIcon} alt="" />
                </button>
              </div>
              <input ref={fileInputRef} type="file" hidden onChange={onAttachFile} />
            </form>
          </aside>
        )}
      </div>
    </div>,
    document.body,
  );
};

const WINDOW_MARGIN = 24;
const MAX_GRID_PEOPLE = 6;

/** Keeps the window fully on screen, however it was dragged or the browser was resized. */
const clampToWindow = (x: number, y: number, box: DOMRect) => {
  const minX = WINDOW_MARGIN + box.width - window.innerWidth;
  const minY = WINDOW_MARGIN + box.height - window.innerHeight;
  return {
    x: Math.min(0, Math.max(minX, x)),
    y: Math.min(0, Math.max(minY, y)),
  };
};

type WindowProps = VideoCallScreenProps & {
  speakerMuted: boolean;
  onToggleSpeaker: () => void;
  onExpand: () => void;
};

/**
 * The default call view, modelled on WhatsApp: a small window that floats over the app,
 * with the other person filling it and your own mirrored video in the corner.
 */
const VideoCallWindow = ({
  title,
  startedAt,
  mainTile,
  stripTiles,
  micEnabled,
  cameraEnabled,
  isConnected,
  statusText,
  incomingPrompt,
  onToggleMic,
  onToggleCamera,
  onEnd,
  speakerMuted,
  onToggleSpeaker,
  onExpand,
}: WindowProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const elapsed = useElapsedTime(startedAt, isConnected);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);

  const everyone = [...(mainTile ? [mainTile] : []), ...stripTiles];
  const me = everyone.find(person => person.isLocal);
  const others = everyone.filter(person => !person.isLocal);
  const isGroup = others.length > 1;
  const shownOthers = others.slice(0, MAX_GRID_PEOPLE - 1);
  const hiddenCount = others.length - shownOthers.length;
  const gridPeople = me ? [...shownOthers, me] : shownOthers;
  const heading = others.length === 1 ? others[0].name : title.replace(/^Video call with /, "");

  useEffect(() => {
    const onResize = () => {
      if (rootRef.current) {
        const box = rootRef.current.getBoundingClientRect();
        setOffset(current => clampToWindow(current.x, current.y, box));
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerX: event.clientX, pointerY: event.clientY, ...offset };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !rootRef.current) return;
    const start = drag.current;
    const box = rootRef.current.getBoundingClientRect();
    setOffset(
      clampToWindow(
        start.x + event.clientX - start.pointerX,
        start.y + event.clientY - start.pointerY,
        box,
      ),
    );
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const showStatus = statusText || !!incomingPrompt;

  return createPortal(
    <div
      ref={rootRef}
      className={classnames("vc-float", { "is-group": isGroup })}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      role="dialog"
      aria-label={`Video call: ${heading}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {isGroup ? (
        <div className={classnames("vc-float__grid", { "is-single-column": gridPeople.length <= 2 })}>
          {gridPeople.map((person, index) => (
            <div key={person.id} className="vc-float__grid-tile">
              <TileMedia tile={person} speakerMuted={speakerMuted} useCrop={false} />
              <span className="vc-float__label">
                {!person.micOn && <i className="bx bx-microphone-off" aria-label="Muted" />}
                {person.isLocal ? "You" : person.name}
              </span>
              {hiddenCount > 0 && index === shownOthers.length - 1 && (
                <span className="vc-float__more">+{hiddenCount}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="vc-float__main">
            {others[0] ? (
              <TileMedia tile={others[0]} speakerMuted={speakerMuted} useCrop={false} />
            ) : (
              <div className="vc-tile__no-video" />
            )}
          </div>
          {me && (
            <div className="vc-float__self">
              <TileMedia tile={me} speakerMuted={speakerMuted} useCrop={false} />
            </div>
          )}
        </>
      )}

      <div className="vc-float__top">
        <div className="vc-float__heading">
          <div className="vc-float__name">{heading}</div>
          <div className="vc-float__time">{isConnected ? elapsed : "Video call"}</div>
        </div>
        <button
          type="button"
          className="vc-float__expand"
          aria-label="Open full screen"
          title="Open full screen"
          onClick={onExpand}
        >
          <img src={maximizeIcon} alt="" />
        </button>
      </div>

      {showStatus && (
        <div className="vc-float__status">
          {statusText && <p>{statusText}</p>}
        </div>
      )}

      {incomingPrompt ? (
        <div className="vc-float__controls">
          <button
            type="button"
            className="vc-float__btn is-decline"
            aria-label="Decline call"
            onClick={incomingPrompt.onDecline}
          >
            <i className="mdi mdi-phone-hangup" />
          </button>
          <button
            type="button"
            className="vc-float__btn is-accept"
            aria-label="Accept call"
            onClick={incomingPrompt.onAccept}
          >
            <i className="mdi mdi-video" />
          </button>
        </div>
      ) : (
        <div className="vc-float__controls">
          <button
            type="button"
            className={classnames("vc-float__btn", { "is-off": !cameraEnabled })}
            aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
            aria-pressed={!cameraEnabled}
            onClick={onToggleCamera}
          >
            <i className={cameraEnabled ? "bx bx-video" : "bx bx-video-off"} />
          </button>
          <button
            type="button"
            className={classnames("vc-float__btn", { "is-off": !micEnabled })}
            aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
            aria-pressed={!micEnabled}
            onClick={onToggleMic}
          >
            <i className={micEnabled ? "bx bx-microphone" : "bx bx-microphone-off"} />
          </button>
          <button
            type="button"
            className={classnames("vc-float__btn", { "is-off": speakerMuted })}
            aria-label={speakerMuted ? "Turn sound on" : "Turn sound off"}
            aria-pressed={speakerMuted}
            onClick={onToggleSpeaker}
          >
            <i className={speakerMuted ? "bx bx-volume-mute" : "bx bx-volume-full"} />
          </button>
          <button type="button" className="vc-float__btn is-end" aria-label="End call" onClick={onEnd}>
            <i className="mdi mdi-phone-hangup" />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
};

/** A call opens in the small window. The full screen is one click away. */
const VideoCallScreen = (props: VideoCallScreenProps) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const onToggleSpeaker = () => setSpeakerMuted(value => !value);

  return isFullScreen ? (
    <VideoCallFullScreen
      {...props}
      speakerMuted={speakerMuted}
      onToggleSpeaker={onToggleSpeaker}
      onMinimize={() => setIsFullScreen(false)}
    />
  ) : (
    <VideoCallWindow
      {...props}
      speakerMuted={speakerMuted}
      onToggleSpeaker={onToggleSpeaker}
      onExpand={() => setIsFullScreen(true)}
    />
  );
};

export default VideoCallScreen;
