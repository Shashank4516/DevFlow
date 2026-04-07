//auth
export const POST_FAKE_LOGIN = "/post-fake-login";
export const POST_FAKE_JWT_LOGIN = "/post-jwt-login";
export const POST_FAKE_PASSWORD_FORGET = "/fake-forget-pwd";
export const POST_FAKE_JWT_PASSWORD_FORGET = "/jwt-forget-pwd";
export const SOCIAL_LOGIN = "/social-login";
export const JWT_REGISTER = "/post-jwt-register";
export const POST_FAKE_REGISTER = "/post-fake-register";

export const USER_CHANGE_PASSWORD = "/user-change-password";

// profile & settings
export const GET_PROFILE_DETAILS = "/profile-details";
export const GET_USER_SETTINGS = "/user-settings";
export const UPDATE_ETTINGS = "/update-user-settings";

// contacts
export const GET_CONTACTS = "/user-contacts";
export const INVITE_CONTACT = "/invite-contact";

// calls
export const GET_CALLS_LIST = "/calls-list";

// bookmarks
export const GET_BOOKMARKS_LIST = "/bookmarks-list";
export const DELETE_BOOKMARK = "/bookmarks-delete";
export const UPDATE_BOOKMARK = "/bookmarks-update";

// chats
export const GET_FAVOURITES = "/get-favourites";
export const GET_DIRECT_MESSAGES = "/get-direct-messages";
export const GET_CHANNELS = "/get-channles";
export const ADD_CONTACTS = "/add-contact";
export const CREATE_CHANNEL = "/create-channel";
export const GET_CHAT_USER_DETAILS = "/get-user-details";
export const GET_CHAT_USER_CONVERSATIONS = "/get-user-conversations";
export const SEND_MESSAGE = "/send-message";
export const RECEIVE_MESSAGE = "/receive-message";
export const READ_MESSAGE = "/read-message";
export const RECEIVE_MESSAGE_FROM_USER = "/receive-message-from-user";
export const DELETE_MESSAGE = "/delete-message";
export const FORWARD_MESSAGE = "/forward-message";
export const DELETE_USER_MESSAGES = "/delete-user-messages";
export const TOGGLE_FAVOURITE_CONTACT = "/toggle-favourite-contact";
export const GET_ARCHIVE_CONTACT = "/get-archive-contacts";
export const TOGGLE_ARCHIVE_CONTACT = "/toggle-archive-contact";
export const READ_CONVERSATION = "/read-conversation";
export const DELETE_IMAGE = "/user-delete-img";

// groups
export const GET_CHANNEL_DETAILS = "/get-channel-details";

// friends (real backend)
export const GET_ACCEPTED_FRIENDS = "/api/friends/accepted.php";
export const GET_DM_MESSAGES = "/api/messages/list.php";
export const POST_DM_MESSAGE = "/api/messages/send.php";

// Stack / projects (PHP backend)
export const GET_PROJECTS_LIST = "/api/projects/list.php";
export const POST_PROJECT_CREATE = "/api/projects/create.php";
export const GET_PROJECT_BOARD = "/api/projects/board.php";
export const GET_PROJECT_CATEGORY_COUNTS = "/api/projects/category_counts.php";
export const GET_PROJECT_MEMBERS = "/api/projects/members.php";
export const POST_PROJECT_INVITE = "/api/projects/invite.php";
export const POST_PROJECT_TASK_MOVE = "/api/projects/task_move.php";
export const POST_PROJECT_TASK_CREATE = "/api/projects/task_create.php";
