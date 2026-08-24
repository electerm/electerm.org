// Cloudflare Worker for electerm.org
// The static site is served by Workers static assets (see wrangler.toml),
// only /api/* reaches this worker.
// CORS for static assets is set in src/static/_headers (Cloudflare's asset
// runtime ignores worker-added headers on asset responses).

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    const { pathname } = url

    // Legacy domain -> electerm.org, keeping path and query
    if (url.hostname === 'electerm.html5beta.com') {
      url.hostname = 'electerm.org'
      return Response.redirect(url.toString(), 301)
    }

    // Country lookup for locale/cloud-ads logic (was api/country.js on Vercel).
    // cf-ipcountry is set by Cloudflare for every request.
    if (pathname === '/api/country') {
      const country = (request.headers.get('cf-ipcountry') || '').toUpperCase()
      return new Response(JSON.stringify({ country }), { headers: jsonHeaders })
    }

    // Unmatched /api/* paths fall through to assets (-> 404 page)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    return new Response('Not Found', { status: 404 })
  }
}
