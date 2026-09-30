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

// Key without any extension ("android-arm64-v8a.apk" -> "android-arm64-v8a",
// "win-arm64.tar.gz" -> "win-arm64"). Lets extension-less queries such as
// "?src=electerm-android-arm64-v8a" resolve to the real file.
export function assetStem (name) {
  return assetKey(name).split('.')[0]
}

// Returns the assets matching `src`, or the whole list when `src` is empty.
//
// Both sides are normalised with assetKey() first, so a query with/without
// the "electerm-" prefix, with/without the version, and with/without the
// extension all resolve, e.g. all of these match
// "electerm-android-arm64-v8a-5.5.25.apk":
//   "electerm-android-arm64-v8a-5.5.25.apk", "electerm-android-arm64-v8a.apk",
//   "android-arm64-v8a.apk", "electerm-android-arm64-v8a", "android-arm64-v8a"
//
// Matching is tiered, most specific first: full file name, then the
// version-less key, then the extension-less stem, then a trailing match
// (e.g. "?src=x64.dmg"). The first tier that produces a hit wins, so a
// precise query is never widened by a later, looser one. An unmatched `src`
// returns [] — the release metadata is still returned, the client just
// learns it has no asset in this release.
export function filterAssets (assets, src) {
  const list = Array.isArray(assets) ? assets.filter(a => a && a.name) : []
  const query = String(src || '').trim().toLowerCase()
  if (!query) return list
  const queryKey = assetKey(query)
  const queryStem = queryKey.split('.')[0]
  const tiers = [
    a => a.name.toLowerCase() === query,
    a => {
      const key = assetKey(a.name)
      return key === query || key === queryKey
    },
    // Extension-less query ("electerm-android-arm64-v8a", "win-arm64").
    // *.blockmap is updater metadata, never a download target, so it only
    // matches on the explicit tiers above — otherwise "?src=mac-arm64"
    // would also return the .dmg.blockmap sidecar.
    a => {
      if (!queryStem || a.name.toLowerCase().endsWith('.blockmap')) return false
      const stem = assetStem(a.name)
      return stem === queryKey || stem === queryStem
    },
    a => {
      const name = a.name.toLowerCase()
      const key = assetKey(a.name)
      return (
        name.endsWith(query) ||
        key.endsWith(query) ||
        (queryKey && (name.endsWith(queryKey) || key.endsWith(queryKey)))
      )
    }
  ]
  for (const matches of tiers) {
    const hits = list.filter(matches)
    if (hits.length) return hits
  }
  return []
}
