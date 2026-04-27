import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "reselect";
import AppSimpleBar from "../../../components/AppSimpleBar";
import LeftbarTitle from "../../../components/LeftbarTitle";
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

const renderDiff = (patch: string) => {
  if (!patch) {
    return "No patch preview available for this file type.";
  }
  const lines = patch.split("\n");
  return (
    <>
      {lines.map((line, idx) => {
        let background = "transparent";
        let color = "#dbe7ff";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          background = "rgba(46, 160, 67, 0.25)";
          color = "#7ee787";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          background = "rgba(248, 81, 73, 0.22)";
          color = "#ffb3ad";
        } else if (line.startsWith("@@")) {
          background = "rgba(56, 139, 253, 0.18)";
          color = "#79c0ff";
        }
        return (
          <div
            key={`${idx}-${line.slice(0, 16)}`}
            style={{ background, color, padding: "0 6px", borderRadius: 3 }}
          >
            {line || " "}
          </div>
        );
      })}
    </>
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
  const [fullScreenReview, setFullScreenReview] = useState(false);

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
    const query = base && head
      ? `repo=${encodeURIComponent(repoFullName)}&base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`
      : `repo=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(branch)}`;
    fetch(`${BACKEND_URL}/api/github/compare.php?${query}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load compare diff");
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
        const def = data.branches?.find((b: Branch) => b.name === repo.default_branch) || data.branches?.[0];
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

  if (!BACKEND_URL) {
    return (
      <div className="p-3">
        <LeftbarTitle title="GitHub" />
        <p className="text-muted small">Backend not configured.</p>
      </div>
    );
  }

  if (!githubConnected) {
    const handleConnectFromTab = () => {
      if (BACKEND_URL) {
        window.location.href = `${BACKEND_URL.replace(/\/$/, "")}/auth/github/index.php`;
      }
    };
    return (
      <div className="p-3">
        <LeftbarTitle title="GitHub" />
        <p className="text-muted small mb-3">
          Connect your GitHub account to view repositories, branches, and files.
        </p>
        {BACKEND_URL ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleConnectFromTab}
          >
            <i className="bx bxl-github me-1" />
            Connect with GitHub
          </button>
        ) : (
          <p className="text-danger small mb-0">
            Set VITE_BACKEND_URL in .env to connect.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <LeftbarTitle title="GitHub" />
      {loading && <Loader />}
      {error && <p className="text-danger small px-3">{error}</p>}
      <AppSimpleBar className="chat-message-list" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {!selectedRepo ? (
          <ul className="list-unstyled contact-list">
            {(repos || []).map((repo) => (
              <li
                key={repo.id}
                className="cursor-pointer"
                onClick={() => loadBranches(repo)}
              >
                <div className="d-flex align-items-center py-2 px-3">
                  <i className="bx bx-folder font-size-20 me-2" />
                  <div className="flex-grow-1 overflow-hidden">
                    <h6 className="text-truncate font-size-14 mb-0">{repo.name}</h6>
                    {repo.description && (
                      <p className="text-muted text-truncate font-size-12 mb-0">
                        {repo.description}
                      </p>
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
                <p className="font-size-12 text-muted mb-1">Branches</p>
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
            <div className="px-3 pb-2 d-flex gap-2">
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

            {mode === "files" && (
              <>
                {contentsLoading && <Loader />}
                {!contentsLoading && (
                  <ul className="list-unstyled contact-list px-3 pb-3">
                    {currentPath && (
                      <li
                        className="cursor-pointer"
                        onClick={() =>
                          openFolder(currentPath.split("/").slice(0, -1).join("/"))
                        }
                      >
                        <div className="d-flex align-items-center py-2">
                          <i className="bx bx-up-arrow-circle font-size-18 me-2" />
                          <span className="font-size-14">..</span>
                        </div>
                      </li>
                    )}
                    {(contents || []).map((item) => (
                      <li
                        key={item.path}
                        className="cursor-pointer"
                        onClick={() =>
                          item.type === "dir"
                            ? openFolder(item.path)
                            : window.open(
                                `https://github.com/${selectedRepo!.full_name}/blob/${currentBranch || selectedRepo!.default_branch}/${item.path}`,
                                "_blank"
                              )
                        }
                      >
                        <div className="d-flex align-items-center py-2">
                          <i
                            className={`font-size-18 me-2 ${item.type === "dir" ? "bx bx-folder" : "bx bx-file"}`}
                          />
                          <span className="font-size-14">{item.name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {mode === "review" && (
              <div className="px-3 pb-3">
                {commitsLoading && <Loader />}
                {compareError && (
                  <p className="small text-danger mb-2">{compareError}</p>
                )}
                {!commitsLoading && commits.length > 0 && (
                  <>
                    <p className="font-size-12 text-muted mb-1">Compare Range</p>
                    <div className="d-flex gap-2 mb-2">
                      <select
                        className="form-select form-select-sm"
                        value={baseSha}
                        onChange={(e) => setBaseSha(e.target.value)}
                      >
                        <option value="">Base commit</option>
                        {commits.map((c) => (
                          <option key={`base-${c.sha}`} value={c.sha}>
                            {c.short_sha} - {c.title}
                          </option>
                        ))}
                      </select>
                      <select
                        className="form-select form-select-sm"
                        value={headSha}
                        onChange={(e) => setHeadSha(e.target.value)}
                      >
                        <option value="">Head commit</option>
                        {commits.map((c) => (
                          <option key={`head-${c.sha}`} value={c.sha}>
                            {c.short_sha} - {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary mb-3"
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
                      {compareLoading ? "Loading..." : "Load Diff"}
                    </button>
                  </>
                )}

                {compareData && (
                  <>
                    <div className="mb-3 p-2 border rounded small">
                      <div>
                        <strong>Status:</strong> {compareData.status || "N/A"}
                      </div>
                      <div>
                        <strong>Commits:</strong> {compareData.total_commits} |{" "}
                        <strong>Files:</strong> {compareData.files.length}
                      </div>
                      <div className="text-muted">
                        {compareData.base.slice(0, 7)}...{compareData.head.slice(0, 7)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-dark mb-3"
                      onClick={() => setFullScreenReview(true)}
                    >
                      <i className="bx bx-expand-alt me-1" />
                      Open Full Screen Review
                    </button>

                    <p className="font-size-12 text-muted mb-1">Recent Commits</p>
                    <ul className="list-unstyled mb-3">
                      {compareData.commits.map((c) => (
                        <li key={c.sha} className="mb-2">
                          <div className="small fw-semibold">{c.title || c.message}</div>
                          <div className="font-size-11 text-muted">
                            {c.short_sha} by {c.github_login || c.author_name}
                          </div>
                        </li>
                      ))}
                    </ul>

                    <p className="font-size-12 text-muted mb-1">Changed Files</p>
                    <div className="border rounded mb-2" style={{ maxHeight: 180, overflowY: "auto" }}>
                      <ul className="list-unstyled mb-0">
                        {compareData.files.map((f) => (
                          <li
                            key={f.filename}
                            className={`px-2 py-1 cursor-pointer ${selectedFile?.filename === f.filename ? "bg-light" : ""}`}
                            onClick={() => setSelectedFile(f)}
                          >
                            <div className="small text-truncate">{f.filename}</div>
                            <div className="font-size-11 text-muted">
                              {f.status} | +{f.additions} -{f.deletions}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {selectedFile && (
                      <div>
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <p className="font-size-12 text-muted mb-0 text-truncate">
                            {selectedFile.filename}
                          </p>
                          {selectedFile.blob_url && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 ms-2"
                              onClick={() => window.open(selectedFile.blob_url, "_blank")}
                            >
                              Open
                            </button>
                          )}
                        </div>
                        <pre
                          className="small border rounded p-2 mb-0"
                          style={{ maxHeight: 280, overflow: "auto", background: "#0b1220", color: "#dbe7ff" }}
                        >
{renderDiff(selectedFile.patch)}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </AppSimpleBar>
      {fullScreenReview && compareData && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 2000, background: "rgba(9, 14, 30, 0.94)" }}
        >
          <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom border-secondary">
            <div className="text-white">
              <h5 className="mb-1 text-white">GitHub Code Review</h5>
              <div className="small text-white-50">
                {selectedRepo?.full_name} | {compareData.base.slice(0, 7)}...{compareData.head.slice(0, 7)}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={() => setFullScreenReview(false)}
            >
              <i className="bx bx-x me-1" />
              Close
            </button>
          </div>
          <div className="d-flex" style={{ height: "calc(100vh - 78px)" }}>
            <div
              className="border-end border-secondary p-3"
              style={{ width: 360, overflowY: "auto", background: "rgba(13, 20, 40, 0.95)" }}
            >
              <p className="font-size-12 text-white-50 mb-2">Changed Files</p>
              <ul className="list-unstyled mb-0">
                {compareData.files.map((f) => (
                  <li
                    key={`full-${f.filename}`}
                    className={`px-2 py-2 rounded cursor-pointer mb-1 ${
                      selectedFile?.filename === f.filename ? "bg-primary bg-opacity-25" : ""
                    }`}
                    onClick={() => setSelectedFile(f)}
                  >
                    <div className="small text-white text-truncate">{f.filename}</div>
                    <div className="font-size-11 text-white-50">
                      {f.status} | +{f.additions} -{f.deletions}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-grow-1 p-3 d-flex flex-column" style={{ minWidth: 0 }}>
              {selectedFile ? (
                <>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="small text-white text-truncate me-3">{selectedFile.filename}</div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-white-50">
                        {selectedFile.status} | +{selectedFile.additions} -{selectedFile.deletions}
                      </span>
                      {selectedFile.blob_url && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-light"
                          onClick={() => window.open(selectedFile.blob_url, "_blank")}
                        >
                          Open on GitHub
                        </button>
                      )}
                    </div>
                  </div>
                  <pre
                    className="small border border-secondary rounded p-3 mb-0 flex-grow-1"
                    style={{
                      overflow: "auto",
                      background: "#050a17",
                      color: "#e6efff",
                      lineHeight: 1.45,
                    }}
                  >
{renderDiff(selectedFile.patch)}
                  </pre>
                </>
              ) : (
                <div className="h-100 d-flex align-items-center justify-content-center text-white-50">
                  Select a changed file to preview diff
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Github;
