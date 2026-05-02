import React, { useState } from "react";
import {
  Modal,
  ModalBody,
  ModalHeader,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
import { Link } from "react-router-dom";

import AppSimpleBar from "./AppSimpleBar";
import type { MessagesTypes } from "../data/messages";

interface AddPinnedTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedMessages: MessagesTypes[];
  onTogglePin?: (messageId: string | number) => void;
}

function getPinnedRowMeta(message: MessagesTypes): {
  icon: string;
  title: string;
  desc: string;
  openUrl?: string;
} {
  const attachments = message.attachments || [];
  const voice = attachments.find((a) => a.type === "voice");
  const files = attachments.filter((a) => a.type !== "voice");
  const imgCount = message.image?.length || 0;

  if (voice && files.length === 0 && !imgCount && !message.text?.trim()) {
    return {
      icon: "bx bx-microphone",
      title: "Voice message",
      desc: `Message #${message.mId}`,
    };
  }

  if (imgCount > 0) {
    const t =
      imgCount > 1 ? `${imgCount} photos` : "Photo message";
    return {
      icon: "bx bx-image",
      title: t,
      desc: message.text?.trim()?.slice(0, 120) || `Message #${message.mId}`,
    };
  }

  if (files.length === 1) {
    const f = files[0];
    return {
      icon: "bx bx-file",
      title: f.name || "File",
      desc: message.text?.trim()?.slice(0, 120) || f.desc || `Message #${message.mId}`,
      openUrl: f.downloadLink,
    };
  }

  if (files.length > 1) {
    return {
      icon: "bx bx-file",
      title: `${files.length} files`,
      desc: message.text?.trim()?.slice(0, 120) || `Message #${message.mId}`,
      openUrl: files[0]?.downloadLink,
    };
  }

  const raw = message.text?.trim() || "";
  const title =
    raw.length > 72 ? `${raw.slice(0, 72)}…` : raw || "Pinned message";

  return {
    icon: "bx bx-message-rounded-dots",
    title,
    desc: `Message #${message.mId}`,
  };
}

const PinnedRow = ({
  message,
  onTogglePin,
}: {
  message: MessagesTypes;
  onTogglePin?: (messageId: string | number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const { icon, title, desc, openUrl } = getPinnedRowMeta(message);

  return (
    <li>
      <div className="d-flex align-items-center">
        <div className="flex-shrink-0 avatar-xs me-3">
          <div className="avatar-title bg-primary-subtle text-primary rounded-circle">
            <i className={icon}></i>
          </div>
        </div>
        <div className="flex-grow-1 overflow-hidden">
          <h5 className="font-size-14 text-truncate mb-1">
            <Link to="#" className="p-0 text-reset" onClick={(e) => e.preventDefault()}>
              {title}
            </Link>
          </h5>
          <p className="text-muted font-size-13 mb-0 text-truncate">{desc}</p>
        </div>
        <div className="flex-shrink-0 ms-3">
          <Dropdown isOpen={open} toggle={() => setOpen((v) => !v)}>
            <DropdownToggle
              tag="a"
              className="font-size-18 text-muted px-1"
              role="button"
            >
              <i className="bx bx-dots-horizontal-rounded"></i>
            </DropdownToggle>
            <DropdownMenu className="dropdown-menu-end">
              {openUrl && (
                <DropdownItem
                  className="d-flex align-items-center justify-content-between"
                  onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
                >
                  Open file <i className="bx bx-link-external ms-2 text-muted"></i>
                </DropdownItem>
              )}
              {onTogglePin && (
                <DropdownItem
                  className="d-flex align-items-center justify-content-between"
                  onClick={() => onTogglePin(message.mId)}
                >
                  Unpin <i className="ri-pushpin-line ms-2 text-muted"></i>
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </li>
  );
};

const AddPinnedTabModal = ({
  isOpen,
  onClose,
  pinnedMessages,
  onTogglePin,
}: AddPinnedTabModalProps) => {
  const list = Array.isArray(pinnedMessages) ? pinnedMessages : [];
  const count = list.length;

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      className="pinnedtabModal"
      tabIndex={-1}
      contentClassName="shadow-lg border-0"
      centered
      scrollable
    >
      <ModalBody className="p-0 ">
        <ModalHeader toggle={onClose} className="bg-primary">
          <div className="modal-title modal-title-custom text-white bg-primary font-size-16">
            Pinned in chat
          </div>
        </ModalHeader>
        <div className="modal-body p-4">
          <div className="d-flex align-items-start mb-3">
            <div className="flex-grow-1">
              <h5 className="font-size-16 mb-0">
                {count} pinned {count === 1 ? "item" : "items"}
              </h5>
              <p className="text-muted small mb-0 mt-1">
                Messages and files you pinned in this conversation. Saved bookmarks stay in the{" "}
                <strong>Bookmark</strong> tab.
              </p>
            </div>
          </div>
          <AppSimpleBar style={{ maxHeight: "299px" }} className="chat-bookmark-list mx-n4">
            <ul className="list-unstyled chat-list">
              {count === 0 ? (
                <li className="px-3 py-4 text-muted text-center small">
                  Nothing pinned yet. Open the <strong>⋮</strong> menu on a message and choose{" "}
                  <strong>Pin</strong>.
                </li>
              ) : (
                list.map((msg) => (
                  <PinnedRow key={msg.mId} message={msg} onTogglePin={onTogglePin} />
                ))
              )}
            </ul>
          </AppSimpleBar>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default AddPinnedTabModal;
