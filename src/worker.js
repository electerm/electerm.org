// Cloudflare Worker for electerm.org
//
// Static assets are served DIRECTLY by the Workers asset runtime
// (run_worker_first is unset/false for asset paths in wrangler.toml). The asset
// runtime applies src/static/_headers (security + Access-Control-Allow-Origin)
// to every asset response — that is what lets https://cloud.electerm.org load
// /electerm.glb.
//
// This worker therefore only runs for:
//   - /api/country (returns JSON; adds first-party CORS so other
//     *.electerm.org subdomains can call it)
//   - /data/electerm-github-release.json, the ONLY asset path listed in
//     run_worker_first, because it takes a ?src=<asset-name> query. The asset
//     runtime ignores query strings, so without the worker it would always
//     return all ~55 assets instead of the one the electerm app asks for.
//
// NOTE: electerm.html5beta.com -> electerm.org is handled by a Cloudflare
// Page Rule at the edge, before requests reach this worker.

import { filterAssets } from './release-asset-filter.js'

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }

const RELEASE_PATH = '/data/electerm-github-release.json'

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}

// True only for electerm.org or any *.electerm.org subdomain.
function isFirstPartyOrigin (origin) {
  if (!origin) return false
  try {
    const host = new URL(origin).hostname
    return host === 'electerm.org' || host.endsWith('.electerm.org')
  } catch {
    return false
  }
}

function corsHeaders (origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  }
}

// src/static/_headers is applied by the asset runtime, which is bypassed for
// paths listed in run_worker_first. Anything this worker serves from an asset
// therefore has to carry those headers itself.
function assetHeaders (extra) {
  return {
    ...SECURITY_HEADERS,
    'Access-Control-Allow-Origin': '*',
    ...extra
  }
}

// Parsed release document, memoised per isolate and invalidated by the asset
// ETag. The file only changes when a new release is deployed, so the JSON.parse
// cost is paid once per isolate instead of once per request.
let releaseMemo = { etag: null, data: null }

async function readRelease (assetResponse) {
  const etag = assetResponse.headers.get('etag')
  if (etag && releaseMemo.etag === etag) return releaseMemo.data
  const data = await assetResponse.json()
  releaseMemo = { etag, data }
  return data
}

// /data/electerm-github-release.json[?src=win-arm64.tar.gz]
//
// Without `src` the published file is streamed through untouched. With `src`
// only the matching entries stay in release.assets, so a client that knows its
// own build does not download (or parse) the whole 50+ asset list.
async function handleRelease (request, env, url) {
  // Keep the incoming method so a HEAD probe gets a bodyless response with
  // correct metadata.
  const assetResponse = await env.ASSETS.fetch(
    new Request(url.origin + RELEASE_PATH, { method: request.method })
  )
  const headers = assetHeaders({
    'content-type': jsonHeaders['content-type'],
    'cache-control':
      assetResponse.headers.get('cache-control') || 'public, max-age=300'
  })
  const src = (url.searchParams.get('src') || '').trim()
  // Nothing to filter (or a HEAD probe): pass the asset response straight
  // through — no parse, no re-serialise.
  if (!assetResponse.ok || !src || request.method !== 'GET') {
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      headers
    })
  }
  const data = (await readRelease(assetResponse)) || {}
  const release = data.release || {}
  const body = JSON.stringify({
    ...data,
    release: { ...release, assets: filterAssets(release.assets, src) }
  })
  return new Response(body, { headers })
}

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    const { pathname } = url

    // www.electerm.org -> electerm.org (301). This also fixes the 522 on www:
    // www had no Worker route so Cloudflare fell through to a dead origin.
    // Once www is attached as a Worker custom domain, this redirect sends
    // everything to the apex, preserving path + query.
    if (url.hostname === 'www.electerm.org') {
      url.hostname = 'electerm.org'
      return Response.redirect(url.toString(), 301)
    }

    // CORS preflight for first-party subdomain requests to /api/*
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin')
      if (isFirstPartyOrigin(origin)) {
        return new Response(null, {
          status: 204,
          headers: { ...SECURITY_HEADERS, ...corsHeaders(origin) }
        })
      }
    }

    // Country lookup for locale/cloud-ads logic (was api/country.js on Vercel).
    // cf-ipcountry is set by Cloudflare for every request.
    if (pathname === '/api/country') {
      const country = (request.headers.get('cf-ipcountry') || '').toUpperCase()
      const origin = request.headers.get('Origin')
      const headers = { ...jsonHeaders, ...SECURITY_HEADERS }
      if (isFirstPartyOrigin(origin)) Object.assign(headers, corsHeaders(origin))
      return new Response(JSON.stringify({ country }), { headers })
    }

    // Release info for the electerm app. Intercepted because of ?src=.
    if (pathname === RELEASE_PATH) {
      return handleRelease(request, env, url)
    }

    // Anything else falls through to static assets (the runtime serves
    // public/404.html with a 404 status via not_found_handling).
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    return new Response('Not Found', { status: 404, headers: SECURITY_HEADERS })
  }
}
