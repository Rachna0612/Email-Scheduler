# Setup Guide (Windows)

## Prerequisites

- Node.js 18+
- Docker Desktop (for Redis & PostgreSQL)

## Step 1: Start Docker

```powershell
cd C:\Users\amitr\OneDrive\Desktop\reachinbox
docker-compose up -d
```

## Step 2: Fix npm install issues (if any)

If `npm install` fails with EPERM/EFTYPE or esbuild errors (common on Windows with OneDrive):

1. **Close Cursor/VS Code** and any terminals using the project
2. **Delete** `node_modules` folders:
   ```powershell
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force backend\node_modules -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force frontend\node_modules -ErrorAction SilentlyContinue
   ```
3. **Delete** `package-lock.json` at the root
4. **Install backend and frontend separately** (avoids workspace hoisting issues):
   ```powershell
   cd backend
   npm install
   cd ..\frontend
   npm install
   ```

## Step 3: Prisma – use version 5

If `npx prisma generate` errors about "url is no longer supported", Prisma 7 was installed. Use Prisma 5:

```powershell
cd backend
npx prisma@5.22.0 generate
npx prisma@5.22.0 db push
```

Or after `npm install` in backend:

```powershell
npm run db:generate
npm run db:push
```

## Step 4: Configure .env

Edit `backend\.env` and add your Google OAuth credentials:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Step 5: Run the app

**Terminal 1 – Backend:**
```powershell
cd C:\Users\amitr\OneDrive\Desktop\reachinbox\backend
npm run dev
```

**Terminal 2 – Frontend:**
```powershell
cd C:\Users\amitr\OneDrive\Desktop\reachinbox\frontend
npm run dev
```

Then open http://localhost:3000

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `tsx is not recognized` | Run `npm install` in backend first. If needed: `npm install -g tsx` |
| Prisma "url no longer supported" | Use `npx prisma@5.22.0 generate` instead of `npx prisma generate` |
| esbuild EFTYPE on install | Delete node_modules, close IDE, retry. Or move project outside OneDrive |
| `cd frontend` fails from backend | Use `cd ..\frontend` (you're in backend folder) |
