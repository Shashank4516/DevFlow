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

## React app wiring

1. **“Continue with Google”** should redirect the browser to:  
   `http://localhost:8080/auth/google/index.php` (or your `backend_base_url` + `/auth/google/index.php`).

2. Add a route **/login/callback** in the React app. On that page, call `GET http://localhost:8080/auth/me.php` with `credentials: 'include'` so the session cookie is sent. If the response is 200, use the JSON (e.g. `basicDetails`) to update Redux and redirect to the dashboard.

3. **Logout** can redirect to `http://localhost:8080/auth/logout.php` so the PHP session is destroyed.

## CORS / cookies

For `auth/me.php` to receive the session cookie from the React app on another port (e.g. 5173), the backend sends `Access-Control-Allow-Origin` for your `frontend_base_url` and `Access-Control-Allow-Credentials: true`. Use `credentials: 'include'` in `fetch` from the React app.

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
