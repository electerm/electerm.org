// Cloudflare Worker for electerm.org
//
// Static assets are served DIRECTLY by the Workers asset runtime
// (run_worker_first = false in wrangler.toml). The asset runtime applies
// src/static/_headers (security + Access-Control-Allow-Origin) to every asset
// response — that is what lets https://cloud.electerm.org load /electerm.glb.
//
// This worker therefore only runs for NON-asset routes:
//   - the legacy domain redirect (electerm.html5beta.com -> electerm.org)
//   - /api/country (returns JSON; adds first-party CORS so other
//     *.electerm.org subdomains can call it)

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }

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

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    const { pathname } = url

    // Legacy domain -> electerm.org, keeping path and query
    if (url.hostname === 'electerm.html5beta.com') {
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

    // Anything else falls through to static assets (the runtime serves
    // public/404.html with a 404 status via not_found_handling).
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    return new Response('Not Found', { status: 404, headers: SECURITY_HEADERS })
  }
}
