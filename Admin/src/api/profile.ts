import { APIClient } from "./apiCore";
import * as url from "./urls";

const api = new APIClient();

const getProfileDetails = () => {
  return api.get(url.GET_PROFILE_DETAILS);
};

const getSettings = () => {
  return api.get(url.GET_USER_SETTINGS);
};
const updateSettings = (field: string, value: any) => {
  return api.update(url.UPDATE_ETTINGS, {
    field: field,
    value: value,
  });
};

const updateProfileImages = (data: { avatar?: File; cover?: File }) => {
  return api.createWithFile(url.POST_PROFILE_UPDATE_IMAGES, data);
};

/** Store avatar/cover in MySQL as data URLs (works on Railway; avoids flaky multipart proxies). */
const updateProfileImagesDataUrls = (data: { avatar?: string; cover?: string }) => {
  return api.create(url.POST_PROFILE_UPDATE_IMAGES, data);
};

export {
  getProfileDetails,
  getSettings,
  updateSettings,
  updateProfileImages,
  updateProfileImagesDataUrls,
};
