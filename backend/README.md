# DevFlow PHP Backend (Google OAuth)

This folder is the PHP backend for Google sign-in. The React app redirects here to start login; after Google redirects back, the backend creates a session and sends the user to the React app.

## Setup

### 1. Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services** → **Credentials**.
2. Create **OAuth 2.0 Client ID** (Web application).
3. Set **Authorized redirect URI** to your callback URL, for example:
   - PHP built-in server: `http://localhost:8080/auth/google/callback.php`
   - XAMPP (backend in `htdocs/devflow-backend/backend`): `http://localhost/devflow-backend/backend/auth/google/callback.php`
   - Production: `https://your-api-domain.com/auth/google/callback.php`

### 2. Config

Copy the example config and set your values:

```bash
cp config.local.php.example config.local.php
```

Edit `config.local.php`:

- `google_client_id` – from Google Cloud Console
- `google_client_secret` – from Google Cloud Console
- `backend_base_url` – URL of this PHP backend (e.g. `http://localhost:8080` or `http://localhost/devflow-backend/backend` for XAMPP)
- `frontend_base_url` – URL of the React app (e.g. `http://localhost:5173`)

### 3. Run the backend

**Option A: PHP built-in server**

From the **DevFlow** folder (parent of `backend`):

```bash
php -S localhost:8080 -t backend
```

Or from inside `backend`:

```bash
php -S localhost:8080
```

Then:

- Start Google login: **http://localhost:8080/auth/google/index.php**
- Callback (used by Google): **http://localhost:8080/auth/google/callback.php**
- Current user (for React): **http://localhost:8080/auth/me.php**
- Logout: **http://localhost:8080/auth/logout.php**

**Option B: XAMPP**

1. Copy this entire `backend` folder into `C:\xampp\htdocs\devflow-backend\backend` (so `auth/`, `config.php`, etc. are inside `backend/`).
2. Start Apache in XAMPP Control Panel.
3. Backend URL: **http://localhost/devflow-backend/backend** (visiting it redirects to Google login).
4. In Google Console, set redirect URI to `http://localhost/devflow-backend/backend/auth/google/callback.php`.
5. In React app `.env`, set `VITE_BACKEND_URL=http://localhost/devflow-backend/backend`.

### Stack dashboard (projects / Kanban)

After copying the backend, these endpoints are available (session + MySQL; see `api/projects/`):

- `GET /api/projects/list.php` — projects for the logged-in user  
- `POST /api/projects/create.php` — create project  
- `GET /api/projects/board.php?project_id=` — Kanban tasks  
- `GET /api/projects/category_counts.php?project_id=` — sidebar counts  
- `GET /api/projects/members.php?project_id=` — teammates  
- `POST /api/projects/invite.php` — invite an accepted friend  
- `POST /api/projects/task_move.php` / `task_create.php` — board updates  

To serve the **Admin** app from XAMPP as well (e.g. `http://localhost/devflow-admin/`), build the React app and copy `Admin/build/` into `htdocs`, and set **`frontend_base_url`** in PHP config to that Admin URL. Step-by-step: **`Admin/docs/XAMPP-DASHBOARD.md`** and feature summary **`Admin/DASHBOARD-UPDATE.md`**.

### Dashboard API discovery & health

- **`GET /api/dashboard/index.php`** — JSON manifest of Stack/Kanban endpoints (no auth).
- **`GET /api/dashboard/ping.php`** — `{ "ok": true }` connectivity test (no auth).

CORS for the React app (including Vite on `http://localhost:3000` or `http://127.0.0.1:3000`) is handled by **`cors_helpers.php`**: it allows the configured **`frontend_base_url`** and any pairing of **localhost / 127.0.0.1 / ::1** so mixed loopback hosts do not cause **Network Error** in the browser.

## React app wiring

1. **“Continue with Google”** should redirect the browser to:  
   `http://localhost:8080/auth/google/index.php` (or your `backend_base_url` + `/auth/google/index.php`).

2. Add a route **/login/callback** in the React app. On that page, call `GET http://localhost:8080/auth/me.php` with `credentials: 'include'` so the session cookie is sent. If the response is 200, use the JSON (e.g. `basicDetails`) to update Redux and redirect to the dashboard.

3. **Logout** can redirect to `http://localhost:8080/auth/logout.php` so the PHP session is destroyed.

## CORS / cookies

For `auth/me.php` to receive the session cookie from the React app on another port (e.g. 5173), the backend sends `Access-Control-Allow-Origin` for your `frontend_base_url` and `Access-Control-Allow-Credentials: true`. Use `credentials: 'include'` in `fetch` from the React app.

## Docker (FrankenPHP + MySQLi) — recommended for Railway

The default Railpack PHP image may not load **mysqli**, which causes `Call to undefined function mysqli_connect()` on `/auth/google/callback.php`. This repo includes a **Dockerfile** that enables **mysqli** and **pdo_mysql**.

1. In Railway → your **backend** service → **Settings**:
   - **Root Directory:** `backend` (this folder).
   - **Builder:** **Dockerfile** (disable Nixpacks/Railpack if it was selected).
2. Ensure **`PORT`** is available (Railway sets it automatically). The `Caddyfile` listens on `{$PORT}`.
3. Set the same env vars as in the table below (especially `GOOGLE_*`, `DB_*`, `BACKEND_BASE_URL`, `FRONTEND_BASE_URL`).
4. Redeploy.

Local smoke test (from repo root):

```bash
docker build -t devflow-backend ./backend
docker run --rm -p 8080:8080 -e PORT=8080 ^
  -e GOOGLE_CLIENT_ID=... -e GOOGLE_CLIENT_SECRET=... ^
  -e DB_HOST=... -e DB_USER=... -e DB_PASSWORD=... -e DB_NAME=... -e DB_PORT=3306 ^
  devflow-backend
```

`config.local.php` is excluded from the image via `.dockerignore`; use env vars on Railway.

## Railway deployment

Set these environment variables in your Railway backend service:

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console OAuth credentials |
| `GITHUB_CLIENT_ID` | From GitHub OAuth App settings |
| `GITHUB_CLIENT_SECRET` | From GitHub OAuth App settings |
| `BACKEND_BASE_URL` | Your Railway backend public domain e.g. `https://xxx.up.railway.app` |
| `FRONTEND_BASE_URL` | Your Railway frontend public domain e.g. `https://yyy.up.railway.app` |
| `DB_HOST` | MySQL host (from Railway MySQL service) |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | MySQL database name |
| `DB_PORT` | MySQL port |

Also add the Railway backend callback URL to Google Cloud Console → OAuth Client → Authorized redirect URIs:
```
https://<BACKEND_BASE_URL>/auth/google/callback.php
```
