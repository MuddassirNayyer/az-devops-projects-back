# ADO Backup

A minimal Next.js app that downloads all Azure DevOps repositories — and optionally a
full MongoDB dump — as a single ZIP. Deploy to Vercel, set the environment variables,
and you're done.

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
| `MONGODB_URI` | MongoDB connection string (optional — omit to disable DB backup) |

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

- All credentials live **only on the server** — never sent to the browser
- `/api/projects` — fetches all projects + repos using your PAT server-side
- `/api/download` — proxies the ZIP download through the server (PAT never exposed)
- The UI auto-selects all repos on load — just click **Take Backup Now**

The ZIP looks like this:

```
repos/<project>/<repo>.zip
database/<dbname>/<collection>.bson.gz
database/<dbname>/<collection>.metadata.json.gz
DATABASE-RESTORE.md
```

---

## Database backup

Set `MONGODB_URI` and an **Include database backup** toggle appears in the UI. The
database backed up is the one named in the URI path (`.../ccf?...` backs up `ccf`).
If `MONGODB_URI` is unset the toggle is hidden and nothing changes.

The dump is produced by the MongoDB Node driver rather than the `mongodump` binary,
which isn't available in Vercel's serverless runtime. Output is byte-identical to
`mongodump --gzip` (verified by diffing against the real tool), so it restores with
the standard tooling:

```bash
mongorestore --gzip --uri="<CONNECTION-STRING>" database/
```

Full instructions ship inside every backup as `DATABASE-RESTORE.md`.

Notes:
- Documents are read with the driver's `raw` option, so the original BSON bytes go
  straight to disk — types like `Decimal128`, `ObjectId` and dates survive exactly.
- Reads use `secondaryPreferred`, so backups don't compete with the primary.
- Collections are dumped independently; one failure won't abort the rest. Failures
  are reported in the UI log and listed in `DATABASE-RESTORE.md`.
- The whole dump is assembled in function memory, so this suits small-to-medium
  databases. Past a few hundred MB, move to streaming into object storage instead.
