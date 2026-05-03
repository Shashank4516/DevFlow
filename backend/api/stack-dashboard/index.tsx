import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Form, Input, Modal, ModalBody, ModalHeader } from "reactstrap";

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !hasBackend) return;
    try {
      const res = await createProject(name);
      setNewName("");
      setModalCreate(false);
      await refreshProjects();
      dispatch(setStackProjectId(res.project.id));
    } catch {
      /* toast optional */
    }
  };

  const inviteOptions = useMemo(() => {
    const memberIds = new Set(members.map(m => m.user_id));
    return friends.filter((f: any) => {
      const id = typeof f.id === "number" ? f.id : parseInt(String(f.id), 10);
      return !Number.isNaN(id) && !memberIds.has(id);
    });
  }, [friends, members]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stackProjectId == null || inviteFriendId === "") return;
    try {
      await inviteProjectMember(stackProjectId, Number(inviteFriendId));
      setModalInvite(false);
      setInviteFriendId("");
      const m = await getProjectMembers(stackProjectId);
      setMembers(m.members || []);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="tm-sidebar">
      <div className="tm-sidebar__workspace">
        <div className="tm-sidebar__ws-text">
          <span className="tm-sidebar__ws-title">{workspaceTitle}</span>
          <span className="tm-sidebar__ws-sub">{workspaceSub}</span>
        </div>
        <div className="tm-sidebar__ws-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M16.5 12.2C16.5 12.34 16.47 12.48 16.41 12.61C16.35 12.74 16.27 12.86 16.17 12.96L13.96 15.17C13.86 15.27 13.74 15.35 13.61 15.41C13.48 15.47 13.34 15.5 13.2 15.5C13.06 15.5 12.92 15.47 12.79 15.41L9 13.5L5.21 15.41C5.08 15.47 4.94 15.5 4.8 15.5C4.66 15.5 4.52 15.47 4.39 15.41C4.26 15.35 4.14 15.27 4.04 15.17L1.83 12.96C1.73 12.86 1.65 12.74 1.59 12.61C1.53 12.48 1.5 12.34 1.5 12.2V5.8C1.5 5.66 1.53 5.52 1.59 5.39C1.65 5.26 1.73 5.14 1.83 5.04L4.04 2.83C4.14 2.73 4.26 2.65 4.39 2.59C4.52 2.53 4.66 2.5 4.8 2.5C4.94 2.5 5.08 2.53 5.21 2.59L9 4.5L12.79 2.59C12.92 2.53 13.06 2.5 13.2 2.5C13.34 2.5 13.48 2.53 13.61 2.59C13.74 2.65 13.86 2.73 13.96 2.83L16.17 5.04C16.27 5.14 16.35 5.26 16.41 5.39C16.47 5.52 16.5 5.66 16.5 5.8V12.2Z" stroke="#BFBFBF" strokeWidth="1.2"/>
          </svg>
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

      <Modal isOpen={modalCreate} toggle={() => setModalCreate(false)} centered>
        <ModalHeader toggle={() => setModalCreate(false)}>New project</ModalHeader>
        <ModalBody>
          <Form onSubmit={handleCreate}>
            <Input
              className="mb-3"
              placeholder="Project name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
            />
            <Button color="primary" type="submit" disabled={!newName.trim()}>
              Create
            </Button>
          </Form>
        </ModalBody>
      </Modal>

      <Modal isOpen={modalInvite} toggle={() => setModalInvite(false)} centered>
        <ModalHeader toggle={() => setModalInvite(false)}>Add teammate</ModalHeader>
        <ModalBody>
          <p className="small text-muted">
            Friends must be connected in Contacts first (accepted friend requests).
          </p>
          <Form onSubmit={handleInvite}>
            <Input
              type="select"
              className="mb-3"
              value={inviteFriendId === "" ? "" : String(inviteFriendId)}
              onChange={e => {
                const v = e.target.value;
                setInviteFriendId(v === "" ? "" : parseInt(v, 10));
              }}
            >
              <option value="">Choose a friend…</option>
              {inviteOptions.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {`${(f.firstName || "").trim()} ${(f.lastName || "").trim()}`.trim() || `User ${f.id}`}
                </option>
              ))}
            </Input>
            <Button color="primary" type="submit" disabled={inviteFriendId === ""}>
              Invite
            </Button>
          </Form>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default Stack;
