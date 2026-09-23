/**
 * Animated banner for the "window opacity" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * desktop with its two background apps, the electerm window (tab bar +
 * terminal + opacity slider), and the slider knob are all plain DOM + CSS
 * driven by one requestAnimationFrame timeline.
 *
 * The story, in three beats:
 *   1. the electerm window sits solid (opacity 1) over a desktop — a runbook
 *      in a browser and a dashboard — that is completely hidden behind it;
 *   2. the slider knob travels down to 0.7 and the whole window turns
 *      translucent, so the runbook shows straight through the terminal;
 *   3. the knob travels back to 1 and the window is solid again.
 *
 * Two deliberate liberties, noted so nobody mistakes them for UI: the
 * background apps are invented stand-ins (any app could be behind the
 * window), and the banner maps the setting to a slightly lifted on-screen
 * opacity so text stays readable at thumbnail scale. The real app applies
 * `#outside-context { opacity: <value> }` verbatim
 * (src/client/components/common/opacity.jsx) — text fades exactly as much
 * as the background does.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + desktop stage (blog post page)
 *   data-eb-banner="card"  -> desktop stage only      (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales to any container.
 */

const STYLE_ID = 'eb-op-style'

// One full pass of the story, in ms.
const PERIOD = 9200

const T = {
  winFrom: 200, // the electerm window rises into place, solid
  winTo: 800,
  bgFrom: 100, // background apps fade in behind it
  bgTo: 700,
  knobDownFrom: 1600, // slider 1 -> 0.7, window turns translucent
  knobDownTo: 3400,
  holdTo: 5600, // reading through the window
  knobUpFrom: 6000, // slider 0.7 -> 1, window goes solid again
  knobUpTo: 7600,
  badgeFrom: 3400, // "see-through" badge while translucent
  badgeTo: 5600,
  fadeFrom: 8500,
  fadeTo: 9000
}

const V_FROM = 1
const V_TO = 0.7

// Display mapping: lift the on-screen opacity a little so terminal text stays
// legible at banner scale. The app itself applies the value verbatim.
function displayOpacity (v) {
  return 0.35 + 0.65 * v
}

const CSS = `
.eb-op {
  --eb-main: #121214;
  --eb-main-dark: #000;
  --eb-text: #ddd;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #dbeafe 0%, #f1f5f9 55%, #e0e7ff 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-op-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-op-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(8, 136, 204, 0.18) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
}
.eb-op-head { position: absolute; left: 5em; right: 5em; top: 3em; pointer-events: none; }
.eb-op-brand {
  display: inline-block;
  font-size: 1.4em;
  font-weight: 800;
  color: #0f172a;
}
.eb-op-brand i { font-style: normal; color: #1389fd; }
.eb-op-h1 {
  margin: 0.22em 0 0;
  font-size: 3.2em;
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-op-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #1389fd, #7c3aed 60%, #06d6a0);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-op-sub { margin: 0.5em 0 0; max-width: 60em; font-size: 1.45em; line-height: 1.4; color: #475569; }
.eb-op-stage { position: absolute; left: 50%; bottom: 3em; width: 78em; height: 37em; transform: translateX(-50%); }
.eb-op[data-variant='card'] .eb-op-stage { bottom: auto; top: 50%; transform: translate(-50%, -50%); }
.eb-op-desktop {
  position: absolute;
  inset: 0;
  border-radius: 0.8em;
  background: linear-gradient(160deg, #1e293b 0%, #334155 100%);
  box-shadow: 0 1.2em 2.4em rgba(9, 20, 40, 0.3);
  overflow: hidden;
}
.eb-op-taskbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2.6em;
  display: flex;
  align-items: center;
  gap: 0.8em;
  padding: 0 1em;
  background: rgba(2, 6, 23, 0.72);
}
.eb-op-taskbar i { width: 1.4em; height: 1.4em; border-radius: 0.3em; background: #475569; }
.eb-op-taskbar i.is-on { background: #38bdf8; }
.eb-op-bgapp {
  position: absolute;
  border-radius: 0.5em;
  background: #f8fafc;
  box-shadow: 0 0.5em 1.2em rgba(0, 0, 0, 0.35);
  overflow: hidden;
  text-align: left;
}
.eb-op-bgapp-doc { left: 4em; top: 3.4em; width: 30em; height: 24em; }
.eb-op-bgapp-dash { right: 4em; top: 5.4em; width: 30em; height: 21em; }
.eb-op-bgapp-bar { height: 2.2em; display: flex; align-items: center; gap: 0.4em; padding: 0 0.8em; background: #e2e8f0; }
.eb-op-bgapp-bar i { width: 0.8em; height: 0.8em; border-radius: 50%; background: #cbd5e1; }
.eb-op-bgapp-title { margin: 0.7em 1em 0; font-size: 1.15em; font-weight: 700; color: #0f172a; }
.eb-op-bgapp-line { margin: 0.55em 1em 0; height: 0.85em; border-radius: 0.4em; background: #e2e8f0; }
.eb-op-bgapp-line.is-hl { background: #bae6fd; }
.eb-op-bgapp-line.is-short { width: 62%; }
.eb-op-bgapp-cmd {
  margin: 0.8em 1em 0;
  padding: 0.55em 0.7em;
  border-radius: 0.35em;
  background: #0f172a;
  color: #7dd3fc;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', monospace;
  font-size: 1.05em;
}
.eb-op-bars { display: flex; align-items: flex-end; gap: 0.7em; height: 9em; margin: 1em 1em 0; }
.eb-op-bars span { flex: 1; border-radius: 0.25em 0.25em 0 0; background: #38bdf8; }
.eb-op-win {
  position: absolute;
  left: 50%;
  top: 2.2em;
  width: 52em;
  transform: translateX(-50%);
  border-radius: 0.6em;
  overflow: hidden;
  background: var(--eb-term-bg);
  box-shadow: 0 1em 2.2em rgba(0, 0, 0, 0.45);
  text-align: left;
  opacity: 0;
}
.eb-op-tabbar { display: flex; align-items: stretch; height: 2.6em; padding: 0 0.5em; background: var(--eb-main-dark); font-size: 1.15em; }
.eb-op-tab {
  display: flex;
  align-items: center;
  gap: 0.4em;
  padding: 0 1em;
  border-radius: 0.2em 0.2em 0 0;
  background: var(--eb-main);
  color: var(--eb-text);
  font-weight: 700;
  white-space: nowrap;
}
.eb-op-tab-count {
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
}
.eb-op-term { padding: 1em 1.3em 0.6em; font-size: 1.7em; font-family: Menlo, Monaco, 'DejaVu Sans Mono', monospace; color: var(--eb-term-fg); }
.eb-op-line { line-height: 1.5; white-space: nowrap; }
.eb-op-ps1 { color: var(--eb-term-green); }
.eb-op-path { color: var(--eb-term-blue); }
.eb-op-caret { display: inline-block; width: 0.6em; height: 1.15em; margin-left: 0.1em; vertical-align: -0.2em; background: #b5bd68; }
.eb-op-slider {
  display: flex;
  align-items: center;
  gap: 0.8em;
  margin: 0.4em 1.1em 1em;
  padding: 0.7em 0.9em;
  border-radius: 0.4em;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 1.1em;
  color: var(--eb-text);
}
.eb-op-slider-label { color: var(--eb-text-dark); }
.eb-op-track { position: relative; flex: 1; height: 0.45em; border-radius: 0.25em; background: rgba(255, 255, 255, 0.18); }
.eb-op-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 0.25em; background: var(--eb-primary); }
.eb-op-knob {
  position: absolute;
  top: 50%;
  width: 1.3em;
  height: 1.3em;
  border-radius: 50%;
  background: #fff;
  border: 0.16em solid var(--eb-primary);
  transform: translate(-50%, -50%);
  box-shadow: 0 0.15em 0.4em rgba(0, 0, 0, 0.5);
}
.eb-op-val { min-width: 3.2em; text-align: right; font-variant-numeric: tabular-nums; color: #fff; font-weight: 700; }
.eb-op-badge {
  position: absolute;
  left: 50%;
  top: 0.4em;
  transform: translateX(-50%);
  padding: 0.35em 0.9em;
  border-radius: 1em;
  background: rgba(6, 214, 160, 0.95);
  color: #052e22;
  font-size: 1.15em;
  font-weight: 800;
  white-space: nowrap;
  opacity: 0;
  box-shadow: 0 0.4em 1em rgba(0, 0, 0, 0.35);
}
@media (prefers-reduced-motion: reduce) {
  .eb-op-dots { animation: none !important; }
}
`

function injectStyle () {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

function clamp (v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function seg (t, from, to) {
  return clamp((t - from) / (to - from), 0, 1)
}

function easeOut (p) {
  return 1 - Math.pow(1 - p, 3)
}

function easeInOut (p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-op-head">
        <span class="eb-op-brand">electerm <i>opacity</i></span>
        <h2 class="eb-op-h1">Turn it down, <em>see through it</em></h2>
        <p class="eb-op-sub">One setting fades the whole window — the app behind shows straight through.</p>
      </div>`
  return `
    <div class="eb-op-deco"><span class="eb-op-dots"></span></div>
    ${head}
    <div class="eb-op-stage">
      <div class="eb-op-desktop">
        <div class="eb-op-bgapp eb-op-bgapp-doc">
          <div class="eb-op-bgapp-bar"><i></i><i></i><i></i></div>
          <div class="eb-op-bgapp-title">runbook — deploy steps</div>
          <div class="eb-op-bgapp-line"></div>
          <div class="eb-op-bgapp-line is-short"></div>
          <div class="eb-op-bgapp-cmd">rsync -a ./dist/ web-02:/srv/app</div>
          <div class="eb-op-bgapp-line is-hl"></div>
          <div class="eb-op-bgapp-line is-short"></div>
        </div>
        <div class="eb-op-bgapp eb-op-bgapp-dash">
          <div class="eb-op-bgapp-bar"><i></i><i></i><i></i></div>
          <div class="eb-op-bgapp-title">dashboard</div>
          <div class="eb-op-bars">
            <span style="height:38%"></span><span style="height:64%"></span>
            <span style="height:46%"></span><span style="height:82%"></span>
            <span style="height:58%"></span><span style="height:72%"></span>
          </div>
        </div>
        <div class="eb-op-win">
          <div class="eb-op-tabbar">
            <span class="eb-op-tab"><span class="eb-op-tab-count">2</span><span>zxd@web-01:22</span></span>
          </div>
          <div class="eb-op-term">
            <div class="eb-op-line"><span class="eb-op-ps1">zxd@web-01</span>:<span class="eb-op-path">~</span>$ rsync -a ./dist/ web-02:/srv/app</div>
            <div class="eb-op-line">sending incremental file list<span class="eb-op-caret"></span></div>
          </div>
          <div class="eb-op-slider">
            <span class="eb-op-slider-label">opacity</span>
            <span class="eb-op-track"><span class="eb-op-fill"></span><span class="eb-op-knob"></span></span>
            <span class="eb-op-val">1.00</span>
          </div>
        </div>
        <div class="eb-op-badge">see-through at 0.7</div>
        <div class="eb-op-taskbar"><i class="is-on"></i><i></i><i></i></div>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-op'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm window turning translucent as the opacity slider moves from 1 to 0.7, revealing the apps behind it')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const el = {
    win: q('.eb-op-win'),
    knob: q('.eb-op-knob'),
    fill: q('.eb-op-fill'),
    val: q('.eb-op-val'),
    badge: q('.eb-op-badge'),
    bgapps: Array.prototype.slice.call(root.querySelectorAll('.eb-op-bgapp'))
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

  function valueAt (t) {
    const down = easeInOut(seg(t, T.knobDownFrom, T.knobDownTo))
    const up = easeInOut(seg(t, T.knobUpFrom, T.knobUpTo))
    return V_FROM + (V_TO - V_FROM) * down + (V_FROM - V_TO) * up
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    root.style.opacity = (1 - gone).toFixed(3)

    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    el.win.style.opacity = (winP * displayOpacity(valueAt(t)) * (1 - gone)).toFixed(3)
    el.win.style.transform = 'translateX(-50%) translateY(' + ((1 - winP) * 2).toFixed(3) + 'em)'

    const bgP = easeOut(seg(t, T.bgFrom, T.bgTo))
    el.bgapps.forEach((node, i) => {
      node.style.opacity = (bgP * (1 - gone)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - bgP) * (1 + i * 0.5)).toFixed(3) + 'em)'
    })

    const v = valueAt(t)
    const frac = (v - V_TO) / (V_FROM - V_TO)
    el.knob.style.left = (frac * 100).toFixed(2) + '%'
    el.fill.style.width = (frac * 100).toFixed(2) + '%'
    const text = v.toFixed(2)
    if (el.val.textContent !== text) el.val.textContent = text

    const badgeP = seg(t, T.badgeFrom, T.badgeFrom + 350) * (1 - seg(t, T.badgeTo, T.badgeTo + 350))
    el.badge.style.opacity = (badgeP * (1 - gone)).toFixed(3)
    el.badge.style.transform = 'translateX(-50%) translateY(' + ((1 - badgeP) * -0.6).toFixed(3) + 'em)'
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.holdTo)
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
