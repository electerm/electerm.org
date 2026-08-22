import fs from 'fs'
import { resolve } from 'path'
import { cwd } from './common.js'
import axios from 'axios'

const dir = resolve(cwd, 'src/release-data')
fs.mkdirSync(dir, { recursive: true })

const token = process.env.GITHUB_TOKEN
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'electerm.org-release-sync'
}
if (token) headers.Authorization = `Bearer ${token}`

const API = 'https://api.github.com/repos/electerm/electerm/releases'

function toReleaseData (release) {
  const assets = (release.assets || []).map(a => ({
    name: a.name,
    url: a.browser_download_url,
    size: a.size,
    type: a.content_type
  }))
  const body = (release.body || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return {
    version: release.tag_name,
    date: (release.published_at || release.created_at || '').slice(0, 10),
    body,
    assets
  }
}

function writeJson (release) {
  const data = toReleaseData(release)
  const file = resolve(dir, data.version + '.json')
  // Do not overwrite with a draft if we already have a real release file.
  if (release.draft && fs.existsSync(file)) return null
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
  return file
}

async function fetchLatest () {
  const { data } = await axios.get(`${API}/latest`, { headers })
  const file = writeJson(data)
  if (file) {
    console.log('✅ Wrote', file)
  } else {
    console.log('ℹ️ Latest release already present; nothing to do.')
  }
}

async function fetchAll () {
  let page = 1
  let count = 0
  const seen = new Set()
  while (true) {
    const { data } = await axios.get(API, {
      headers,
      params: { per_page: 100, page }
    })
    if (!data.length) break
    for (const release of data) {
      if (release.draft) continue
      if (seen.has(release.tag_name)) continue
      seen.add(release.tag_name)
      const file = writeJson(release)
      if (file) count++
    }
    page++
    if (page > 20) break // safety: 2000 releases max
  }
  console.log(`✅ Synced ${count} release(s) into ${dir}`)
}

async function main () {
  const mode = process.argv[2]
  if (mode === '--all') {
    await fetchAll()
  } else {
    await fetchLatest()
  }
}

main().catch(err => {
  console.error('❌ Failed to fetch releases:', err.message)
  process.exit(1)
})
