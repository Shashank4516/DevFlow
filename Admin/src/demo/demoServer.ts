/**
 * In-browser stand-in for the PHP backend, used only in demo mode. Response shapes
 * mirror `backend/api/**`. State lives in memory, so refreshing the page resets it.
 */
import {
  DEMO_AUTO_REPLIES,
  DEMO_USER_ID,
  demoBasicDetails,
  demoBookmarks,
  demoBranches,
  demoChannelMessages,
  demoChannels,
  demoCommits,
  demoCompare,
  demoContents,
  demoDmMessages,
  demoFriends,
  demoMe,
  demoMediaList,
  demoNotifications,
  demoPendingRequests,
  demoProjects,
  demoRepos,
  demoStrangers,
  newMessageId,
  newTodoId,
  type DemoMessage,
  type DemoProject,
  type DemoTask,
} from "./demoData";
import { STATUS_TYPES } from "../constants";

export type DemoRequest = {
  method: string;
  /** Path without origin or query string, e.g. /api/projects/board.php */
  path: string;
  query: Record<string, any>;
  body: any;
};

export type DemoResponse = { status: number; data: any };

const ME = String(DEMO_USER_ID);

const friends = demoFriends();
const dms = demoDmMessages();
const channels = demoChannels();
const channelMessages = demoChannelMessages();
const projects = demoProjects();
let bookmarks = demoBookmarks();
const pendingRequests = demoPendingRequests();
const notifications = demoNotifications();
const strangerStatuses: Record<string, { status: string; request_id: number | null }> = {};
const settings: any = {
  basicDetails: demoBasicDetails,
  status: STATUS_TYPES.ACTIVE,
  theme: { image: "bgimg-radio5" },
  privacy: {
    displayprofilePhoto: "selected",
    displayLastSeen: true,
    displayStatus: "everyone",
    readReceipts: true,
    displayGroups: "everyone",
  },
  security: { securityNotification: false },
};

let nextId = 8000;
const newId = () => ++nextId;

const ok = (data: any): DemoResponse => ({ status: 200, data });
const fail = (status: number, error: string): DemoResponse => ({
  status,
  data: { error },
});

const fullName = (u: { firstName: string; lastName: string }) =>
  `${u.firstName} ${u.lastName}`.trim();

const initials = (u: { firstName: string; lastName: string }) =>
  (u.firstName.charAt(0) + u.lastName.charAt(0)).toUpperCase();

const findUser = (id: number): any => {
  if (id === DEMO_USER_ID) return demoMe;
  return friends.find(f => f.id === id) || null;
};

const isLoggedIn = () => {
  try {
    const raw = localStorage.getItem("authUser");
    return !!raw && Number(JSON.parse(raw)?.id) === DEMO_USER_ID;
  } catch {
    return false;
  }
};

/* ─── Messages ─────────────────────────────────────────────── */

const attachmentsToMessageFields = (attachments: any[] | undefined) => {
  const list = Array.isArray(attachments) ? attachments : [];
  const images = list
    .filter(a => a.type === "image")
    .map((a, i) => ({ id: i + 1, downloadLink: a.url }));
  const files = list
    .filter(a => a.type !== "image")
    .map((a, i) => ({
      id: i + 1,
      name: a.name,
      downloadLink: a.url,
      desc: `${Math.max(1, Math.round((a.size || 0) / 1024))} KB`,
      type: a.type,
      mimeType: a.mimeType || "",
      duration: a.duration ?? null,
    }));
  return {
    ...(images.length ? { image: images } : {}),
    ...(files.length ? { attachments: files } : {}),
  };
};

const buildMessage = (
  sender: string,
  receiver: string,
  text: string,
  attachments?: any[],
): DemoMessage => ({
  mId: newMessageId(),
  text,
  time: new Date().toISOString(),
  meta: { sender, receiver, sent: true, received: true, read: sender !== ME },
  isPinned: false,
  pinnedAt: null,
  ...attachmentsToMessageFields(attachments),
});

const withSenderData = (message: DemoMessage): DemoMessage => {
  const user = findUser(Number(message.meta.sender));
  if (!user) return message;
  return {
    ...message,
    meta: {
      ...message.meta,
      userData: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage || null,
      },
    },
  };
};

const pickReply = () =>
  DEMO_AUTO_REPLIES[Math.floor(Math.random() * DEMO_AUTO_REPLIES.length)];

/** Who is typing in each message list, and how many replies they still have to send. */
const typingCounts = new Map<DemoMessage[], Map<string, number>>();

const typingIn = (list: DemoMessage[] | undefined) =>
  Array.from((list && typingCounts.get(list)?.keys()) || [])
    .map(id => findUser(Number(id)))
    .filter(Boolean)
    .map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage || null,
    }));

/** They read the message, type for a moment, then reply, as on a real phone. */
const scheduleReply = (
  list: DemoMessage[],
  sender: string,
  receiver: string,
  replyText?: string,
) => {
  window.setTimeout(() => {
    list.forEach(message => {
      message.meta.read = true;
    });
    const counts = typingCounts.get(list) || new Map<string, number>();
    counts.set(sender, (counts.get(sender) || 0) + 1);
    typingCounts.set(list, counts);

    window.setTimeout(() => {
      const left = (counts.get(sender) || 1) - 1;
      if (left > 0) counts.set(sender, left);
      else counts.delete(sender);
      list.push(buildMessage(sender, receiver, replyText || pickReply()));
    }, 1800 + Math.random() * 1400);
  }, 500);
};

const togglePin = (list: DemoMessage[], messageId: string) => {
  const message = list.find(m => m.mId === String(messageId));
  if (!message) return null;
  message.isPinned = !message.isPinned;
  message.pinnedAt = message.isPinned ? new Date().toISOString() : null;
  return message;
};

/* ─── Projects ─────────────────────────────────────────────── */

const findProject = (id: any): DemoProject | undefined =>
  projects.find(p => p.id === Number(id));

const findTask = (project: DemoProject | undefined, id: any) =>
  project?.tasks.find(t => t.id === Number(id));

const progressOf = (task: DemoTask) => ({
  done: task.todos.filter(t => t.is_done).length,
  total: task.todos.length,
});

const assigneeOf = (userId: number | null) => {
  if (userId == null) return null;
  const user = findUser(userId);
  if (!user) return null;
  return {
    user_id: user.id,
    name: fullName(user),
    firstName: user.firstName,
    lastName: user.lastName,
    profileImage: user.profileImage || "",
    initials: initials(user),
  };
};

const serializeTask = (task: DemoTask) => ({
  id: String(task.id),
  title: task.title,
  description: task.description,
  column_key: task.column,
  progress: progressOf(task),
  files: task.files,
  comments: task.comments,
  badges: task.badges.map(label => ({ label })),
  assignee: assigneeOf(task.assignee),
});

const serializeProject = (project: DemoProject) => ({
  id: project.id,
  name: project.name,
  owner_id: project.owner_id,
});

const categoryCounts = (project: DemoProject) => {
  const counts: Record<string, number> = {
    todo: 0,
    inprogress: 0,
    review: 0,
    complete: 0,
  };
  project.tasks.forEach(t => {
    counts[t.column] += 1;
  });
  return counts;
};

const serializeMember = (member: { user_id: number; role: string }) => {
  const user = findUser(member.user_id);
  return {
    user_id: member.user_id,
    role: member.role,
    name: user ? fullName(user) : "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    profileImage: user?.profileImage || "",
    initials: user ? initials(user) : "?",
  };
};

const suggestAssignee = (project: DemoProject) => {
  const open_counts: Record<string, number> = {};
  project.members.forEach(m => {
    open_counts[String(m.user_id)] = 0;
  });
  project.tasks.forEach(t => {
    if (t.column !== "complete" && t.assignee != null) {
      open_counts[String(t.assignee)] = (open_counts[String(t.assignee)] || 0) + 1;
    }
  });
  let suggested: number | null = null;
  project.members.forEach(m => {
    if (
      suggested == null ||
      open_counts[String(m.user_id)] < open_counts[String(suggested)]
    ) {
      suggested = m.user_id;
    }
  });
  return {
    suggested_user_id: suggested,
    open_counts,
    reason: "Fewest open tasks in this project",
  };
};

/* ─── Router ───────────────────────────────────────────────── */

const handleAuth = (req: DemoRequest): DemoResponse | null => {
  const { path } = req;
  if (path === "/post-fake-login" || path === "/post-jwt-login") {
    // Any credentials work in the demo. The profile tab reads this key.
    localStorage.setItem(
      "devflow_profile_basicDetails",
      JSON.stringify(demoBasicDetails),
    );
    return ok({ ...demoMe, role: "admin" });
  }
  if (path === "/post-fake-register" || path === "/post-jwt-register") {
    return ok(req.body || {});
  }
  if (path === "/fake-forget-pwd" || path === "/jwt-forget-pwd") {
    return ok("Check your mail to reset your password.");
  }
  if (path === "/auth/me.php") {
    if (!isLoggedIn()) return fail(401, "not_authenticated");
    return ok({
      user: demoMe,
      basicDetails: demoBasicDetails,
      github_connected: true,
      github_username: "shashank-m",
    });
  }
  return null;
};

const addFriend = (id: number, name: string, image?: string | null) => {
  if (friends.some(f => f.id === id)) return;
  const [firstName, ...rest] = name.split(" ");
  friends.push({
    ...friends[0],
    id,
    uid: String(id),
    firstName,
    lastName: rest.join(" "),
    profileImage: (image || "") as any,
    about: "New teammate",
    email: `${firstName.toLowerCase()}@devflow.demo`,
    meta: { unRead: 0 },
    isFavourite: false,
    isArchived: false,
  });
  dms[id] = [buildMessage(String(id), ME, "Thanks for connecting! Happy to join the team.")];
};

/** A request arrives while the demo is running, so that the bell can be seen ringing. */
let liveRequestScheduled = false;
const scheduleLiveRequest = () => {
  if (liveRequestScheduled || !isLoggedIn()) return;
  liveRequestScheduled = true;
  window.setTimeout(() => {
    pendingRequests.push({
      request_id: 7002,
      user_id: 9010,
      name: "Isha Verma",
      profile_image: "",
      created_at: new Date().toISOString(),
    });
  }, 25000);
};

const lastMessageOf = (list: DemoMessage[] | undefined, isGroup: boolean) => {
  const last = list?.[list.length - 1];
  if (!last) return undefined;
  const fromMe = last.meta.sender === ME;
  const hasFile = !!last.attachments?.length;
  return {
    text: last.text,
    time: last.time,
    fromMe,
    senderName:
      isGroup && !fromMe ? findUser(Number(last.meta.sender))?.firstName : undefined,
    kind: last.text ? undefined : last.image?.length ? "image" : hasFile ? "file" : undefined,
  };
};

const withLastMessage = (friend: any) => ({
  ...friend,
  lastMessage: lastMessageOf(dms[friend.id], false),
});

const handleFriends = (req: DemoRequest): DemoResponse | null => {
  const { path, body, query } = req;
  switch (path) {
    case "/api/friends/accepted.php":
      return ok(friends.filter(f => !f.isArchived).map(withLastMessage));
    case "/api/friends/favorites.php":
      return ok(friends.filter(f => f.isFavourite && !f.isArchived).map(withLastMessage));
    case "/api/friends/archived_list.php":
      return ok(friends.filter(f => f.isArchived).map(withLastMessage));
    case "/api/friends/favorite_toggle.php": {
      const friend = findUser(Number(body?.target_user_id));
      if (!friend) return fail(404, "not_friends");
      friend.isFavourite = !friend.isFavourite;
      return ok({
        status: friend.isFavourite ? "added" : "removed",
        friend_id: friend.id,
        is_favourite: friend.isFavourite,
        message: friend.isFavourite ? "Added to favourites" : "Removed from favourites",
      });
    }
    case "/api/friends/archive_toggle.php": {
      const friend = findUser(Number(body?.target_user_id));
      if (!friend) return fail(404, "not_friends");
      friend.isArchived = !friend.isArchived;
      return ok({
        isArchived: friend.isArchived,
        message: friend.isArchived ? "Chat archived" : "Chat restored",
      });
    }
    case "/api/friends/pending.php":
      scheduleLiveRequest();
      return ok({ pending: pendingRequests });
    case "/api/friends/respond.php": {
      const index = pendingRequests.findIndex(
        p => p.request_id === Number(body?.request_id),
      );
      if (index < 0) return fail(404, "request_not_found");
      const [request] = pendingRequests.splice(index, 1);
      if (body?.action === "accept") {
        addFriend(request.user_id, request.name, request.profile_image);
      }
      return ok({
        status: body?.action === "accept" ? "accepted" : "rejected",
        request_id: request.request_id,
      });
    }
    case "/api/friends/statuses.php": {
      const ids = String(query.ids || "").split(",").filter(Boolean);
      const statuses: Record<string, any> = {};
      ids.forEach(id => {
        const isFriend = friends.some(f => String(f.id) === id);
        const incoming = pendingRequests.find(p => String(p.user_id) === id);
        statuses[id] = isFriend
          ? { status: "accepted", request_id: null }
          : incoming
            ? { status: "incoming_pending", request_id: incoming.request_id }
            : strangerStatuses[id] || { status: "none", request_id: null };
      });
      return ok({ statuses });
    }
    case "/api/friends/request.php": {
      const id = String(body?.target_user_id ?? body?.user_id ?? body?.to_user_id ?? "");
      const request_id = newId();
      if (id) {
        strangerStatuses[id] = { status: "outgoing_pending", request_id };
        // In the demo, people say yes after a moment, so the whole flow can be shown.
        const person = demoStrangers().find(p => String(p.id) === id);
        window.setTimeout(() => {
          if (person) addFriend(person.id, person.name, person.profile_image);
        }, 3500);
      }
      return ok({ status: "pending", request_id, message: "Friend request sent" });
    }
    case "/api/search/profiles.php": {
      const term = String(query.q || "").trim().toLowerCase();
      const people = [
        ...friends.map(f => ({
          id: f.id,
          name: fullName(f),
          profile_image: f.profileImage,
          profile_tag: `${f.firstName.toLowerCase()}#${String(f.id).slice(-4)}`,
        })),
        ...demoStrangers().filter(s => !friends.some(f => f.id === s.id)),
      ];
      return ok(people.filter(p => p.name.toLowerCase().includes(term)));
    }
    default:
      return null;
  }
};

const handleChat = (req: DemoRequest): DemoResponse | null => {
  const { path, body, query } = req;

  if (path === "/api/messages/list.php") {
    const peerId = Number(query.with_user_id);
    return ok({
      conversationId: `dm_${peerId}`,
      userId: String(peerId),
      messages: dms[peerId] || [],
      typing: typingIn(dms[peerId]),
    });
  }
  if (path === "/api/messages/send.php") {
    const peerId = Number(body?.to_user_id);
    if (!findUser(peerId)) return fail(404, "recipient_not_found");
    const text = String(body?.text || "");
    if (!text && !body?.attachments?.length) return fail(400, "empty_message");
    const list = dms[peerId] || (dms[peerId] = []);
    const message = buildMessage(ME, String(peerId), text, body?.attachments);
    list.push(message);
    scheduleReply(list, String(peerId), ME);
    return ok({ conversationId: `dm_${peerId}`, userId: String(peerId), message });
  }
  if (path === "/api/messages/upload.php") {
    const form = body as FormData;
    const uploaded = form?.get?.("file") as File | null;
    if (!uploaded) return fail(400, "file_required");
    return ok({
      attachment: {
        url: URL.createObjectURL(uploaded),
        type: String(form.get("kind") || "file"),
        name: uploaded.name || "attachment",
        size: uploaded.size,
        mimeType: uploaded.type,
        duration: form.get("duration") ? Number(form.get("duration")) : null,
      },
    });
  }
  if (path === "/api/messages/pin_toggle.php") {
    const peerId = Number(body?.with_user_id);
    const message = togglePin(dms[peerId] || [], body?.message_id);
    if (!message) return fail(404, "message_not_found");
    return ok({ conversationId: `dm_${peerId}`, userId: String(peerId), message });
  }
  if (path === "/api/messages/clear_dm.php") {
    dms[Number(body?.with_user_id)] = [];
    return ok({ ok: true, message: "Messages are Deleted!" });
  }

  if (path === "/api/channels/list.php") {
    return ok(
      channels.map(channel => {
        const memberAvatars = channel.memberIds
          .map(id => findUser(id)?.profileImage)
          .filter(Boolean)
          .slice(0, 3);
        return {
          id: channel.id,
          name: channel.name,
          description: channel.description,
          meta: { unRead: 0 },
          memberAvatars,
          memberCount: channel.memberIds.length,
          lastMessage: lastMessageOf(channelMessages[channel.id], true),
        };
      }),
    );
  }
  if (path === "/api/channels/details.php") {
    const channel = channels.find(c => c.id === String(query.id));
    if (!channel) return fail(404, "channel_not_found");
    return ok({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      meta: { unRead: 0 },
      members: channel.memberIds
        .map(id => findUser(id))
        .filter(Boolean)
        .map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          status: u.status ?? STATUS_TYPES.ACTIVE,
          lastSeenText: `Last seen ${((u.id % 6) + 1) * 7} min ago`,
        })),
    });
  }
  if (path === "/api/channels/create.php") {
    const name = String(body?.name || "").trim();
    if (!name) return fail(400, "name_required");
    const id = String(newId());
    channels.push({
      id,
      name,
      description: String(body?.description || ""),
      memberIds: [
        DEMO_USER_ID,
        ...(Array.isArray(body?.members) ? body.members.map(Number) : []),
      ],
    });
    channelMessages[id] = [];
    return ok("Channel Created!");
  }
  if (path === "/api/channels/messages_list.php") {
    const channelId = String(query.channel_id);
    return ok({
      conversationId: `channel_${channelId}`,
      channelId,
      messages: (channelMessages[channelId] || []).map(withSenderData),
      typing: typingIn(channelMessages[channelId]),
    });
  }
  if (path === "/api/channels/messages_send.php") {
    const channelId = String(body?.channel_id);
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return fail(404, "channel_not_found");
    const list = channelMessages[channelId] || (channelMessages[channelId] = []);
    const message = buildMessage(ME, channelId, String(body?.text || ""), body?.attachments);
    list.push(message);
    const others = channel.memberIds.filter(id => id !== DEMO_USER_ID);
    // Someone who was mentioned is the one who answers.
    const mentioned = others.find(id => {
      const user = findUser(id);
      return user && String(body?.text || "").includes(`@${fullName(user)}`);
    });
    if (mentioned) {
      scheduleReply(
        list,
        String(mentioned),
        channelId,
        `@${fullName(demoMe)} got it, I'll take a look now.`,
      );
    } else if (others.length) {
      const replier = others[Math.floor(Math.random() * others.length)];
      scheduleReply(list, String(replier), channelId);
    }
    return ok({ conversationId: `channel_${channelId}`, channelId, message: withSenderData(message) });
  }
  if (path === "/api/channels/messages_pin_toggle.php") {
    const channelId = String(body?.channel_id);
    const message = togglePin(channelMessages[channelId] || [], body?.message_id);
    if (!message) return fail(404, "message_not_found");
    return ok({ conversationId: `channel_${channelId}`, channelId, message });
  }

  // Template-era routes that the chat sagas still call.
  if (path.startsWith("/get-user-details/")) {
    const id = Number(path.split("/").pop());
    const user = findUser(id);
    return user ? ok(user) : fail(404, "user_not_found");
  }
  if (path.startsWith("/read-conversation/")) {
    const friend = findUser(Number(path.split("/").pop()));
    if (friend?.meta) friend.meta.unRead = 0;
    return ok("Conversation read");
  }
  if (path.startsWith("/delete-message/")) {
    const [, , peer, messageId] = path.split("/");
    const list = dms[Number(peer)] || channelMessages[peer];
    if (list) {
      const index = list.findIndex(m => m.mId === messageId);
      if (index >= 0) list.splice(index, 1);
    }
    return ok("Message deleted");
  }
  if (path === "/forward-message") return ok("Message forwarded");
  if (path.startsWith("/user-delete-img/")) return ok("Image deleted");
  if (
    path.startsWith("/receive-message") ||
    path.startsWith("/read-message")
  ) {
    return ok("OK");
  }
  return null;
};

const handleProjects = (req: DemoRequest): DemoResponse | null => {
  const { path, body, query } = req;
  if (!path.startsWith("/api/projects/")) return null;

  if (path === "/api/projects/list.php") {
    return ok({ projects: projects.map(serializeProject) });
  }
  if (path === "/api/projects/create.php") {
    const name = String(body?.name || "").trim();
    if (!name) return fail(400, "name_required");
    const project: DemoProject = {
      id: newId(),
      name,
      owner_id: DEMO_USER_ID,
      members: [{ user_id: DEMO_USER_ID, role: "owner" }],
      repos: [],
      tasks: [],
    };
    projects.push(project);
    return ok({ project: serializeProject(project) });
  }

  const project = findProject(body?.project_id ?? query.project_id);
  if (!project) return fail(404, "project_not_found");

  switch (path) {
    case "/api/projects/board.php":
      return ok({
        project: serializeProject(project),
        tasks: project.tasks.map(serializeTask),
      });
    case "/api/projects/category_counts.php":
      return ok({ counts: categoryCounts(project) });
    case "/api/projects/members.php":
      return ok({ members: project.members.map(serializeMember) });
    case "/api/projects/invite.php": {
      const id = Number(body?.friend_user_id);
      if (!project.members.some(m => m.user_id === id)) {
        project.members.push({ user_id: id, role: "member" });
      }
      return ok({ ok: true });
    }
    case "/api/projects/suggest_assignee.php":
      return ok(suggestAssignee(project));
    case "/api/projects/task_create.php": {
      const title = String(body?.title || "").trim();
      if (!title) return fail(400, "title_required");
      const task: DemoTask = {
        id: newId(),
        title,
        description: String(body?.description || ""),
        column: body?.column_key || "todo",
        assignee: body?.assignee_user_id ?? null,
        badges: ["Task"],
        files: 0,
        comments: 0,
        todos: [],
      };
      project.tasks.push(task);
      return ok({ task: serializeTask(task) });
    }
    case "/api/projects/repos_config.php": {
      if (req.method === "post") {
        project.repos = (body?.repos || []).map((r: any) => ({
          id: newId(),
          repo_full_name: r.repo_full_name,
          default_branch: r.default_branch || "main",
        }));
        return ok({ ok: true, repos: project.repos });
      }
      return ok({ repos: project.repos, can_edit: true, github_connected: true });
    }
    case "/api/projects/workgraph.php":
      return ok({
        repos: project.repos,
        github_connected: true,
        by_repo: {},
        can_edit: true,
      });
    default:
      break;
  }

  const task = findTask(project, body?.task_id ?? query.task_id);
  if (!task) return fail(404, "task_not_found");

  switch (path) {
    case "/api/projects/task_move.php":
      task.column = body?.column_key;
      return ok({ ok: true });
    case "/api/projects/task_update.php":
      if ("assignee_user_id" in (body || {})) task.assignee = body.assignee_user_id;
      if (typeof body?.title === "string") task.title = body.title;
      if (typeof body?.description === "string") task.description = body.description;
      return ok({ ok: true, task: serializeTask(task) });
    case "/api/projects/task_todos_list.php":
      return ok({ todos: task.todos, progress: progressOf(task) });
    case "/api/projects/task_todos_create.php": {
      const todo = {
        id: newTodoId(),
        text: String(body?.text || ""),
        is_done: false,
      };
      task.todos.push(todo);
      return ok({ todo, progress: progressOf(task) });
    }
    case "/api/projects/task_todos_toggle.php": {
      const todo = task.todos.find(t => t.id === String(body?.todo_id));
      if (!todo) return fail(404, "todo_not_found");
      todo.is_done = !!body?.is_done;
      return ok({ ok: true, progress: progressOf(task) });
    }
    default:
      return null;
  }
};

const handleGithub = (req: DemoRequest): DemoResponse | null => {
  const { path, query } = req;
  switch (path) {
    case "/api/github/repos.php":
      return ok({ repos: demoRepos() });
    case "/api/github/branches.php":
      return ok({ branches: demoBranches() });
    case "/api/github/contents.php":
      return ok({ contents: demoContents[String(query.path || "")] || [] });
    case "/api/github/commits.php":
      return ok({ commits: demoCommits() });
    case "/api/github/compare.php":
      return ok(demoCompare(String(query.base || ""), String(query.head || "")));
    default:
      return null;
  }
};

const handleAccount = (req: DemoRequest): DemoResponse | null => {
  const { path, body } = req;

  if (path === "/profile-details") {
    return ok({
      basicDetails: demoBasicDetails,
      media: { total: demoMediaList.length, list: demoMediaList },
      attachedFiles: {
        total: 2,
        list: [
          { id: 1, fileName: "api-spec-v2.pdf", size: "1.8 MB", downloadUrl: "#", icon: "bx bxs-file-pdf" },
          { id: 2, fileName: "sprint-4-notes.docx", size: "240 KB", downloadUrl: "#", icon: "bx bxs-file-doc" },
        ],
      },
    });
  }
  if (path === "/user-settings.php") return ok(settings);
  if (path === "/update-user-settings.php") {
    if (body?.field) settings[body.field] = body.value;
    return ok("Settings updated");
  }
  if (path === "/api/profile/update.php") {
    if (body?.avatar) settings.basicDetails = { ...settings.basicDetails, profile: body.avatar };
    if (body?.cover) settings.basicDetails = { ...settings.basicDetails, coverImage: body.cover };
    return ok({
      ok: true,
      profile: settings.basicDetails.profile,
      coverImage: settings.basicDetails.coverImage,
    });
  }
  if (path === "/user-change-password") return ok("Password changed");
  if (path === "/user-contacts") return ok(friends);
  if (path === "/invite-contact") return ok("Invitation sent");
  if (path === "/add-contact") return ok("Contacts added");
  if (path === "/calls-list") return ok([]);

  if (path === "/api/bookmarks/list.php") return ok(bookmarks);
  if (path === "/api/bookmarks/create.php") {
    const title = String(body?.title || "").trim();
    if (!title) return fail(400, "title_required");
    const bookmark = {
      id: newId(),
      icon: body?.icon || "bx bx-pin",
      title,
      desc: String(body?.desc || ""),
    };
    bookmarks = [bookmark, ...bookmarks];
    return ok({ ...bookmark, message: "Bookmark created" });
  }
  if (path.startsWith("/api/bookmarks/delete.php")) {
    const id = Number(path.split("/").pop());
    bookmarks = bookmarks.filter(b => b.id !== id);
    return ok("Bookmark deleted");
  }
  if (path.startsWith("/api/bookmarks/update.php")) {
    const id = Number(path.split("/").pop());
    bookmarks = bookmarks.map(b => (b.id === id ? { ...b, ...body } : b));
    return ok("Bookmark updated");
  }

  if (path === "/api/notifications/list.php") {
    return ok({
      notifications: notifications.map(({ actorId, ...item }) => {
        const actor = findUser(actorId);
        return {
          ...item,
          actor: { id: actorId, name: fullName(actor), image: actor?.profileImage },
        };
      }),
    });
  }
  if (path === "/api/presence/ping.php") return ok({ ok: true });
  if (path === "/api/webrtc/twilio-ice.php") return ok({ ice_servers: [] });
  return null;
};

const HANDLERS = [
  handleAuth,
  handleFriends,
  handleChat,
  handleProjects,
  handleGithub,
  handleAccount,
];

export const handleDemoRequest = (req: DemoRequest): DemoResponse => {
  for (const handler of HANDLERS) {
    const response = handler(req);
    if (response) {
      // Clone so that the UI and Redux can never mutate the demo state directly.
      return {
        status: response.status,
        data: JSON.parse(JSON.stringify(response.data)),
      };
    }
  }
  // eslint-disable-next-line no-console
  console.warn("[demo] no mock for", req.method, req.path);
  return fail(404, "demo_no_route");
};
