import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

/* ─── Types ───────────────────────────────────────────────── */
interface Badge {
  label: string;
}
interface Card {
  id: string;
  title: string;
  description: string;
  badges: Badge[];
  progress: { done: number; total: number };
  files: number;
  comments: number;
}
interface Column {
  id: string;
  label: string;
  dotColor: string;
  countBg: string;
  countText: string;
  badgeBg: string;
  badgeText: string;
  barColor: string;
  cards: Card[];
}

/* ─── Kanban data (exact from Figma) ─────────────────────── */
const INITIAL_COLUMNS: Column[] = [
  {
    id: "todo",
    label: "To Do",
    dotColor: "#FC736F",
    countBg: "rgba(252,115,111,0.2)",
    countText: "#FF9996",
    badgeBg: "rgba(252,115,111,0.2)",
    badgeText: "#FF9996",
    barColor: "#FC736F",
    cards: [
      {
        id: "c1",
        title: "Homepage UI Design Draft",
        description:
          "Building the first version of homepage layout focusing on usability and flow.",
        badges: [{ label: "Design UI/UX" }, { label: "Frontend" }],
        progress: { done: 0, total: 4 },
        files: 3,
        comments: 1,
      },
      {
        id: "c2",
        title: "Product Detail Wireframe",
        description:
          "Wireframing the product detail page with focus on images and description.",
        badges: [{ label: "UX" }, { label: "Research" }],
        progress: { done: 0, total: 4 },
        files: 2,
        comments: 3,
      },
      {
        id: "c3",
        title: "Shopping Cart Structure",
        description:
          "Planning the shopping cart page to ensure user-friendly checkout flow.",
        badges: [{ label: "Backend" }, { label: "API" }],
        progress: { done: 0, total: 4 },
        files: 3,
        comments: 5,
      },
    ],
  },
  {
    id: "inprogress",
    label: "In Progress",
    dotColor: "#3B78F5",
    countBg: "rgba(59,120,245,0.2)",
    countText: "#8BB1FF",
    badgeBg: "rgba(59,120,245,0.2)",
    badgeText: "#8BB1FF",
    barColor: "#3B78F5",
    cards: [
      {
        id: "c4",
        title: "User Registration Flow",
        description:
          "Building user account creation system with secure authentication.",
        badges: [{ label: "Frontend" }, { label: "Auth" }],
        progress: { done: 1, total: 4 },
        files: 3,
        comments: 8,
      },
      {
        id: "c5",
        title: "Payment Gateway Setup",
        description:
          "Integrating payment gateway API to support multiple methods.",
        badges: [{ label: "Backend" }, { label: "API" }],
        progress: { done: 3, total: 4 },
        files: 2,
        comments: 9,
      },
      {
        id: "c6",
        title: "Product Catalog Layout",
        description:
          "Creating responsive product grid for better shopping experience.",
        badges: [{ label: "Design UI/UX" }, { label: "Frontend" }],
        progress: { done: 2, total: 4 },
        files: 3,
        comments: 11,
      },
    ],
  },
  {
    id: "review",
    label: "Review",
    dotColor: "#F5BD4F",
    countBg: "rgba(245,189,79,0.2)",
    countText: "#FCCB6B",
    badgeBg: "rgba(245,189,79,0.2)",
    badgeText: "#FCCB6B",
    barColor: "#F5BD4F",
    cards: [
      {
        id: "c7",
        title: "Homepage Responsive Check",
        description:
          "Testing homepage layout across devices to ensure responsiveness.",
        badges: [{ label: "QA" }, { label: "Frontend" }],
        progress: { done: 2, total: 4 },
        files: 2,
        comments: 18,
      },
      {
        id: "c8",
        title: "Product Image Optimization",
        description:
          "Checking optimized images for clarity and performance balance.",
        badges: [{ label: "Media" }, { label: "Performance" }],
        progress: { done: 3, total: 4 },
        files: 3,
        comments: 16,
      },
      {
        id: "c9",
        title: "Checkout Flow Testing",
        description:
          "Reviewing checkout process to ensure smooth user experience.",
        badges: [{ label: "QA" }, { label: "Backend" }],
        progress: { done: 3, total: 4 },
        files: 2,
        comments: 5,
      },
    ],
  },
  {
    id: "complete",
    label: "Complete",
    dotColor: "#22BD73",
    countBg: "rgba(34,189,115,0.2)",
    countText: "#44D992",
    badgeBg: "rgba(34,189,115,0.2)",
    badgeText: "#44D992",
    barColor: "#22BD73",
    cards: [
      {
        id: "c10",
        title: "Login Page Interface",
        description:
          "Finished building login interface including input validation.",
        badges: [{ label: "Design UI/UX" }, { label: "Frontend" }],
        progress: { done: 4, total: 4 },
        files: 1,
        comments: 8,
      },
      {
        id: "c11",
        title: "Database Schema Setup",
        description:
          "Delivered database setup with tables for users, orders, and items.",
        badges: [{ label: "Backend" }, { label: "Database" }],
        progress: { done: 4, total: 4 },
        files: 3,
        comments: 19,
      },
    ],
  },
];

function findCardInColumns(
  columns: Column[],
  cardId: string
): { card: Card; col: Column } | null {
  for (const col of columns) {
    const card = col.cards.find(c => c.id === cardId);
    if (card) return { card, col };
  }
  return null;
}

/* ─── Avatar initials ────────────────────────────────────── */
const AVATAR_COLORS = ["#594DED", "#3B78F5", "#22BD73", "#F5BD4F"];
const AVATAR_INITIALS = ["MK", "SC", "DJ"];

/* ─── Inline SVG atoms ───────────────────────────────────── */
const PlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M8 3V13M3 8H13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const KanbanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="1" y="2" width="4" height="12" rx="1" fill="currentColor" />
    <rect
      x="6"
      y="2"
      width="4"
      height="8"
      rx="1"
      fill="currentColor"
      opacity="0.6"
    />
    <rect
      x="11"
      y="2"
      width="4"
      height="10"
      rx="1"
      fill="currentColor"
      opacity="0.4"
    />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M10.5 10.5L14 14"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M2 4h12M4 8h8M6 12h4"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path
      d="M10 2a6 6 0 0 0-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 0 0-6-6z"
      stroke="#9E9E9E"
      strokeWidth="1.3"
    />
    <path d="M8.5 16.5a1.5 1.5 0 0 0 3 0" stroke="#9E9E9E" strokeWidth="1.3" />
  </svg>
);

const ChevronRightSm = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M5 3l4 4-4 4"
      stroke="#9E9E9E"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="3" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="13" cy="8" r="1.5" fill="currentColor" />
  </svg>
);

const FolderSmIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M2 4.5C2 3.7 2.7 3 3.5 3H6L7.5 4.5H11C11.8 4.5 12.5 5.2 12.5 6V10.5C12.5 11.3 11.8 12 11 12H3C2.2 12 1.5 11.3 1.5 10.5V4.5H2Z"
      fill="#9E9E9E"
      opacity="0.5"
    />
    <path
      d="M1.5 6.5H12.5V10.5C12.5 11.3 11.8 12 11 12H3C2.2 12 1.5 11.3 1.5 10.5V6.5Z"
      fill="#9E9E9E"
    />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M2 2h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8.5L6 12l-1-2H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
      stroke="#9E9E9E"
      strokeWidth="1.1"
    />
  </svg>
);

/* ─── Progress Bar ───────────────────────────────────────── */
const ProgressBar = ({
  done,
  total,
  color,
}: {
  done: number;
  total: number;
  color: string;
}) => {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const safeTotal = Math.max(1, total);
  const clampedPct = Math.max(0, Math.min(100, pct));
  const activeSegments = Math.floor((clampedPct / 100) * safeTotal);
  const remainderPct = ((clampedPct / 100) * safeTotal - activeSegments) * 100;
  return (
    <div className="tm-progress">
      <div className="tm-progress__header">
        <span className="tm-progress__label">Progress</span>
        <span className="tm-progress__count">
          {done}/{total}
        </span>
      </div>
      <div className="tm-progress__segments" aria-hidden>
        {Array.from({ length: safeTotal }).map((_, i) => {
          const isActive = i < activeSegments;
          const isPartial = i === activeSegments && remainderPct > 0 && activeSegments < safeTotal;
          return (
            <span
              key={i}
              className={`tm-progress__segment${isActive ? " is-active" : ""}${isPartial ? " is-partial" : ""}`}
              style={
                isActive
                  ? ({ ["--tm-progress-color" as any]: color } as React.CSSProperties)
                  : isPartial
                    ? ({ ["--tm-progress-color" as any]: color, ["--tm-progress-partial" as any]: `${remainderPct}%` } as React.CSSProperties)
                    : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
};

/* ─── Kanban Card ─────────────────────────────────────────── */
const KanbanCard = ({ card, col }: { card: Card; col: Column }) => (
  <div className="tm-card">
    <div className="tm-card__header">
      <div className="tm-card__badges">
        {card.badges.map(b => (
          <span
            key={b.label}
            className="tm-card__badge"
            style={{ background: col.badgeBg, color: col.badgeText }}
          >
            {b.label}
          </span>
        ))}
      </div>
      <button
        type="button"
        className="tm-card__menu-btn"
        aria-label="Card options"
        onPointerDown={e => e.stopPropagation()}
      >
        <DotsIcon />
      </button>
    </div>
    <div className="tm-card__body">
      <h4 className="tm-card__title">{card.title}</h4>
      <p className="tm-card__desc">{card.description}</p>
    </div>
    <div className="tm-card__footer">
      <ProgressBar
        done={card.progress.done}
        total={card.progress.total}
        color={col.barColor}
      />
      <div className="tm-card__meta">
        <div className="tm-card__avatars">
          {AVATAR_INITIALS.slice(0, 2).map((ini, i) => (
            <span
              key={i}
              className="tm-card__avatar"
              style={{ background: AVATAR_COLORS[i], zIndex: 2 - i }}
            >
              {ini}
            </span>
          ))}
        </div>
        <div className="tm-card__tags">
          <span className="tm-card__tag">
            <FolderSmIcon />
            <span>{card.files}</span>
          </span>
          <span className="tm-card__tag">
            <ChatBubbleIcon />
            <span>{card.comments}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Draggable card ──────────────────────────────────────── */
const DraggableKanbanCard = ({ card, col }: { card: Card; col: Column }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { columnId: col.id },
  });
  const style: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Translate.toString(transform),
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="tm-card-draggable"
      {...listeners}
      {...attributes}
    >
      {isDragging ? (
        <div className="tm-card tm-card--drop-placeholder" aria-hidden />
      ) : (
        <KanbanCard card={card} col={col} />
      )}
    </div>
  );
};

/* ─── Kanban Column ───────────────────────────────────────── */
const KanbanColumn = ({ col }: { col: Column }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div className={`tm-column tm-column--${col.id}`}>
      <div className="tm-column__header">
        <div className="tm-column__title">
          <div className="tm-column__title-left">
            <span
              className="tm-column__dot"
              style={{ background: col.dotColor }}
            />
            <span className="tm-column__label">{col.label}</span>
            <span
              className="tm-column__count"
              style={{ background: col.countBg, color: col.countText }}
            >
              {col.cards.length}
            </span>
          </div>
          <button
            type="button"
            className="tm-column__add-btn"
            aria-label={`Add card to ${col.label}`}
          >
            <PlusIcon size={14} />
          </button>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`tm-column__cards${isOver ? " is-over" : ""}`}
      >
        {col.cards.map(card => (
          <DraggableKanbanCard key={card.id} card={card} col={col} />
        ))}
      </div>
    </div>
  );
};

/* ─── Main KanbanBoard ────────────────────────────────────── */
const KanbanBoard = () => {
  const [activeTab, setActiveTab] = useState<"Dashboard">("Dashboard");
  const [columns, setColumns] = useState<Column[]>(() =>
    INITIAL_COLUMNS.map(c => ({ ...c, cards: [...c.cards] }))
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const activeDragPayload = useMemo(() => {
    if (!activeDragId) return null;
    return findCardInColumns(columns, activeDragId);
  }, [activeDragId, columns]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;
    const cardId = String(active.id);
    const overId = String(over.id);
    const source = findCardInColumns(columns, cardId);
    if (!source) return;
    const targetCol =
      columns.find(c => c.id === overId) ??
      findCardInColumns(columns, overId)?.col;
    if (!targetCol) return;
    if (source.col.id === targetCol.id) return;

    setColumns(prev =>
      prev.map(col => {
        if (col.id === source.col.id) {
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }
        if (col.id === targetCol.id) {
          return { ...col, cards: [...col.cards, source.card] };
        }
        return col;
      })
    );
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  return (
    <div className="tm-main">
      {/* ── Top header row (breadcrumb + notifications + profile) ── */}
      <div className="tm-topbar">
        <nav className="tm-breadcrumb" aria-label="breadcrumb">
          <span className="tm-breadcrumb__item tm-breadcrumb__item--muted">
            Project
          </span>
          <ChevronRightSm />
          <span className="tm-breadcrumb__item tm-breadcrumb__item--muted">
            Website
          </span>
          <ChevronRightSm />
          <span className="tm-breadcrumb__item">E-Commerce Website</span>
        </nav>
        <div className="tm-topbar__right">
          <button className="tm-topbar__icon-btn" aria-label="Notifications">
            <BellIcon />
          </button>
          <div className="tm-topbar__divider" />
          <div className="tm-topbar__profile">
            <span
              className="tm-topbar__avatar"
              style={{ background: "#594DED" }}
            >
              S
            </span>
            <div className="tm-topbar__profile-info">
              <span className="tm-topbar__profile-name">Shahsank</span>
              <span className="tm-topbar__profile-email">
                jeno.sonn@gmail.com
              </span>
            </div>
            <ChevronRightSm />
          </div>
        </div>
      </div>

      {/* ── Secondary header (title + actions + tabs + search) ── */}
      <div className="tm-subheader">
        <div className="tm-subheader__top">
          <div className="tm-subheader__left">
            <h1 className="tm-subheader__title">E-Commerce Website</h1>
          </div>
          <div className="tm-subheader__actions">
            <div className="tm-avatar-group">
              {AVATAR_COLORS.slice(0, 3).map((c, i) => (
                <span
                  key={i}
                  className="tm-avatar-group__item"
                  style={{ background: c, zIndex: 3 - i }}
                >
                  {AVATAR_INITIALS[i] || "+9"}
                </span>
              ))}
              <span
                className="tm-avatar-group__item tm-avatar-group__item--overflow"
                style={{ background: "#2E2B3B" }}
              >
                +9
              </span>
            </div>
            <button className="tm-btn-primary">
              <PlusIcon size={14} />
              <span>New Task</span>
            </button>
          </div>
        </div>
        <div className="tm-subheader__bottom">
          <div className="tm-tabs">
            {(["Dashboard"] as const).map(t => (
              <button
                key={t}
                className={`tm-tabs__tab ${activeTab === t ? "is-active" : ""}`}
                onClick={() => setActiveTab(t)}
              >
                {t === "Dashboard" && <KanbanIcon />}
                {t}
              </button>
            ))}
          </div>
          <div className="tm-filters">
            <div className="tm-search">
              <SearchIcon />
              <span className="tm-search__placeholder">Search...</span>
            </div>
            <button className="tm-filter-btn">
              <FilterIcon />
              <span>Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Kanban board ──────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="tm-board">
          {columns.map(col => (
            <KanbanColumn key={col.id} col={col} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeDragPayload ? (
            <div className="tm-drag-overlay-card">
              <KanbanCard card={activeDragPayload.card} col={activeDragPayload.col} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default KanbanBoard;
