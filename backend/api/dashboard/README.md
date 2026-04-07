# Dashboard API (PHP)

This folder documents and exposes the **Stack / Kanban** backend that lives under `../projects/`.

## Files

| File | Purpose |
|------|---------|
| `index.php` | `GET` — JSON list of all dashboard-related endpoints (no auth). |
| `ping.php` | `GET` — `{ ok: true }` for connectivity tests (no auth). |

## Implementation

- **Business logic:** `../projects/*.php` (list, create, board, tasks, invite, etc.).
- **Tables:** created automatically on first request via `../projects/_bootstrap.php`.
- **Auth:** PHP session (same cookie as `auth/me.php`); send `credentials: 'include'` from the React app.
- **CORS:** `../../cors_helpers.php` — allows `frontend_base_url` and local dev (`localhost` / `127.0.0.1`).

## Configure

1. MySQL running; `config.php` / `config.local.php` with `db_*` settings.
2. `frontend_base_url` must match where you open the Admin app (e.g. `http://localhost:3000` for Vite).

## Quick test

Open in the browser (same machine as XAMPP):

- `http://localhost/devflow-backend/backend/api/dashboard/ping.php`  
  → should return JSON `{"ok":true,...}`

Then open:

- `http://localhost/devflow-backend/backend/api/dashboard/index.php`  
  → full endpoint manifest.

If `list.php` still fails from the SPA, check DevTools → Network for CORS and confirm `VITE_BACKEND_URL` matches the backend base URL (no trailing slash).
