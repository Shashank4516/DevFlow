import React, { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, Modal, ModalBody, ModalHeader, Spinner } from "reactstrap";
import { useSelector } from "react-redux";
import { createSelector } from "reselect";

import config from "../../../config";
import {
  getProjectReposConfig,
  saveProjectReposConfig,
  type ProjectRepoLink,
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

type RepoBarData = {
  repos: ProjectRepoLink[];
  can_edit: boolean;
  github_connected: boolean;
};

const ProjectWorkGraph = ({ projectId }: Props) => {
  const { connected: reduxGitHub } = useSelector(githubSel);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<RepoBarData | null>(null);

  const load = useCallback(async () => {
    if (projectId == null) {
      setData(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const w = await getProjectReposConfig(projectId);
      setData({
        repos: w.repos ?? [],
        can_edit: !!w.can_edit,
        github_connected: !!w.github_connected,
      });
    } catch (e) {
      setData(null);
      setErr("Couldn’t load repository links.");
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
  const githubLinked = !!githubOk || !!reduxGitHub;

  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formRepos, setFormRepos] = useState<ProjectRepoLink[]>([]);
  const [ghPick, setGhPick] = useState("");
  const [ghBranch, setGhBranch] = useState("main");
  const [ghOptions, setGhOptions] = useState<GhRepo[]>([]);
  const [manualRepo, setManualRepo] = useState("");
  const [manualBranch, setManualBranch] = useState("main");

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
    if (githubLinked) {
      fetch(`${BACKEND.replace(/\/$/, "")}/api/github/repos.php`, { credentials: "include" })
        .then(r => r.json())
        .then(j => {
          const list = (j.repos as GhRepo[]) || [];
          setGhOptions(Array.isArray(list) ? list : []);
        })
        .catch(() => setGhOptions([]));
    }
    setModal(true);
  }, [githubLinked, projectId, repos]);

  const saveLinks = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (projectId == null) return;
      setSaving(true);
      try {
        const payload = {
          project_id: projectId,
          repos: formRepos.map(r => ({
            repo_full_name: r.repo_full_name.trim(),
            default_branch: r.default_branch || "main",
          })),
        };
        const saved = await saveProjectReposConfig(payload);
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            repos: saved?.repos || prev.repos,
          };
        });
        setModal(false);
        await load();
      } catch (e: any) {
        setErr(e?.message || "Couldn’t save repositories.");
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

  const addManual = () => {
    const repo = manualRepo.trim();
    if (!repo) return;
    if (formRepos.some(r => r.repo_full_name === repo)) return;
    setFormRepos([
      ...formRepos,
      {
        id: -1,
        repo_full_name: repo,
        default_branch: manualBranch.trim() || "main",
      },
    ]);
    setManualRepo("");
    setManualBranch("main");
  };

  const removeAt = (idx: number) => {
    setFormRepos(formRepos.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<ProjectRepoLink>) => {
    setFormRepos(
      formRepos.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };

  if (projectId == null) {
    return null;
  }

  return (
    <div className="tm-workgraph">
      <div className="tm-workgraph__head">
        <div className="tm-workgraph__head-left">
          <span className="tm-workgraph__title">Repositories</span>
          <span className="tm-workgraph__hint">Link repos for GitHub automation (DF-… in commits / PRs)</span>
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
            aria-label="Refresh linked repositories"
          >
            {loading ? <Spinner size="sm" /> : <RefreshIcon />}
          </button>
        </div>
      </div>

      {err && <p className="tm-workgraph__err small mb-0">{err}</p>}

      {loading && !data && <p className="tm-workgraph__loading small">Loading…</p>}

      {!githubOk && !loading && data && (
        <div className="tm-workgraph__callout">
          <GitIcon />
          <div>
            <p className="mb-1">Connect GitHub to pick repos from your account or add them manually.</p>
            <a className="tm-workgraph__a" href={GITHUB_OAUTH}>
              Connect GitHub
            </a>
          </div>
        </div>
      )}

      {githubOk && !repos.length && !loading && canEdit && (
        <div className="tm-workgraph__empty">
          <p className="mb-2">Link one or more repositories and a default branch so webhooks can move tasks on this board.</p>
          <button type="button" className="tm-btn-primary" onClick={() => openModal()}>
            Add repositories
          </button>
        </div>
      )}

      {githubOk && !repos.length && !loading && !canEdit && (
        <p className="tm-workgraph__empty small">No repositories linked yet. Ask a project owner to add them.</p>
      )}

      {githubOk && repos.length > 0 && (
        <p className="tm-workgraph__empty small mb-0">
          Linked:{" "}
          {repos.map(r => r.repo_full_name).join(", ")}
        </p>
      )}

      <Modal isOpen={modal} toggle={() => setModal(false)} size="lg" centered>
        <ModalHeader toggle={() => setModal(false)}>Repositories for this project</ModalHeader>
        <ModalBody>
          {!githubLinked && (
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

            {githubLinked && ghOptions.length > 0 && (
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

            <div className="d-flex flex-wrap gap-2 align-items-end border-top border-secondary pt-3 mt-2">
              <div className="flex-grow-1" style={{ minWidth: 220 }}>
                <div className="text-muted small mb-1">Add repository manually</div>
                <Input
                  value={manualRepo}
                  onChange={e => setManualRepo(e.target.value)}
                  placeholder="org/name"
                />
              </div>
              <div style={{ minWidth: 140 }}>
                <div className="text-muted small mb-1">Branch</div>
                <Input
                  value={manualBranch}
                  onChange={e => setManualBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
              <Button type="button" color="secondary" onClick={addManual} disabled={!manualRepo.trim()}>
                Add manual
              </Button>
            </div>

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
