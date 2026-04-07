# XAMPP: DevFlow Admin + Stack dashboard

This guide deploys the **Admin** React app (including the **Stack** tab / Kanban under `src/pages/Dashboard/Stack/`) into **Apache `htdocs`**, next to the PHP backend.

## Folder layout (recommended)

| Path | Contents |
|------|----------|
| `C:\xampp\htdocs\devflow-backend\backend\` | PHP backend (copy from repo `backend/`) |
| `C:\xampp\htdocs\devflow-admin\` | Production build of the Admin app (`npm run build` output) |

Backend URL: `http://localhost/devflow-backend/backend`  
Admin URL: `http://localhost/devflow-admin/`

## 1. Backend in htdocs

1. Copy the repo folder **`backend`** to `C:\xampp\htdocs\devflow-backend\backend\` (so `auth/`, `api/`, `config.php` sit under `backend\`). From the repo root you can run: `powershell -ExecutionPolicy Bypass -File .\scripts\copy-backend-to-xampp.ps1`
2. Configure `config.local.php` (see `backend/README.md`).
3. Set **`frontend_base_url`** to your Admin URL, e.g. `http://localhost/devflow-admin` (no trailing slash is fine; match what you use in the browser).
4. Ensure **`mod_rewrite`** is enabled in Apache if you use `.htaccess` rules elsewhere.

Stack APIs live under:

- `http://localhost/devflow-backend/backend/api/projects/`

## 2. Build the Admin app for a subfolder

From the **`Admin`** directory:

1. Copy `.env.production.example` to `.env.production`.
2. Set **`VITE_BACKEND_URL`** to `http://localhost/devflow-backend/backend` (no trailing slash).
3. Set **`VITE_PUBLIC_BASE=/devflow-admin/`** so JS/CSS paths work when the site is not at the domain root.
4. Run:

```bash
npm run build
```

5. Copy **everything** inside `Admin/build/` into `C:\xampp\htdocs\devflow-admin\` (including **`index.html`**, **`assets/`**, and **`.htaccess`** from `public/`).

The **`public/.htaccess`** file enables client-side routes (e.g. `/auth-login`) to load `index.html` under Apache.

## 3. Google OAuth redirect (if you use Google login)

In Google Cloud Console, add **Authorized JavaScript origins** and redirect URIs for:

- Origin: `http://localhost/devflow-admin`
- Redirect: `http://localhost/devflow-backend/backend/auth/google/callback.php` (unchanged if backend URL stayed the same)

## 4. Verify

1. Open `http://localhost/devflow-admin/` — login as usual.
2. Open the **Stack** sidebar tab — projects load from MySQL via the PHP API.
3. If the page is blank, check the browser **Network** tab: asset URLs should start with `/devflow-admin/assets/...` when `VITE_PUBLIC_BASE` is set.

## Development without XAMPP

Use `npm run dev` (Vite) with `Admin/.env` pointing at `VITE_BACKEND_URL`; you do not need `VITE_PUBLIC_BASE` for the default dev server.

## See also

- `../DASHBOARD-UPDATE.md` — Stack dashboard feature summary and file list.
- `../../backend/README.md` — backend and MySQL setup.
