/**
 * Animated banner for the "Fatfish Terminal Watermark" blog post.
 *
 * The terminal window, the widget settings card, the pointer and the timeline
 * are generated DOM + CSS — no GIF, no canvas, no binary asset in this repo.
 * The watermark itself is the widget's original PNG, referenced from the
 * widget's own repository through jsDelivr at the same commit the registry
 * hashed (61ae2ec). That is deliberate: readers see the real artwork, not a
 * redrawn approximation of it.
 *
 * The story, in two beats:
 *   1. electerm's faint white wordmark sits behind the terminal text;
 *   2. the pointer clicks Start widget, the wordmark fades out and the sprite
 *      fades in behind the text.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + window (blog post page)
 *   data-eb-banner="card"  -> window only      (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * The layout is expressed in `em` and the root font-size is kept at 1% of the
 * banner width, so one design scales from the hero to the card. Geometry is
 * declared on wrappers without a font-size of their own; text sits in inner
 * elements, so an em width never resolves against a scaled font.
 */

const STYLE_ID = 'eb-fw-style'

const PERIOD = 12000

const ORIGINAL_PNG = 'https://cdn.jsdelivr.net/gh/electerm/electerm-widget-fatfish-watermark@61ae2ec00218457ebebf6bb83fcb8bf33df6be7c/assets/source-front.png'

const T = {
  winFrom: 150,
  winTo: 850,
  chip1From: 900,
  chip1To: 1400,
  ptrFrom: 1600,
  ptrTo: 2500,
  click: 2600,
  swapFrom: 2700,
  swapTo: 3700,
  statusFrom: 3100,
  ptrOutFrom: 4200,
  ptrOutTo: 4800,
  chip2From: 3900,
  chip2To: 4400,
  fadeFrom: 11200,
  fadeTo: 11900
}

const CSS = `
.eb-fw {
  position: relative; display: block; width: 100%; aspect-ratio: 16 / 9;
  overflow: hidden; border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #f2f7ff 0%, #e2edff 55%, #d3e2fb 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3; isolation: isolate; -webkit-font-smoothing: antialiased;
}
.eb-fw-dots { position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(rgba(44,88,158,.22) .12em, transparent .12em);
  background-size: 4em 4em; opacity: .5; }
.eb-fw-head { position: absolute; left: 4.5em; right: 4.5em; top: 2.6em;
  pointer-events: none; z-index: 3; }
.eb-fw[data-variant="card"] .eb-fw-head { display: none; }
.eb-fw-brand { display: inline-block; font-size: 1.3em; font-weight: 800;
  color: #2c589e; letter-spacing: .04em; }
.eb-fw-h1 { margin: .25em 0 0; font-size: 3em; font-weight: 800; line-height: 1.05;
  letter-spacing: -.025em; color: #162244; }
.eb-fw-h1 em { font-style: normal; color: #2c589e; }
.eb-fw-sub { margin: .5em 0 0; max-width: 62em; font-size: 1.4em; color: #5a6b8c; }
.eb-fw-stage { position: absolute; inset: 0; }
.eb-fw[data-variant="hero"] .eb-fw-stage { top: 12em; }
.eb-fw-chip-slot { position: absolute; right: 2em; top: .6em; width: 34em;
  height: 3em; z-index: 4; pointer-events: none; }
.eb-fw-chip { position: absolute; top: 0; right: 0; white-space: nowrap;
  background: #fff; border: 1px solid #b9cdee; border-radius: 999px;
  padding: .45em 1.1em; font-size: 1.25em; font-weight: 700; color: #2c589e;
  box-shadow: 0 .4em 1.4em rgba(44,88,158,.14); }
.eb-fw-chip b { color: #162244; }
.eb-fw-window {
  position: absolute; left: 50%; bottom: 3em; width: 84em; max-width: 92%;
  transform: translateX(-50%); background: #121214; overflow: hidden;
  border: 1px solid rgba(44,88,158,.35); border-radius: 1.1em;
  box-shadow: 0 2em 5em rgba(22,34,68,.3);
}
.eb-fw[data-variant="card"] .eb-fw-window { width: 90em; max-width: 94%; bottom: 2em; }
.eb-fw-bar { display: flex; align-items: center; gap: .9em; padding: .75em 1.2em;
  background: #1d1f26; color: #9aa3b2; }
.eb-fw-bar-dots { display: flex; gap: .5em; }
.eb-fw-bar-dots i { display: block; width: .85em; height: .85em; border-radius: 50%; }
.eb-fw-bar-title { font-size: 1.15em; }
.eb-fw-bar-title b { color: #d8deea; font-weight: 600; }
.eb-fw-bar-tag { margin-left: auto; font-size: 1.05em; color: #19f9d8; }
.eb-fw-body { display: flex; min-height: 31em; }
.eb-fw-terminal { position: relative; flex: 1; min-width: 0; overflow: hidden;
  background: #20111b; padding: 1.3em 1.5em; }
.eb-fw-lines { position: relative; z-index: 2; font-size: 1.2em; line-height: 1.75;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #bbbbbb;
  white-space: pre; }
.eb-fw-lines .g { color: #19f9d8; }
.eb-fw-lines .b { color: #6fc1ff; }
.eb-fw-wm { position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; font-size: 3.4em; font-weight: 800; letter-spacing: .28em;
  color: rgba(255,255,255,.18); z-index: 1; }
.eb-fw-art { position: absolute; left: 50%; top: 50%; width: 18em; height: 24em;
  transform: translate(-50%, -50%); z-index: 1; opacity: 0; }
/* The page styles every img inside .blog-banner with a border and rounded
   corners; the watermark is a layer, not a framed picture. Higher specificity
   plus explicit resets keep it clean on the post page. */
.eb-fw .eb-fw-art img { display: block; width: 100%; height: 100%; max-width: none;
  border: 0; border-radius: 0; object-fit: contain; }
.eb-fw-panel { width: 30em; flex: none; background: #1b1d24; padding: 1.2em;
  border-left: 1px solid #30333d; color: #ddd; }
.eb-fw-ptitle { font-size: 1.25em; font-weight: 700; color: #f2f4f8; }
.eb-fw-ver { display: inline-block; margin-left: .4em; padding: .1em .5em;
  font-size: .78em; font-weight: 600; color: #19f9d8; background: #123333;
  border-radius: .4em; vertical-align: .1em; }
.eb-fw-form { margin: 1em 0 .9em; }
.eb-fw-row { display: flex; align-items: center; justify-content: space-between;
  gap: .6em; padding: .35em 0; border-bottom: 1px solid #2a2d36; }
.eb-fw-row span { font-size: 1.02em; color: #9aa3b2; }
.eb-fw-row b { font-size: 1.02em; font-weight: 600; color: #e6e9f0;
  background: #262932; border-radius: .35em; padding: .1em .55em; }
.eb-fw-row b.on { color: #04121f; background: #19f9d8; }
.eb-fw-start { position: relative; text-align: center; font-size: 1.15em;
  font-weight: 700; color: #fff; background: #08c; border-radius: .45em;
  padding: .45em 1em; overflow: hidden; }
.eb-fw-ripple { position: absolute; left: 50%; top: 50%; width: 1.4em; height: 1.4em;
  margin: -.7em 0 0 -.7em; border: 2px solid rgba(255,255,255,.85);
  border-radius: 50%; transform: scale(0); opacity: 0; }
.eb-fw-status { margin-top: .5em; font-size: 1em; color: #888; text-align: center; }
.eb-fw-pointer { position: absolute; width: 1.7em; height: 2.4em; z-index: 6;
  background: #fff; pointer-events: none;
  clip-path: polygon(0 0, 0 100%, 28% 72%, 52% 100%, 70% 88%, 46% 62%, 100% 62%);
  filter: drop-shadow(0 .15em .25em rgba(0,0,0,.6)); }
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
    ? `<div class="eb-fw-head">
        <span class="eb-fw-brand">widgets.electerm.org · new widget</span>
        <h2 class="eb-fw-h1">Fatfish <em>Terminal Watermark</em></h2>
        <p class="eb-fw-sub">Two sprites · four settings · one pinned commit.</p>
      </div>`
    : ''
  return `
    <div class="eb-fw-dots"></div>
    ${head}
    <div class="eb-fw-stage">
      <div class="eb-fw-chip-slot">
        <div class="eb-fw-chip" data-chip="before"><b>before</b> · default wordmark</div>
        <div class="eb-fw-chip" data-chip="after"><b>after</b> · fatfish watermark applied</div>
      </div>
      <div class="eb-fw-window">
        <div class="eb-fw-bar">
          <span class="eb-fw-bar-dots"><i style="background:#f87171"></i><i style="background:#fbbf24"></i><i style="background:#34d399"></i></span>
          <span class="eb-fw-bar-title">Settings <b>› Widgets</b></span>
          <span class="eb-fw-bar-tag">v1.4.0 · pinned</span>
        </div>
        <div class="eb-fw-body">
          <div class="eb-fw-terminal">
            <div class="eb-fw-wm">electerm</div>
            <div class="eb-fw-art"><img src="${ORIGINAL_PNG}" alt=""></div>
            <div class="eb-fw-lines"><span class="g">➜</span> ssh dev-box
<span class="b">connected</span> · uptime 41 days
<span class="g">➜</span> tail -f app.log
INFO  listening on :8080
<span class="g">➜</span> <span class="eb-fw-caret">▊</span></div>
          </div>
          <div class="eb-fw-panel">
            <div class="eb-fw-ptitle">Fatfish Terminal Watermark<span class="eb-fw-ver">1.4.0</span></div>
            <div class="eb-fw-form">
              <div class="eb-fw-row"><span>Artwork style</span><b>Original PNG ▾</b></div>
              <div class="eb-fw-row"><span>Opacity (%)</span><b>20</b></div>
              <div class="eb-fw-row"><span>Height (%)</span><b>78</b></div>
              <div class="eb-fw-row"><span>Apply on launch</span><b class="on">ON</b></div>
            </div>
            <div class="eb-fw-start"><span class="eb-fw-start-label">Start widget</span><span class="eb-fw-ripple"></span></div>
            <div class="eb-fw-status">Stopped</div>
          </div>
        </div>
        <div class="eb-fw-pointer"></div>
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
  root.className = 'eb-fw'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm terminal with the default wordmark replaced by the blue fatfish watermark')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const el = {
    window: q('.eb-fw-window'),
    chipBefore: q('[data-chip="before"]'),
    chipAfter: q('[data-chip="after"]'),
    wordmark: q('.eb-fw-wm'),
    art: q('.eb-fw-art'),
    start: q('.eb-fw-start'),
    label: q('.eb-fw-start-label'),
    ripple: q('.eb-fw-ripple'),
    status: q('.eb-fw-status'),
    pointer: q('.eb-fw-pointer'),
    caret: q('.eb-fw-caret')
  }

  const target = { x: 84, y: 76 }
  const fit = () => {
    const w = root.clientWidth
    if (w) root.style.fontSize = (w / 100) + 'px'
    const win = el.window.getBoundingClientRect()
    const btn = el.start.getBoundingClientRect()
    if (win.width && btn.width) {
      target.x = ((btn.left + btn.width / 2 - win.left) / win.width) * 100
      target.y = ((btn.top + btn.height / 2 - win.top) / win.height) * 100
    }
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

    const wP = easeOut(seg(t, T.winFrom, T.winTo))
    el.window.style.opacity = wP.toFixed(3)
    el.window.style.transform = 'translateX(-50%) translateY(' + ((1 - wP) * 3).toFixed(3) + 'em)'

    const swap = easeInOut(seg(t, T.swapFrom, T.swapTo))
    el.wordmark.style.opacity = (1 - swap).toFixed(3)
    el.art.style.opacity = (swap * 0.45).toFixed(3)

    const before = easeOut(seg(t, T.chip1From, T.chip1To)) * (1 - easeInOut(seg(t, T.swapFrom, T.swapTo)))
    el.chipBefore.style.opacity = before.toFixed(3)
    el.chipAfter.style.opacity = easeOut(seg(t, T.chip2From, T.chip2To)).toFixed(3)

    const running = t >= T.statusFrom
    el.status.textContent = running ? 'Running · 1 instance' : 'Stopped'
    el.status.style.color = running ? '#19f9d8' : '#888'
    el.label.textContent = running ? 'Stop widget' : 'Start widget'

    const move = easeInOut(seg(t, T.ptrFrom, T.ptrTo))
    el.pointer.style.left = (42 + (target.x - 42) * move).toFixed(2) + '%'
    el.pointer.style.top = (82 + (target.y - 82) * move).toFixed(2) + '%'
    el.pointer.style.opacity = (wP * (1 - easeInOut(seg(t, T.ptrOutFrom, T.ptrOutTo)))).toFixed(3)

    const rp = seg(t, T.click, T.click + 700)
    el.ripple.style.transform = 'scale(' + (rp > 0 && rp < 1 ? (rp * 6).toFixed(3) : 0) + ')'
    el.ripple.style.opacity = (rp > 0 && rp < 1 ? 1 - rp : 0).toFixed(3)

    if (el.caret) {
      el.caret.style.opacity = Math.floor(t / 500) % 2 === 0 ? '1' : '0.15'
    }
  }

  const state = { raf: null }
  // A card is a thumbnail: start on the settled "applied" beat instead of the
  // faint wordmark, so the first impression is the widget itself.
  const offset = variant === 'card' ? 5200 : 0
  if (offset) frame(offset)
  const start = performance.now()
  const tick = (now) => {
    frame((now - start + offset) % PERIOD)
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

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(7000)
  } else if (window.IntersectionObserver) {
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
