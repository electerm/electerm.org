/**
 * Animated banner for the "electerm-web" (self-hosted) blog post.
 *
 * Everything is generated here — no image, no GIF, no canvas: a browser
 * window with an address bar typing your-server:8082, the electerm app
 * inside the page (tab bar + terminal + footer), a docker chip feeding the
 * server, and a phone joining in are all plain DOM + CSS driven by one
 * requestAnimationFrame timeline.
 *
 * The story, in three beats:
 *   1. a docker chip boots the server, the browser window rises;
 *   2. the address bar types your-server:8082 and the electerm UI fades in
 *      inside the page — tabs, an ssh session, the footer;
 *   3. the auth lock clicks on and a phone slides in beside the browser:
 *      the same gateway, your own password, any device.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + browser stage (blog post page)
 *   data-eb-banner="card"  -> browser stage only      (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales to any container.
 */

const STYLE_ID = 'eb-web-style'

// One full pass of the story, in ms.
const PERIOD = 9000

const T = {
  browserFrom: 150,
  browserTo: 800,
  urlFrom: 900,
  urlTo: 2600,
  appFrom: 2600,
  appTo: 3400,
  lockFrom: 3800,
  lockTo: 4300,
  phoneFrom: 4400,
  phoneTo: 5400,
  cursorTo: 7000,
  fadeFrom: 8300,
  fadeTo: 8900
}

const URL_TEXT = 'your-server:8082'

const CSS = `
.eb-web {
  --eb-main: #121214;
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-primary: #08c;
  --eb-green: #19f9d8;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #0b1220 0%, #16233d 55%, #1b2f4b 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-web[data-variant="card"] { aspect-ratio: 16 / 9; }
.eb-web-stars { position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,.35) .12em, transparent .12em);
  background-size: 5em 5em; opacity: .35; }
.eb-web-head { position: absolute; left: 5em; right: 5em; top: 2.6em; pointer-events: none; z-index: 3; }
.eb-web[data-variant="card"] .eb-web-head { display: none; }
.eb-web-brand { display: inline-block; font-size: 1.3em; font-weight: 800; color: #7dd3fc; letter-spacing: .02em; }
.eb-web-h1 { margin: .25em 0 0; font-size: 3em; font-weight: 800; line-height: 1.05; letter-spacing: -.025em; color: #fff; }
.eb-web-h1 em { font-style: normal; color: #19f9d8; }
.eb-web-sub { margin: .5em 0 0; max-width: 58em; font-size: 1.4em; color: #94a3b8; }
.eb-web-stage { position: absolute; inset: 0; }
.eb-web[data-variant="hero"] .eb-web-stage { top: 14em; }
.eb-web-browser {
  position: absolute; left: 50%; bottom: 4em; width: 72em; max-width: 82%;
  transform: translateX(-50%);
  background: #0f172a; border: 1px solid rgba(148,163,184,.35);
  border-radius: 1.2em; overflow: hidden;
  box-shadow: 0 2em 5em rgba(0,0,0,.5);
}
.eb-web-bar { display: flex; align-items: center; gap: .8em; padding: .9em 1.2em; background: #1e293b; }
.eb-web-dots { display: flex; gap: .5em; }
.eb-web-dots i { width: .9em; height: .9em; border-radius: 50%; display: block; }
.eb-web-url {
  flex: 1; display: flex; align-items: center; gap: .6em;
  background: #0b1220; border: 1px solid rgba(148,163,184,.25);
  border-radius: .7em; padding: .45em 1em; color: #e2e8f0;
  font-size: 1.25em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  min-height: 2.1em;
}
.eb-web-lock {
  display: inline-flex; align-items: center; gap: .35em;
  font-size: 1em; font-weight: 700; color: #04121f;
  background: #19f9d8; border-radius: 999px; padding: .2em .8em;
}
.eb-web-caret { display: inline-block; width: .55em; height: 1.15em; background: #7dd3fc; vertical-align: -0.15em; animation: eb-web-blink 1s steps(1) infinite; }
@keyframes eb-web-blink { 50% { opacity: 0; } }
.eb-web-app { background: var(--eb-main); }
.eb-web-tabs { display: flex; gap: .5em; padding: .7em .9em 0; }
.eb-web-tab { font-size: 1.05em; color: #cbd5e1; background: #1f2937; border-radius: .6em .6em 0 0; padding: .35em 1em; }
.eb-web-tab.on { color: #fff; background: #2b3648; }
.eb-web-term { margin: 0 .9em; background: var(--eb-term-bg); border-radius: 0 0 .6em .6em; padding: .9em 1.1em; min-height: 11.5em;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 1.2em; color: var(--eb-term-fg); }
.eb-web-term .g { color: var(--eb-green); }
.eb-web-term .b { color: #6fc1ff; }
.eb-web-foot { display: flex; align-items: center; gap: 1em; padding: .55em 1em; color: #94a3b8; font-size: 1.05em; }
.eb-web-foot .pill { background: #1f2937; border-radius: .5em; padding: .15em .8em; color: #cbd5e1; }
.eb-web-chip {
  position: absolute; left: 4em; bottom: 5em; z-index: 2;
  display: flex; align-items: center; gap: .7em;
  background: rgba(13,25,48,.9); border: 1px solid rgba(125,211,252,.4);
  border-radius: 1em; padding: .8em 1.2em; color: #e2e8f0; font-size: 1.2em; font-weight: 700;
}
.eb-web-chip small { display: block; font-weight: 400; color: #7dd3fc; font-size: .85em; }
.eb-web-whale { font-size: 1.8em; }
.eb-web-dotlive { width: .8em; height: .8em; border-radius: 50%; background: #22c55e; box-shadow: 0 0 1em #22c55e; }
.eb-web-phone {
  position: absolute; right: 5em; bottom: 4em; width: 13em; z-index: 2;
  background: #0f172a; border: 1px solid rgba(148,163,184,.4); border-radius: 1.6em;
  padding: .9em .7em 1.1em; box-shadow: 0 1.5em 4em rgba(0,0,0,.5);
}
.eb-web-phone .scr { background: var(--eb-main); border-radius: 1em; overflow: hidden; }
.eb-web-phone .nt { height: .7em; width: 40%; margin: .5em auto; background: #334155; border-radius: 999px; }
.eb-web-phone .tl { display: flex; gap: .35em; padding: .5em .5em 0; }
.eb-web-phone .tl i { display: block; height: 1.1em; border-radius: .3em; background: #334155; flex: 1; }
.eb-web-phone .tl i.on { background: #475569; }
.eb-web-phone .tm { margin: .4em; background: var(--eb-term-bg); border-radius: .5em; padding: .6em; min-height: 8em;
  font-family: ui-monospace, Menlo, monospace; font-size: .95em; color: var(--eb-term-fg); }
.eb-web[data-variant="card"] .eb-web-phone { right: 3em; width: 12em; }
.eb-web[data-variant="card"] .eb-web-chip { left: 3em; font-size: 1.05em; }
`

function injectStyle () {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}

function markup (variant) {
  const head = variant === 'hero'
    ? `<div class="eb-web-head">
        <span class="eb-web-brand">electerm-web · self-hosted</span>
        <h2 class="eb-web-h1">Your terminal, <em>your server.</em></h2>
        <p class="eb-web-sub">Docker · browser · your password, your data, your rules.</p>
      </div>`
    : ''
  return `
    <div class="eb-web-stars"></div>
    ${head}
    <div class="eb-web-stage">
      <div class="eb-web-chip">
        <span class="eb-web-whale">🐳</span>
        <span>electerm-web<small>zxdong262/electerm-web · :5577</small></span>
        <span class="eb-web-dotlive"></span>
      </div>
      <div class="eb-web-browser">
        <div class="eb-web-bar">
          <span class="eb-web-dots"><i style="background:#f87171"></i><i style="background:#fbbf24"></i><i style="background:#34d399"></i></span>
          <span class="eb-web-url"><span class="eb-web-typed"></span><span class="eb-web-caret"></span>
            <span class="eb-web-lock">🔒 auth</span>
          </span>
        </div>
        <div class="eb-web-app">
          <div class="eb-web-tabs"><span class="eb-web-tab on">prod-web</span><span class="eb-web-tab">db-01</span><span class="eb-web-tab">home-lab</span></div>
          <div class="eb-web-term"><span class="g">➜</span> ssh prod-web<br><span class="b">connected</span> · uptime 42 days<br><span class="g">➜</span> docker ps <span class="eb-web-tail">▊</span></div>
          <div class="eb-web-foot"><span class="pill">ssh</span><span class="pill">sftp</span><span>triggers ƒx·3</span><span style="margin-left:auto">utf-8</span></div>
        </div>
      </div>
      <div class="eb-web-phone">
        <div class="scr"><div class="nt"></div>
          <div class="tl"><i class="on"></i><i></i><i></i></div>
          <div class="tm"><span style="color:#19f9d8">➜</span> ssh prod-web<br><span style="color:#6fc1ff">connected</span><br>➜ uptime</div>
        </div>
      </div>
    </div>`
}

function seg (t, from, to) {
  if (t <= from) return 0
  if (t >= to) return 1
  return (t - from) / (to - from)
}

function easeOut (p) { return 1 - Math.pow(1 - p, 3) }
function easeInOut (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2 }

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-web'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'Browser opening your-server:8082 with electerm inside, served from a docker container, joined by a phone')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const el = {
    browser: q('.eb-web-browser'),
    typed: q('.eb-web-typed'),
    caret: q('.eb-web-caret'),
    app: q('.eb-web-app'),
    lock: q('.eb-web-lock'),
    phone: q('.eb-web-phone'),
    chip: q('.eb-web-chip'),
    tail: q('.eb-web-tail')
  }

  const fit = () => {
    const w = root.clientWidth
    if (w) root.style.fontSize = (w / 100) + 'px'
  }
  fit()
  if (window.ResizeObserver) {
    new window.ResizeObserver(fit).observe(root)
  } else {
    window.addEventListener('resize', fit)
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    root.style.opacity = (1 - gone).toFixed(3)

    const bP = easeOut(seg(t, T.browserFrom, T.browserTo))
    el.browser.style.opacity = bP.toFixed(3)
    el.browser.style.transform = 'translateX(-50%) translateY(' + ((1 - bP) * 3).toFixed(3) + 'em)'

    const cP = easeOut(seg(t, T.browserFrom, T.browserTo))
    el.chip.style.opacity = cP.toFixed(3)

    // typing the URL
    const tp = seg(t, T.urlFrom, T.urlTo)
    const n = Math.floor(tp * URL_TEXT.length)
    const text = URL_TEXT.slice(0, n)
    if (el.typed.textContent !== text) el.typed.textContent = text
    el.caret.style.opacity = tp >= 1 ? '0' : '1'

    const aP = easeOut(seg(t, T.appFrom, T.appTo))
    el.app.style.opacity = aP.toFixed(3)

    const lP = easeInOut(seg(t, T.lockFrom, T.lockTo))
    el.lock.style.opacity = lP.toFixed(3)
    el.lock.style.transform = 'scale(' + (0.6 + 0.4 * lP).toFixed(3) + ')'

    const pP = easeOut(seg(t, T.phoneFrom, T.phoneTo))
    el.phone.style.opacity = pP.toFixed(3)
    el.phone.style.transform = 'translateY(' + ((1 - pP) * 4).toFixed(3) + 'em)'

    // blinking tail in terminal after app appears
    if (el.tail) {
      const blink = Math.floor(t / 500) % 2 === 0 ? '1' : '0.1'
      el.tail.style.opacity = (aP * Number(blink)).toFixed(2)
    }
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.cursorTo)
    return
  }

  const state = { raf: null }
  const start = performance.now()
  const tick = (now) => {
    frame((now - start) % PERIOD)
    state.raf = window.requestAnimationFrame(tick)
  }
  const play = () => {
    if (state.raf === null) state.raf = window.requestAnimationFrame(tick)
  }
  const pause = () => {
    if (state.raf !== null) {
      window.cancelAnimationFrame(state.raf)
      state.raf = null
    }
  }

  if (window.IntersectionObserver) {
    new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) play()
      else pause()
    }, { threshold: 0 }).observe(root)
  } else {
    play()
  }
}

function selfPath () {
  try {
    return new URL(import.meta.url).pathname
  } catch (err) {
    return ''
  }
}

export function initBanners (doc = document) {
  injectStyle()
  const self = selfPath()
  const hosts = doc.querySelectorAll('[data-eb-banner]')
  for (const host of hosts) {
    const src = host.getAttribute('data-eb-banner-src')
    if (src && self && src !== self) continue
    mount(host)
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initBanners())
  } else {
    initBanners()
  }
}
