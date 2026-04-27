import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Form, Input, Modal, ModalBody, ModalHeader, Spinner } from "reactstrap";
import { useSelector } from "react-redux";
import { createSelector } from "reselect";

import config from "../../../config";
import {
  getProjectWorkgraph,
  saveProjectReposConfig,
  type ProjectRepoLink,
  type WorkgraphRepoState,
} from "../../../api";

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string) || config.API_URL;
const GITHUB_OAUTH = `${BACKEND.replace(/\/$/, "")}/auth/github/index.php`;

const githubSel = createSelector(
  (state: { Github?: { connected: boolean; username: string | null } }) => state.Github,
  (g) => ({ connected: g?.connected, username: g?.username })
);

const GitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
    />
  </svg>
);

const RefreshIcon = () => (
  <i className="bx bx-refresh" style={{ fontSize: 16 }} aria-hidden />
);

type GhRepo = { full_name: string; default_branch: string };

type Props = { projectId: number | null };

function formatCiPill(
  ci: WorkgraphRepoState["ci"]
): { label: string; className: string } {
  if (!ci) {
    return { label: "No checks", className: "is-muted" };
  }
  if (ci.source === "deployments") {
    const c = (ci.conclusion || "").toLowerCase();
    if (c === "success") return { label: "Deploy OK", className: "is-success" };
    if (c === "failure" || c === "error") return { label: "Deploy failed", className: "is-danger" };
    if (c === "pending" || c === "in_progress" || c === "queued")
      return { label: "Deploying…", className: "is-pending" };
    return { label: c || "Deploy", className: "is-muted" };
  }
  const st = (ci.status || "").toLowerCase();
  const cl = (ci.conclusion || "").toLowerCase();
  if (st === "in_progress" || st === "queued" || (cl === "" && st !== "completed")) {
    return { label: "Running", className: "is-pending" };
  }
  if (cl === "success" || (st === "completed" && cl === "success")) {
    return { label: "Passing", className: "is-success" };
  }
  if (cl === "failure" || cl === "timed_out" || cl === "cancelled" || cl === "action_required") {
    return { label: "Failing", className: "is-danger" };
  }
  if (cl === "neutral" || cl === "skipped") {
    return { label: "Skipped", className: "is-muted" };
  }
  return { label: "Checks", className: "is-muted" };
}

const ProjectWorkGraph = ({ projectId }: Props) => {
  const { connected: reduxGitHub } = useSelector(githubSel);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getProjectWorkgraph>> | null>(null);

  const load = useCallback(async () => {
    if (projectId == null) {
      setData(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const w = await getProjectWorkgraph(projectId);
      setData(w);
    } catch (e) {
      setData(null);
      setErr("Couldn’t load work graph.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canEdit = data?.can_edit;
  const githubOk = data?.github_connected;
  const repos = data?.repos ?? [];
  const byRepo = data?.by_repo ?? {};

  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formRepos, setFormRepos] = useState<ProjectRepoLink[]>([]);
  const [ghPick, setGhPick] = useState("");
  const [ghBranch, setGhBranch] = useState("main");
  const [ghOptions, setGhOptions] = useState<GhRepo[]>([]);

  const openModal = useCallback(() => {
    if (projectId == null) return;
    setFormRepos(
      (repos as ProjectRepoLink[]).map((r, i) => ({
        id: r.id,
        repo_full_name: r.repo_full_name,
        default_branch: r.default_branch,
        sort_order: i,
      }))
    );
    setGhPick("");
    setGhBranch("main");
    if (reduxGitHub) {
      fetch(`${BACKEND.replace(/\/$/, "")}/api/github/repos.php`, { credentials: "include" })
        .then(r => r.json())
        .then(j => {
          const list = (j.repos as GhRepo[]) || [];
          setGhOptions(Array.isArray(list) ? list : []);
        })
        .catch(() => setGhOptions([]));
    }
    setModal(true);
  }, [projectId, repos, reduxGitHub]);

  const saveLinks = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (projectId == null) return;
      setSaving(true);
      try {
        const payload = {
          project_id: projectId,
          repos: formRepos.map(r => ({
            repo_full_name: r.repo_full_name,
            default_branch: r.default_branch || "main",
          })),
        };
        await saveProjectReposConfig(payload);
        setModal(false);
        await load();
      } catch {
        setErr("Couldn’t save repositories.");
      } finally {
        setSaving(false);
      }
    },
    [projectId, formRepos, load]
  );

  const addPicked = () => {
    if (!ghPick) return;
    if (formRepos.some(r => r.repo_full_name === ghPick)) return;
    const g = ghOptions.find(x => x.full_name === ghPick);
    setFormRepos([
      ...formRepos,
      {
        id: -1,
        repo_full_name: ghPick,
        default_branch: g?.default_branch || ghBranch,
      },
    ]);
    setGhPick("");
  };

  const removeAt = (idx: number) => {
    setFormRepos(formRepos.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<ProjectRepoLink>) => {
    setFormRepos(
      formRepos.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };

  const track = useMemo(() => {
    if (!githubOk || !repos.length) return null;
    return (
      <div className="tm-workgraph__track">
        {repos.map(l => {
          const s = byRepo[l.repo_full_name] as WorkgraphRepoState | undefined;
          if (!s) {
            return (
              <div key={l.repo_full_name} className="tm-wg-card">
                <div className="tm-wg-card__name">{l.repo_full_name}</div>
                <p className="tm-wg-card__empty small">No data for this link.</p>
              </div>
            );
          }
          const pill = formatCiPill(s.ci);
          return (
            <div key={l.repo_full_name} className="tm-wg-card">
              <div className="tm-wg-card__row">
                <a
                  className="tm-wg-card__name"
                  href={`https://github.com/${l.repo_full_name}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {l.repo_full_name}
                </a>
                <span className="tm-wg-card__branch">{l.default_branch}</span>
                <a
                  className={`tm-wg-pill ${pill.className}`}
                  href={s.ci?.html_url || `https://github.com/${l.repo_full_name}/actions`}
                  target="_blank"
                  rel="noreferrer"
                  title="CI or deployments on GitHub"
                >
                  {pill.label}
                </a>
              </div>

              {s.error && <p className="tm-wg-card__err small">Branch or repo not reachable on GitHub.</p>}

              {s.diff && !s.diff.message && s.diff.file_count > 0 && (
                <a
                  className="tm-wg-card__diff"
                  href={s.diff.compare_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Latest diff</span>
                  <span className="tm-wg-card__diff-stat">
                    {s.diff.file_count} file{s.diff.file_count === 1 ? "" : "s"} ·
                    <span className="tm-wg__add">+{s.diff.additions}</span>{" "}
                    <span className="tm-wg__sub">−{s.diff.deletions}</span>
                  </span>
                </a>
              )}
              {s.diff?.message === "single_commit" && (
                <p className="tm-wg-card__meta small">First commit on this branch in view.</p>
              )}

              <ul className="tm-wg-card__list">
                {s.commits.slice(0, 3).map(c => (
                  <li key={c.sha}>
                    <a
                      href={c.html_url}
                      className="tm-wg-card__link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <code>{c.short_sha}</code>
                      <span className="text-truncate">{c.title || "—"}</span>
                    </a>
                  </li>
                ))}
              </ul>

              {s.open_prs.length > 0 && (
                <div className="tm-wg-card__prs">
                  <div className="tm-wg-card__pr-head">
                    <span>Pull requests</span>
                    <span className="tm-wg-card__pr-count">{s.open_prs.length} open</span>
                  </div>
                  <ul>
                    {s.open_prs.slice(0, 3).map(pr => (
                      <li key={pr.number}>
                        <a
                          href={pr.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="tm-wg-card__pr-link"
                        >
                          #{pr.number} {pr.draft && <em className="text-muted">(draft) </em>}
                          {pr.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [byRepo, githubOk, repos]);

  if (projectId == null) {
    return null;
  }

  return (
    <div className="tm-workgraph">
      <div className="tm-workgraph__head">
        <div className="tm-workgraph__head-left">
          <span className="tm-workgraph__title">Work graph</span>
          <span className="tm-workgraph__hint">Project ↔ Git ↔ team chat</span>
        </div>
        <div className="tm-workgraph__head-actions">
          {canEdit && (
            <button type="button" className="tm-workgraph__btn" onClick={() => openModal()}>
              {repos.length ? "Manage repositories" : "Link repositories"}
            </button>
          )}
          <button
            type="button"
            className="tm-workgraph__icon"
            onClick={() => void load()}
            title="Refresh"
            disabled={loading}
            aria-label="Refresh work graph"
          >
            {loading ? <Spinner size="sm" /> : <RefreshIcon />}
          </button>
        </div>
      </div>

      {err && <p className="tm-workgraph__err small mb-0">{err}</p>}

      {loading && !data && <p className="tm-workgraph__loading small">Loading work graph…</p>}

      {!githubOk && !loading && data && (
        <div className="tm-workgraph__callout">
          <GitIcon />
          <div>
            <p className="mb-1">Connect GitHub to see commits, PRs, and checks for linked repos.</p>
            <a className="tm-workgraph__a" href={GITHUB_OAUTH}>
              Connect GitHub
            </a>
          </div>
        </div>
      )}

      {githubOk && !repos.length && !loading && canEdit && (
        <div className="tm-workgraph__empty">
          <p className="mb-2">Link one or more repositories and a default branch. Activity shows up here for the whole team.</p>
          <button type="button" className="tm-btn-primary" onClick={() => openModal()}>
            Add repositories
          </button>
        </div>
      )}

      {githubOk && !repos.length && !loading && !canEdit && (
        <p className="tm-workgraph__empty small">No repositories linked yet. Ask a project owner to add them.</p>
      )}

      {track}

      <Modal isOpen={modal} toggle={() => setModal(false)} size="lg" centered>
        <ModalHeader toggle={() => setModal(false)}>Repositories for this project</ModalHeader>
        <ModalBody>
          {!reduxGitHub && (
            <p className="text-muted small">
              Connect{" "}
              <a href={GITHUB_OAUTH} target="_blank" rel="noreferrer">
                GitHub
              </a>{" "}
              to list your repositories.
            </p>
          )}

          <Form onSubmit={saveLinks}>
            {formRepos.map((r, idx) => (
              <div key={idx} className="d-flex gap-2 align-items-end mb-2">
                <div className="flex-grow-1">
                  <div className="text-muted small mb-1">Repository</div>
                  <Input
                    value={r.repo_full_name}
                    onChange={e => updateRow(idx, { repo_full_name: e.target.value })}
                    placeholder="org/name"
                    required
                  />
                </div>
                <div style={{ minWidth: 120 }}>
                  <div className="text-muted small mb-1">Branch</div>
                  <Input
                    value={r.default_branch}
                    onChange={e => updateRow(idx, { default_branch: e.target.value })}
                    placeholder="main"
                  />
                </div>
                <Button
                  type="button"
                  color="link"
                  className="text-danger text-decoration-none"
                  onClick={() => removeAt(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}

            {reduxGitHub && ghOptions.length > 0 && (
              <div className="d-flex flex-wrap gap-2 align-items-end border-top border-secondary pt-3 mt-2">
                <div className="flex-grow-1" style={{ minWidth: 200 }}>
                  <div className="text-muted small mb-1">Add from your GitHub</div>
                  <Input
                    type="select"
                    value={ghPick}
                    onChange={e => {
                      setGhPick(e.target.value);
                      const g = ghOptions.find(x => x.full_name === e.target.value);
                      if (g) setGhBranch(g.default_branch);
                    }}
                  >
                    <option value="">Choose repository…</option>
                    {ghOptions.map(g => (
                      <option key={g.full_name} value={g.full_name}>
                        {g.full_name}
                      </option>
                    ))}
                  </Input>
                </div>
                <Button type="button" color="secondary" onClick={addPicked} disabled={!ghPick}>
                  Add
                </Button>
              </div>
            )}

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button type="button" color="light" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button type="submit" color="primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default ProjectWorkGraph;
