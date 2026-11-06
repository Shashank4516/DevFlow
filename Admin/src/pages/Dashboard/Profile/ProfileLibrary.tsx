import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";

import LightBox from "../../../components/LightBox";
import { AttachedfileTypes, MediaTypes } from "../../../data/myProfile";

const PREVIEW_MEDIA = 6;
const PREVIEW_FILES = 3;

export const ProfileMedia = ({ media }: { media?: MediaTypes }) => {
  const [showAll, setShowAll] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const list = media?.list || [];
  const lightBoxImages = useMemo(
    () => list.map(item => ({ id: item.id, downloadLink: item.url })),
    [list],
  );
  if (list.length === 0) return null;

  const shown = showAll ? list : list.slice(0, PREVIEW_MEDIA);
  const hidden = list.length - shown.length;

  return (
    <section className="my-profile__section">
      <h6>
        Media <span>{list.length}</span>
      </h6>
      <div className="my-profile__media">
        {shown.map((item, index) => {
          const isLastPreview = !showAll && hidden > 0 && index === shown.length - 1;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={isLastPreview ? `Show ${hidden} more` : `Open image ${index + 1}`}
              onClick={() => (isLastPreview ? setShowAll(true) : setOpenIndex(index))}
            >
              <img src={item.url} alt="" />
              {isLastPreview && <span>+{hidden + 1}</span>}
            </button>
          );
        })}
      </div>
      {openIndex !== null && (
        <LightBox
          isOpen
          images={lightBoxImages}
          defaultIdx={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
};

const FILE_COLORS: [RegExp, string][] = [
  [/pdf/, "#ff3b30"],
  [/doc/, "#007aff"],
  [/image|fig/, "#af52de"],
  [/zip|archive/, "#ff9500"],
];

export const ProfileFiles = ({ attachedFiles }: { attachedFiles?: AttachedfileTypes }) => {
  const [showAll, setShowAll] = useState(false);
  const list = attachedFiles?.list || [];
  if (list.length === 0) return null;
  const shown = showAll ? list : list.slice(0, PREVIEW_FILES);

  return (
    <section className="my-profile__section">
      <h6>
        Files <span>{list.length}</span>
      </h6>
      <div className="my-profile__group">
        {shown.map(file => {
          const color =
            FILE_COLORS.find(([pattern]) => pattern.test(file.icon))?.[1] || "#8e8e93";
          return (
            <a
              key={file.id}
              href={file.downloadUrl}
              download={file.fileName}
              className="my-profile__row"
              onClick={event => {
                if (!file.downloadUrl || file.downloadUrl === "#") {
                  event.preventDefault();
                  toast.info("This is a sample file, so there is nothing to download.");
                }
              }}
            >
              <span className="my-profile__row-icon" style={{ background: color, color: "#fff" }}>
                <i className={file.icon} />
              </span>
              <span className="my-profile__row-text">
                <span>{file.fileName}</span>
                <small>{file.size}</small>
              </span>
              <i className="bx bx-download my-profile__row-end" />
            </a>
          );
        })}
        {list.length > PREVIEW_FILES && (
          <button
            type="button"
            className="my-profile__show-all"
            onClick={() => setShowAll(value => !value)}
          >
            {showAll ? "Show less" : `Show all ${list.length}`}
          </button>
        )}
      </div>
    </section>
  );
};
