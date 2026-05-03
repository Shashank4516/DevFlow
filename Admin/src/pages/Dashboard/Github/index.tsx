import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "reselect";
import AppSimpleBar from "../../../components/AppSimpleBar";
import Loader from "../../../components/Loader";
import { setGithubStatus } from "../../../redux/actions";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  default_branch: string;
}

interface Branch {
  name: string;
  commit: string;
}

interface ContentItem {
  name: string;
  path: string;
  type: string;
  size: number;
}

interface CommitItem {
  sha: string;
  short_sha: string;
  message: string;
  title: string;
  author_name: string;
  author_email?: string;
  author_date: string;
  github_login: string;
  html_url?: string;
}

interface CompareFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  previous_filename: string;
  blob_url: string;
}

interface CompareData {
  base: string;
  head: string;
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: CommitItem[];
  files: CompareFile[];
}

const lineRowClass = (line: string): string => {
  if (line.startsWith("+") && !line.startsWith("+++")) return "github-diff-line github-diff-line--add";
  if (line.startsWith("-") && !line.startsWith("---")) return "github-diff-line github-diff-line--del";
  if (line.startsWith("@@")) return "github-diff-line github-diff-line--hunk";
  return "github-diff-line github-diff-line--ctx";
};

const DiffPreview = ({ file }: { file: CompareFile }) => {
  const patch = file.patch;
  const [copied, setCopied] = useState(false);

  const copyPatch = () => {
    if (!patch) return;
    navigator.clipboard.writeText(patch).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };

  if (!patch) {
    return (
      <div className="github-ws-main-empty h-100 d-flex align-items-center justify-content-center text-muted small px-4 text-center">
        No patch preview for this file (binary or large change). Open on GitHub to view the diff.
      </div>
    );
  }

  const lines = patch.split("\n");

  return (
    <div className="github-diff-panel d-flex flex-column h-100 min-h-0 border rounded overflow-hidden">
      <div className="github-diff-panel__header d-flex flex-wrap align-items-center gap-2 px-3 py-2 border-bottom flex-shrink-0">
        <i className="bx bxl-github github-diff-panel__gh-icon flex-shrink-0" title="GitHub" aria-hidden />
        <div className="small github-diff-panel__filename text-truncate flex-grow-1 min-w-0 fw-semibold" title={file.filename}>
          {file.filename}
        </div>
        <span className="small github-diff-panel__meta text-nowrap">
          {file.status} · +{file.additions} −{file.deletions}
        </span>
        {file.blob_url && (
          <button
            type="button"
            className="btn btn-sm github-diff-panel__action"
            onClick={() => window.open(file.blob_url, "_blank")}
          >
            Open on GitHub
          </button>
        )}
        <button type="button" className="btn btn-sm github-diff-panel__action" onClick={copyPatch}>
          {copied ? "Copied" : "Copy patch"}
        </button>
      </div>
      <div className="github-diff-panel__body flex-grow-1 overflow-auto min-h-0 d-flex flex-column">
        <table className="table table-borderless mb-0 github-diff-table flex-shrink-0">
          <tbody>
            {lines.map((line, idx) => {
              const text = line || " ";
              return (
                <tr key={`${idx}-${text.slice(0, 24)}`} className={lineRowClass(line)}>
                  <td className="github-diff-table__lineno align-top text-end user-select-none py-0 px-2">
                    {idx + 1}
                  </td>
                  <td className="github-diff-table__code align-top py-0 px-2 font-monospace small text-break">
                    <pre className="mb-0">{text}</pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="github-diff-panel__pad flex-grow-1 flex-shrink-0" aria-hidden />
      </div>
    </div>
  );
};

const Github = () => {
  const dispatch = useDispatch();
  const githubConnected = useSelector(
    createSelector(
      (state: any) => state.Github,
      (g) => g.connected
    )
  );
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [currentPath, setCurrentPath] = useState<string>("");
  const [syncedOnce, setSyncedOnce] = useState(false);
  const [mode, setMode] = useState<"files" | "review">("files");
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [baseSha, setBaseSha] = useState("");
  const [headSha, setHeadSha] = useState("");
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<CompareFile | null>(null);

  useEffect(() => {
    if (!BACKEND_URL || githubConnected || syncedOnce) return;
    setSyncedOnce(true);
    fetch(`${BACKEND_URL}/auth/me.php`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.github_connected === true) {
          dispatch(setGithubStatus(true, data.github_username ?? null));
        }
      })
      .catch(() => {});
  }, [BACKEND_URL, githubConnected, syncedOnce, dispatch]);

  useEffect(() => {
    if (!BACKEND_URL || !githubConnected) return;
    setLoading(true);
    setError(null);
    fetch(`${BACKEND_URL}/api/github/repos.php`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load repos");
        return res.json();
      })
      .then((data) => {
        setRepos(data.repos || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [githubConnected]);

  const loadCommits = (repoFullName: string, branch: string) => {
    if (!BACKEND_URL) return;
    setCommitsLoading(true);
    setCompareError(null);
    setCompareData(null);
    setSelectedFile(null);
    fetch(
      `${BACKEND_URL}/api/github/commits.php?repo=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(branch)}&per_page=30`,
      { credentials: "include" }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load commits");
        return res.json();
      })
      .then((data) => {
        const list: CommitItem[] = data.commits || [];
        setCommits(list);
        const autoHead = list[0]?.sha || "";
        const autoBase = list[1]?.sha || "";
        setHeadSha(autoHead);
        setBaseSha(autoBase);
        if (autoHead && autoBase) {
          loadCompare(repoFullName, autoBase, autoHead, branch);
        }
      })
      .catch((e) => setCompareError(e.message))
      .finally(() => setCommitsLoading(false));
  };

  const loadCompare = (
    repoFullName: string,
    base: string,
    head: string,
    branch: string
  ) => {
    if (!BACKEND_URL) return;
    setCompareLoading(true);
    setCompareError(null);
    const query =
      base && head
        ? `repo=${encodeURIComponent(repoFullName)}&base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`
        : `repo=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(branch)}`;
    fetch(`${BACKEND_URL}/api/github/compare.php?${query}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to compare diff");
        return res.json();
      })
      .then((data) => {
        setCompareData(data);
        setSelectedFile(data.files?.[0] || null);
      })
      .catch((e) => setCompareError(e.message))
      .finally(() => setCompareLoading(false));
  };

  const loadBranches = (repo: Repo) => {
    setSelectedRepo(repo);
    setBranches([]);
    setContents([]);
    setCurrentPath("");
    setMode("files");
    setCommits([]);
    setBaseSha("");
    setHeadSha("");
    setCompareData(null);
    setSelectedFile(null);
    setCompareError(null);
    if (!BACKEND_URL) return;
    setBranchLoading(true);
    fetch(
      `${BACKEND_URL}/api/github/branches.php?repo=${encodeURIComponent(repo.full_name)}`,
      { credentials: "include" }
    )
      .then((res) => res.json())
      .then((data) => {
        setBranches(data.branches || []);
        const def =
          data.branches?.find((b: Branch) => b.name === repo.default_branch) || data.branches?.[0];
        if (def) {
          setCurrentBranch(def.name);
          loadContents(repo.full_name, def.name, "");
          loadCommits(repo.full_name, def.name);
        }
      })
      .finally(() => setBranchLoading(false));
  };

  const loadContents = (fullName: string, branch: string, path: string) => {
    setCurrentBranch(branch);
    setCurrentPath(path);
    if (!BACKEND_URL) return;
    setContentsLoading(true);
    const url = `${BACKEND_URL}/api/github/contents.php?repo=${encodeURIComponent(fullName)}&branch=${encodeURIComponent(branch)}${path ? "&path=" + encodeURIComponent(path) : ""}`;
    fetch(url, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setContents(data.contents || []))
      .finally(() => setContentsLoading(false));
  };

  const openFolder = (path: string) => {
    if (!selectedRepo) return;
    loadContents(selectedRepo.full_name, currentBranch || selectedRepo.default_branch, path);
  };

  const onBranchChange = (branch: string) => {
    if (!selectedRepo) return;
    loadContents(selectedRepo.full_name, branch, "");
    loadCommits(selectedRepo.full_name, branch);
  };

  const handleConnect = () => {
    if (BACKEND_URL) {
      window.location.href = `${BACKEND_URL.replace(/\/$/, "")}/auth/github/index.php`;
    }
  };

  const renderFilesExplorer = () => (
    <div className="github-ws-files h-100 d-flex flex-column min-h-0 p-3">
      {contentsLoading && <Loader />}
      {!contentsLoading && (
        <AppSimpleBar className="flex-grow-1 github-ws-files-scroll w-100" style={{ height: "100%", maxHeight: "100%" }}>
          <ul className="list-unstyled mb-0">
            {currentPath && (
              <li
                className="cursor-pointer rounded px-2 py-2 github-ws-list-item"
                onClick={() => openFolder(currentPath.split("/").slice(0, -1).join("/"))}
              >
                <div className="d-flex align-items-center">
                  <i className="bx bx-up-arrow-circle font-size-18 me-2" />
                  <span className="font-size-14">..</span>
                </div>
              </li>
            )}
            {(contents || []).map((item) => (
              <li
                key={item.path}
                className="cursor-pointer rounded px-2 py-2 github-ws-list-item"
                onClick={() =>
                  item.type === "dir"
                    ? openFolder(item.path)
                    : window.open(
                        `https://github.com/${selectedRepo!.full_name}/blob/${currentBranch || selectedRepo!.default_branch}/${item.path}`,
                        "_blank"
                      )
                }
              >
                <div className="d-flex align-items-center">
                  <i
                    className={`font-size-18 me-2 ${item.type === "dir" ? "bx bx-folder" : "bx bx-file"}`}
                  />
                  <span className="font-size-14">{item.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </AppSimpleBar>
      )}
    </div>
  );

  const renderRail = () => (
    <aside className="github-ws-rail border-end d-flex flex-column min-h-0">
      <AppSimpleBar
        className="github-ws-rail-scroll flex-grow-1 w-100"
        style={{ height: "100%", maxHeight: "100%" }}
      >
        {!selectedRepo ? (
          <ul className="list-unstyled contact-list mb-0">
            {(repos || []).map((repo) => (
              <li
                key={repo.id}
                className="cursor-pointer github-ws-list-item"
                onClick={() => loadBranches(repo)}
              >
                <div className="d-flex align-items-center py-2 px-3">
                  <i className="bx bx-folder font-size-20 me-2" />
                  <div className="flex-grow-1 overflow-hidden">
                    <h6 className="text-truncate font-size-14 mb-0">{repo.name}</h6>
                    {repo.description && (
                      <p className="text-muted text-truncate font-size-12 mb-0">{repo.description}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="px-3 py-2 border-bottom d-flex align-items-center">
              <button
                type="button"
                className="btn btn-sm btn-soft-secondary me-2"
                onClick={() => setSelectedRepo(null)}
              >
                <i className="bx bx-arrow-back" />
              </button>
              <span className="text-truncate small">{selectedRepo.name}</span>
            </div>
            {branchLoading && <Loader />}
            {!branchLoading && branches.length > 0 && (
              <div className="px-3 py-2">
                <p className="font-size-12 text-muted mb-1">Branch</p>
                <select
                  className="form-select form-select-sm"
                  value={currentBranch}
                  onChange={(e) => onBranchChange(e.target.value)}
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="px-3 pb-2 pt-1 d-flex gap-2 border-bottom">
              <button
                type="button"
                className={`btn btn-sm ${mode === "files" ? "btn-primary" : "btn-soft-secondary"}`}
                onClick={() => setMode("files")}
              >
                Files
              </button>
              <button
                type="button"
                className={`btn btn-sm ${mode === "review" ? "btn-primary" : "btn-soft-secondary"}`}
                onClick={() => setMode("review")}
              >
                Review
              </button>
            </div>

            {mode === "review" && (
              <div className="px-3 py-3">
                {commitsLoading && <Loader />}
                {compareError && <p className="small text-danger mb-2">{compareError}</p>}
                {!commitsLoading && commits.length > 0 && (
                  <>
                    <p className="font-size-12 text-muted mb-1">Compare range</p>
                    <select
                      className="form-select form-select-sm mb-2"
                      value={baseSha}
                      onChange={(e) => setBaseSha(e.target.value)}
                    >
                      <option value="">Base commit</option>
                      {commits.map((c) => (
                        <option key={`base-${c.sha}`} value={c.sha}>
                          {c.short_sha} — {c.title}
                        </option>
                      ))}
                    </select>
                    <select
                      className="form-select form-select-sm mb-2"
                      value={headSha}
                      onChange={(e) => setHeadSha(e.target.value)}
                    >
                      <option value="">Head commit</option>
                      {commits.map((c) => (
                        <option key={`head-${c.sha}`} value={c.sha}>
                          {c.short_sha} — {c.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary w-100 mb-3"
                      disabled={!baseSha || !headSha || compareLoading}
                      onClick={() =>
                        loadCompare(
                          selectedRepo.full_name,
                          baseSha,
                          headSha,
                          currentBranch || selectedRepo.default_branch
                        )
                      }
                    >
                      {compareLoading ? "Loading…" : "Load diff"}
                    </button>
                  </>
                )}

                {compareData && (
                  <>
                    <div className="mb-3 p-2 border rounded font-size-12 github-ws-summary">
                      <div>
                        <strong>Status:</strong> {compareData.status || "N/A"}
                      </div>
                      <div>
                        <strong>Commits:</strong> {compareData.total_commits} ·{" "}
                        <strong>Files:</strong> {compareData.files.length}
                      </div>
                      <div className="text-muted">
                        {compareData.base.slice(0, 7)}…{compareData.head.slice(0, 7)}
                      </div>
                    </div>

                    <p className="font-size-12 text-muted mb-1">Recent commits</p>
                    <ul className="list-unstyled mb-3 small">
                      {compareData.commits.slice(0, 6).map((c) => (
                        <li key={c.sha} className="mb-2">
                          <div className="fw-semibold text-truncate">{c.title || c.message}</div>
                          <div className="font-size-11 text-muted">
                            {c.short_sha} · {c.github_login || c.author_name}
                          </div>
                        </li>
                      ))}
                    </ul>

                    <p className="font-size-12 text-muted mb-1">Changed files</p>
                    <ul className="list-unstyled mb-0">
                      {compareData.files.map((f) => (
                        <li
                          key={f.filename}
                          className={`px-2 py-2 rounded cursor-pointer mb-1 github-ws-file-pill ${
                            selectedFile?.filename === f.filename ? "github-ws-file-pill--active" : ""
                          }`}
                          onClick={() => setSelectedFile(f)}
                        >
                          <div className="small text-truncate">{f.filename}</div>
                          <div className="font-size-11 text-muted">
                            {f.status} · +{f.additions} −{f.deletions}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </AppSimpleBar>
    </aside>
  );

  const renderMain = () => {
    if (!selectedRepo) {
      return (
        <main className="github-ws-main d-flex flex-column align-items-center justify-content-center text-muted p-4">
          <i className="bx bxl-github display-4 mb-3 opacity-50" />
          <p className="mb-0 text-center small">Select a repository from the list to browse files or review changes.</p>
        </main>
      );
    }

    if (mode === "files") {
      return <main className="github-ws-main flex-grow-1 min-w-0 min-h-0 d-flex flex-column">{renderFilesExplorer()}</main>;
    }

    if (!compareData) {
      return (
        <main className="github-ws-main d-flex flex-column align-items-center justify-content-center text-muted p-4">
          <i className="bx bx-git-compare display-4 mb-3 opacity-50" />
          <p className="mb-0 text-center small">
            Choose base and head commits, then tap <strong>Load diff</strong>. The preview appears here.
          </p>
        </main>
      );
    }

    if (!selectedFile) {
      return (
        <main className="github-ws-main d-flex flex-column align-items-center justify-content-center text-muted p-4">
          <p className="mb-0 small">Select a changed file from the list.</p>
        </main>
      );
    }

    return (
      <main className="github-ws-main flex-grow-1 min-w-0 min-h-0 d-flex flex-column">
        <DiffPreview file={selectedFile} />
      </main>
    );
  };

  if (!BACKEND_URL) {
    return (
      <div className="github-main-workspace d-flex flex-column">
        <div className="p-4">
          <h5 className="mb-2">GitHub</h5>
          <p className="text-muted small mb-0">Backend URL is not configured (VITE_BACKEND_URL).</p>
        </div>
      </div>
    );
  }

  if (!githubConnected) {
    return (
      <div className="github-main-workspace d-flex flex-column align-items-center justify-content-center p-4">
        <div className="text-center" style={{ maxWidth: 420 }}>
          <i className="bx bxl-github display-4 text-primary mb-3" />
          <h5 className="mb-2">Connect GitHub</h5>
          <p className="text-muted small mb-4">
            Connect your GitHub account to browse repositories, branches, files, and inline diffs in the main workspace.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleConnect}>
            <i className="bx bxl-github me-1" />
            Continue with GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="github-main-workspace d-flex flex-column github-main-workspace--connected overflow-hidden">
      <header className="github-ws-head border-bottom px-3 py-2 d-flex align-items-center flex-shrink-0">
        <h5 className="mb-0 me-3">GitHub</h5>
        {loading && <Loader />}
        {error && (
          <span className="text-danger small">{error}</span>
        )}
        {selectedRepo && !loading && (
          <span className="text-muted small text-truncate">
            <span className="d-none d-md-inline">{selectedRepo.full_name}</span>
          </span>
        )}
      </header>

      <div className="github-ws-body d-flex flex-grow-1 min-h-0">
        {renderRail()}
        {renderMain()}
      </div>
    </div>
  );
};

export default Github;
