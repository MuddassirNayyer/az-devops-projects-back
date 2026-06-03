# ADO Backup

A minimal Next.js app that lets you download all Azure DevOps repositories as ZIP files.
Deploy to Vercel, set two environment variables, and you're done.

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "init"
gh repo create ado-backup --private --push
```

### 2. Import in Vercel

Go to https://vercel.com/new → Import your GitHub repo → click Deploy.

### 3. Set environment variables

In your Vercel project → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `ADO_ORG_URL` | `https://dev.azure.com/YOUR-ORG-NAME` |
| `ADO_PAT` | Your Personal Access Token |

Then go to Deployments → Redeploy (or push any commit) to apply.

---

## Create the PAT (Personal Access Token)

1. Go to `https://dev.azure.com/YOUR-ORG/_usersSettings/tokens`
2. Click **New Token**
3. Name: `ado-backup`
4. Expiration: **Custom defined → set far future date** (or select "Never expire" if available)
5. Scopes: **Code → Read**
6. Copy the token and paste it as `ADO_PAT` in Vercel

---

## Local development

```bash
npm install
```

Create `.env.local`:
```
ADO_ORG_URL=https://dev.azure.com/your-org
ADO_PAT=your-pat-here
```

```bash
npm run dev
```

Open http://localhost:3000

---

## How it works

- `ADO_ORG_URL` and `ADO_PAT` live **only on the server** — never sent to the browser
- `/api/projects` — fetches all projects + repos using your PAT server-side
- `/api/download` — proxies the ZIP download through the server (PAT never exposed)
- The UI auto-selects all repos on load — just click **Take Backup Now**
