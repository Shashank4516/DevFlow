import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRedux, useProfile } from "../../../hooks";
import { createSelector } from "reselect";
import {
  createProject,
  getCategoryCounts,
  getDirectMessages,
  getProjectMembers,
  inviteProjectMember,
  listProjects,
  type StackMember,
  type StackProject,
} from "../../../api";
import { showErrorNotification, showSuccessNotification } from "../../../helpers/notifications";
import { BoardModal, PersonPicker } from "./BoardModal";
import { STACK_COUNTS_REFRESH } from "./stackEvents";
import { setStackProjectId } from "../../../redux/layout/actions";

/* ── Category colour map ─────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  "To Do": "#FC736F",
  "In Progress": "#3B78F5",
  Review: "#F5BD4F",
  Complete: "#22BD73",
};

const CAT_ROWS = [
  { key: "todo", label: "To Do" },
  { key: "inprogress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "complete", label: "Complete" },
] as const;

const MSG_COLORS = ["#594DED", "#3B78F5", "#22BD73", "#F5BD4F", "#FC736F"];

/* ── Small icon helpers (inline SVG) ─────────────────────── */
const FolderIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
    <path d="M3 6.5C3 5.4 3.9 4.5 5 4.5H9L11 6.5H17C18.1 6.5 19 7.4 19 8.5V15.5C19 16.6 18.1 17.5 17 17.5H5C3.9 17.5 3 16.6 3 15.5V6.5Z" fill="#7B7999" opacity="0.6"/>
    <path d="M3 9.5H19V15.5C19 16.6 18.1 17.5 17 17.5H5C3.9 17.5 3 16.6 3 15.5V9.5Z" fill="#7B7999"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const Stack = () => {
  const { dispatch, useAppSelector } = useRedux();
  const { userProfile } = useProfile();

  const layoutSel = createSelector(
    (state: any) => state.Layout,
    (l: any) => ({ stackProjectId: l.stackProjectId as number | null })
  );
  const { stackProjectId } = useAppSelector(layoutSel);

  const [projects, setProjects] = useState<StackProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [members, setMembers] = useState<StackMember[]>([]);
  const [modalCreate, setModalCreate] = useState(false);
  const [modalInvite, setModalInvite] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteFriendId, setInviteFriendId] = useState<number | "">("");
  const [friends, setFriends] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const selectAfterRefreshRef = useRef<number | null>(null);

  const hasBackend = !!import.meta.env.VITE_BACKEND_URL;

  const refreshProjects = useCallback(async () => {
    if (!hasBackend) {
      setLoading(false);
      setLoadErr("Set VITE_BACKEND_URL in Admin/.env to load projects.");
      return;
    }
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await listProjects();
      setProjects(res.projects || []);
    } catch (e: any) {
      setLoadErr(typeof e === "string" ? e : "Could not load projects.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [hasBackend]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    // A new project is selected once the refreshed list includes it. Selecting it any
    // sooner would make the check below jump back to the first project.
    if (selectAfterRefreshRef.current != null) {
      const id = selectAfterRefreshRef.current;
      if (projects.some(p => p.id === id)) {
        selectAfterRefreshRef.current = null;
        dispatch(setStackProjectId(id));
      }
      return;
    }
    if (!projects.length) {
      dispatch(setStackProjectId(null));
      return;
    }
    const exists = stackProjectId != null && projects.some(p => p.id === stackProjectId);
    if (!exists) {
      dispatch(setStackProjectId(projects[0].id));
    }
  }, [projects, stackProjectId, dispatch]);

  const refreshCountsAndMembers = useCallback(async () => {
    if (!hasBackend || stackProjectId == null) {
      setCounts({});
      setMembers([]);
      return;
    }
    try {
      const [c, m, f] = await Promise.all([
        getCategoryCounts(stackProjectId),
        getProjectMembers(stackProjectId),
        getDirectMessages().catch(() => []),
      ]);
      setCounts(c.counts || {});
      setMembers(m.members || []);
      setFriends(Array.isArray(f) ? f : []);
    } catch {
      setCounts({});
      setMembers([]);
    }
  }, [hasBackend, stackProjectId]);

  useEffect(() => {
    refreshCountsAndMembers();
  }, [refreshCountsAndMembers]);

  useEffect(() => {
    const onBoardChange = () => {
      refreshCountsAndMembers();
    };
    window.addEventListener(STACK_COUNTS_REFRESH, onBoardChange);
    return () => window.removeEventListener(STACK_COUNTS_REFRESH, onBoardChange);
  }, [refreshCountsAndMembers]);

  const workspaceTitle = useMemo(() => {
    if (userProfile?.displayName || userProfile?.firstName) {
      return (userProfile.displayName || `${userProfile.firstName || ""} ${userProfile.lastName || ""}`).trim();
    }
    return "Team Workspace";
  }, [userProfile]);

  const workspaceSub = userProfile?.email || "Signed in";

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || !hasBackend) return;
    setIsSaving(true);
    try {
      const res = await createProject(name);
      setNewName("");
      setModalCreate(false);
      selectAfterRefreshRef.current = res.project.id;
      await refreshProjects();
      showSuccessNotification(`Project "${name}" created.`);
    } catch {
      showErrorNotification("Could not create the project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const inviteOptions = useMemo(() => {
    const memberIds = new Set(members.map(m => m.user_id));
    return friends.filter((f: any) => {
      const id = typeof f.id === "number" ? f.id : parseInt(String(f.id), 10);
      return !Number.isNaN(id) && !memberIds.has(id);
    });
  }, [friends, members]);

  const handleInvite = async () => {
    if (stackProjectId == null || inviteFriendId === "") return;
    setIsSaving(true);
    try {
      await inviteProjectMember(stackProjectId, Number(inviteFriendId));
      setModalInvite(false);
      setInviteFriendId("");
      const m = await getProjectMembers(stackProjectId);
      setMembers(m.members || []);
      // The board reads the team too, for its avatars and assignee lists.
      window.dispatchEvent(new Event(STACK_COUNTS_REFRESH));
      showSuccessNotification("Teammate added to the project.");
    } catch {
      showErrorNotification("Could not add your teammate. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const wsAvatarImg: string =
    userProfile?.profileImage || userProfile?.photoURL || "";
  const wsInitials = workspaceTitle.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="tm-sidebar">
      <div className="tm-sidebar__workspace">
        <div className="tm-sidebar__ws-text">
          <span className="tm-sidebar__ws-title">{workspaceTitle}</span>
          <span className="tm-sidebar__ws-sub">{workspaceSub}</span>
        </div>
        <div className="tm-sidebar__ws-icon">
          {wsAvatarImg ? (
            <img
              src={wsAvatarImg}
              alt={workspaceTitle}
              referrerPolicy="no-referrer"
              style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#594DED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 600 }}>
              {wsInitials}
            </span>
          )}
        </div>
      </div>

      <div className="tm-sidebar__divider" />

      <div className="tm-sidebar__section">
        <div className="tm-sidebar__section-header">
          <span className="tm-sidebar__section-title">Project &amp; Companies</span>
          <button
            type="button"
            className="tm-sidebar__icon-btn"
            aria-label="Add project"
            onClick={() => setModalCreate(true)}
            disabled={!hasBackend}
          >
            <PlusIcon />
          </button>
        </div>
        {loadErr && (
          <p className="px-3 small text-danger mb-2">{loadErr}</p>
        )}
        {loading && <p className="px-3 small text-muted mb-0">Loading projects…</p>}
        <ul className="tm-sidebar__list">
          {projects.map(p => (
            <li
              key={p.id}
              className={`tm-sidebar__list-item ${p.id === stackProjectId ? "is-active" : ""}`}
              onClick={() => dispatch(setStackProjectId(p.id))}
            >
              <span className="tm-sidebar__item-content">
                <FolderIcon />
                <span className="tm-sidebar__item-label">{p.name}</span>
              </span>
            </li>
          ))}
        </ul>
        {!loading && !projects.length && hasBackend && (
          <p className="px-3 small text-muted">No projects yet. Click + to create one.</p>
        )}
      </div>

      <div className="tm-sidebar__divider" />

      <div className="tm-sidebar__section">
        <div className="tm-sidebar__section-header">
          <span className="tm-sidebar__section-title">Categories</span>
        </div>
        <ul className="tm-sidebar__cat-list">
          {CAT_ROWS.map(c => (
            <li key={c.key} className="tm-sidebar__cat-item">
              <span className="tm-sidebar__cat-content">
                <span
                  className="tm-sidebar__cat-dot"
                  style={{ background: CAT_COLORS[c.label] }}
                />
                <span className="tm-sidebar__cat-name">{c.label}</span>
              </span>
              <span className="tm-sidebar__cat-count">{counts[c.key] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="tm-sidebar__divider" />

      <div className="tm-sidebar__section">
        <div className="tm-sidebar__section-header">
          <span className="tm-sidebar__section-title">Team</span>
          <button
            type="button"
            className="tm-sidebar__icon-btn"
            aria-label="Invite friend"
            onClick={() => stackProjectId != null && setModalInvite(true)}
            disabled={stackProjectId == null || !hasBackend}
          >
            <PlusIcon />
          </button>
        </div>
        <ul className="tm-sidebar__msg-list">
          {members.map((m, i) => (
            <li key={m.user_id} className="tm-sidebar__msg-item">
              <span
                className="tm-sidebar__avatar"
                style={{ background: MSG_COLORS[i % MSG_COLORS.length] }}
              >
                {m.initials || "?"}
              </span>
              <span className="tm-sidebar__msg-info">
                <span className="tm-sidebar__msg-name">{m.name || m.firstName}</span>
                <span className="tm-sidebar__msg-role">{m.role === "owner" ? "Owner" : "Member"}</span>
              </span>
            </li>
          ))}
        </ul>
        {stackProjectId != null && !members.length && (
          <p className="px-3 small text-muted">Only you — invite a friend.</p>
        )}
      </div>

      <BoardModal
        isOpen={modalCreate}
        onClose={() => setModalCreate(false)}
        title="New project"
        subtitle="A board for your team's tasks."
        icon="bx bxs-folder-plus"
        submitLabel="Create project"
        canSubmit={!!newName.trim()}
        isBusy={isSaving}
        hint="Give your project a name"
        onSubmit={handleCreate}
      >
        <div className="tm-modal__field">
          <label className="tm-modal__label" htmlFor="tm-project-name">
            Project name
          </label>
          <input
            id="tm-project-name"
            data-autofocus
            type="text"
            placeholder="e.g. Website redesign"
            autoComplete="off"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
        </div>
      </BoardModal>

      <BoardModal
        isOpen={modalInvite}
        onClose={() => setModalInvite(false)}
        title="Add teammate"
        subtitle="They'll be able to see and work on this board."
        icon="bx bxs-user-plus"
        submitLabel="Add to project"
        canSubmit={inviteFriendId !== ""}
        isBusy={isSaving}
        hint="Choose a friend"
        onSubmit={handleInvite}
      >
        <PersonPicker
          label="Friends"
          people={inviteOptions.map((f: any) => ({
            id: Number(f.id),
            name: `${(f.firstName || "").trim()} ${(f.lastName || "").trim()}`.trim() || `User ${f.id}`,
            image: f.profileImage,
          }))}
          value={inviteFriendId}
          onChange={setInviteFriendId}
          emptyText="All your friends are already on this project. Use search to connect with more people."
        />
      </BoardModal>
    </div>
  );
};

export default Stack;
