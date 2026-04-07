# Dashboard update — Stack (Kanban) + XAMPP

This file summarizes the **Stack** area of the dashboard and how it fits **XAMPP / htdocs** deployment.

## What was added

- **Dynamic projects** stored in MySQL, created from the Stack sidebar (`+`).
- **Team / friends**: invite **accepted friends** to a project; members listed in the sidebar and as avatars on the board.
- **Kanban board**: tasks per project, drag-and-drop between columns; **New Task** creates rows in the database.
- **Auth on the UI**: workspace header and Kanban top bar use the logged-in user from **`/auth/me.php`** (`useProfile()`).

## Main files (Admin)

| Area | Path |
|------|------|
| Stack sidebar | `src/pages/Dashboard/Stack/index.tsx` |
| Kanban board | `src/pages/Dashboard/Stack/KanbanBoard.tsx` |
| Count refresh event | `src/pages/Dashboard/Stack/stackEvents.ts` |
| API client | `src/api/projects.ts` |
| URL constants | `src/api/urls.ts` (paths under `/api/projects/`) |
| Selected project (Redux) | `src/redux/layout/` (`stackProjectId`, `setStackProjectId`) |

## Backend (PHP)

| Purpose | Path |
|---------|------|
| Tables + helpers | `backend/api/projects/_bootstrap.php` |
| List / create / board / members / invite / tasks | `backend/api/projects/*.php` |

## Deploy Admin to XAMPP htdocs

1. Follow **`docs/XAMPP-DASHBOARD.md`**.
2. Build with **`.env.production`** (`VITE_BACKEND_URL`, optional **`VITE_PUBLIC_BASE`** for a subfolder).
3. Copy the **`build/`** folder contents into e.g. `C:\xampp\htdocs\devflow-admin\`.

Updating the dashboard later: change the files above, run **`npm run build`**, and copy **`build/`** again into `devflow-admin` (overwrite).

## Environment variables (Admin)

| Variable | Role |
|----------|------|
| `VITE_BACKEND_URL` | PHP backend root (e.g. `http://localhost/devflow-backend/backend`) |
| `VITE_PUBLIC_BASE` | Vite asset base for subfolder deploy (e.g. `/devflow-admin/`) |

Last updated: aligns with Stack + projects API and XAMPP deployment docs in this repo.
