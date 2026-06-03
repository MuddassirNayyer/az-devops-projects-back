export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { projectId, repoId, repoName, projectName, branch } = req.query;
  if (!projectId || !repoId)
    return res.status(400).json({ error: "Missing projectId or repoId" });

  const org = process.env.ADO_ORG_URL?.replace(/\/$/, "");
  const pat = process.env.ADO_PAT;

  if (!org || !pat)
    return res.status(500).json({ error: "Server not configured." });

  const headers = {
    Authorization: "Basic " + Buffer.from(":" + pat).toString("base64"),
  };

  const cleanBranch = (branch || "main").replace("refs/heads/", "");

  // Correct ADO zip endpoint — tries specific branch first, then falls back to repo default
  const urls = [
    // Archive zip endpoint — most reliable for full repo download
    `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&versionDescriptor.versionType=branch&versionDescriptor.version=${cleanBranch}&$format=zip&api-version=6.0`,
    `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&versionDescriptor.versionType=branch&versionDescriptor.version=master&$format=zip&api-version=6.0`,
    `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&$format=zip&api-version=6.0`,
    // Alternative: use the zip archive endpoint directly
    `${org}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&$format=zip&api-version=6.0`,
  ];

  let upstream = null;
  let lastStatus = 0;
  let lastBody = "";

  for (const url of urls) {
    try {
      const r = await fetch(url, { headers });
      if (r.ok) {
        upstream = r;
        break;
      }
      lastStatus = r.status;
      lastBody = await r.text();
    } catch (e) {
      lastBody = e.message;
    }
  }

  if (!upstream) {
    // Check if it's an empty repo (no branches/commits)
    if (
      lastBody.includes("Cannot find any branches") ||
      lastBody.includes("GitItemNotFoundException") ||
      lastStatus === 404
    ) {
      return res.status(204).end();
    }
    console.error(
      `Download failed for ${repoName}: ${lastStatus} — ${lastBody}`,
    );
    return res.status(500).json({
      error: `Could not download repo: ${repoName}`,
      detail: `${lastStatus}: ${lastBody.slice(0, 200)}`,
    });
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `${(projectName || projectId).replace(/[^a-z0-9_\-]/gi, "_")}_${(repoName || repoId).replace(/[^a-z0-9_\-]/gi, "_")}_${date}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}
