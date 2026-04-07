import { APIClient } from "./apiCore";
import * as url from "./urls";

const api = new APIClient();

const pingPresence = () => {
  return api.create(url.POST_PRESENCE_PING, {});
};

export { pingPresence };

