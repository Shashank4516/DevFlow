/**
 * Seed data for demo mode (`npm run demo`). Nothing here reaches a real backend.
 * The ids are deliberately high so they can never collide with real MySQL user ids.
 */
import avatar1 from "../assets/images/users/avatar-1.jpg";
import avatar2 from "../assets/images/users/avatar-2.jpg";
import avatar3 from "../assets/images/users/avatar-3.jpg";
import avatar4 from "../assets/images/users/avatar-4.jpg";
import avatar5 from "../assets/images/users/avatar-5.jpg";
import avatar7 from "../assets/images/users/avatar-7.jpg";
import avatar8 from "../assets/images/users/avatar-8.jpg";
import avatar11 from "../assets/images/users/avatar-11.jpg";
import avatar12 from "../assets/images/users/avatar-12.jpg";
import img1 from "../assets/images/small/img-1.jpg";
import img2 from "../assets/images/small/img-2.jpg";
import img3 from "../assets/images/small/img-3.jpg";
import img4 from "../assets/images/small/img-4.jpg";
import img5 from "../assets/images/small/img-5.jpg";
import { STATUS_TYPES } from "../constants";
import type { CallItem } from "../data/calls";

export const DEMO_USER_ID = 9001;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
export const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

export const demoMe = {
  id: DEMO_USER_ID,
  uid: String(DEMO_USER_ID),
  firstName: "Shashank",
  lastName: "Malik",
  displayName: "Shashank Malik",
  email: "shashank@devflow.demo",
  profileImage: avatar1,
  photoURL: avatar1,
};

export const demoBasicDetails = {
  firstName: "Shashank",
  lastName: "Malik",
  fullName: "Shashank Malik",
  title: "Project Lead",
  description:
    "Building DevFlow: one workspace for team chat, Kanban planning and GitHub activity.",
  email: demoMe.email,
  location: "New Delhi, India",
  avatar: avatar1,
  profile: avatar1,
  coverImage: img4,
  profileTag: "shashank#0412",
};

export const demoMediaList = [img1, img2, img3, img4, img5].map((url, i) => ({
  id: i + 1,
  url,
}));

const file = (id: number, fileName: string, size: string, icon: string) => ({
  id,
  fileName,
  size,
  downloadUrl: "#",
  icon,
});

const sharedFiles = [
  file(1, "api-spec-v2.pdf", "1.8 MB", "bx bxs-file-pdf"),
  file(2, "kanban-wireframes.fig", "12.4 MB", "bx bxs-file-image"),
  file(3, "sprint-4-notes.docx", "240 KB", "bx bxs-file-doc"),
];

type PersonSeed = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  location: string;
  profileImage: string;
  status: STATUS_TYPES;
  unRead?: number;
  isFavourite?: boolean;
  isArchived?: boolean;
};

const person = (seed: PersonSeed) => ({
  id: seed.id,
  uid: String(seed.id),
  firstName: seed.firstName,
  lastName: seed.lastName,
  profileImage: seed.profileImage,
  status: seed.status,
  about: seed.role,
  email: `${seed.firstName.toLowerCase()}@devflow.demo`,
  location: seed.location,
  meta: { unRead: seed.unRead ?? 0 },
  isFavourite: !!seed.isFavourite,
  isArchived: !!seed.isArchived,
  channels: [
    { id: "501", name: "frontend-team" },
    { id: "503", name: "announcements" },
  ],
  media: { total: demoMediaList.length, list: demoMediaList },
  attachedFiles: { total: sharedFiles.length, list: sharedFiles },
});

export const demoFriends = () => [
  person({ id: 9002, firstName: "Aarav", lastName: "Sharma", role: "Backend developer, PHP and MySQL", location: "Bengaluru, India", profileImage: avatar12, status: STATUS_TYPES.ACTIVE, unRead: 2, isFavourite: true }),
  person({ id: 9003, firstName: "Priya", lastName: "Nair", role: "UI/UX designer", location: "Kochi, India", profileImage: avatar7, status: STATUS_TYPES.ACTIVE, isFavourite: true }),
  person({ id: 9004, firstName: "Rohan", lastName: "Gupta", role: "Frontend developer, React", location: "Pune, India", profileImage: avatar4, status: STATUS_TYPES.ACTIVE, unRead: 1 }),
  person({ id: 9005, firstName: "Ananya", lastName: "Iyer", role: "QA engineer", location: "Chennai, India", profileImage: avatar2, status: STATUS_TYPES.AWAY }),
  person({ id: 9006, firstName: "Vikram", lastName: "Singh", role: "DevOps engineer", location: "Jaipur, India", profileImage: avatar5, status: STATUS_TYPES.ACTIVE }),
  person({ id: 9007, firstName: "Neha", lastName: "Kapoor", role: "Product manager", location: "Mumbai, India", profileImage: avatar11, status: STATUS_TYPES.DO_NOT_DISTURB }),
  person({ id: 9008, firstName: "Kabir", lastName: "Mehta", role: "Mobile developer", location: "Hyderabad, India", profileImage: avatar8, status: STATUS_TYPES.AWAY }),
  person({ id: 9009, firstName: "Sara", lastName: "Thomas", role: "Technical writer", location: "Goa, India", profileImage: avatar3, status: STATUS_TYPES.AWAY, isArchived: true }),
];

/** People who show up in profile search but are not friends yet. */
export const demoStrangers = () => [
  { id: 9010, name: "Isha Verma", profile_image: "", profile_tag: "isha#2291" },
  { id: 9011, name: "Arjun Rao", profile_image: "", profile_tag: "arjun#7730" },
  { id: 9012, name: "Dev Patel", profile_image: "", profile_tag: "dev#5148" },
];

/** Incoming friend requests, shown on the Notifications tab. */
export const demoPendingRequests = () => [
  { request_id: 7001, user_id: 9012, name: "Dev Patel", profile_image: "", created_at: ago(3 * HOUR) },
];

type SeedAttachment = {
  name: string;
  size: string;
  type: "file" | "voice";
  mimeType: string;
};

type SeedMessage = {
  from: number;
  text: string;
  at: number;
  image?: string[];
  attachment?: SeedAttachment;
  pinned?: boolean;
};

export type DemoMessage = {
  mId: string;
  text: string;
  time: string;
  meta: {
    sender: string;
    receiver: string;
    sent: boolean;
    received: boolean;
    read: boolean;
    userData?: {
      id: number;
      firstName: string;
      lastName: string;
      profileImage: string | null;
    };
  };
  isPinned: boolean;
  pinnedAt: string | null;
  image?: { id: number; downloadLink: string }[];
  attachments?: {
    id: number;
    name: string;
    downloadLink: string;
    desc: string;
    type: string;
    mimeType: string;
    duration: number | null;
  }[];
};

let nextMessageId = 1000;
export const newMessageId = () => String(++nextMessageId);

const ME = DEMO_USER_ID;

const toMessage = (seed: SeedMessage, receiver: number | string): DemoMessage => ({
  mId: newMessageId(),
  text: seed.text,
  time: ago(seed.at),
  meta: {
    sender: String(seed.from),
    receiver: String(receiver),
    sent: true,
    received: true,
    read: true,
  },
  isPinned: !!seed.pinned,
  pinnedAt: seed.pinned ? ago(seed.at) : null,
  ...(seed.image
    ? { image: seed.image.map((downloadLink, i) => ({ id: i + 1, downloadLink })) }
    : {}),
  ...(seed.attachment
    ? {
        attachments: [
          {
            id: 1,
            name: seed.attachment.name,
            downloadLink: "#",
            desc: seed.attachment.size,
            type: seed.attachment.type,
            mimeType: seed.attachment.mimeType,
            duration: null,
          },
        ],
      }
    : {}),
});

const PDF = "application/pdf";

const DM_SEEDS: Record<number, SeedMessage[]> = {
  9002: [
    { from: 9002, text: "Hey! I pushed the first version of the task move endpoint.", at: DAY + 3 * HOUR },
    { from: ME, text: "Nice. Does it validate that the user is a member of the project?", at: DAY + 2.9 * HOUR },
    { from: 9002, text: "Yes, it returns 403 for non-members. I added that check to every project route.", at: DAY + 2.8 * HOUR },
    { from: 9002, text: "Here is the updated API spec with all the Stack endpoints.", at: DAY + 2.7 * HOUR, attachment: { name: "api-spec-v2.pdf", size: "1.8 MB", type: "file", mimeType: PDF }, pinned: true },
    { from: ME, text: "Perfect, I will wire the Kanban board to it today.", at: DAY + 2 * HOUR },
    { from: 9002, text: "The session handler fix is ready for review. DF-104 is in the Review column.", at: 22 * MINUTE },
    { from: 9002, text: "Can you take a look before the demo?", at: 21 * MINUTE },
  ],
  9003: [
    { from: 9003, text: "I finished the new Kanban card design. Sharing the mockups.", at: 2 * DAY },
    { from: 9003, text: "Cards now show the checklist progress as segments, and the assignee at the bottom.", at: 2 * DAY - 2 * MINUTE, image: [img1, img2] },
    { from: ME, text: "These look great! The segmented progress bar reads really well.", at: 2 * DAY - 20 * MINUTE },
    { from: 9003, text: "Thanks! Should dark mode be the default on the dashboard?", at: 3 * HOUR },
    { from: ME, text: "Let's follow the device preference. The app already detects it on load.", at: 2.8 * HOUR },
    { from: 9003, text: "Makes sense, I will update the style guide.", at: 2.7 * HOUR },
  ],
  9004: [
    { from: ME, text: "Rohan, how is the drag and drop going?", at: 5 * HOUR },
    { from: 9004, text: "Done with dnd-kit. Cards move between columns with an optimistic update, and they roll back if the API fails.", at: 4.8 * HOUR },
    { from: 9004, text: "Moving a card to Complete with unfinished checklist items now asks for confirmation too.", at: 4.7 * HOUR },
    { from: ME, text: "That is a nice touch. Please add it to the demo script.", at: 4.5 * HOUR },
    { from: 9004, text: "Added. I also started on the sidebar category counts.", at: 15 * MINUTE },
  ],
  9005: [
    { from: 9005, text: "I ran the regression suite on the chat module. 42 of 44 test cases passed.", at: 26 * HOUR },
    { from: ME, text: "What failed?", at: 25.5 * HOUR },
    { from: 9005, text: "Voice notes on Safari, and the pinned message order. Both are logged on the board.", at: 25 * HOUR },
    { from: ME, text: "Thanks Ananya. Please assign the Safari one to Rohan.", at: 24.5 * HOUR },
  ],
  9006: [
    { from: 9006, text: "The Docker image for the backend now ships with mysqli and pdo_mysql enabled.", at: 3 * DAY },
    { from: ME, text: "So the Railway deploy error is gone?", at: 3 * DAY - 10 * MINUTE },
    { from: 9006, text: "Yes, the Google OAuth callback works on staging now.", at: 3 * DAY - 15 * MINUTE },
    { from: 9006, text: "The CI pipeline is green. Build time is down to about 3 minutes.", at: 6 * HOUR },
  ],
  9007: [
    { from: 9007, text: "Sprint 4 goal: finish Kanban automation and GitHub integration.", at: 4 * DAY, pinned: true },
    { from: ME, text: "Agreed. Commit messages with a task ID should move the card automatically.", at: 4 * DAY - HOUR },
    { from: 9007, text: "Great. I will walk stakeholders through it at the sprint review.", at: 8 * HOUR },
  ],
  9008: [
    { from: 9008, text: "The mobile navigation prototype is ready for testing.", at: 2 * DAY + 2 * HOUR },
    { from: ME, text: "I will try it on my phone tonight and share feedback.", at: 2 * DAY },
  ],
  9009: [
    { from: 9009, text: "The installation guide is published in the Documentation folder.", at: 7 * DAY },
    { from: ME, text: "Thanks Sara!", at: 7 * DAY - HOUR },
  ],
};

export const demoDmMessages = () => {
  const out: Record<number, DemoMessage[]> = {};
  Object.entries(DM_SEEDS).forEach(([peer, seeds]) => {
    const peerId = Number(peer);
    out[peerId] = seeds.map(seed =>
      toMessage(seed, seed.from === ME ? peerId : ME),
    );
  });
  return out;
};

export type DemoChannel = {
  id: string;
  name: string;
  description: string;
  memberIds: number[];
};

export const demoChannels = (): DemoChannel[] => [
  { id: "501", name: "frontend-team", description: "React, UI components and design reviews", memberIds: [ME, 9003, 9004, 9005, 9006, 9008] },
  { id: "502", name: "backend-api", description: "PHP endpoints, MySQL schema and deployments", memberIds: [ME, 9002, 9006, 9005, 9004] },
  { id: "503", name: "announcements", description: "Sprint updates for the whole team", memberIds: [ME, 9002, 9003, 9004, 9005, 9006, 9007, 9008] },
];

const ZIP = "application/zip";
const JPG = "image/jpeg";

const CHANNEL_SEEDS: Record<string, SeedMessage[]> = {
  "501": [
    { from: 9003, text: "Sharing the assets from the design sprint.", at: 3 * DAY, attachment: { name: "team-workshop.jpg", size: "4.3 KB", type: "file", mimeType: JPG } },
    { from: 9003, text: "And the final Kanban wireframe.", at: 3 * DAY - 5 * MINUTE, attachment: { name: "kanban-wireframe.jpg", size: "4.3 KB", type: "file", mimeType: JPG } },
    { from: 9004, text: "Sidebar screenshot from the latest build.", at: 2 * DAY, attachment: { name: "sidebar-preview.jpg", size: "13 MB", type: "file", mimeType: JPG } },
    { from: 9003, text: "New component library tokens are merged. Please pull before you start on new screens.", at: 28 * HOUR },
    { from: 9004, text: "Pulled. The Kanban columns are already using them.", at: 27 * HOUR },
    { from: 9008, text: "Do the tokens cover the mobile breakpoints as well?", at: 26 * HOUR },
    { from: 9003, text: "Yes, here is the responsive preview.", at: 25.5 * HOUR, image: [img3] },
    { from: 9003, text: "Here are the fonts and tokens for the new UI.", at: 25 * HOUR, attachment: { name: "design-tokens.zip", size: "12 MB", type: "file", mimeType: ZIP } },
    { from: ME, text: "Looks clean. Let's freeze UI changes on Thursday before the demo.", at: 2 * HOUR },
    { from: 9004, text: "Sounds good. I will finish the sidebar counts by then.", at: 90 * MINUTE },
  ],
  "502": [
    { from: 9002, text: "Database schema for the Stack feature.", at: 3 * DAY, attachment: { name: "stack-schema.zip", size: "2.1 MB", type: "file", mimeType: ZIP } },
    { from: 9002, text: "The migration runner now creates every table. It is safe to run more than once.", at: 2 * DAY },
    { from: 9006, text: "I ran it against staging with no errors.", at: 2 * DAY - 30 * MINUTE },
    { from: 9005, text: "API tests are passing on staging. The presence ping looks stable as well.", at: 5 * HOUR },
    { from: ME, text: "Great work. Please add an index on the messages table for the conversation lookup.", at: 4 * HOUR },
    { from: 9002, text: "On it. That will be part of DF-106.", at: 3.5 * HOUR },
  ],
  "503": [
    { from: 9007, text: "Sprint 4 started today! The focus is Kanban automation and GitHub integration.", at: 4 * DAY, pinned: true },
    { from: ME, text: "Demo day is coming up. Please keep the board updated so that we can present real progress.", at: DAY },
    { from: 9007, text: "We are ahead of plan, with most of the sprint backlog in progress or review. Nice work everyone.", at: 40 * MINUTE },
  ],
};

export const demoChannelMessages = () => {
  const out: Record<string, DemoMessage[]> = {};
  Object.entries(CHANNEL_SEEDS).forEach(([channelId, seeds]) => {
    out[channelId] = seeds.map(seed => toMessage(seed, channelId));
  });
  return out;
};

export const DEMO_AUTO_REPLIES = [
  "Got it, thanks for the update!",
  "Sounds good. I will take a look now.",
  "Nice! I will update the task on the board.",
  "Agreed. Let's go with that.",
  "Sure, give me ten minutes and I will get back to you.",
  "Great, I will mention this at the next stand-up.",
];

/** The feed that the real backend has no endpoint for yet. Actors are looked up by id. */
export const demoNotifications = () => [
  { id: "feed-mention-1", type: "mention", actorId: 9003, text: "mentioned you in #frontend-team", quote: "@Shashank can you check the new sidebar tokens before Thursday?", channelId: "501", time: ago(9 * MINUTE) },
  { id: "feed-task-1", type: "task_assigned", actorId: 9007, text: "assigned you a task", task: { code: "DF-107", title: "Sidebar category counts", status: "In Progress" }, projectId: 101, time: ago(35 * MINUTE) },
  { id: "feed-call-1", type: "missed_call", actorId: 9006, text: "tried to video call you", time: ago(70 * MINUTE) },
  { id: "feed-review-1", type: "review_requested", actorId: 9002, text: "asked you to review a task", task: { code: "DF-104", title: "Fix session handling across subdomains", status: "Review" }, projectId: 101, time: ago(3 * HOUR) },
  { id: "feed-push-1", type: "github_push", actorId: 9004, text: "pushed to devflow-web", commit: { sha: "9f3c2ab", message: "DF-105: confirm before completing a task" }, time: ago(5 * HOUR), readByDefault: true },
  { id: "feed-channel-1", type: "channel_added", actorId: 9007, text: "added you to #announcements", channelId: "503", time: ago(DAY), readByDefault: true },
  { id: "feed-task-2", type: "task_assigned", actorId: 9007, text: "assigned you a task", task: { code: "DF-301", title: "Prepare presentation slides", status: "In Progress" }, projectId: 103, time: ago(2 * DAY), readByDefault: true },
];

/* ─── Stack / Kanban ───────────────────────────────────────── */

type TaskSeed = {
  id: number;
  title: string;
  description: string;
  column: "todo" | "inprogress" | "review" | "complete";
  assignee: number | null;
  badges: string[];
  files: number;
  comments: number;
  /** Checklist items. A leading "x " marks an item as done. */
  todos: string[];
};

export type DemoTodo = { id: string; text: string; is_done: boolean };

export type DemoTask = Omit<TaskSeed, "todos"> & { todos: DemoTodo[] };

export type DemoProject = {
  id: number;
  name: string;
  owner_id: number;
  members: { user_id: number; role: string }[];
  repos: { id: number; repo_full_name: string; default_branch: string }[];
  tasks: DemoTask[];
};

let nextTodoId = 3000;
export const newTodoId = () => String(++nextTodoId);

const task = (seed: TaskSeed): DemoTask => ({
  ...seed,
  todos: seed.todos.map(raw => {
    const is_done = raw.startsWith("x ");
    return {
      id: newTodoId(),
      text: is_done ? raw.slice(2) : raw,
      is_done,
    };
  }),
});

const memberRows = (ids: number[]) =>
  [DEMO_USER_ID, ...ids].map((user_id, i) => ({
    user_id,
    role: i === 0 ? "owner" : "member",
  }));

export const demoProjects = (): DemoProject[] => [
  {
    id: 101,
    name: "DevFlow Platform",
    owner_id: DEMO_USER_ID,
    members: memberRows([9002, 9003, 9004, 9005, 9006]),
    repos: [{ id: 1, repo_full_name: "devflow-demo/devflow-web", default_branch: "main" }],
    tasks: [
      task({ id: 101, title: "GitHub webhook automation", description: "Move a card when a commit message or PR title contains its task ID.", column: "todo", assignee: 9002, badges: ["Backend", "Automation"], files: 2, comments: 4, todos: ["Verify the webhook signature", "Parse task IDs from commit messages", "Map PR events to board columns", "Write integration tests"] }),
      task({ id: 102, title: "Group video call UI polish", description: "Improve the participant grid layout and add a clear state for muted users.", column: "todo", assignee: 9003, badges: ["UI/UX"], files: 3, comments: 1, todos: ["Responsive participant grid", "Muted state indicator"] }),
      task({ id: 103, title: "Notification preferences", description: "Let users mute channels and choose which events raise an alert.", column: "todo", assignee: null, badges: ["Feature"], files: 0, comments: 2, todos: [] }),
      task({ id: 104, title: "Fix session handling across subdomains", description: "Store PHP sessions in MySQL so logins survive a redeploy on Railway.", column: "review", assignee: 9002, badges: ["Backend", "Bug"], files: 1, comments: 6, todos: ["x Add a database session handler", "x Set secure cookie flags", "x Test the OAuth callback on staging", "Get code review approval"] }),
      task({ id: 105, title: "Kanban drag and drop", description: "Move cards between columns with an optimistic update and rollback on failure.", column: "inprogress", assignee: 9004, badges: ["Frontend"], files: 4, comments: 8, todos: ["x Integrate dnd-kit", "x Optimistic column updates", "x Confirm before completing with open items", "Keyboard accessibility", "Touch device testing"] }),
      task({ id: 106, title: "Optimise the messages query", description: "Add an index for the conversation lookup and paginate the message history.", column: "inprogress", assignee: 9002, badges: ["Backend", "Performance"], files: 1, comments: 3, todos: ["x Profile the slow query", "Add a composite index", "Paginate the message list"] }),
      task({ id: 107, title: "Sidebar category counts", description: "Show live task counts per column in the Stack sidebar.", column: "inprogress", assignee: DEMO_USER_ID, badges: ["Frontend"], files: 1, comments: 2, todos: ["x Create the counts endpoint", "Refresh after each board change"] }),
      task({ id: 108, title: "Chat regression test pass", description: "Run the full chat test plan across Chrome, Firefox and Safari.", column: "review", assignee: 9005, badges: ["QA"], files: 2, comments: 5, todos: ["x Chrome", "x Firefox", "Safari voice notes"] }),
      task({ id: 109, title: "Google and GitHub sign-in", description: "OAuth login through the PHP backend with session restore in the React app.", column: "complete", assignee: DEMO_USER_ID, badges: ["Auth"], files: 3, comments: 9, todos: ["x Google OAuth flow", "x GitHub OAuth flow", "x Session restore on refresh"] }),
      task({ id: 110, title: "Direct messages and channels", description: "One-to-one and group chat with attachments, pinning and read state.", column: "complete", assignee: 9004, badges: ["Feature"], files: 5, comments: 12, todos: ["x Direct messages", "x Channels", "x Attachments", "x Pinned messages"] }),
      task({ id: 111, title: "Dockerise the backend", description: "FrankenPHP image with mysqli and pdo_mysql for Railway deployments.", column: "complete", assignee: 9006, badges: ["DevOps"], files: 2, comments: 3, todos: ["x Write the Dockerfile", "x Configure the Caddyfile", "x Deploy to staging"] }),
    ],
  },
  {
    id: 102,
    name: "Mobile App Redesign",
    owner_id: DEMO_USER_ID,
    members: memberRows([9003, 9008, 9007]),
    repos: [{ id: 2, repo_full_name: "devflow-demo/devflow-mobile", default_branch: "develop" }],
    tasks: [
      task({ id: 201, title: "Offline message queue", description: "Queue outgoing messages when the device has no connection.", column: "todo", assignee: 9008, badges: ["Mobile"], files: 0, comments: 2, todos: ["Design the queue storage", "Retry with backoff"] }),
      task({ id: 202, title: "Onboarding flow", description: "A three-step introduction for new users.", column: "todo", assignee: 9003, badges: ["UI/UX"], files: 2, comments: 1, todos: [] }),
      task({ id: 203, title: "Bottom navigation", description: "Replace the side drawer with bottom tabs for one-handed use.", column: "inprogress", assignee: 9008, badges: ["Mobile"], files: 3, comments: 4, todos: ["x Tab bar component", "x Route mapping", "Unread badges"] }),
      task({ id: 204, title: "Compact Kanban for phones", description: "Swipe between columns on small screens.", column: "review", assignee: 9003, badges: ["UI/UX"], files: 4, comments: 7, todos: ["x Swipe gesture", "x Column indicator", "User testing feedback"] }),
      task({ id: 205, title: "User research summary", description: "Interview notes and key findings from eight student teams.", column: "complete", assignee: 9007, badges: ["Research"], files: 1, comments: 3, todos: ["x Interviews", "x Summary report"] }),
    ],
  },
  {
    id: 103,
    name: "Final Year Project Report",
    owner_id: DEMO_USER_ID,
    members: memberRows([9007, 9005]),
    repos: [],
    tasks: [
      task({ id: 301, title: "Prepare presentation slides", description: "Architecture, feature walkthrough and results for the final review.", column: "inprogress", assignee: DEMO_USER_ID, badges: ["Report"], files: 1, comments: 2, todos: ["x Architecture diagram", "Feature walkthrough", "Results and conclusion"] }),
      task({ id: 302, title: "Write the testing chapter", description: "Test plan, test cases and results.", column: "todo", assignee: 9005, badges: ["Report"], files: 0, comments: 0, todos: ["Test plan", "Results table"] }),
      task({ id: 303, title: "Literature survey", description: "Compare existing collaboration and project tracking tools.", column: "complete", assignee: 9007, badges: ["Research"], files: 2, comments: 4, todos: ["x Collect papers", "x Comparison table"] }),
    ],
  },
];

/* ─── Bookmarks / calls ────────────────────────────────────── */

export const demoBookmarks = () => [
  { id: 1, icon: "bx bx-file", title: "api-spec-v2.pdf", desc: "1.8 MB" },
  { id: 2, icon: "bx bx-pin", title: "Sprint 4 goals", desc: "Kanban automation and GitHub integration" },
  { id: 3, icon: "bx bx-link", title: "Component library", desc: "Design tokens and UI guidelines" },
];

const call = (
  callId: number,
  peerUserId: number,
  firstName: string,
  lastName: string,
  profileImage: string,
  callDuration: string,
  isIncomming: boolean,
  when: number,
): CallItem => ({
  callId,
  peerUserId: String(peerUserId),
  firstName,
  lastName,
  profileImage,
  callDuration,
  isIncomming,
  callDate: ago(when),
  isGrouped: false,
  hasVideoCall: true,
  peoplesAvailableOnCall: 2,
});

export const demoCalls = (): CallItem[] => [
  { ...call(5, 9006, "Vikram", "Singh", avatar5, "—", true, 70 * MINUTE), wasConnected: false },
  { ...call(1, 9002, "Aarav", "Sharma", avatar12, "12:48", true, 2 * HOUR), wasConnected: true },
  { ...call(2, 9003, "Priya", "Nair", avatar7, "6:15", false, 5 * HOUR), wasConnected: true },
  { ...call(6, 9008, "Kabir", "Mehta", avatar8, "—", false, 26 * HOUR), wasConnected: false },
  { ...call(3, 9007, "Neha", "Kapoor", avatar11, "24:02", true, 28 * HOUR), wasConnected: true },
  { ...call(4, 9004, "Rohan", "Gupta", avatar4, "3:37", false, 4 * DAY), wasConnected: true },
  { ...call(7, 9005, "Ananya", "Iyer", avatar2, "—", true, 5 * DAY), wasConnected: false },
];

/* ─── GitHub tab ───────────────────────────────────────────── */

export const demoRepos = () => [
  { id: 1, name: "devflow-web", full_name: "devflow-demo/devflow-web", private: true, html_url: "#", description: "React dashboard and PHP backend for DevFlow", default_branch: "main" },
  { id: 2, name: "devflow-mobile", full_name: "devflow-demo/devflow-mobile", private: true, html_url: "#", description: "Mobile client for DevFlow", default_branch: "develop" },
];

export const demoBranches = () => [
  { name: "main", commit: "9f3c2ab" },
  { name: "develop", commit: "c41d7e0" },
  { name: "feature/kanban-dnd", commit: "a7e19b4" },
];

const entry = (path: string, type: "dir" | "file", size = 0) => ({
  name: path.split("/").pop() as string,
  path,
  type,
  size,
});

export const demoContents: Record<string, ReturnType<typeof entry>[]> = {
  "": [
    entry("Admin", "dir"),
    entry("backend", "dir"),
    entry("Documentation", "dir"),
    entry(".gitignore", "file", 209),
    entry("README.md", "file", 2140),
  ],
  Admin: [
    entry("Admin/src", "dir"),
    entry("Admin/package.json", "file", 1820),
    entry("Admin/vite.config.ts", "file", 690),
  ],
  "Admin/src": [
    entry("Admin/src/pages", "dir"),
    entry("Admin/src/redux", "dir"),
    entry("Admin/src/App.tsx", "file", 1540),
  ],
  backend: [
    entry("backend/api", "dir"),
    entry("backend/auth", "dir"),
    entry("backend/db.php", "file", 410),
    entry("backend/Dockerfile", "file", 780),
  ],
};

const commit = (
  sha: string,
  title: string,
  author: string,
  login: string,
  when: number,
) => ({
  sha: sha.padEnd(40, "0"),
  short_sha: sha,
  message: title,
  title,
  author_name: author,
  author_email: `${login}@devflow.demo`,
  author_date: ago(when),
  github_login: login,
  html_url: "#",
});

export const demoCommits = () => [
  commit("9f3c2ab", "DF-105: confirm before completing a task with open checklist items", "Rohan Gupta", "rohan-g", 3 * HOUR),
  commit("a7e19b4", "DF-105: add optimistic column updates with rollback", "Rohan Gupta", "rohan-g", 8 * HOUR),
  commit("c41d7e0", "DF-104: store PHP sessions in MySQL", "Aarav Sharma", "aarav-s", DAY),
  commit("3be8d12", "DF-111: enable mysqli and pdo_mysql in the Docker image", "Vikram Singh", "vikram-s", 3 * DAY),
  commit("7a10fe5", "DF-109: restore the session on page refresh", "Shashank Malik", "shashank-m", 4 * DAY),
];

export const demoCompare = (base: string, head: string) => ({
  base,
  head,
  status: "ahead",
  ahead_by: 1,
  behind_by: 0,
  total_commits: 1,
  commits: demoCommits().slice(0, 1),
  files: [
    {
      filename: "Admin/src/pages/Dashboard/Stack/KanbanBoard.tsx",
      status: "modified",
      additions: 6,
      deletions: 1,
      changes: 7,
      patch: `@@ -210,7 +210,12 @@ const handleDragEnd = async (event: DragEndEvent) => {
     if (targetCol.id === "complete") {
       const list = todosRes.todos || [];
-      await performMoveToColumn(cardId, targetCol.id);
+      const incomplete = list.filter(t => !t.is_done).length;
+      if (list.length > 0 && incomplete > 0) {
+        setCompleteConfirmPending({ cardId });
+        setCompleteConfirmOpen(true);
+        return;
+      }
     }`,
      previous_filename: "",
      blob_url: "#",
    },
    {
      filename: "backend/api/projects/task_move.php",
      status: "modified",
      additions: 2,
      deletions: 0,
      changes: 2,
      patch: `@@ -18,6 +18,8 @@
 $columnKey = (string)($input['column_key'] ?? '');
+$allowed = ['todo', 'inprogress', 'review', 'complete'];
+if (!in_array($columnKey, $allowed, true)) json_ok(['error' => 'invalid_column']);
 $stmt = mysqli_prepare($conn, "UPDATE project_tasks SET column_key = ? WHERE id = ?");`,
      previous_filename: "",
      blob_url: "#",
    },
  ],
});
