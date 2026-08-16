import { buildZip } from "../../lib/zip";
import { dumpDatabase } from "../../lib/mongo-dump";

export const config = {
  api: {
    responseLimit: false,
    bodyParser: true,
  },
  maxDuration: 300,
};

async function fetchRepos(org, headers, repos) {
  const results = await Promise.all(
    repos.map(async ({ projectId, projectName, repoId, repoName, branch }) => {
      const cleanBranch = (branch || "main").replace("refs/heads/", "");
      const urls = [
        `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&versionDescriptor.versionType=branch&versionDescriptor.version=${cleanBranch}&$format=zip&api-version=6.0`,
        `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&versionDescriptor.versionType=branch&versionDescriptor.version=master&$format=zip&api-version=6.0`,
        `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&$format=zip&api-version=6.0`,
        `${org}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&$format=zip&api-version=6.0`,
      ];
      for (const url of urls) {
        try {
          const r = await fetch(url, { headers });
          if (r.ok) {
            const buf = Buffer.from(await r.arrayBuffer());
            const safeName = `repos/${projectName.replace(/[^a-z0-9_\-]/gi, "_")}/${repoName.replace(/[^a-z0-9_\-]/gi, "_")}.zip`;
            return { name: safeName, buf };
          }
          const txt = await r.text();
          if (
            txt.includes("Cannot find any branches") ||
            txt.includes("GitItemNotFoundException")
          )
            return null;
        } catch (e) {
          continue;
        }
      }
      return null;
    }),
  );
  return results.filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { repos, includeDatabase } = req.body;
  const wantRepos = Boolean(repos?.length);
  const wantDatabase = Boolean(includeDatabase);

  if (!wantRepos && !wantDatabase)
    return res.status(400).json({ error: "Nothing selected to back up." });

  const org = process.env.ADO_ORG_URL?.replace(/\/$/, "");
  const pat = process.env.ADO_PAT;
  if (wantRepos && (!org || !pat))
    return res.status(500).json({ error: "Server not configured." });

  const mongoUri = process.env.MONGODB_URI;
  if (wantDatabase && !mongoUri)
    return res
      .status(500)
      .json({ error: "MONGODB_URI is not configured on the server." });

  const entries = [];
  let dbStats = null;

  try {
    if (wantRepos) {
      const headers = {
        Authorization: "Basic " + Buffer.from(":" + pat).toString("base64"),
      };
      entries.push(...(await fetchRepos(org, headers, repos)));
    }

    if (wantDatabase) {
      const dump = await dumpDatabase(mongoUri);
      entries.push(...dump.entries);
      dbStats = dump.stats;
    }
  } catch (e) {
    return res.status(500).json({ error: `Backup failed: ${e.message}` });
  }

  if (!entries.length)
    return res.status(404).json({ error: "Nothing could be backed up." });

  const zipBuf = buildZip(entries);

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="ado-backup-${date}.zip"`,
  );
  res.setHeader("Content-Length", zipBuf.length);
  // Surfaced in the UI log so a partial DB dump is visible rather than silent.
  if (dbStats)
    res.setHeader(
      "X-Backup-Db",
      JSON.stringify({
        db: dbStats.dbName,
        collections: dbStats.collections,
        failed: dbStats.failed.length,
      }),
    );
  res.end(zipBuf);
}
