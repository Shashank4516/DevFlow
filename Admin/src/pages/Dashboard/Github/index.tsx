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

  const loadBranches = (repo: Repo) => {
    setSelectedRepo(repo);
    setBranches([]);
    setContents([]);
    setCurrentPath("");
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
                  onChange={(e) =>
                    loadContents(selectedRepo.full_name, e.target.value, currentPath)
                  }
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
      </AppSimpleBar>
    </>
  );
};

export default Github;
