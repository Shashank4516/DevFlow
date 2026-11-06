import { format, isThisWeek, isThisYear, isToday, isYesterday } from "date-fns";

/** The last message of a chat, when the API includes one. */
export type ChatLastMessage = {
  text?: string;
  time?: string;
  fromMe?: boolean;
  senderName?: string;
  /** Set when the message was only an attachment. */
  kind?: "image" | "file" | "voice";
};

export const shortChatTime = (time?: string) => {
  if (!time) return "";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return format(date, "EEEE");
  return format(date, isThisYear(date) ? "MMM d" : "MMM d, yyyy");
};

const KIND_LABELS = { image: "Photo", file: "File", voice: "Voice message" };

export const chatPreviewText = (last?: ChatLastMessage) => {
  if (!last) return "";
  const body = last.text || (last.kind ? KIND_LABELS[last.kind] : "");
  if (!body) return "";
  const who = last.fromMe ? "You" : last.senderName;
  return who ? `${who}: ${body}` : body;
};
