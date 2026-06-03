export const config = {
  api: {
    responseLimit: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { projectId, repoId, repoName, projectName } = req.query
  if (!projectId || !repoId) return res.status(400).json({ error: 'Missing projectId or repoId' })

  const org = process.env.ADO_ORG_URL?.replace(/\/$/, '')
  const pat = process.env.ADO_PAT

  if (!org || !pat) return res.status(500).json({ error: 'Server not configured.' })

  const headers = {
    Authorization: 'Basic ' + Buffer.from(':' + pat).toString('base64'),
  }

  // Try with defaultBranch first, then without (picks default automatically)
  const branch = req.query.branch?.replace('refs/heads/', '') || 'main'
  const urls = [
    `${org}/${projectId}/_apis/git/repositories/${repoId}/items/items?path=/&recursionLevel=full&includeContentMetadata=true&versionDescriptor.version=${branch}&$format=zip&api-version=7.0`,
    `${org}/${projectId}/_apis/git/repositories/${repoId}/items/items?path=/&recursionLevel=full&includeContentMetadata=true&$format=zip&api-version=7.0`,
  ]

  let upstream = null
  for (const url of urls) {
    const r = await fetch(url, { headers })
    if (r.ok) { upstream = r; break }
  }

  if (!upstream) {
    return res.status(404).json({ error: `Could not download repo: ${repoName}` })
  }

  const date = new Date().toISOString().slice(0, 10)
  const filename = `${projectName || projectId}_${repoName || repoId}_${date}.zip`

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

  const reader = upstream.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    res.write(Buffer.from(value))
  }
  res.end()
}
