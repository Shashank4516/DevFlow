import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Form } from "reactstrap";
import classnames from "classnames";
import { createSelector } from "reselect";

import { useProfile, useRedux } from "../../../../hooks";

// components
import StartButtons from "./StartButtons";
import InputSection from "./InputSection";
import EndButtons from "./EndButtons";
import MoreMenu from "./MoreMenu";
import Reply from "./Reply";

// interface
import { MessagesTypes } from "../../../../data/messages";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

interface GithubRepoSuggestion {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
}

interface MentionableMember {
  id: string | number;
  name: string;
  image?: string;
}

interface IndexProps {
  onSend: (data: any) => Promise<void> | void;
  replyData: null | MessagesTypes | undefined;
  onSetReplyData: (reply: null | MessagesTypes | undefined) => void;
  chatUserDetails: any;
  disabled?: boolean;
  disabledReason?: string;
}
const Index = ({
  onSend,
  replyData,
  onSetReplyData,
  chatUserDetails,
  disabled: transportDisabled,
  disabledReason,
}: IndexProps) => {
  const { useAppSelector } = useRedux();
  const { userProfile } = useProfile();
  const friendData = createSelector(
    (state: any) => state.Chats,
    chats => ({ directMessages: chats.directMessages, favourites: chats.favourites }),
  );
  const { directMessages, favourites } = useAppSelector(friendData);

  /*
  more menu collapse
  */
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onToggle = () => {
    setIsOpen(!isOpen);
    setemojiArray(true);
  };

  /*
  disable send button
  */
  const [sendDisabled, setSendDisabled] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);

  /*
  input text
  */
  const [text, setText] = useState<null | string>("");
  const onChangeText = (value: string) => {
    setText(value);
  };

  /*
  images
  */
  const [images, setImages] = useState<Array<any> | null | undefined>();
  const onSelectImages = (images: Array<any>) => {
    setImages(images);
  };

  /*
  files
  */
  const [files, setFiles] = useState<Array<any> | null | undefined>();
  const onSelectFiles = (files: Array<any>) => {
    setFiles(files);
  };
  const [voiceMessage, setVoiceMessage] = useState<{
    blob: Blob;
    duration: number;
    url: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepoSuggestion[]>([]);

  useEffect(() => {
    if (!BACKEND_URL) return;
    fetch(`${BACKEND_URL}/api/github/repos.php`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const repos = Array.isArray(data?.repos) ? data.repos : [];
        setGithubRepos(repos);
      })
      .catch(() => setGithubRepos([]));
  }, []);

  useEffect(() => {
    if (text || images || files || voiceMessage) {
      setSendDisabled(false);
    } else {
      setSendDisabled(true);
    }
  }, [text, images, files, voiceMessage]);

  // emoji picker 
  const [emojiArray, setemojiArray] = useState<any>("");
  const [emojiPicker, setemojiPicker] = useState<boolean>(false);
  const onEmojiClick = (event: any) => {
    setemojiArray([...emojiArray, event.emoji]);
    setText(text + event.emoji);
  };


  // Submit Message
  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      alert("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      recorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stopRecordingTimer();
        stream.getTracks().forEach(track => track.stop());
        const duration = Math.max(
          1,
          Math.round((Date.now() - recordingStartedAtRef.current) / 1000),
        );
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        setVoiceMessage({
          blob,
          duration,
          url: URL.createObjectURL(blob),
        });
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
      }, 500);
    } catch (e: any) {
      setIsRecording(false);
      alert(e?.message || "Could not start voice recording.");
    }
  };

  const onToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
      stopRecordingTimer();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (voiceMessage?.url) URL.revokeObjectURL(voiceMessage.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async () => {
    if (sendDisabled || transportDisabled || isSending) return;
    let data: any = {};
    if (text) {
      data["text"] = text;
    }
    if (images && images.length) {
      data["images"] = images;
    }

    if (files && files.length) {
      data["files"] = files;
    }

    if (voiceMessage) {
      data["voice"] = voiceMessage;
    }

    setIsSending(true);
    try {
      await onSend(data);
    } catch {
      // onSend has already reported the error. Keep the text so it can be retried.
      return;
    } finally {
      setIsSending(false);
    }
    // Emptied here, as the bubble lifts out of the box.
    setText("");
    setCaret(0);
    setImages(null);
    setFiles(null);
    if (voiceMessage?.url) URL.revokeObjectURL(voiceMessage.url);
    setVoiceMessage(null);
    setemojiPicker(false);
  };

  const onClearMedia = () => {
    setImages(null);
    setFiles(null);
    if (voiceMessage?.url) URL.revokeObjectURL(voiceMessage.url);
    setVoiceMessage(null);
  };

  /*
  mentioning a group member
  */
  const inputRef = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState(0);
  const [activeMember, setActiveMember] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const typedBeforeCaret = (text || "").slice(0, caret);
  const memberMatch = chatUserDetails?.isChannel
    ? typedBeforeCaret.match(/(^|\s)@([^@\n]{0,30})$/)
    : null;
  const mentionStart = memberMatch
    ? (memberMatch.index ?? 0) + memberMatch[1].length
    : null;
  const memberQuery = memberMatch ? memberMatch[2].toLowerCase() : "";
  const mentionableMembers = useMemo<MentionableMember[]>(() => {
    const photos = new Map<string, string>();
    [...(directMessages || []), ...(favourites || [])].forEach((friend: any) => {
      if (friend?.profileImage) photos.set(String(friend.id), friend.profileImage);
    });
    const myId = String(userProfile?.id ?? userProfile?.uid ?? "");
    return (chatUserDetails?.members || [])
      .filter((member: any) => String(member.id) !== myId)
      .map((member: any) => ({
        id: member.id,
        name: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
        image: photos.get(String(member.id)),
      }))
      .filter((member: MentionableMember) => member.name);
  }, [chatUserDetails?.members, directMessages, favourites, userProfile?.id, userProfile?.uid]);
  const memberSuggestions =
    memberMatch && mentionStart !== dismissedAt
      ? mentionableMembers.filter(member => {
          const name = member.name.toLowerCase();
          return name.startsWith(memberQuery) || name.includes(` ${memberQuery}`);
        })
      : [];
  const showMemberMenu = memberSuggestions.length > 0;

  useEffect(() => {
    setActiveMember(0);
  }, [memberQuery, mentionStart]);

  useEffect(() => {
    if (mentionStart === null) setDismissedAt(null);
  }, [mentionStart]);

  const onInsertMember = (member: MentionableMember) => {
    if (mentionStart === null) return;
    const current = text || "";
    const inserted = `@${member.name} `;
    const nextCaret = mentionStart + inserted.length;
    setText(current.slice(0, mentionStart) + inserted + current.slice(caret));
    setCaret(nextCaret);
    // Puts the cursor straight after the name, once React has updated the box.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMemberMenu) return;
    const count = memberSuggestions.length;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveMember(index => (index + 1) % count);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveMember(index => (index - 1 + count) % count);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      onInsertMember(memberSuggestions[Math.min(activeMember, count - 1)]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDismissedAt(mentionStart);
    }
  };

  const mentionMatch = (text || "").match(/(?:^|\s)@([a-zA-Z0-9_.-/]*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const showRepoMentions = !showMemberMenu && mentionQuery !== null && githubRepos.length > 0;
  const filteredRepos = showRepoMentions
    ? githubRepos
        .filter((repo) => {
          if (!mentionQuery) return true;
          return (
            repo.full_name.toLowerCase().includes(mentionQuery) ||
            repo.name.toLowerCase().includes(mentionQuery)
          );
        })
        .slice(0, 8)
    : [];

  const onInsertRepoMention = (repo: GithubRepoSuggestion) => {
    const current = text || "";
    const updated = current.replace(
      /(^|\s)@([a-zA-Z0-9_.-/]*)$/,
      `$1@${repo.full_name} `
    );
    setText(updated);
  };

  return (
    <div className="chat-input-section p-3 p-lg-4">
      {disabledReason ? (
        <Alert color="warning" className="py-2 px-3 mb-2">
          {disabledReason}
        </Alert>
      ) : null}
      <Form
        id="chatinput-form"
        onSubmit={(e: any) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="row g-0 align-items-center">
          <div className="col-auto">
            <StartButtons
              onToggle={onToggle}
              onEmojiClick={onEmojiClick}
              setemojiPicker={setemojiPicker}
              emojiPicker={emojiPicker}
            />
          </div>
          <div className="col position-relative">
            <InputSection
              value={text}
              onChange={onChangeText}
              disabled={!!transportDisabled}
              placeholder="Type your message..."
              inputRef={inputRef}
              onKeyDown={onInputKeyDown}
              onCaretChange={setCaret}
            />
            {showMemberMenu && (
              <ul className="member-mention-menu" role="listbox" aria-label="Mention a member">
                <li className="member-mention-menu__title" role="presentation">
                  Members
                </li>
                {memberSuggestions.map((member, index) => (
                  <li key={member.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeMember}
                      className={classnames("member-mention-menu__item", {
                        "is-active": index === activeMember,
                      })}
                      // Keeps the cursor in the message box.
                      onMouseDown={event => event.preventDefault()}
                      onMouseEnter={() => setActiveMember(index)}
                      onClick={() => onInsertMember(member)}
                    >
                      {member.image ? (
                        <img src={member.image} alt="" />
                      ) : (
                        <span className="member-mention-menu__initials">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {member.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showRepoMentions && filteredRepos.length > 0 ? (
              <div className="repo-mention-menu shadow">
                {filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    type="button"
                    className="repo-mention-item"
                    onClick={() => onInsertRepoMention(repo)}
                  >
                    <span className="repo-mention-name">@{repo.full_name}</span>
                    <span className="repo-mention-meta">{repo.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="col-auto">
            <EndButtons
              onSubmit={onSubmit}
              disabled={sendDisabled || !!transportDisabled || isSending}
              onToggleRecording={onToggleRecording}
              isRecording={isRecording}
              recordingDisabled={!!transportDisabled || isSending}
            />
          </div>
        </div>
      </Form>
      {isRecording ? (
        <Alert color="danger" className="py-2 px-3 mb-2">
          Recording voice message... {recordingSeconds}s. Tap the mic again to stop.
        </Alert>
      ) : null}
      {(images && images.length) || (files && files.length) || voiceMessage ? (
        <Alert
          isOpen={true}
          toggle={onClearMedia}
          color="secondary"
          className="alert-dismiss-custom 
        rounded-pill font-size-12 mb-1 selected-media"
          closeClassName="selected-media-close"
        >
          <p className="me-2 mb-0">
            {images && images.length ? ` ${images.length} image(s)` : ""}
            {files && files.length ? ` ${files.length} file(s)` : ""}
            {voiceMessage ? ` Voice message (${voiceMessage.duration}s)` : ""}
            {isSending ? " Uploading..." : ""}
          </p>
        </Alert>
      ) : null}

      <MoreMenu
        isOpen={isOpen}
        onSelectImages={onSelectImages}
        onSelectFiles={onSelectFiles}
        onToggle={onToggle}
      />

      <Reply
        reply={replyData}
        onSetReplyData={onSetReplyData}
        chatUserDetails={chatUserDetails}
      />
    </div>
  );
};

export default Index;
