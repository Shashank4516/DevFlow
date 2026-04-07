# Stack dashboard (copy for XAMPP / backend tree)

This folder is a **copy** of `Admin/src/pages/Dashboard/Stack/` so the React Stack UI sources live **next to** the PHP API under `backend/api/` (e.g. when you deploy to `C:\xampp\htdocs\devflow-backend\backend\api\stack-dashboard\`).

- **Canonical source for builds:** edit and build from **`Admin/src/pages/Dashboard/Stack/`** in the DevFlow repo.
- **PHP endpoints** for Stack: `backend/api/projects/` (not in this folder).

To refresh this copy after changing the Admin Stack files, from the repo root:

```powershell
Copy-Item -Path "Admin\src\pages\Dashboard\Stack\*" -Destination "backend\api\stack-dashboard\" -Force
```

Apache does not execute these `.tsx` files; they are for **reference / backup / transfer** alongside the API on the server.
