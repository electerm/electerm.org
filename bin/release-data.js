import fs from 'fs'
import { resolve } from 'path'
import { cwd } from './common.js'
import { marked } from 'marked'

const dir = resolve(cwd, 'src/release-data')
const androidDir = resolve(cwd, 'src/release-data-android')

function formatBytes (bytes) {
  if (!bytes && bytes !== 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return (i === 0 ? n : n.toFixed(1)) + ' ' + units[i]
}

// --- Mirror URL helpers (mirrors data.js so release pages reuse download.pug) ---
function getSourceforgeUrl (url) {
  const arr = url.split('/')
  const len = arr.length
  return `https://master.dl.sourceforge.net/project/electerm.mirror/${arr[len - 2]}/${arr[len - 1]}?viasf=1`
}

function getCdnUrl (url) {
  return url.replace('github.com', 'r2.electerm.org')
}

function getR2Url (url, isAndroid) {
  const prefix = isAndroid ? '/r1/' : '/r/'
  return 'https://r2.electerm.org' + prefix + url.split('/').pop()
}

function isAndroidAsset (fileName, downloadUrl) {
  return fileName.endsWith('.apk') || downloadUrl.includes('electerm-android')
}

// Transform a flat list of release assets into the grouped shape that
// download.pug consumes (windows{x64,arm64,win7}, mac, linux{arches}, android).
function classifyAssets (rawAssets) {
  return (rawAssets || []).reduce((prev, curr) => {
    const androidFlag = isAndroidAsset(curr.name, curr.url)
    const nr = {
      name: curr.name,
      browser_download_url: curr.url,
      sourceforgeUrl: getSourceforgeUrl(curr.url),
      cdnUrl: getCdnUrl(curr.url),
      r2Url: getR2Url(curr.url, androidFlag),
      isAndroid: androidFlag
    }
    const cname = curr.name
    if (
      cname.includes('win') &&
      !cname.endsWith('.blockmap') &&
      !cname.includes('.appx') &&
      !cname.includes('loose')
    ) {
      if (cname.includes('installer') && cname.endsWith('.exe')) {
        nr.desc = 'Windows installer (recommended)'
      } else if (cname.endsWith('.exe') && !cname.includes('installer')) {
        nr.desc = 'Portable executable'
      } else if (cname.endsWith('.zip')) {
        nr.desc = 'Portable zip archive'
      } else if (cname.endsWith('.msi')) {
        nr.desc = 'Windows installer package'
      } else if (cname.includes('portable') && cname.endsWith('.tar.gz')) {
        nr.desc = 'Portable archive'
      } else if (cname.includes('win7')) {
        nr.desc = 'Legacy Windows 7 compatible'
      } else if (cname.endsWith('.tar.gz')) {
        nr.desc = 'Just extract and run'
      }
      let archType = ''
      if (cname.includes('arm64')) archType = 'arm64'
      else if (cname.includes('x64') || cname.includes('x86_64')) archType = 'x64'
      else if (cname.includes('win7')) archType = 'win7'
      else archType = 'x64'
      if (!prev.windows[archType]) prev.windows[archType] = { items: [] }
      prev.windows[archType].items.push(nr)
    } else if (cname.endsWith('.dmg')) {
      if (cname.includes('mac10')) nr.desc = 'for macOS 10.x'
      else if (cname.includes('arm64') || cname.includes('apple-silicon')) nr.desc = 'for Apple Silicon Macs (M1, M2, etc.)'
      else if (cname.includes('x64') || cname.includes('intel')) nr.desc = 'for Intel Macs'
      else nr.desc = 'macOS disk image'
      prev.mac.items.push(nr)
    } else if (cname.includes('linux')) {
      const isLegacy = cname.includes('-legacy')
      const isLoong64 = cname.includes('loong64')
      const isLoongarch64 = cname.includes('loongarch64')
      if (cname.endsWith('.rpm')) {
        nr.desc = isLegacy ? 'for Red Hat, Fedora... (glibc < 2.34)' : 'for Red Hat, Fedora...'
      } else if (cname.endsWith('.deb')) {
        if (isLoong64) {
          nr.desc = isLegacy ? 'for old world UOS/Kylin...' : 'for new world UOS/Kylin...'
        } else if (isLoongarch64) {
          nr.desc = isLegacy ? 'for old world Debian, Ubuntu... (loongarch64)' : 'for new world Debian, Ubuntu... (loongarch64)'
        } else {
          nr.desc = isLegacy ? 'for Debian, Ubuntu... (glibc < 2.34, like UOS/Kylin/Ubuntu 18)' : 'for Debian, Ubuntu...'
        }
      } else if (cname.endsWith('.snap')) {
        nr.desc = 'for all linux that support snap'
      } else if (cname.endsWith('.gz')) {
        if (isLoong64 || isLoongarch64) {
          nr.desc = isLegacy ? 'for old world loongarch, just extract' : 'for new world loongarch, just extract'
        } else {
          nr.desc = isLegacy ? 'for all linux, just extract (glibc < 2.34)' : 'for all linux, just extract'
        }
      } else if (cname.endsWith('.AppImage')) {
        nr.desc = isLegacy ? 'for all linux, just run it (glibc < 2.34)' : 'for all linux, just run it'
      }
      let archType = ''
      if (cname.includes('x64') || cname.includes('x86') || cname.includes('amd64')) archType = 'x86_64'
      else if (cname.includes('arm64') || cname.includes('aarch64')) archType = 'arm64'
      else if (cname.includes('armv7l')) archType = 'armv7'
      else if (cname.includes('loong64') || cname.includes('loongarch64')) archType = 'loong64'
      const category = isLegacy ? `${archType}_legacy` : archType
      if (!prev.linux[category]) prev.linux[category] = { items: [] }
      prev.linux[category].items.push(nr)
    } else if (androidFlag) {
      if (cname.includes('arm64-v8a') || cname.includes('arm64')) nr.desc = 'for ARM64 devices (most modern phones)'
      else if (cname.includes('armeabi-v7a') || cname.includes('armv7') || cname.includes('arm-')) nr.desc = 'for older ARM devices'
      else if (cname.includes('x86_64') || cname.includes('x64')) nr.desc = 'for x86_64 devices (emulators, some tablets)'
      else if (cname.includes('x86')) nr.desc = 'for x86 devices'
      else if (cname.includes('universal')) nr.desc = 'universal (all architectures)'
      else nr.desc = 'Android APK'
      prev.android.items.push(nr)
    }
    return prev
  }, {
    linux: {
      x86_64: { items: [] },
      x86_64_legacy: { items: [] },
      arm64: { items: [] },
      arm64_legacy: { items: [] },
      armv7: { items: [] },
      armv7_legacy: { items: [] },
      loong64: { items: [] },
      loong64_legacy: { items: [] }
    },
    mac: { items: [] },
    windows: { x64: { items: [] }, arm64: { items: [] }, win7: { items: [] } },
    android: { items: [] }
  })
}

const OS_LABELS = { windows: 'Windows', mac: 'macOS', linux: 'Linux', android: 'Android' }
const OS_ORDER = ['windows', 'mac', 'linux', 'android']

function groupHasItems (group) {
  if (!group) return false
  if (Array.isArray(group.items)) return group.items.length > 0
  return Object.values(group).some(g => g && g.items && g.items.length > 0)
}

function firstArch (group, order) {
  for (const a of order) {
    if (group[a] && group[a].items && group[a].items.length) return a
  }
  return order[0]
}

function loadOne (file) {
  const raw = fs.readFileSync(file, 'utf-8')
  const d = JSON.parse(raw)
  if (!d || !d.version) return null
  // Derive a display name (not stored in the JSON to keep it minimal).
  d.name = d.name || ('electerm ' + d.version)
  // Render the markdown changelog to HTML once, at load time.
  d.bodyHtml = d.body ? marked.parse(d.body) : ''
  if (Array.isArray(d.assets)) {
    // Merge electerm-android APK assets for the same version (keyed by the
    // desktop version tag) so the Android tab appears on the release page.
    const androidFile = resolve(androidDir, d.version + '.json')
    if (fs.existsSync(androidFile)) {
      try {
        const ad = JSON.parse(fs.readFileSync(androidFile, 'utf-8'))
        const have = new Set(d.assets.map(a => a.name))
        for (const a of (ad.assets || [])) {
          if (!have.has(a.name)) {
            d.assets.push({ name: a.name, url: a.url, size: a.size, type: a.type })
            have.add(a.name)
          }
        }
      } catch (e) {
        // Corrupt android file — ignore, the desktop data is still valid.
      }
    }
    d.assets.forEach(a => {
      a.sizeHuman = formatBytes(a.size)
    })
    // Group assets into the download.pug shape (windows/mac/linux/android).
    d.downloadAssets = classifyAssets(d.assets)
    d.downloadTabs = OS_ORDER.filter(os => groupHasItems(d.downloadAssets[os]))
    d.downloadActiveOs = d.downloadTabs[0] || 'windows'
    d.downloadActiveArch = {
      windows: firstArch(d.downloadAssets.windows, ['x64', 'arm64', 'win7']),
      linux: firstArch(d.downloadAssets.linux, ['x86_64', 'x86_64_legacy', 'arm64', 'arm64_legacy', 'armv7', 'armv7_legacy', 'loong64', 'loong64_legacy'])
    }
  } else {
    d.downloadAssets = classifyAssets([])
    d.downloadTabs = []
    d.downloadActiveOs = 'windows'
  }
  return d
}

export function getAllReleases () {
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  const arr = files.map(f => loadOne(resolve(dir, f))).filter(Boolean)
  arr.sort((a, b) => new Date(b.date) - new Date(a.date))
  return arr
}

export function getRelease (version) {
  const file = resolve(dir, version + '.json')
  if (!fs.existsSync(file)) return null
  return loadOne(file)
}

export function getReleasesByYear () {
  const all = getAllReleases()
  const map = new Map()
  for (const r of all) {
    const year = String(new Date(r.date).getFullYear())
    if (!map.has(year)) map.set(year, [])
    map.get(year).push(r)
  }
  return Array.from(map.entries())
    .map(([year, items]) => ({ year, items }))
    .sort((a, b) => b.year.localeCompare(a.year))
}

export { OS_LABELS }

export default {
  getAllReleases,
  getRelease,
  getReleasesByYear
}
