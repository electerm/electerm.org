// Asset filtering for /data/electerm-github-release.json?src=<name>.
//
// Shared by the Cloudflare Worker (src/worker.js) and the local dev server
// (bin/dev-server.js) so both resolve a `src` query identically.
//
// Published assets are named "<product>-<version>-<platform><ext>", e.g.
//   electerm-5.5.15-win-arm64.tar.gz
//   electerm-5.5.15-linux-x86_64-legacy.AppImage
//   electerm-android-arm64-v8a-5.5.15.apk
// A client asks for the platform part it runs, so `?src=win-arm64.tar.gz`
// has to resolve to the first of those.

// Version-less, product-less key of an asset name:
//   "electerm-5.5.15-win-arm64.tar.gz"        -> "win-arm64.tar.gz"
//   "electerm-android-arm64-v8a-5.5.15.apk"   -> "android-arm64-v8a.apk"
export function assetKey (name) {
  return String(name || '')
    .replace(/-v?\d+\.\d+\.\d+/g, '')
    .replace(/^electerm-/, '')
    .toLowerCase()
}

// Returns the assets matching `src`, or the whole list when `src` is empty.
//
// Matching is tiered, most specific first: full file name, then the version-less
// key (what clients actually send), then a trailing match (e.g. "?src=x64.dmg").
// The first tier that produces a hit wins, so a precise query is never widened
// by a later, looser one. An unmatched `src` returns [] — the release metadata
// is still returned, the client just learns it has no asset in this release.
export function filterAssets (assets, src) {
  const list = Array.isArray(assets) ? assets.filter(a => a && a.name) : []
  const query = String(src || '').trim().toLowerCase()
  if (!query) return list
  const tiers = [
    a => a.name.toLowerCase() === query,
    a => assetKey(a.name) === query,
    a => a.name.toLowerCase().endsWith(query)
  ]
  for (const matches of tiers) {
    const hits = list.filter(matches)
    if (hits.length) return hits
  }
  return []
}
