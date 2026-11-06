import React, { useLayoutEffect, useRef, useState } from "react";
import {
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
} from "reactstrap";
import classnames from "classnames";
import { Link } from "react-router-dom";

// components
import LightBox from "../../../components/LightBox";

//images
import imagePlaceholder from "../../../assets/images/users/user-dummy-img.jpg";

// interface
import {
  MessagesTypes,
  ImageTypes,
  AttachmentTypes,
} from "../../../data/messages";

// hooks
import { useProfile } from "../../../hooks";

// utils
import { formateDate } from "../../../utils";
import RepliedMessage from "./RepliedMessage";
import { fadeInStatus } from "./messageAnimations";

interface MenuProps {
  onDelete: () => any;
  onReply: () => any;
  onForward: () => void;
  onTogglePin: () => void;
  isPinned: boolean;
  canAddBookmark?: boolean;
  onAddBookmark?: () => void;
}

const Menu = ({
  onDelete,
  onReply,
  onForward,
  onTogglePin,
  isPinned,
  canAddBookmark = false,
  onAddBookmark,
}: MenuProps) => {
  return (
    <UncontrolledDropdown className="align-self-start message-box-drop">
      <DropdownToggle className="btn btn-toggle" role="button" tag={"a"}>
        <i className="ri-more-2-fill"></i>
      </DropdownToggle>
      <DropdownMenu>
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          to="#"
          onClick={onReply}
        >
          Reply <i className="bx bx-share ms-2 text-muted"></i>
        </DropdownItem>
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          to="#"
          onClick={onForward}
        >
          Forward <i className="bx bx-share-alt ms-2 text-muted"></i>
        </DropdownItem>
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          to="#"
        >
          Copy <i className="bx bx-copy text-muted ms-2"></i>
        </DropdownItem>
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          to="#"
          onClick={onTogglePin}
        >
          {isPinned ? "Unpin" : "Pin"}{" "}
          <i className={classnames("text-muted", "ms-2", isPinned ? "ri-pushpin-fill" : "ri-pushpin-line")}></i>
        </DropdownItem>
        <DropdownItem
          className="d-flex align-items-center justify-content-between"
          to="#"
        >
          Mark as Unread <i className="bx bx-message-error text-muted ms-2"></i>
        </DropdownItem>
        {canAddBookmark && onAddBookmark && (
          <DropdownItem
            className="d-flex align-items-center justify-content-between"
            to="#"
            onClick={onAddBookmark}
          >
            Add to Bookmarks <i className="bx bx-bookmarks text-muted ms-2"></i>
          </DropdownItem>
        )}
        <DropdownItem
          className="d-flex align-items-center justify-content-between delete-item"
          onClick={onDelete}
        >
          Delete <i className="bx bx-trash text-muted ms-2"></i>
        </DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
  );
};
interface ImageMoreMenuProps {
  imagelink: any,
  onReply: () => any;
  onDelete: () => void;
  onTogglePin: () => void;
  isPinned: boolean;
}
const ImageMoreMenu = ({ imagelink,onReply, onDelete, onTogglePin, isPinned }: ImageMoreMenuProps) => {
  return (
    <div className="message-img-link">
      <ul className="list-inline mb-0">
        <UncontrolledDropdown
          tag="li"
          color="none"
          className="list-inline-item dropdown"
        >
          <DropdownToggle tag="a" role="button" className="btn btn-toggle">
            <i className="bx bx-dots-horizontal-rounded"></i>
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem
              className="dropdown-item d-flex align-items-center justify-content-between"
              href={imagelink}
              download
            >
              Download <i className="bx bx-download ms-2 text-muted"></i>
            </DropdownItem>
            <DropdownItem
              tag="a"
              className=" d-flex align-items-center justify-content-between"
              href="#"
              onClick={onReply}
            >
              Reply <i className="bx bx-share ms-2 text-muted"></i>
            </DropdownItem>
            <DropdownItem
              tag="a"
              className=" d-flex align-items-center justify-content-between"
              href="#"
              data-bs-toggle="modal"
              data-bs-target=".forwardModal"
            >
              Forward <i className="bx bx-share-alt ms-2 text-muted"></i>
            </DropdownItem>
            <DropdownItem
              tag="a"
              className=" d-flex align-items-center justify-content-between"
              href="#"
              onClick={onTogglePin}
            >
              {isPinned ? "Unpin" : "Pin"}{" "}
              <i className={classnames("text-muted", "ms-2", isPinned ? "ri-pushpin-fill" : "ri-pushpin-line")}></i>
            </DropdownItem>
            <DropdownItem
              tag="a"
              className=" d-flex align-items-center justify-content-between delete-item"
              href="#"
              onClick={onDelete}
            >
              Delete <i className="bx bx-trash ms-2 text-muted"></i>
            </DropdownItem>
          </DropdownMenu>
        </UncontrolledDropdown>
      </ul>
    </div>
  );
};

interface ImageProps {
  message : MessagesTypes,
  image: ImageTypes;
  onImageClick: (id: number) => void;
  index: number;
  onSetReplyData: (reply: null | MessagesTypes | undefined) => void;
  onDeleteImg: (imageId: string | number) => void;
  onTogglePin: (messageId: string | number) => void;
}
const Image = ({ message ,image, onImageClick, index,onSetReplyData, onDeleteImg, onTogglePin }: ImageProps) => {
  const onDelete = () => {
    onDeleteImg(image.id);
  };
  const onClickReply = () => {

    let multiimages: any = message['image'];

    let results = multiimages.filter((multiimage : any) => multiimage.id === image.id);

    message['newimage'] = results;

    onSetReplyData(message);

  };
  const onTogglePinMessage = () => {
    onTogglePin(message.mId);
  };
  return (
    <React.Fragment>
      <div className="message-img-list">
        <div>
          <Link
            className="popup-img d-inline-block"
            to={"#"}
            onClick={() => onImageClick(index)}
          >
            <img src={image.downloadLink} alt="" className="rounded border" />
          </Link>
        </div>
        <ImageMoreMenu
          imagelink={image.downloadLink}
          onReply={onClickReply}
          onDelete={onDelete}
          onTogglePin={onTogglePinMessage}
          isPinned={!!message.isPinned}
        />
      </div>
    </React.Fragment>
  );
};
interface ImagesProps {
  message : MessagesTypes,
  images: ImageTypes[];
  onSetReplyData: (reply: null | MessagesTypes | undefined) => void;
  onDeleteImg: (imageId: string | number) => void;
  onTogglePin: (messageId: string | number) => void;
}
const Images = ({ message,images,onSetReplyData, onDeleteImg, onTogglePin }: ImagesProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const onImageClick = (id: number) => {
    setSelected(id);
    setIsOpen(true);
  };
  const onClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div className="message-img mb-0">
        {(images || []).map((image: ImageTypes, key: number) => (
            <Image
              message={message}
              image={image}
              key={key}
              index={key}
              onImageClick={onImageClick}
              onSetReplyData={onSetReplyData}
              onDeleteImg={onDeleteImg}
              onTogglePin={onTogglePin}
            />
        ))}
      </div>
      {isOpen && (
        <LightBox
          isOpen={isOpen}
          images={images}
          onClose={onClose}
          defaultIdx={selected}
        />
      )}
    </>
  );
};

interface AttachmentsProps {
  attachments: AttachmentTypes[] | undefined;
  isFromMe: boolean;
  avatar: string;
  messageTime: string;
  isRead: boolean;
}
const formatVoiceTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

interface VoiceMessageProps {
  attachment: AttachmentTypes;
  avatar: string;
  isFromMe: boolean;
  messageTime: string;
  isRead: boolean;
}

const VoiceMessage = ({
  attachment,
  avatar,
  isFromMe,
  messageTime,
  isRead,
}: VoiceMessageProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(attachment.duration || 0);
  const [currentTime, setCurrentTime] = useState(0);

  const bars = Array.from({ length: 34 }, (_, i) => {
    const h = 6 + ((i * 7) % 18);
    return h;
  });
  const progress =
    duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  const onTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <div className={classnames("voice-note", { "voice-note--me": isFromMe })}>
      <img src={avatar} alt="" className="voice-note__avatar" />
      <button
        type="button"
        className="voice-note__play"
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        <i className={isPlaying ? "ri-pause-fill" : "ri-play-fill"} />
      </button>
      <div className="voice-note__center">
        <div className="voice-note__wave">
          {bars.map((height, idx) => (
                    <span
                      key={`${idx}-${height}`}
                      className={classnames({ "is-active": idx / bars.length <= progress })}
                      style={{ height }}
                    />
          ))}
        </div>
        <div className="voice-note__meta">
          <span className="voice-note__duration">
            {formatVoiceTime(isPlaying ? currentTime : duration || currentTime)}
          </span>
          <span className="voice-note__stamp">
            {messageTime}
            {isFromMe && (
              <i className={classnames("bx", "ms-1", { "bx-check-double": isRead }, { "bx-check": !isRead })}></i>
            )}
          </span>
        </div>
      </div>
      <audio
        ref={audioRef}
        preload="metadata"
        src={attachment.downloadLink}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onLoadedMetadata={e => {
          const next = e.currentTarget.duration || attachment.duration || 0;
          setDuration(next);
        }}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime || 0)}
      />
    </div>
  );
};

const Attachments = ({
  attachments,
  isFromMe,
  avatar,
  messageTime,
  isRead,
}: AttachmentsProps) => {
  return (
    <>
      {(attachments || []).map((attachment: AttachmentTypes, key: number) => {
        const isVoice = attachment.type === "voice";
        return (
          <div
            key={key}
            className={classnames(
              {
                "voice-message-wrap": isVoice,
              },
              {
                "p-3 border-primary border rounded-3": !isVoice,
              },
              {
              "mt-2": key !== 0,
              }
            )}
          >
            {isVoice ? (
              <VoiceMessage
                attachment={attachment}
                avatar={avatar}
                isFromMe={isFromMe}
                messageTime={messageTime}
                isRead={isRead}
              />
            ) : (
              <div className="d-flex align-items-center attached-file">
                <div className="flex-shrink-0 avatar-sm me-3 ms-0 attached-file-avatar">
                  <div className="avatar-title bg-primary-subtle text-primary rounded-circle font-size-20">
                    <i className="ri-attachment-2"></i>
                  </div>
                </div>
                <div className="flex-grow-1 overflow-hidden">
                  <div className="text-start">
                    <h5 className="font-size-14 mb-1">{attachment.name}</h5>
                    <p className="text-muted text-truncate font-size-13 mb-0">
                      {attachment.desc}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ms-4">
                  <div className="d-flex gap-2 font-size-20 d-flex align-items-start">
                    <div>
                      <a
                        href={attachment.downloadLink ? attachment.downloadLink : "#"}
                        className="text-muted"
                        download
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="bx bxs-download"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

const Typing = () => {
  return (
    <p className="mb-0">
      typing
      <span className="animate-typing">
        <span className="dot mx-1"></span>
        <span className="dot me-1"></span>
        <span className="dot"></span>
      </span>
    </p>
  );
};

const GITHUB_REPO_MENTION_SEGMENT =
  /^(@[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)(\s+@[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)*$/;

const isGithubRepoOnlyText = (text: string | undefined) => {
  if (!text) return false;
  return GITHUB_REPO_MENTION_SEGMENT.test(text.trim());
};

const escapeForRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Turns "@owner/repo" into a link, and "@Member Name" into a highlight when that person
 * is in this chat. Longest names first, so "@Ann Lee" wins over "@Ann".
 */
const renderMessageText = (text: string, memberNames: string[], myName: string) => {
  const repo = "@[a-zA-Z0-9_.-]+\\/[a-zA-Z0-9_.-]+";
  const names = [...memberNames]
    .sort((a, b) => b.length - a.length)
    .map(escapeForRegex)
    .join("|");
  const pattern = names
    ? `(${repo}|@(?:${names})(?![\\p{L}\\p{N}]))`
    : `(${repo})`;
  return text.split(new RegExp(pattern, "gu")).map((part, index) => {
    const repoMatch = part.match(/^@([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)$/);
    if (repoMatch) {
      return (
        <a
          key={`repo-${repoMatch[1]}-${index}`}
          href={`https://github.com/${repoMatch[1]}`}
          target="_blank"
          rel="noreferrer"
          className="chat-repo-mention"
        >
          {part}
        </a>
      );
    }
    if (part.startsWith("@") && memberNames.includes(part.slice(1))) {
      return (
        <span
          key={`member-${index}`}
          className={classnames("imsg-mention", { "is-me": part.slice(1) === myName })}
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
  });
};

const MessageStatus = ({ label }: { label: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) fadeInStatus(ref.current);
  }, [label]);
  return (
    <div className="imsg-status" ref={ref}>
      {label}
    </div>
  );
};

interface MessageProps {
  message: MessagesTypes;
  chatUserDetails: any;
  onDelete: (messageId: string | number) => any;
  onTogglePin: (messageId: string | number) => void;
  onSetReplyData: (reply: null | MessagesTypes | undefined) => void;
  isFromMe: boolean;
  onOpenForward: (message: MessagesTypes) => void;
  isChannel: boolean;
  onDeleteImage: (messageId: string | number, imageId: string | number) => void;
  onAddBookmark: (message: MessagesTypes) => void;
  /** First bubble in a run from the same sender. */
  isGroupStart: boolean;
  /** Last bubble in a run from the same sender. It gets the tail. */
  isGroupEnd: boolean;
  /** My newest message. It shows Delivered or Read underneath. */
  isLatestFromMe: boolean;
  // onSetReplyImageData: () => void;
}
const Message = ({
  message,
  chatUserDetails,
  onDelete,
  onTogglePin,
  onSetReplyData,
  isFromMe,
  onOpenForward,
  isChannel,
  onDeleteImage,
  onAddBookmark,
  isGroupStart,
  isGroupEnd,
  isLatestFromMe,
}: MessageProps) => {
  const { userProfile } = useProfile();
  const hasImages = message.image && message.image.length;
  const hasAttachments = message.attachments && message.attachments.length;
  const hasText = message.text;
  const hasOnlyVoiceAttachment =
    !!message.attachments?.length &&
    message.attachments.every((attachment: AttachmentTypes) => attachment.type === "voice");
  const isTyping = false;

  const chatUserFullName = chatUserDetails?.firstName
    ? `${chatUserDetails.firstName} ${chatUserDetails.lastName}`
    : "-";

  const myProfile = userProfile?.profileImage
    ? userProfile.profileImage
    : imagePlaceholder;
  const channeluserProfile =
    message.meta.userData && message.meta.userData.profileImage
      ? message.meta.userData.profileImage
      : imagePlaceholder;
  const chatUserprofile = chatUserDetails?.profileImage
    ? chatUserDetails.profileImage
    : imagePlaceholder;
  const profile = isChannel ? channeluserProfile : chatUserprofile;
  const date = formateDate(message.time, "hh:mmaaa");
  const isRead = message.meta.read;
  const memberNames: string[] = isChannel
    ? (chatUserDetails?.members || [])
        .map((member: any) => `${member.firstName || ""} ${member.lastName || ""}`.trim())
        .filter(Boolean)
    : [];
  const myName = `${userProfile?.firstName || ""} ${userProfile?.lastName || ""}`.trim();
  const isForwarded = message.meta.isForwarded;
  const isPinned = !!message.isPinned;
  const channdelSenderFullname = message.meta.userData
    ? `${message.meta.userData.firstName} ${message.meta.userData.lastName}`
    : "-";
  const fullName = isChannel ? channdelSenderFullname : chatUserFullName;
  const onDeleteMessage = () => {
    onDelete(message.mId);
  };

  const onClickReply = () => {
    onSetReplyData(message);
  };
  const isRepliedMessage = message.replyOf;

  const onForwardMessage = () => {
    onOpenForward(message);
  };

  const onDeleteImg = (imageId: number | string) => {
    onDeleteImage(message.mId, imageId);
  };
  const onTogglePinMessage = () => {
    onTogglePin(message.mId);
  };
  const onAddBookmarkFromMessage = () => {
    onAddBookmark(message);
  };
  return (
    <li
      className={classnames(
        "chat-list",
        { right: isFromMe },
        { reply: isRepliedMessage },
        { "imsg-group-end": isGroupEnd },
      )}
      data-mid={message.mId}
    >
      <div className="conversation-list">
        {/* As in iMessage, only other people in group chats get an avatar. */}
        {isChannel && !isFromMe && (
          <div className={classnames("chat-avatar", { "imsg-avatar-hidden": !isGroupEnd })}>
            <img src={profile} alt="" />
          </div>
        )}

        <div className="user-chat-content" title={date}>
          {isChannel && !isFromMe && isGroupStart && (
            <div className="imsg-sender">{fullName}</div>
          )}
          {hasImages && message.text && (
            <div className="ctext-wrap">
              <div
                className={classnames("ctext-wrap-content", {
                  "github-repo-msg": isGithubRepoOnlyText(message.text),
                })}
              >
                <p className="mb-0 ctext-content">
                  {renderMessageText(message.text || "", memberNames, myName)}
                </p>
              </div>
            </div>
          )}
          {isForwarded && (
            <span
              className={classnames(
                "me-1",
                "text-muted",
                "font-size-13",
                "mb-1",
                "d-block"
              )}
            >
              <i
                className={classnames(
                  "ri",
                  "ri-share-forward-line",
                  "align-middle",
                  "me-1"
                )}
              ></i>
              Forwarded
            </span>
          )}
          {isPinned && (
            <span
              className={classnames(
                "badge",
                "bg-light",
                "text-body",
                "border",
                "mb-2",
                "d-inline-flex",
                "align-items-center",
              )}
            >
              <i className="ri-pushpin-fill me-1"></i>
              Pinned
            </span>
          )}

          <div className="ctext-wrap">
            {/* text message end */}

            {/* image message start */}
            {hasImages ? (
              <>
                <Images
                  images={message.image!}
                  message={message}
                  onSetReplyData={onSetReplyData}
                  onDeleteImg={onDeleteImg}
                  onTogglePin={onTogglePin}
                />
              </>
            ) : (
              <>
                <div
                  className={classnames("ctext-wrap-content", {
                    "imsg-tail": isGroupEnd,
                    "voice-only": hasOnlyVoiceAttachment,
                    "github-repo-msg":
                      hasText &&
                      !isRepliedMessage &&
                      !hasAttachments &&
                      isGithubRepoOnlyText(message.text),
                  })}
                >
                  {isRepliedMessage && (
                    <RepliedMessage
                      fullName={fullName}
                      message={message}
                      isFromMe={isFromMe}
                    />
                  )}

                  {hasText && (
                    <p className="mb-0 ctext-content">
                      {renderMessageText(message.text || "", memberNames, myName)}
                    </p>
                  )}

                  {/* typing start */}
                  {isTyping && <Typing />}

                  {/* typing end */}
                  {/* files message start */}
                  {hasAttachments && (
                    <Attachments
                      attachments={message.attachments}
                      isFromMe={isFromMe}
                      avatar={isFromMe ? myProfile : profile}
                      messageTime={date}
                      isRead={isRead}
                    />
                  )}
                  {/* files message end */}
                </div>
                <Menu
                  onForward={onForwardMessage}
                  onDelete={onDeleteMessage}
                  onReply={onClickReply}
                  onTogglePin={onTogglePinMessage}
                  isPinned={isPinned}
                  canAddBookmark={!!hasAttachments}
                  onAddBookmark={onAddBookmarkFromMessage}
                />
              </>
            )}

            {/* image message end */}
          </div>
          {isFromMe && isLatestFromMe && (
            <MessageStatus label={isRead && !isChannel ? "Read" : "Delivered"} />
          )}
        </div>
      </div>
    </li>
  );
};

export default Message;
