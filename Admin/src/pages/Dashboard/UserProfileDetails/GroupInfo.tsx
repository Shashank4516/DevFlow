import React, { useMemo, useState } from "react";
import classnames from "classnames";
import { createSelector } from "reselect";
import { toast } from "react-toastify";

// Bundled so that the panel keeps its exact font without an internet connection.
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";

import { useProfile, useRedux } from "../../../hooks";
import {
  changeSelectedChat,
  getChatUserConversations,
  getChatUserDetails,
  readConversation,
  setChatUserDetails,
  toggleUserDetailsTab,
} from "../../../redux/actions";
import { STATUS_TYPES } from "../../../constants";

import AppSimpleBar from "../../../components/AppSimpleBar";
import AudioCallModal from "../../../components/AudioCallModal";

import closeIcon from "../../../assets/images/group-info/close.svg";
import infoIcon from "../../../assets/images/group-info/info.svg";
import verifiedIcon from "../../../assets/images/group-info/verified.svg";
import chevronIcon from "../../../assets/images/group-info/chevron-down.svg";
import phoneIcon from "../../../assets/images/group-info/phone.svg";
import chatIcon from "../../../assets/images/group-info/chat.svg";
import addIcon from "../../../assets/images/group-info/add.svg";
import moreIcon from "../../../assets/images/group-info/more.svg";
import fileThumbMask from "../../../assets/images/group-info/file-thumb-mask.svg";
import fileThumbTop from "../../../assets/images/group-info/file-thumb-top.svg";
import fileThumbBottom from "../../../assets/images/group-info/file-thumb-bottom.svg";
import imageThumbTop from "../../../assets/images/group-info/image-thumb-top.svg";
import imageThumbBottom from "../../../assets/images/group-info/image-thumb-bottom.svg";

const PREVIEW_MEMBERS = 3;
const PREVIEW_FILES = 4;

const Icon = ({ src, width, height }: { src: string; width: number; height: number }) => (
  <span
    className="group-info__icon"
    aria-hidden="true"
    style={{
      width,
      height,
      WebkitMaskImage: `url("${src}")`,
      maskImage: `url("${src}")`,
    }}
  />
);

type Attachment = {
  key: string;
  name: string;
  detail: string;
  url: string;
  isImage: boolean;
};

const IMAGE_FILE = /\.(jpe?g|png|gif|webp|svg|heic)$/i;

const fileNameFromUrl = (url: string) => {
  if (url.startsWith("blob:") || url.startsWith("data:")) return "Image";
  const path = url.split(/[?#]/)[0];
  return decodeURIComponent(path.substring(path.lastIndexOf("/") + 1)) || "Image";
};

/** Newest first: every image and file shared in the channel's messages. */
const collectAttachments = (messages: any[]): Attachment[] => {
  const found: Attachment[] = [];
  [...messages].reverse().forEach(message => {
    (message.attachments || [])
      .filter((file: any) => file.type !== "voice")
      .forEach((file: any) => {
        found.push({
          key: `${message.mId}-file-${file.id}`,
          name: file.name,
          detail: file.desc || "",
          url: file.downloadLink,
          isImage: IMAGE_FILE.test(file.name || ""),
        });
      });
    (message.image || []).forEach((image: any) => {
      found.push({
        key: `${message.mId}-image-${image.id}`,
        name: fileNameFromUrl(image.downloadLink),
        detail: "Image",
        url: image.downloadLink,
        isImage: true,
      });
    });
  });
  return found;
};

const FileThumb = () => (
  <span className="group-info__thumb">
    <span
      className="group-info__thumb-file"
      style={{
        WebkitMaskImage: `url("${fileThumbMask}")`,
        maskImage: `url("${fileThumbMask}")`,
      }}
    >
      <img src={fileThumbTop} alt="" className="group-info__thumb-file-top" />
      <img src={fileThumbBottom} alt="" className="group-info__thumb-file-bottom" />
    </span>
  </span>
);

const ImageThumb = () => (
  <span className="group-info__thumb">
    <span className="group-info__thumb-sheet" />
    <img src={imageThumbTop} alt="" className="group-info__thumb-image-top" />
    <img src={imageThumbBottom} alt="" className="group-info__thumb-image-bottom" />
  </span>
);

interface GroupInfoProps {
  chatUserDetails: any;
}

/** The side panel for a channel. Design: Figma "Chat Massage Dashboard", node 1:295. */
const GroupInfo = ({ chatUserDetails }: GroupInfoProps) => {
  const { dispatch, useAppSelector } = useRedux();
  const { userProfile } = useProfile();

  const chatData = createSelector(
    (state: any) => state.Chats,
    chats => ({
      directMessages: chats.directMessages,
      favourites: chats.favourites,
      archiveContacts: chats.archiveContacts,
      chatUserConversations: chats.chatUserConversations,
    }),
  );
  const { directMessages, favourites, archiveContacts, chatUserConversations } =
    useAppSelector(chatData);

  const [showDescription, setShowDescription] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [callingMember, setCallingMember] = useState<any>(null);

  const allMembers: any[] = chatUserDetails.members || [];
  const myId = String(userProfile?.id ?? userProfile?.uid ?? "");

  // The channel API only returns names, so presence comes from my friends list.
  const friendsById = useMemo(() => {
    const byId = new Map<string, any>();
    [...(directMessages || []), ...(favourites || []), ...(archiveContacts || [])].forEach(
      (friend: any) => byId.set(String(friend.id), friend),
    );
    return byId;
  }, [directMessages, favourites, archiveContacts]);

  const otherMembers = allMembers
    .filter(member => String(member.id) !== myId)
    .map(member => {
      const friend = friendsById.get(String(member.id));
      const status = member.status ?? friend?.status;
      const isOnline = status === STATUS_TYPES.ACTIVE;
      return {
        ...member,
        friend,
        isOnline,
        photo: member.profileImage || friend?.profileImage,
        presence: isOnline ? "Online" : member.lastSeenText || "Offline",
      };
    });
  const members = showAllMembers
    ? otherMembers
    : otherMembers.slice(0, PREVIEW_MEMBERS);

  const attachments = useMemo(
    () => collectAttachments(chatUserConversations?.messages || []),
    [chatUserConversations?.messages],
  );
  const files = showAllFiles ? attachments : attachments.slice(0, PREVIEW_FILES);

  const onClose = () => dispatch(toggleUserDetailsTab(false));

  const onOpenChat = (member: any) => {
    if (member.friend) dispatch(setChatUserDetails(member.friend));
    else dispatch(getChatUserDetails(member.id));
    dispatch(readConversation(member.id));
    dispatch(getChatUserConversations(member.id));
    dispatch(changeSelectedChat(member.id));
    onClose();
  };

  const onDownload = (event: React.MouseEvent, url: string) => {
    if (!url || url === "#") {
      event.preventDefault();
      toast.info("This is a sample file, so there is nothing to download.");
    }
  };

  return (
    <AppSimpleBar className="group-info">
      <div className="group-info__top">
        <button type="button" className="group-info__close" aria-label="Close" onClick={onClose}>
          <Icon src={closeIcon} width={32} height={32} />
        </button>
        <h2 className="group-info__heading">Group info</h2>
        <button
          type="button"
          className="group-info__info"
          aria-label="About this channel"
          aria-expanded={showDescription}
          onClick={() => setShowDescription(value => !value)}
        >
          <Icon src={infoIcon} width={6} height={11} />
        </button>
      </div>

      <div className="group-info__identity">
        <div className="group-info__avatar">#</div>
        <div className="group-info__name">
          <span className="group-info__name-text">{chatUserDetails.name}</span>
          <Icon src={verifiedIcon} width={24} height={24} />
        </div>
        {showDescription && (
          <p className="group-info__description">
            {chatUserDetails.description || "No description yet."}
          </p>
        )}
      </div>

      <div className="group-info__section-head group-info__section-head--members">
        <div className="group-info__section-title">
          <span>Members</span>
          <span className="group-info__chip">{allMembers.length}</span>
        </div>
        {otherMembers.length > PREVIEW_MEMBERS && (
          <button
            type="button"
            className={classnames("group-info__icon-btn", "group-info__chevron", {
              "is-open": showAllMembers,
            })}
            aria-label={showAllMembers ? "Show fewer members" : "Show all members"}
            aria-expanded={showAllMembers}
            onClick={() => setShowAllMembers(value => !value)}
          >
            <Icon src={chevronIcon} width={24} height={24} />
          </button>
        )}
      </div>

      <ul className="group-info__members">
        {members.map(member => (
          <li key={member.id} className="group-info__row group-info__member">
            <div className="group-info__row-main">
              <span className="group-info__member-avatar">
                {member.photo ? (
                  <img src={member.photo} alt="" className="group-info__member-photo" />
                ) : (
                  <>
                    {(member.firstName || "").charAt(0)}
                    {(member.lastName || "").charAt(0)}
                  </>
                )}
                <span
                  className={classnames("group-info__status-dot", {
                    "is-online": member.isOnline,
                  })}
                />
              </span>
              <div className="group-info__text">
                <div className="group-info__title">
                  {member.firstName} {member.lastName}
                </div>
                <div className="group-info__subtitle">{member.presence}</div>
              </div>
            </div>
            <div className="group-info__actions">
              <button
                type="button"
                className="group-info__round-btn"
                aria-label={`Call ${member.firstName}`}
                onClick={() => setCallingMember(member)}
              >
                <Icon src={phoneIcon} width={20} height={20} />
              </button>
              <button
                type="button"
                className="group-info__round-btn"
                aria-label={`Message ${member.firstName}`}
                onClick={() => onOpenChat(member)}
              >
                <Icon src={chatIcon} width={20} height={20} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="group-info__cta-layer">
        <button
          type="button"
          className="group-info__cta"
          onClick={() => toast.info("Adding members to a channel is not available yet.")}
        >
          <Icon src={addIcon} width={24} height={24} />
          Add Members
        </button>
      </div>

      <div className="group-info__section-head">
        <div className="group-info__section-title group-info__section-title--media">
          Media Attachment
        </div>
        <button
          type="button"
          className="group-info__icon-btn"
          aria-label={showAllFiles ? "Show fewer attachments" : "Show all attachments"}
          aria-expanded={showAllFiles}
          onClick={() => setShowAllFiles(value => !value)}
        >
          <Icon src={moreIcon} width={24} height={24} />
        </button>
      </div>

      {files.length === 0 && (
        <p className="group-info__empty">No files have been shared in this channel yet.</p>
      )}
      <ul className="group-info__files">
        {files.map(file => (
          <li key={file.key} className="group-info__row group-info__file">
            <div className="group-info__row-main">
              {file.isImage ? <ImageThumb /> : <FileThumb />}
              <div className="group-info__text">
                <div className="group-info__title">{file.name}</div>
                <div className="group-info__subtitle">{file.detail}</div>
              </div>
            </div>
            <a
              href={file.url}
              className="group-info__download"
              download={file.name}
              target="_blank"
              rel="noreferrer"
              onClick={event => onDownload(event, file.url)}
            >
              Download
            </a>
          </li>
        ))}
      </ul>

      {callingMember && (
        <AudioCallModal
          isOpen={!!callingMember}
          onClose={() => setCallingMember(null)}
          user={callingMember}
        />
      )}
    </AppSimpleBar>
  );
};

export default GroupInfo;
