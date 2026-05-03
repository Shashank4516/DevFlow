import { APIClient } from "./apiCore";
import * as url from "./urls";

const api = new APIClient();

const getFavourites = () => {
  return api.get(url.GET_FAVOURITES);
};

const getDirectMessages = () => {
  // Use accepted friends from the real backend as DM list.
  return api.get(url.GET_ACCEPTED_FRIENDS);
};
const getChannels = () => {
  return api.get(url.GET_CHANNELS);
};

const addContacts = (contacts: Array<string | number>) => {
  return api.create(url.ADD_CONTACTS, contacts);
};

const createChannel = (data: object) => {
  return api.create(url.CREATE_CHANNEL, data);
};

const getChatUserDetails = (id: string | number) => {
  return api.get(url.GET_CHAT_USER_DETAILS + "/" + id, { params: { id } });
};

const getChatUserConversations = (id: string | number) => {
  return api.get(url.GET_DM_MESSAGES, {
    params: { with_user_id: id },
  });
};

const sendMessage = (data: {
  to_user_id: string | number;
  text?: string;
  attachments?: Array<any>;
}) => {
  return api.create(url.POST_DM_MESSAGE, data);
};

const uploadMessageAttachment = (data: {
  file: File | Blob;
  kind: "image" | "file" | "voice";
  name?: string;
  duration?: number;
}) => {
  const formData = new FormData();
  formData.append("file", data.file, data.name || "attachment");
  formData.append("kind", data.kind);
  if (data.duration != null) {
    formData.append("duration", String(data.duration));
  }
  return api.create(url.POST_DM_UPLOAD, formData);
};

const receiveMessage = (id: string | number) => {
  return api.update(url.RECEIVE_MESSAGE + "/" + id, { params: { id } });
};

const readMessage = (id: string | number) => {
  return api.update(url.READ_MESSAGE + "/" + id, { params: { id } });
};

const receiveMessageFromUser = (id: string | number) => {
  return api.get(url.RECEIVE_MESSAGE_FROM_USER + "/" + id, {
    params: { id },
  });
};

const deleteMessage = (userId: number | string, messageId: number | string) => {
  return api.delete(url.DELETE_MESSAGE + "/" + userId + "/" + messageId, {
    params: { userId, messageId },
  });
};

const forwardMessage = (data: object) => {
  return api.create(url.FORWARD_MESSAGE, data);
};

const deleteUserMessages = (userId: number | string) => {
  return api.create(url.DELETE_USER_MESSAGES, {
    with_user_id: Number(userId),
  });
};

const getChannelDetails = (id: string | number) => {
  return api.get(url.GET_CHANNEL_DETAILS, { params: { id } });
};

const getChannelMessages = (channelId: string | number, limit: number = 200) => {
  return api.get(url.GET_CHANNEL_MESSAGES, {
    params: { channel_id: channelId, limit },
  });
};

const sendChannelMessage = (data: {
  channel_id: string | number;
  text?: string;
  attachments?: Array<any>;
}) => {
  return api.create(url.POST_CHANNEL_MESSAGE, data);
};

const toggleMessagePin = (data: {
  with_user_id: string | number;
  message_id: string | number;
}) => {
  return api.create(url.POST_DM_TOGGLE_PIN, data);
};

const toggleChannelMessagePin = (data: {
  channel_id: string | number;
  message_id: string | number;
}) => {
  return api.create(url.POST_CHANNEL_TOGGLE_PIN, data);
};

const toggleFavouriteContact = (id: string | number) => {
  return api.create(url.TOGGLE_FAVOURITE_CONTACT, {
    target_user_id: Number(id),
  });
};

/*
archive
*/
const getArchiveContact = () => {
  return api.get(url.GET_ARCHIVE_CONTACT);
};

const toggleArchiveContact = (id: string | number) => {
  return api.create(url.TOGGLE_ARCHIVE_CONTACT, {
    target_user_id: Number(id),
  });
};

const readConversation = (id: string | number) => {
  return api.update(url.READ_CONVERSATION + "/" + id, { params: { id } });
};

const deleteImage = (
  userId: number | string,
  messageId: number | string,
  imageId: number | string
) => {
  return api.delete(url.DELETE_IMAGE + "/" + userId + "/" + messageId, {
    params: { userId, messageId, imageId },
  });
};

export {
  getFavourites,
  getDirectMessages,
  getChannels,
  addContacts,
  createChannel,
  getChatUserDetails,
  getChatUserConversations,
  sendMessage,
  uploadMessageAttachment,
  receiveMessage,
  readMessage,
  receiveMessageFromUser,
  deleteMessage,
  forwardMessage,
  deleteUserMessages,
  getChannelDetails,
  getChannelMessages,
  sendChannelMessage,
  toggleMessagePin,
  toggleChannelMessagePin,
  toggleFavouriteContact,
  getArchiveContact,
  toggleArchiveContact,
  readConversation,
  deleteImage,
};
