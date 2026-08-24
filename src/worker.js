// Cloudflare Worker for electerm.org
// The static site is served by Workers static assets (see wrangler.toml),
// only /api/* reaches this worker.

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }

// Allow other *.electerm.org subdomains to load our static resources
// (e.g. https://electerm.org/electerm.glb) cross-origin. We reflect a
// first-party Origin instead of using "*" so non-electerm.org origins stay
// blocked.
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

// Attach CORS headers to a response when the request comes from a first-party
// subdomain.
function withCors (request, response) {
  const origin = request.headers.get('Origin')
  if (!isFirstPartyOrigin(origin)) return response

  const headers = new Headers(response.headers)
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    headers.set(k, v)
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
        return new Response(null, { status: 204, headers: corsHeaders(origin) })
      }
    }

    // Country lookup for locale/cloud-ads logic (was api/country.js on Vercel).
    // cf-ipcountry is set by Cloudflare for every request.
    if (pathname === '/api/country') {
      const country = (request.headers.get('cf-ipcountry') || '').toUpperCase()
      return withCors(
        request,
        new Response(JSON.stringify({ country }), { headers: jsonHeaders })
      )
    }

    // Everything else falls through to static assets (-> 404 page for misses)
    if (env.ASSETS) {
      return withCors(request, await env.ASSETS.fetch(request))
    }

    return new Response('Not Found', { status: 404 })
  }
}
