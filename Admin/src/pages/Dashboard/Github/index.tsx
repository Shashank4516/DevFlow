import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "reselect";
import { formatDistanceToNow } from "date-fns";
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

type Mode = "files" | "review" | "history";

/* ─── Helpers ──────────────────────────────────────────────── */

const timeAgo = (iso: string): string => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, { addSuffix: true }).replace("about ", "");
};

const formatSize = (bytes: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const initials = (name: string): string =>
  (name || "?")
    .split(/[\s\-_.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/** iOS-style tinted icon tile per file type. */
const fileGlyph = (item: ContentItem): { icon: string; tone: string } => {
  if (item.type === "dir") return { icon: "bx bxs-folder", tone: "blue" };
  const name = item.name.toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  if (name === "dockerfile") return { icon: "bx bxl-docker", tone: "teal" };
  if (["ts", "tsx", "js", "jsx"].includes(ext)) return { icon: "bx bx-code-alt", tone: "yellow" };
  if (["php", "py", "go", "rb", "java", "kt", "swift", "c", "cpp", "rs"].includes(ext))
    return { icon: "bx bx-code-curly", tone: "indigo" };
  if (["md", "txt", "rst"].includes(ext)) return { icon: "bx bx-text", tone: "gray" };
  if (["json", "yml", "yaml", "toml", "xml", "ini", "env", "lock"].includes(ext) || name.startsWith("."))
    return { icon: "bx bx-cog", tone: "gray" };
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)) return { icon: "bx bx-image", tone: "pink" };
  if (["css", "scss", "sass", "less"].includes(ext)) return { icon: "bx bx-palette", tone: "purple" };
  return { icon: "bx bx-file-blank", tone: "gray" };
};

const STATUS_LABEL: Record<string, { letter: string; tone: string }> = {
  added: { letter: "A", tone: "green" },
  modified: { letter: "M", tone: "orange" },
  changed: { letter: "M", tone: "orange" },
  removed: { letter: "D", tone: "red" },
  deleted: { letter: "D", tone: "red" },
  renamed: { letter: "R", tone: "blue" },
  copied: { letter: "C", tone: "blue" },
};

const StatusTile = ({ status }: { status: string }) => {
  const s = STATUS_LABEL[status] || { letter: "•", tone: "gray" };
  return (
    <span className={`gh-tile gh-tile--${s.tone} gh-tile--sm`} title={status}>
      {s.letter}
    </span>
  );
};

const EmptyState = ({ icon, title, children }: { icon: string; title: string; children?: React.ReactNode }) => (
  <div className="gh-empty">
    <div className="gh-empty__icon">
      <i className={icon} />
    </div>
    <h5 className="gh-empty__title">{title}</h5>
    {children && <p className="gh-empty__text">{children}</p>}
  </div>
);

const lineRowClass = (line: string): string => {
  if (line.startsWith("+") && !line.startsWith("+++")) return "gh-diff-line gh-diff-line--add";
  if (line.startsWith("-") && !line.startsWith("---")) return "gh-diff-line gh-diff-line--del";
  if (line.startsWith("@@")) return "gh-diff-line gh-diff-line--hunk";
  return "gh-diff-line";
};

const DiffPreview = ({ file }: { file: CompareFile }) => {
  const patch = file.patch;
  const [copied, setCopied] = useState(false);
  const parts = file.filename.split("/");
  const base = parts.pop();

  const copyPatch = () => {
    if (!patch) return;
    navigator.clipboard.writeText(patch).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className="gh-card gh-diff">
      <div className="gh-diff__head">
        <StatusTile status={file.status} />
        <div className="gh-diff__title min-w-0">
          <div className="gh-diff__name text-truncate" title={file.filename}>
            {base}
          </div>
          <div className="gh-diff__path text-truncate">
            {file.previous_filename && file.previous_filename !== file.filename
              ? `Renamed from ${file.previous_filename}`
              : parts.join("/") || "/"}
          </div>
        </div>
        <span className="gh-diff__nums">
          <span className="is-add">+{file.additions}</span>
          <span className="is-del">−{file.deletions}</span>
        </span>
        {patch && (
          <button type="button" className="gh-round-btn" onClick={copyPatch} title={copied ? "Copied" : "Copy patch"}>
            <i className={copied ? "bx bx-check" : "bx bx-copy"} />
          </button>
        )}
        {file.blob_url && (
          <button
            type="button"
            className="gh-round-btn"
            onClick={() => window.open(file.blob_url, "_blank")}
            title="Open on GitHub"
          >
            <i className="bx bx-link-external" />
          </button>
        )}
      </div>

      {patch ? (
        <div className="gh-diff__body">
          <table className="gh-diff__table">
            <tbody>
              {patch.split("\n").map((line, idx) => (
                <tr key={`${idx}-${line.slice(0, 24)}`} className={lineRowClass(line)}>
                  <td className="gh-diff__ln">{idx + 1}</td>
                  <td className="gh-diff__code">
                    <pre>{line || " "}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="bx bx-file-blank" title="No preview">
          This is a binary or very large change. Open it on GitHub to see the full diff.
        </EmptyState>
      )}
    </div>
  );
};

/* ─── Page ─────────────────────────────────────────────────── */

const Github = () => {
  const dispatch = useDispatch();
  const { githubConnected, githubUsername } = useSelector(
    createSelector(
      (state: any) => state.Github,
      (g) => ({ githubConnected: g.connected as boolean, githubUsername: g.username as string | null })
    )
  );
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoQuery, setRepoQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [currentPath, setCurrentPath] = useState<string>("");
  const [syncedOnce, setSyncedOnce] = useState(false);
  const [mode, setMode] = useState<Mode>("files");
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

  const loadCompare = (repoFullName: string, base: string, head: string, branch: string) => {
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
    fetch(`${BACKEND_URL}/api/github/branches.php?repo=${encodeURIComponent(repo.full_name)}`, {
      credentials: "include",
    })
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

  const handleConnect = () => {
    if (BACKEND_URL) {
      window.location.href = `${BACKEND_URL.replace(/\/$/, "")}/auth/github/index.php`;
    }
  };

  const filteredRepos = useMemo(() => {
    const q = repoQuery.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q)
    );
  }, [repos, repoQuery]);

  const sortedContents = useMemo(
    () =>
      [...(contents || [])].sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [contents]
  );

  const compareTotals = useMemo(() => {
    if (!compareData) return { additions: 0, deletions: 0 };
    return compareData.files.reduce(
      (acc, f) => ({ additions: acc.additions + f.additions, deletions: acc.deletions + f.deletions }),
      { additions: 0, deletions: 0 }
    );
  }, [compareData]);

  const repoUrl = (repo: Repo) =>
    repo.html_url && repo.html_url !== "#" ? repo.html_url : `https://github.com/${repo.full_name}`;

  /* ─── Sidebar (mirrors the Chats sidebar) ─── */

  const renderSidebar = () => (
    <aside className={`gh-sidebar ${selectedRepo ? "has-selection" : ""}`}>
      <div className="gh-sidebar__search">
        <input
          type="search"
          placeholder="Search repositories…"
          value={repoQuery}
          onChange={(e) => setRepoQuery(e.target.value)}
          aria-label="Search repositories"
        />
        <i className="bx bx-search" />
      </div>

      <div className="gh-sidebar__title">
        <h4>GitHub</h4>
        {githubUsername && <span className="gh-sidebar__user">@{githubUsername}</span>}
      </div>

      <AppSimpleBar className="gh-sidebar__scroll" style={{ height: "100%", maxHeight: "100%" }}>
        <div className="gh-section-title">
          Repositories
          {!loading && <span className="gh-section-title__count">{filteredRepos.length}</span>}
        </div>

        {loading && <Loader />}
        {!loading && error && <p className="gh-sidebar__note gh-sidebar__note--error">{error}</p>}
        {!loading && !error && filteredRepos.length === 0 && (
          <p className="gh-sidebar__note">
            {repos.length ? `No repositories match “${repoQuery}”.` : "No repositories yet."}
          </p>
        )}

        <ul className="gh-repo-list">
          {filteredRepos.map((repo) => {
            const active = selectedRepo?.id === repo.id;
            return (
              <li key={repo.id} className={`gh-repo ${active ? "active" : ""}`}>
                <button type="button" className="gh-repo__link" onClick={() => loadBranches(repo)}>
                  <span className="gh-repo__avatar">
                    {initials(repo.name)}
                    {repo.private && (
                      <span className="gh-repo__lock" title="Private">
                        <i className="bx bxs-lock-alt" />
                      </span>
                    )}
                  </span>
                  <span className="gh-repo__body">
                    <span className="gh-repo__top">
                      <span className="gh-repo__name">{repo.name}</span>
                      <span className="gh-repo__branch">{repo.default_branch}</span>
                    </span>
                    <span className="gh-repo__preview">
                      {repo.description || (repo.private ? "Private repository" : "Public repository")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </AppSimpleBar>
    </aside>
  );

  /* ─── Topbar (mirrors the chat conversation topbar) ─── */

  const renderTopbar = (repo: Repo) => (
    <header className="gh-topbar">
      <button type="button" className="gh-topbar__back" onClick={() => setSelectedRepo(null)} aria-label="Back">
        <i className="bx bx-chevron-left" />
      </button>
      <span className="gh-topbar__avatar">{initials(repo.name)}</span>
      <div className="gh-topbar__info min-w-0">
        <div className="gh-topbar__name text-truncate">{repo.name}</div>
        <div className="gh-topbar__sub text-truncate">
          {repo.private ? "Private" : "Public"} · {branchLoading ? "…" : branches.length} branches ·{" "}
          {repo.full_name.split("/")[0]}
        </div>
      </div>

      <div className="gh-segmented" role="tablist">
        {(
          [
            ["files", "Code"],
            ["review", "Changes"],
            ["history", "History"],
          ] as [Mode, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            className={mode === key ? "is-active" : ""}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="gh-topbar__actions">
        <label className="gh-branch" title="Switch branch">
          <i className="bx bx-git-branch" />
          <select
            value={currentBranch}
            disabled={branchLoading || branches.length === 0}
            onChange={(e) => onBranchChange(e.target.value)}
            aria-label="Branch"
          >
            {branches.length === 0 && <option value="">{branchLoading ? "Loading…" : "—"}</option>}
            {branches.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          <i className="bx bx-chevron-down gh-branch__caret" />
        </label>
        <a className="gh-icon-btn" href={repoUrl(repo)} target="_blank" rel="noreferrer" title="Open on GitHub">
          <i className="bx bxl-github" />
        </a>
      </div>
    </header>
  );

  /* ─── Code ─── */

  const renderCode = (repo: Repo) => {
    const latest = commits[0];
    const branch = currentBranch || repo.default_branch;
    const segments = currentPath.split("/").filter(Boolean);

    return (
      <div className="gh-page">
        {repo.description && !currentPath && <p className="gh-page__lead">{repo.description}</p>}

        {latest && (
          <div className="gh-card gh-latest">
            <span className="gh-avatar">{initials(latest.author_name || latest.github_login)}</span>
            <div className="min-w-0 flex-grow-1">
              <div className="gh-latest__title text-truncate" title={latest.title || latest.message}>
                {latest.title || latest.message}
              </div>
              <div className="gh-latest__meta">
                {latest.github_login || latest.author_name} · {timeAgo(latest.author_date)}
              </div>
            </div>
            <span className="gh-sha">{latest.short_sha}</span>
          </div>
        )}

        <div className="gh-group-head">
          <nav className="gh-crumbs" aria-label="Path">
            <button type="button" onClick={() => openFolder("")} className={segments.length ? "" : "is-current"}>
              {repo.name}
            </button>
            {segments.map((seg, i) => {
              const path = segments.slice(0, i + 1).join("/");
              const last = i === segments.length - 1;
              return (
                <React.Fragment key={path}>
                  <i className="bx bx-chevron-right" />
                  <button
                    type="button"
                    onClick={() => !last && openFolder(path)}
                    className={last ? "is-current" : ""}
                  >
                    {seg}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
          {!contentsLoading && <span>{sortedContents.length} items</span>}
        </div>

        <div className="gh-card">
          {contentsLoading ? (
            <div className="py-5">
              <Loader />
            </div>
          ) : (
            <ul className="gh-list">
              {currentPath && (
                <li>
                  <button
                    type="button"
                    className="gh-row"
                    onClick={() => openFolder(currentPath.split("/").slice(0, -1).join("/"))}
                  >
                    <span className="gh-tile gh-tile--gray">
                      <i className="bx bx-arrow-back" />
                    </span>
                    <span className="gh-row__label">Back</span>
                  </button>
                </li>
              )}
              {sortedContents.map((item) => {
                const isDir = item.type === "dir";
                const g = fileGlyph(item);
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      className="gh-row"
                      onClick={() =>
                        isDir
                          ? openFolder(item.path)
                          : window.open(`https://github.com/${repo.full_name}/blob/${branch}/${item.path}`, "_blank")
                      }
                    >
                      <span className={`gh-tile gh-tile--${g.tone}`}>
                        <i className={g.icon} />
                      </span>
                      <span className="gh-row__label">{item.name}</span>
                      <span className="gh-row__detail">{isDir ? "" : formatSize(item.size)}</span>
                      <i className={`gh-row__chev bx ${isDir ? "bx-chevron-right" : "bx-link-external"}`} />
                    </button>
                  </li>
                );
              })}
              {!currentPath && sortedContents.length === 0 && (
                <li>
                  <EmptyState icon="bx bx-folder-open" title="Nothing here yet" />
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    );
  };

  /* ─── Changes ─── */

  const renderChanges = (repo: Repo) => (
    <div className="gh-split">
      <div className="gh-split__side">
        <div className="gh-group-head">
          <span>Compare</span>
        </div>
        <div className="gh-card">
          {commitsLoading ? (
            <div className="py-4">
              <Loader />
            </div>
          ) : (
            <ul className="gh-list">
              <li>
                <label className="gh-row gh-row--field">
                  <span className="gh-row__label">From</span>
                  <select value={baseSha} onChange={(e) => setBaseSha(e.target.value)}>
                    <option value="">Choose…</option>
                    {commits.map((c) => (
                      <option key={`base-${c.sha}`} value={c.sha}>
                        {c.short_sha} — {c.title}
                      </option>
                    ))}
                  </select>
                  <i className="bx bx-chevron-down gh-row__chev" />
                </label>
              </li>
              <li>
                <label className="gh-row gh-row--field">
                  <span className="gh-row__label">To</span>
                  <select value={headSha} onChange={(e) => setHeadSha(e.target.value)}>
                    <option value="">Choose…</option>
                    {commits.map((c) => (
                      <option key={`head-${c.sha}`} value={c.sha}>
                        {c.short_sha} — {c.title}
                      </option>
                    ))}
                  </select>
                  <i className="bx bx-chevron-down gh-row__chev" />
                </label>
              </li>
            </ul>
          )}
        </div>
        <button
          type="button"
          className="gh-btn gh-btn--primary w-100 mt-2"
          disabled={!baseSha || !headSha || compareLoading}
          onClick={() => loadCompare(repo.full_name, baseSha, headSha, currentBranch || repo.default_branch)}
        >
          {compareLoading ? "Comparing…" : "Compare"}
        </button>
        {compareError && <p className="gh-note gh-note--error">{compareError}</p>}

        {compareData && (
          <>
            <div className="gh-summary">
              <div>
                <strong>{compareData.total_commits}</strong>
                <span>{compareData.total_commits === 1 ? "commit" : "commits"}</span>
              </div>
              <div>
                <strong>{compareData.files.length}</strong>
                <span>{compareData.files.length === 1 ? "file" : "files"}</span>
              </div>
              <div className="is-add">
                <strong>+{compareTotals.additions}</strong>
                <span>added</span>
              </div>
              <div className="is-del">
                <strong>−{compareTotals.deletions}</strong>
                <span>removed</span>
              </div>
            </div>

            <div className="gh-group-head">
              <span>Changed files</span>
            </div>
            <div className="gh-card">
              <ul className="gh-list">
                {compareData.files.map((f) => {
                  const parts = f.filename.split("/");
                  const base = parts.pop();
                  const active = selectedFile?.filename === f.filename;
                  return (
                    <li key={f.filename}>
                      <button
                        type="button"
                        className={`gh-row gh-row--two ${active ? "is-active" : ""}`}
                        onClick={() => setSelectedFile(f)}
                        title={f.filename}
                      >
                        <StatusTile status={f.status} />
                        <span className="gh-row__stack min-w-0">
                          <span className="gh-row__label text-truncate">{base}</span>
                          <span className="gh-row__sub text-truncate">{parts.join("/") || "/"}</span>
                        </span>
                        <span className="gh-row__nums">
                          <span className="is-add">+{f.additions}</span>
                          <span className="is-del">−{f.deletions}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="gh-split__main">
        {compareLoading ? (
          <div className="py-5">
            <Loader />
          </div>
        ) : !compareData ? (
          <EmptyState icon="bx bx-git-compare" title="Compare two commits">
            Pick where to start and end, then press Compare to see what changed.
          </EmptyState>
        ) : !selectedFile ? (
          <EmptyState icon="bx bx-check-circle" title={compareData.files.length ? "Select a file" : "No changes"}>
            {compareData.files.length
              ? "Choose a changed file to preview its diff."
              : "These two commits are identical."}
          </EmptyState>
        ) : (
          <DiffPreview file={selectedFile} />
        )}
      </div>
    </div>
  );

  /* ─── History ─── */

  const renderHistory = () => (
    <div className="gh-page">
      <div className="gh-group-head">
        <span>Recent commits on {currentBranch}</span>
        {!commitsLoading && <span>{commits.length}</span>}
      </div>
      <div className="gh-card">
        {commitsLoading ? (
          <div className="py-5">
            <Loader />
          </div>
        ) : commits.length === 0 ? (
          <EmptyState icon="bx bx-history" title="No commits yet" />
        ) : (
          <ul className="gh-list">
            {commits.map((c) => (
              <li key={c.sha}>
                <button
                  type="button"
                  className="gh-row gh-row--two"
                  onClick={() => c.html_url && c.html_url !== "#" && window.open(c.html_url, "_blank")}
                >
                  <span className="gh-avatar">{initials(c.author_name || c.github_login)}</span>
                  <span className="gh-row__stack min-w-0">
                    <span className="gh-row__label text-truncate" title={c.title || c.message}>
                      {c.title || c.message}
                    </span>
                    <span className="gh-row__sub text-truncate">
                      {c.github_login || c.author_name} · {timeAgo(c.author_date)}
                    </span>
                  </span>
                  <span className="gh-sha">{c.short_sha}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderMain = () => {
    if (!selectedRepo) {
      return (
        <main className="gh-main">
          <EmptyState icon="bx bxl-github" title="Your repositories">
            Pick a repository to browse its code, review changes and follow its history.
          </EmptyState>
        </main>
      );
    }
    return (
      <main className="gh-main">
        {renderTopbar(selectedRepo)}
        <AppSimpleBar className="gh-main__scroll" style={{ height: "100%", maxHeight: "100%" }}>
          {mode === "files" && renderCode(selectedRepo)}
          {mode === "review" && renderChanges(selectedRepo)}
          {mode === "history" && renderHistory()}
        </AppSimpleBar>
      </main>
    );
  };

  /* ─── Not connected ─── */

  if (!BACKEND_URL || !githubConnected) {
    const configured = !!BACKEND_URL;
    return (
      <div className="github-main-workspace gh-welcome">
        <div className="gh-welcome__inner">
          <div className={`gh-welcome__icon ${configured ? "" : "is-warn"}`}>
            <i className={configured ? "bx bxl-github" : "bx bx-plug"} />
          </div>
          <h2 className="gh-welcome__title">{configured ? "Connect GitHub" : "Backend not configured"}</h2>
          <p className="gh-welcome__text">
            {configured ? (
              "Browse your repositories, review changes and follow commits — right next to your team chat."
            ) : (
              <>
                Set <code>VITE_BACKEND_URL</code> in your <code>.env</code> file to enable GitHub.
              </>
            )}
          </p>
          {configured && (
            <>
              <div className="gh-card gh-welcome__list">
                <ul className="gh-list">
                  {[
                    ["bx bx-book-bookmark", "blue", "Repositories", "Browse branches and files"],
                    ["bx bx-git-compare", "orange", "Changes", "Compare commits with inline diffs"],
                    ["bx bx-history", "green", "History", "See who changed what, and when"],
                  ].map(([icon, tone, title, sub]) => (
                    <li key={title}>
                      <div className="gh-row gh-row--two gh-row--static">
                        <span className={`gh-tile gh-tile--${tone}`}>
                          <i className={icon} />
                        </span>
                        <span className="gh-row__stack">
                          <span className="gh-row__label">{title}</span>
                          <span className="gh-row__sub">{sub}</span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <button type="button" className="gh-btn gh-btn--primary gh-btn--lg w-100" onClick={handleConnect}>
                <i className="bx bxl-github" />
                Continue with GitHub
              </button>
              <p className="gh-welcome__fine">You'll be asked to authorize DevFlow on GitHub.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="github-main-workspace gh-shell">
      {renderSidebar()}
      {renderMain()}
    </div>
  );
};

export default Github;
