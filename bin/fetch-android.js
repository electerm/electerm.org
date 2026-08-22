import fs from 'fs'
import { resolve } from 'path'
import { cwd } from './common.js'
import axios from 'axios'

// Sync electerm-android (APK) releases into per-version files under
// src/release-data-android/<version>.json, keyed by the SAME version tag as
// the desktop electerm release. Android releases whose version does NOT match
// any desktop release are ignored (no file is written), so they never create a
// standalone release page.
//
// Robustness notes:
//  - An android release may not exist yet for a given desktop version -> 404 is
//    treated as "nothing to do" (skip, do not error).
//  - The [electerm-release] repository_dispatch may be fired by either the
//    desktop or the android repo. We always key off the desktop version that
//    already exists in src/release-data, so both origins are handled.
//  - If a desktop data file is missing for a version we try to fetch it once;
//    if even that 404s the version is android-only and is ignored.

const dir = resolve(cwd, 'src/release-data')
const androidDir = resolve(cwd, 'src/release-data-android')
fs.mkdirSync(dir, { recursive: true })
fs.mkdirSync(androidDir, { recursive: true })

const token = process.env.GITHUB_TOKEN
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'electerm.org-release-sync'
}
if (token) headers.Authorization = `Bearer ${token}`

const DESKTOP_API = 'https://api.github.com/repos/electerm/electerm'
const ANDROID_API = 'https://api.github.com/repos/electerm/electerm-android'

// Keep only .apk assets — those are what the download UI renders.
// No body/date: the desktop release already provides changelog + date, and
// we only ever merge these assets into the matching desktop version.
function toAndroidData (release) {
  const assets = (release.assets || [])
    .filter(a => a.name && a.name.endsWith('.apk'))
    .map(a => ({
      name: a.name,
      url: a.browser_download_url,
      size: a.size,
      type: a.content_type
    }))
  return {
    version: release.tag_name,
    assets
  }
}

function writeAndroidJson (data) {
  const file = resolve(androidDir, data.version + '.json')
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
  return file
}

// Fetch a single android release by tag. Returns parsed data, or null if it
// does not exist (404) or has no apk assets. Throws on other errors.
async function fetchAndroidByTag (tag) {
  try {
    const { data } = await axios.get(`${ANDROID_API}/releases/tags/${encodeURIComponent(tag)}`, { headers })
    const out = toAndroidData(data)
    return out.assets.length ? out : null
  } catch (err) {
    if (err.response && err.response.status === 404) return null
    throw err
  }
}

// Ensure the desktop data file for `version` exists. Returns true if a desktop
// release is/was available, false if the version is android-only (no matching
// desktop release) and must be ignored.
async function ensureDesktop (version) {
  const desktopFile = resolve(dir, version + '.json')
  if (fs.existsSync(desktopFile)) return true
  try {
    const { data } = await axios.get(`${DESKTOP_API}/releases/tags/${encodeURIComponent(version)}`, { headers })
    const assets = (data.assets || []).map(a => ({
      name: a.name,
      url: a.browser_download_url,
      size: a.size,
      type: a.content_type
    }))
    const body = (data.body || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const out = {
      version: data.tag_name,
      date: (data.published_at || data.created_at || '').slice(0, 10),
      body,
      assets
    }
    fs.writeFileSync(desktopFile, JSON.stringify(out, null, 2) + '\n')
    console.log('✅ Fetched missing desktop data for', version)
    return true
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.log(`ℹ️ Skip ${version}: no matching electerm desktop release (android-only) — ignored.`)
      return false
    }
    throw err
  }
}

// Merge the android release for a single desktop version (if present).
async function mergeOne (version) {
  const ok = await ensureDesktop(version)
  if (!ok) return false
  const androidFile = resolve(androidDir, version + '.json')
  if (fs.existsSync(androidFile)) {
    console.log(`ℹ️ Android data for ${version} already present; skip.`)
    return false
  }
  const android = await fetchAndroidByTag(version)
  if (!android) {
    console.log(`ℹ️ No android release for ${version} (or no apk assets); skip.`)
    return false
  }
  const file = writeAndroidJson(android)
  console.log(`✅ Wrote android data for ${version} (${android.assets.length} apk)`)
  return file
}

// Merge android for ALL desktop versions (backfill). Idempotent.
async function mergeAll () {
  const versions = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''))
  let count = 0
  for (const v of versions) {
    const ok = await mergeOne(v)
    if (ok) count++
  }
  console.log(`✅ Synced android data for ${count} version(s).`)
}

// Merge android for the most recent android releases that match an existing
// desktop version. Cheap (1 list call) — used on every dispatch.
async function mergeRecent (limit = 30) {
  let releases
  try {
    const { data } = await axios.get(`${ANDROID_API}/releases`, {
      headers,
      params: { per_page: limit, page: 1 }
    })
    releases = data
  } catch (err) {
    console.warn('⚠️ Could not list android releases:', err.message)
    return
  }
  let count = 0
  for (const r of releases) {
    const tag = r.tag_name
    const ok = await ensureDesktop(tag)
    if (!ok) continue
    const androidFile = resolve(androidDir, tag + '.json')
    if (fs.existsSync(androidFile)) continue
    const android = await fetchAndroidByTag(tag)
    if (!android) continue
    writeAndroidJson(android)
    console.log(`✅ Wrote android data for ${tag} (${android.assets.length} apk)`)
    count++
  }
  console.log(`✅ Synced android data for ${count} recent version(s).`)
}

async function main () {
  const arg = process.argv[2]
  if (arg === '--all') {
    await mergeAll()
  } else if (arg && !arg.startsWith('--')) {
    await mergeOne(arg)
  } else {
    await mergeRecent()
  }
}

main().catch(err => {
  console.error('❌ Failed to sync android releases:', err.message)
  process.exit(1)
})
