import archiver from 'archiver'

export const config = {
  api: {
    responseLimit: false,
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const org = process.env.ADO_ORG_URL?.replace(/\/$/, '')
  const pat = process.env.ADO_PAT
  if (!org || !pat) return res.status(500).json({ error: 'Server not configured.' })

  const headers = {
    Authorization: 'Basic ' + Buffer.from(':' + pat).toString('base64'),
  }

  // Parse body manually since bodyParser is off
  const body = await new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => (data += chunk))
    req.on('end', () => { try { resolve(JSON.parse(data)) } catch (e) { reject(e) } })
    req.on('error', reject)
  })

  const { repos } = body // [{ projectId, projectName, repoId, repoName, branch }]
  if (!repos?.length) return res.status(400).json({ error: 'No repos provided' })

  const date = new Date().toISOString().slice(0, 10)
  const filename = `ado-backup-${date}.zip`

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

  const archive = archiver('zip', { zlib: { level: 1 } })
  archive.pipe(res)

  for (const { projectId, projectName, repoId, repoName, branch } of repos) {
    const cleanBranch = (branch || 'main').replace('refs/heads/', '')
    const urls = [
      `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&versionDescriptor.versionType=branch&versionDescriptor.version=${cleanBranch}&$format=zip&api-version=6.0`,
      `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&versionDescriptor.versionType=branch&versionDescriptor.version=master&$format=zip&api-version=6.0`,
      `${org}/${projectId}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&$format=zip&api-version=6.0`,
      `${org}/_apis/git/repositories/${repoId}/items?scopePath=/&recursionLevel=full&download=true&$format=zip&api-version=6.0`,
    ]

    let repoStream = null
    for (const url of urls) {
      try {
        const r = await fetch(url, { headers })
        if (r.ok) { repoStream = r.body; break }
        const txt = await r.text()
        if (txt.includes('Cannot find any branches') || txt.includes('GitItemNotFoundException')) break
      } catch (e) { continue }
    }

    if (!repoStream) continue // skip empty/failed repos silently

    const safeProjName = projectName.replace(/[^a-z0-9_\-]/gi, '_')
    const safeRepoName = repoName.replace(/[^a-z0-9_\-]/gi, '_')
    const entryName = `${safeProjName}/${safeRepoName}.zip`

    // Convert web stream to Node stream
    const { Readable } = await import('stream')
    const reader = repoStream.getReader()
    const nodeStream = new Readable({
      async read() {
        const { done, value } = await reader.read()
        if (done) this.push(null)
        else this.push(Buffer.from(value))
      }
    })

    archive.append(nodeStream, { name: entryName })
    await new Promise((resolve, reject) => {
      nodeStream.on('end', resolve)
      nodeStream.on('error', reject)
    })
  }

  await archive.finalize()
}
