import React, { useState } from "react";

/* ── Category colour map ─────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  "To Do": "#FC736F",
  "In Progress": "#3B78F5",
  Review: "#F5BD4F",
  Complete: "#22BD73",
};

/* ── Project data ─────────────────────────────────────────── */
const PROJECTS = [
  { name: "Graphic Design", active: false },
  { name: "Mobile App", active: false },
  {
    name: "Website",
    active: true,
    sub: ["Company Website", "E-Commerce Website", "Landing Page Campaign"],
    activeSub: "E-Commerce Website",
  },
  { name: "Illustration Assets", active: false },
  { name: "User Research", active: false },
  { name: "Branding", active: false },
  { name: "Development", active: false },
];

/* ── Category data ─────────────────────────────────────────── */
const CATEGORIES = [
  { name: "To Do", count: 3 },
  { name: "In Progress", count: 3 },
  { name: "Review", count: 3 },
  { name: "Complete", count: 2 },
];

/* ── Team message data ─────────────────────────────────────── */
const MESSAGES = [
  { name: "Michael Anderson", role: "UI/UX Designer", color: "#594DED", initials: "MA" },
  { name: "Sophia Carter", role: "Graphic Designer", color: "#3B78F5", initials: "SC" },
  { name: "Daniel Johnson", role: "Frontend Developer", color: "#22BD73", initials: "DJ" },
  { name: "James Wilson", role: "Backend Programmer", color: "#F5BD4F", initials: "JW" },
];

/* ── Small icon helpers (inline SVG) ─────────────────────── */
const FolderIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
    <path d="M3 6.5C3 5.4 3.9 4.5 5 4.5H9L11 6.5H17C18.1 6.5 19 7.4 19 8.5V15.5C19 16.6 18.1 17.5 17 17.5H5C3.9 17.5 3 16.6 3 15.5V6.5Z" fill="#7B7999" opacity="0.6"/>
    <path d="M3 9.5H19V15.5C19 16.6 18.1 17.5 17 17.5H5C3.9 17.5 3 16.6 3 15.5V9.5Z" fill="#7B7999"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const Stack = () => {
  const [openProject, setOpenProject] = useState("Website");

  return (
    <div className="tm-sidebar">
      {/* ── Workspace header ──────────────────────────────── */}
      <div className="tm-sidebar__workspace">
        <div className="tm-sidebar__ws-text">
          <span className="tm-sidebar__ws-title">Team Workspace</span>
          <span className="tm-sidebar__ws-sub">Syncboard.Company</span>
        </div>
        <div className="tm-sidebar__ws-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M16.5 12.2C16.5 12.34 16.47 12.48 16.41 12.61C16.35 12.74 16.27 12.86 16.17 12.96L13.96 15.17C13.86 15.27 13.74 15.35 13.61 15.41C13.48 15.47 13.34 15.5 13.2 15.5C13.06 15.5 12.92 15.47 12.79 15.41L9 13.5L5.21 15.41C5.08 15.47 4.94 15.5 4.8 15.5C4.66 15.5 4.52 15.47 4.39 15.41C4.26 15.35 4.14 15.27 4.04 15.17L1.83 12.96C1.73 12.86 1.65 12.74 1.59 12.61C1.53 12.48 1.5 12.34 1.5 12.2V5.8C1.5 5.66 1.53 5.52 1.59 5.39C1.65 5.26 1.73 5.14 1.83 5.04L4.04 2.83C4.14 2.73 4.26 2.65 4.39 2.59C4.52 2.53 4.66 2.5 4.8 2.5C4.94 2.5 5.08 2.53 5.21 2.59L9 4.5L12.79 2.59C12.92 2.53 13.06 2.5 13.2 2.5C13.34 2.5 13.48 2.53 13.61 2.59C13.74 2.65 13.86 2.73 13.96 2.83L16.17 5.04C16.27 5.14 16.35 5.26 16.41 5.39C16.47 5.52 16.5 5.66 16.5 5.8V12.2Z" stroke="#BFBFBF" strokeWidth="1.2"/>
          </svg>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="tm-sidebar__divider" />

      {/* ── Projects & Companies ──────────────────────────── */}
      <div className="tm-sidebar__section">
        <div className="tm-sidebar__section-header">
          <span className="tm-sidebar__section-title">Project &amp; Companies</span>
          <button className="tm-sidebar__icon-btn" aria-label="Add project">
            <PlusIcon />
          </button>
        </div>
        <ul className="tm-sidebar__list">
          {PROJECTS.map((p) => (
            <React.Fragment key={p.name}>
              <li
                className={`tm-sidebar__list-item ${p.name === openProject ? "is-active" : ""}`}
                onClick={() => setOpenProject(p.name === openProject ? "" : p.name)}
              >
                <span className="tm-sidebar__item-content">
                  <FolderIcon />
                  <span className="tm-sidebar__item-label">{p.name}</span>
                </span>
                {p.sub && (
                  <span className={`tm-sidebar__chevron ${p.name === openProject ? "is-open" : ""}`}>
                    <ChevronRightIcon />
                  </span>
                )}
              </li>
              {p.sub && p.name === openProject && (
                <ul className="tm-sidebar__sub-list">
                  {p.sub.map((s) => (
                    <li
                      key={s}
                      className={`tm-sidebar__sub-item ${s === p.activeSub ? "is-active" : ""}`}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </React.Fragment>
          ))}
        </ul>
      </div>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="tm-sidebar__divider" />

      {/* ── Categories ────────────────────────────────────── */}
      <div className="tm-sidebar__section">
        <div className="tm-sidebar__section-header">
          <span className="tm-sidebar__section-title">Categories</span>
        </div>
        <ul className="tm-sidebar__cat-list">
          {CATEGORIES.map((c) => (
            <li key={c.name} className="tm-sidebar__cat-item">
              <span className="tm-sidebar__cat-content">
                <span
                  className="tm-sidebar__cat-dot"
                  style={{ background: CAT_COLORS[c.name] }}
                />
                <span className="tm-sidebar__cat-name">{c.name}</span>
              </span>
              <span className="tm-sidebar__cat-count">{c.count}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="tm-sidebar__divider" />

      {/* ── Messages ──────────────────────────────────────── */}
      <div className="tm-sidebar__section">
        <div className="tm-sidebar__section-header">
          <span className="tm-sidebar__section-title">Message</span>
        </div>
        <ul className="tm-sidebar__msg-list">
          {MESSAGES.map((m) => (
            <li key={m.name} className="tm-sidebar__msg-item">
              <span
                className="tm-sidebar__avatar"
                style={{ background: m.color }}
              >
                {m.initials}
              </span>
              <span className="tm-sidebar__msg-info">
                <span className="tm-sidebar__msg-name">{m.name}</span>
                <span className="tm-sidebar__msg-role">{m.role}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Stack;
