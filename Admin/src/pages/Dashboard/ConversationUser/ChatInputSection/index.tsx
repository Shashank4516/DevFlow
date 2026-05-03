import React, { useEffect, useRef, useState } from "react";
import { Alert, Form } from "reactstrap";

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
    } finally {
      setIsSending(false);
    }
    setText("");
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

  const mentionMatch = (text || "").match(/(?:^|\s)@([a-zA-Z0-9_.-/]*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const showRepoMentions = mentionQuery !== null && githubRepos.length > 0;
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
            />
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
