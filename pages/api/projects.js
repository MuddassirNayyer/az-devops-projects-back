export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const org = process.env.ADO_ORG_URL?.replace(/\/$/, '')
  const pat = process.env.ADO_PAT

  if (!org || !pat) {
    return res.status(500).json({ error: 'ADO_ORG_URL and ADO_PAT environment variables are not configured.' })
  }

  const headers = {
    Authorization: 'Basic ' + Buffer.from(':' + pat).toString('base64'),
    'Content-Type': 'application/json',
  }

  try {
    const projRes = await fetch(`${org}/_apis/projects?$top=200&api-version=7.0`, { headers })
    if (!projRes.ok) {
      const text = await projRes.text()
      return res.status(projRes.status).json({ error: `Azure DevOps error: ${projRes.status} — ${text}` })
    }
    const projData = await projRes.json()
    const projects = projData.value || []

    const result = await Promise.all(
      projects.map(async (proj) => {
        try {
          const repoRes = await fetch(
            `${org}/${proj.id}/_apis/git/repositories?api-version=7.0`,
            { headers }
          )
          const repoData = repoRes.ok ? await repoRes.json() : { value: [] }
          return {
            id: proj.id,
            name: proj.name,
            state: proj.state,
            repos: (repoData.value || []).map((r) => ({
              id: r.id,
              name: r.name,
              defaultBranch: r.defaultBranch,
              remoteUrl: r.remoteUrl,
            })),
          }
        } catch {
          return { id: proj.id, name: proj.name, state: proj.state, repos: [] }
        }
      })
    )

    return res.status(200).json({ org, projects: result })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
