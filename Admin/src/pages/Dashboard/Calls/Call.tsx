import React from "react";
import classnames from "classnames";
import { format } from "date-fns";

import { CallItem } from "../../../data/calls";

/** Missed for the person called. For the caller, the same call just wasn't answered. */
export const isMissedCall = (call: CallItem) =>
  call.wasConnected === false && call.isIncomming && !call.wasDeclined;

const describeCall = (call: CallItem) => {
  if (call.wasDeclined) {
    return {
      icon: call.isIncomming ? "bx bx-phone-incoming" : "bx bx-phone-outgoing",
      label: "Declined",
    };
  }
  if (isMissedCall(call)) return { icon: "bx bx-phone-incoming", label: "Missed" };
  if (call.wasConnected === false) return { icon: "bx bx-phone-outgoing", label: "No answer" };
  return call.isIncomming
    ? { icon: "bx bx-phone-incoming", label: "Incoming" }
    : { icon: "bx bx-phone-outgoing", label: "Outgoing" };
};

interface CallProps {
  call: CallItem;
  onOpenChat: (call: CallItem) => void;
  onCall: (call: CallItem) => void;
}

const Call = ({ call, onOpenChat, onCall }: CallProps) => {
  const fullName = `${call.firstName} ${call.lastName}`.trim();
  const initials = `${call.firstName.charAt(0)}${call.lastName.charAt(0)}`.toUpperCase();
  const missed = isMissedCall(call);
  const { icon, label } = describeCall(call);
  const hasDuration = call.callDuration && call.callDuration !== "—";

  return (
    <li className={classnames("call-row", { "is-missed": missed })}>
      <button
        type="button"
        className="call-row__main"
        title={`Open chat with ${fullName}`}
        disabled={!call.peerUserId}
        onClick={() => onOpenChat(call)}
      >
        {call.profileImage ? (
          <img src={call.profileImage} alt="" className="call-row__avatar" />
        ) : (
          <span className="call-row__avatar call-row__avatar--initials">{initials}</span>
        )}
        <span className="call-row__body">
          <span className="call-row__top">
            <span className="call-row__name">{fullName}</span>
            <time className="call-row__time">{format(new Date(call.callDate), "h:mm a")}</time>
          </span>
          <span className="call-row__detail">
            <i className={icon} />
            {label}
            {hasDuration && ` · ${call.callDuration}`}
          </span>
        </span>
      </button>
      <button
        type="button"
        className="call-row__call"
        aria-label={`Video call ${fullName}`}
        title={`Video call ${fullName}`}
        disabled={!call.peerUserId}
        onClick={() => onCall(call)}
      >
        <i className="bx bxs-video" />
      </button>
    </li>
  );
};

export default Call;
