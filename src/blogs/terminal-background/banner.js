/**
 * Animated banner for the "terminal background" blog post.
 *
 * Everything here is generated in the page — no image, no GIF, no canvas. The
 * terminal window, the settings panel with its five number fields, the
 * wallpaper and the big dim text are plain DOM + CSS driven by one
 * requestAnimationFrame timeline.
 *
 * The story, in four beats:
 *   1. the window rises with a wallpaper behind the terminal, every filter at
 *      its default (opacity 1, blur 0, brightness 1, grayscale 0, contrast 1);
 *   2. the five fields change and the wallpaper dims, blurs and desaturates —
 *      while the terminal text stays exactly as bright as it was;
 *   3. the value switches to [📝] and the wallpaper is replaced by big centred
 *      text at 30% opacity; the filter fields disappear, because the app hides
 *      them for a text background (src/client/components/setting-panel/
 *      terminal-bg-config.jsx, renderFilter());
 *   4. back to the image, then the loop fades and resets.
 *
 * Colours are the app's own shipped defaults, not invented: UI theme from
 * src/client/common/theme-defaults.js (main #121214, main-dark #000, text #ddd,
 * text-dark #888, primary #08c) and the terminal palette from the same file
 * (background #20111b, foreground #bbbbbb, cursor #b5bd68, green #19f9d8,
 * brightBlue #6FC1FF). The number fields use the colours antd actually derives
 * for electerm's ConfigProvider theme — measured by rendering a real antd
 * InputNumber under the app's own theme tokens: container #23232b, border
 * #4d4d5e, text rgba(221,221,221,.85), radius 3px on a 32px field.
 *
 * Deliberate liberties, so nobody mistakes them for UI:
 *   - the settings panel is a depiction, not a screenshot: the app renders it
 *     in a scrollable settings column, not as a floating card;
 *   - blur is drawn as <value> * 0.128em instead of the app's absolute px, so
 *     it stays proportional at both the hero and the card size. The number
 *     shown in the field is the real px value the app would store;
 *   - the "choose file" suffix is a static stand-in for antd's Upload affix.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero" -> headline + stage  (blog post page)
 *   data-eb-banner="card" -> stage only        (blog index thumbnail)
 * Every banner script on the blog index loads for every card, so a mount also
 * has to match data-eb-banner-src (the module the template loaded for that
 * post) — otherwise the first script to run would claim every card.
 *
 * The layout is expressed in `em` and the root font-size is kept at 1% of the
 * banner width, so one design scales from the 780px hero to the 418px card.
 */

const STYLE_ID = 'eb-tb-style'

// One full pass of the story, in ms.
const PERIOD = 10800

const T = {
  rootInTo: 300,
  winFrom: 150,
  winTo: 850,
  wallFrom: 300,
  wallTo: 1200,
  fFrom: 1700, // filters -> applied
  fTo: 3400,
  fHoldTo: 5200,
  fBackFrom: 5200, // filters -> defaults
  fBackTo: 6400,
  modeFrom: 6400, // switch to the text background
  modeTo: 7400,
  modeSwap: 6900, // the value field changes text here
  modeHoldTo: 8800,
  modeBackFrom: 8800, // switch back to the image
  modeBackTo: 9700,
  modeBackSwap: 9250,
  rootOutFrom: 10200,
  rootOutTo: 10700
}

// The app's absolute px blur, mapped onto the banner's em scale so it stays
// proportional at any banner size (1em = 1% of the banner width ~ 7.8px here).
const BLUR_EM = 0.128

const F_DEFAULT = { opacity: 1, blur: 0, brightness: 1, grayscale: 0, contrast: 1 }
const F_APPLIED = { opacity: 0.5, blur: 6, brightness: 0.95, grayscale: 0.5, contrast: 1.1 }

const IMG_VALUE = '~/Pictures/dusk.jpg'
const TEXT_VALUE = '[📝]'
const BG_TEXT = 'PRODUCTION'

const CSS = `
.eb-tb {
  --eb-main: #121214;
  --eb-main-dark: #000;
  --eb-text: #ddd;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  --eb-term-dim: #757575;
  --eb-field-bg: #23232b;
  --eb-field-border: #4d4d5e;
  --eb-field-text: rgba(221, 221, 221, 0.85);
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e0e7ff 0%, #f8fafc 48%, #fbe8ff 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-tb-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-tb-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(8, 136, 204, 0.16) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
}
.eb-tb-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(0.6em);
  opacity: 0.5;
}
.eb-tb-blob-a { left: -12em; top: -14em; width: 34em; height: 34em; background: radial-gradient(circle, rgba(255, 122, 89, 0.5), rgba(255, 122, 89, 0)); }
.eb-tb-blob-b { right: -10em; top: -10em; width: 30em; height: 30em; background: radial-gradient(circle, rgba(77, 171, 247, 0.45), rgba(77, 171, 247, 0)); }
.eb-tb-head { position: absolute; left: 4.6em; right: 4.6em; top: 2.7em; pointer-events: none; }
.eb-tb-brand { display: inline-block; font-size: 1.32em; font-weight: 800; color: #0f172a; }
.eb-tb-brand i { font-style: normal; color: #1389fd; }
.eb-tb-h1 {
  margin: 0.24em 0 0;
  font-size: 3.05em;
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-tb-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #1389fd, #7c3aed 58%, #06d6a0);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-tb-sub { margin: 0.5em 0 0; font-size: 1.34em; line-height: 1.4; color: #475569; }
.eb-tb-stage { position: absolute; left: 50%; bottom: 2.7em; width: 84em; height: 37em; transform: translateX(-50%); }
/* Card variant: the index card is ~279px wide, so the settings panel's labels
   would render at ~4px and read as noise. The card shows the scene instead —
   the pane, the wallpaper and the filter effect — with a larger terminal font
   and the panel dropped. The 50% transform the hero uses is not reused here
   because the frame loop owns translateY on .eb-tb-win. */
.eb-tb[data-variant='card'] .eb-tb-stage { bottom: auto; top: 50%; height: 46em; transform: translate(-50%, -50%); }
.eb-tb[data-variant='card'] .eb-tb-win { left: 4em; width: 76em; height: 46em; }
.eb-tb[data-variant='card'] .eb-tb-panel { display: none; }
.eb-tb[data-variant='card'] .eb-tb-term { padding: 1.6em 2.4em; }
.eb-tb[data-variant='card'] .eb-tb-line { font-size: 2.6em; }
.eb-tb[data-variant='card'] .eb-tb-bigtext { font-size: 4.6em; }
/* The card pane is ~120px tall, so the centred text background would sit on top
   of the last output line. One row fewer keeps the two apart. */
.eb-tb[data-variant='card'] .eb-tb-l4 { display: none; }
.eb-tb-win {
  position: absolute;
  left: 0;
  top: 0;
  width: 51em;
  height: 37em;
  border-radius: 0.7em;
  overflow: hidden;
  background: var(--eb-main);
  box-shadow: 0 1em 2.2em rgba(15, 23, 42, 0.3);
  text-align: left;
}
.eb-tb-tabbar { height: 2.9em; display: flex; align-items: stretch; padding: 0 0.6em; background: var(--eb-main-dark); }
.eb-tb-tab {
  display: flex;
  align-items: center;
  gap: 0.45em;
  padding: 0 1.1em;
  border-radius: 0.25em 0.25em 0 0;
  background: var(--eb-main);
  color: var(--eb-text);
  font-size: 1.18em;
  font-weight: 700;
  white-space: nowrap;
}
.eb-tb-pill {
  display: inline-block;
  height: 1.35em;
  padding: 0 0.34em;
  border-radius: 0.68em 0.16em 0.16em 0.68em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.35em;
}
.eb-tb-pane { position: absolute; left: 0; top: 2.9em; right: 0; bottom: 0; overflow: hidden; background: var(--eb-term-bg); }
.eb-tb-wall {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: #08080f;
  background-image:
    radial-gradient(56% 66% at 18% 90%, rgba(255, 122, 89, 0.95) 0%, rgba(255, 122, 89, 0) 62%),
    radial-gradient(48% 50% at 86% 70%, rgba(77, 171, 247, 0.8) 0%, rgba(77, 171, 247, 0) 64%),
    radial-gradient(58% 64% at 56% 100%, rgba(132, 94, 247, 0.8) 0%, rgba(132, 94, 247, 0) 66%),
    radial-gradient(32% 38% at 98% 88%, rgba(18, 184, 134, 0.7) 0%, rgba(18, 184, 134, 0) 60%),
    radial-gradient(26% 30% at 6% 62%, rgba(255, 212, 59, 0.55) 0%, rgba(255, 212, 59, 0) 62%),
    linear-gradient(158deg, #0a0a16 0%, #1a1230 50%, #07080f 100%);
}
.eb-tb-bigtext {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', monospace;
  font-size: 3.6em;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
  opacity: 0;
}
.eb-tb-term {
  position: absolute;
  inset: 0;
  z-index: 2;
  padding: 1.5em 1.6em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', monospace;
}
.eb-tb-line { font-size: 1.62em; line-height: 1.55; white-space: nowrap; color: var(--eb-term-fg); }
.eb-tb-p { color: var(--eb-term-green); }
.eb-tb-d { color: var(--eb-term-blue); }
.eb-tb-ok { color: var(--eb-term-blue); }
.eb-tb-dim { color: var(--eb-term-dim); }
.eb-tb-caret { display: inline-block; width: 0.55em; height: 1.1em; vertical-align: -0.18em; background: #b5bd68; }
.eb-tb-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 30em;
  height: 37em;
  box-sizing: border-box;
  padding: 1.5em;
  border-radius: 0.7em;
  background: var(--eb-main);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 1em 2.2em rgba(15, 23, 42, 0.3);
  text-align: left;
}
.eb-tb-ptitle { font-size: 1.32em; line-height: 1.5; color: var(--eb-text); white-space: nowrap; }
.eb-tb-field {
  position: relative;
  height: 3.7em;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 0 0.9em;
  margin-top: 0.8em;
  border-radius: 0.32em;
  background: var(--eb-field-bg);
  border: 1px solid var(--eb-field-border);
  overflow: hidden;
}
.eb-tb-ftext {
  font-size: 1.55em;
  color: var(--eb-field-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eb-tb-pick { margin-left: auto; padding-left: 1.2em; font-size: 1.4em; color: var(--eb-text-dark); white-space: nowrap; }
.eb-tb-fields { margin-top: 0; }
.eb-tb-fields .eb-tb-field { margin-top: 0.7em; }
.eb-tb-fields .eb-tb-field:first-child { margin-top: 0.8em; }
@media (prefers-reduced-motion: reduce) {
  .eb-tb-blob { filter: none; }
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

const FILTER_FIELDS = [
  ['Opacity', 'opacity'],
  ['Blur', 'blur'],
  ['Brightness', 'brightness'],
  ['Grayscale', 'grayscale'],
  ['Contrast', 'contrast']
]

function fieldRow (label, key, value) {
  return `
          <div class="eb-tb-field" data-f="${key}">
            <span class="eb-tb-ftext">${label}: ${value}</span>
          </div>`
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-tb-head">
        <span class="eb-tb-brand">electerm <i>background</i></span>
        <h2 class="eb-tb-h1">Paint the pane, <em>keep the text</em></h2>
        <p class="eb-tb-sub">A photo, a URL, your own text or the session number &mdash; behind a terminal that stays readable.</p>
      </div>`
  return `
    <div class="eb-tb-deco">
      <span class="eb-tb-dots"></span>
      <span class="eb-tb-blob eb-tb-blob-a"></span>
      <span class="eb-tb-blob eb-tb-blob-b"></span>
    </div>
    ${head}
    <div class="eb-tb-stage">
      <div class="eb-tb-win">
        <div class="eb-tb-tabbar">
          <span class="eb-tb-tab"><span class="eb-tb-pill">2</span><span>zxd@web-01:22</span></span>
        </div>
        <div class="eb-tb-pane">
          <div class="eb-tb-wall"></div>
          <div class="eb-tb-bigtext">${BG_TEXT}</div>
          <div class="eb-tb-term">
            <div class="eb-tb-line"><span class="eb-tb-p">zxd@web-01</span>:<span class="eb-tb-d">~</span>$ kubectl get pods -n prod</div>
            <div class="eb-tb-line eb-tb-dim">NAME                       READY   STATUS    RESTARTS   AGE</div>
            <div class="eb-tb-line"><span class="eb-tb-ok">api-7d9f4c8b6-2xk4n</span>        1/1     Running   0          4d2h</div>
            <div class="eb-tb-line eb-tb-l4"><span class="eb-tb-ok">worker-5b8c9d7f4-qp8zt</span>     1/1     Running   0          4d2h</div>
            <div class="eb-tb-line"><span class="eb-tb-p">zxd@web-01</span>:<span class="eb-tb-d">~</span>$ <span class="eb-tb-caret"></span></div>
          </div>
        </div>
      </div>
      <div class="eb-tb-panel">
        <div class="eb-tb-ptitle">Terminal background image</div>
        <div class="eb-tb-field">
          <span class="eb-tb-ftext" data-value>${IMG_VALUE}</span>
          <span class="eb-tb-pick">choose file</span>
        </div>
        <div class="eb-tb-fields">
          ${FILTER_FIELDS.map(([label, key]) => fieldRow(label, key, F_DEFAULT[key])).join('')}
        </div>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-tb'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm terminal with a wallpaper behind the text, its five background filters changing, then a text background replacing the image')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const el = {
    win: q('.eb-tb-win'),
    panel: q('.eb-tb-panel'),
    wall: q('.eb-tb-wall'),
    big: q('.eb-tb-bigtext'),
    caret: q('.eb-tb-caret'),
    value: q('[data-value]'),
    fields: q('.eb-tb-fields'),
    rows: {}
  }
  for (const [, key] of FILTER_FIELDS) {
    el.rows[key] = root.querySelector('[data-f="' + key + '"] .eb-tb-ftext')
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

  function filterValueAt (t) {
    const on = easeInOut(seg(t, T.fFrom, T.fTo))
    const off = easeInOut(seg(t, T.fBackFrom, T.fBackTo))
    const p = clamp(on - off, 0, 1)
    const out = {}
    for (const key of Object.keys(F_DEFAULT)) {
      out[key] = F_DEFAULT[key] + (F_APPLIED[key] - F_DEFAULT[key]) * p
    }
    return out
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.rootOutFrom, T.rootOutTo))
    root.style.opacity = (easeOut(seg(t, 0, T.rootInTo)) * (1 - gone)).toFixed(3)

    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    el.win.style.opacity = (winP * (1 - gone)).toFixed(3)
    el.win.style.transform = 'translateY(' + ((1 - winP) * 2).toFixed(3) + 'em)'
    el.panel.style.opacity = (winP * (1 - gone)).toFixed(3)
    el.panel.style.transform = 'translateY(' + ((1 - winP) * 2).toFixed(3) + 'em)'

    // wallpaper: fade in once, then swap out for the text background
    const wallIn = easeOut(seg(t, T.wallFrom, T.wallTo))
    const toText = easeInOut(seg(t, T.modeFrom, T.modeTo))
    const backToImg = easeInOut(seg(t, T.modeBackFrom, T.modeBackTo))
    const mode = clamp(toText - backToImg, 0, 1)
    el.wall.style.opacity = (wallIn * (1 - mode)).toFixed(3)
    // the app paints the text background at opacity .3
    el.big.style.opacity = (0.3 * mode).toFixed(3)

    const f = filterValueAt(t)
    el.wall.style.filter =
      'blur(' + (f.blur * BLUR_EM).toFixed(3) + 'em)' +
      ' opacity(' + f.opacity.toFixed(3) + ')' +
      ' brightness(' + f.brightness.toFixed(3) + ')' +
      ' contrast(' + f.contrast.toFixed(3) + ')' +
      ' grayscale(' + f.grayscale.toFixed(3) + ')'

    for (const [label, key] of FILTER_FIELDS) {
      const shown = Math.round(f[key] * 100) / 100
      const node = el.rows[key]
      const text = label + ': ' + shown
      if (node.textContent !== text) node.textContent = text
    }

    // the filter fields are hidden for a text background, exactly as the app does
    const fieldsOpacity = (1 - mode) * (1 - gone)
    el.fields.style.opacity = fieldsOpacity.toFixed(3)
    el.fields.style.display = fieldsOpacity < 0.01 ? 'none' : ''

    const wantValue = mode > 0.5 ? TEXT_VALUE : IMG_VALUE
    if (el.value.textContent !== wantValue) el.value.textContent = wantValue

    // caret blinks off the timeline so a frozen frame is deterministic
    el.caret.style.opacity = (Math.floor(t / 530) % 2 === 0 ? 1 : 0)
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // settled frame that shows the point: the wallpaper with the filters applied
    frame(T.fHoldTo - 200)
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
