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

export { getProfileDetails, getSettings, updateSettings, updateProfileImages };
