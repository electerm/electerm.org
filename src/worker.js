// Cloudflare Worker for electerm.org
// The static site is served by Workers static assets (see wrangler.toml),
// only /api/* reaches this worker.
//
// Response headers (security + CORS) are set HERE in the worker, not in
// src/static/_headers. Two reasons:
//   1. The build copies assets with `cp -r src/static/*`, whose glob excludes
//      dotfiles, so `_headers`/`_redirects` were never even deployed.
//   2. With run_worker_first = true the asset runtime serves files via
//      env.ASSETS.fetch() and drops _headers rules anyway, while a Response
//      returned by the worker keeps its headers.

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

// Merge security headers + first-party CORS into a response.
function withResponseHeaders (request, response) {
  const headers = new Headers(response.headers)
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    headers.set(k, v)
  }

  const origin = request.headers.get('Origin')
  if (isFirstPartyOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')
    headers.set('Access-Control-Max-Age', '86400')
    headers.set('Vary', 'Origin')
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
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

    // CORS preflight for first-party subdomain requests
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin')
      if (isFirstPartyOrigin(origin)) {
        return new Response(null, {
          status: 204,
          headers: {
            ...SECURITY_HEADERS,
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
            Vary: 'Origin'
          }
        })
      }
    }

    // Country lookup for locale/cloud-ads logic (was api/country.js on Vercel).
    // cf-ipcountry is set by Cloudflare for every request.
    if (pathname === '/api/country') {
      const country = (request.headers.get('cf-ipcountry') || '').toUpperCase()
      return withResponseHeaders(
        request,
        new Response(JSON.stringify({ country }), { headers: jsonHeaders })
      )
    }

    // Everything else falls through to static assets. We wrap the asset
    // response to inject security + first-party CORS headers (see note at top).
    if (env.ASSETS) {
      return withResponseHeaders(request, await env.ASSETS.fetch(request))
    }

    return withResponseHeaders(
      request,
      new Response('Not Found', { status: 404 })
    )
  }
}
