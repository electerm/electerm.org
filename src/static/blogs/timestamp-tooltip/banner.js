/**
 * Animated banner for the "Unix timestamp tooltip" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas:
 * the gradient, the polka dots, the terminal chrome, the typed command,
 * the selection sweep, the tooltip with the formatted date, the cartoon
 * cursor and the copy beat are all plain DOM + CSS, driven by one
 * requestAnimationFrame timeline.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> full composition (blog post page)
 *   data-eb-banner="card"  -> terminal only  (blog index thumbnail)
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales to any container.
 */

const STYLE_ID = 'eb-bn-style'

// One full pass of the story, in ms.
const PERIOD = 7200

const T = {
  typeFrom: 350, // the command is typed out
  typeTo: 1350,
  outFrom: 1650, // the log line appears
  outTo: 2000,
  selFrom: 2250, // the timestamp gets selected
  selTo: 2850,
  tipFrom: 2850, // the tooltip pops in
  tipTo: 3250,
  curFrom: 4350, // the cursor travels to the tooltip
  curTo: 4900,
  copyAt: 5050, // ... and copies the formatted string
  fadeFrom: 6350,
  fadeTo: 6800
}

const CMD = 'tail -n1 app.log'
const OUT = '{"ts":1789821105611,"msg":"ok"}'
const TS = '1789821105611'
const FORMATTED = '2026/9/19 20:31:45'

// Monospace, so character offsets are exact fractions of the line width.
const SEL_LEFT = (OUT.indexOf(TS) / OUT.length) * 100
const SEL_WIDTH = (TS.length / OUT.length) * 100
const TIP_CENTER = SEL_LEFT + SEL_WIDTH / 2

// Where the cartoon cursor starts and where it ends up.
// The cursor comes in from past the end of the line and settles on the
// top-right corner of the tooltip, so it reads as a click without covering
// the formatted date.
const CUR_X0 = 100
const CUR_X1 = TIP_CENTER + 10
const CUR_Y0 = 0.95
const CUR_Y1 = 1.8
const RIPPLE_Y = 2.3

const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'
const COPY_ICON = '<svg class="eb-bn-tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.4"/><path d="M5.4 15H4.2A1.2 1.2 0 0 1 3 13.8V4.2A1.2 1.2 0 0 1 4.2 3h9.6A1.2 1.2 0 0 1 15 4.2v1.2"/></svg>'
const CHECK_ICON = '<svg class="eb-bn-tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.6 9.4 18 20 6.6"/></svg>'

const CSS = `
.eb-bn {
  --eb-ink: #16233a;
  --eb-term: #0f1a2c;
  --eb-bar: #1d2b45;
  --eb-text: #e6edf3;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e8f1ff 0%, #f2ecff 52%, #fdeef5 100%);
  color: var(--eb-ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}

/* ---------- background decoration ---------- */
.eb-bn-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-bn-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-bn-drift 34s linear infinite;
}
@keyframes eb-bn-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-bn-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-bn-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-bn-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-bn-spark {
  position: absolute;
  width: 1.7em;
  height: 1.7em;
  background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-bn-twinkle 3.6s ease-in-out infinite;
}
.eb-bn-spark-a { right: 7.5em; top: 4.6em; }
.eb-bn-spark-b { right: 14.5em; top: 12em; width: 1.05em; height: 1.05em; background: #ec4899; animation-delay: 0.7s; }
.eb-bn-spark-c { right: 4.2em; top: 15.5em; width: 1.25em; height: 1.25em; background: #14b8a6; animation-delay: 1.4s; }
@keyframes eb-bn-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}

/* ---------- headline ---------- */
.eb-bn-head { position: absolute; left: 5em; right: 5em; top: 4.2em; }
.eb-bn-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.45em;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #2563eb;
}
.eb-bn-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-bn-h1 {
  margin: 0.3em 0 0;
  font-size: 4.2em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-bn-h1 em {
  font-style: normal;
  color: #2563eb;
  background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-bn-sub {
  margin: 0.6em 0 0;
  max-width: 54em;
  font-size: 1.8em;
  line-height: 1.4;
  color: #475569;
}

/* ---------- terminal window ----------
   Every em in here is relative to the terminal's own font-size, so the
   whole window (chrome, text, selection, tooltip) scales as one piece. */
.eb-bn-term {
  position: absolute;
  left: 50%;
  bottom: 6.4%;
  transform: translateX(-50%);
  width: 23.2em;
  font-size: 3em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  background: var(--eb-term);
  border: 0.16em solid var(--eb-ink);
  border-radius: 1.1em;
  box-shadow: 0 1.2em 2.6em rgba(15, 23, 42, 0.3), 0 0 2.4em rgba(37, 99, 235, 0.26);
  animation: eb-bn-glow 4.4s ease-in-out infinite;
}
@keyframes eb-bn-glow {
  0%, 100% { box-shadow: 0 1.2em 2.6em rgba(15, 23, 42, 0.3), 0 0 2.2em rgba(37, 99, 235, 0.22); }
  50% { box-shadow: 0 1.2em 2.6em rgba(15, 23, 42, 0.32), 0 0 3.6em rgba(124, 58, 237, 0.44); }
}
.eb-bn-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.55em;
  height: 1.9em;
  padding: 0 1em;
  background: var(--eb-bar);
  border-bottom: 1px solid #3d5375;
  border-radius: 0.9em 0.9em 0 0;
}
.eb-bn-dot { width: 0.68em; height: 0.68em; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.35); }
.eb-bn-title {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.78em;
  color: #93a9c9;
  letter-spacing: 0.02em;
}
/* the bottom padding is the room the tooltip opens into */
.eb-bn-body { position: relative; padding: 1.2em 1.5em 2.2em; }
.eb-bn-l1, .eb-bn-l2 { white-space: nowrap; line-height: 1.7em; }
.eb-bn-l1 { display: flex; align-items: baseline; color: var(--eb-text); }
.eb-bn-prompt { color: #5eead4; margin-right: 0.6em; }
.eb-bn-caret {
  display: inline-block;
  width: 0.62em;
  height: 1.15em;
  margin-left: 0.14em;
  background: #7dd3fc;
  transform: translateY(0.2em);
  animation: eb-bn-blink 1.05s steps(1, end) infinite;
}
@keyframes eb-bn-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }

.eb-bn-l2 { position: relative; margin-top: 0.4em; color: var(--eb-text); }
.eb-bn-out { position: relative; display: inline-block; white-space: nowrap; }

/* terminal selection block, sized/positioned from the timeline */
.eb-bn-sel {
  position: absolute;
  left: 0;
  top: -0.18em;
  bottom: -0.18em;
  width: 0;
  border-radius: 0.16em;
  background: rgba(56, 189, 248, 0.34);
  box-shadow: 0 0 0 0.06em rgba(125, 211, 252, 0.55);
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}

/* ---------- tooltip ----------
   em in here is the tooltip's own font-size (0.9 x the terminal font), so
   the offsets read as 0.9 x what you would expect in terminal units. */
.eb-bn-tip {
  position: absolute;
  top: 2.05em;
  left: 0;
  display: flex;
  align-items: center;
  padding: 0.34em 0.6em;
  border-radius: 0.34em;
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 0.9em;
  line-height: 1.25;
  white-space: nowrap;
  opacity: 0;
  box-shadow: 0 0.5em 1.4em rgba(0, 0, 0, 0.34);
  transform: translate(-50%, 0) scale(0.72);
  transform-origin: 50% 0;
  pointer-events: none;
  z-index: 2;
}
.eb-bn-tip-arrow {
  position: absolute;
  left: 50%;
  top: -0.3em;
  width: 0.78em;
  height: 0.78em;
  background: rgba(0, 0, 0, 0.78);
  border-radius: 0.08em;
  transform: translateX(-50%) rotate(45deg);
}
.eb-bn-tip-main, .eb-bn-tip-copied { display: inline-flex; align-items: center; gap: 0.4em; }
.eb-bn-tip-copied { display: none; color: #6ee7b7; }
.eb-bn-tip-icon { width: 1em; height: 1em; opacity: 0.85; flex: none; }
.eb-bn-tip[data-copied='1'] { background: rgba(6, 78, 59, 0.88); }
.eb-bn-tip[data-copied='1'] .eb-bn-tip-arrow { background: rgba(6, 78, 59, 0.88); }
.eb-bn-tip[data-copied='1'] .eb-bn-tip-main { display: none; }
.eb-bn-tip[data-copied='1'] .eb-bn-tip-copied { display: inline-flex; }

/* ---------- cartoon cursor + click ripple ---------- */
.eb-bn-cursor {
  position: absolute;
  left: 100%;
  top: 0.95em;
  width: 1.1em;
  height: 1.55em;
  opacity: 0;
  filter: drop-shadow(0 0.1em 0.2em rgba(15, 23, 42, 0.35));
  pointer-events: none;
  z-index: 3;
}
.eb-bn-ripple {
  position: absolute;
  left: 0;
  top: 0;
  width: 0.9em;
  height: 0.9em;
  border: 0.16em solid #7dd3fc;
  border-radius: 50%;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4);
  pointer-events: none;
}

/* ---------- card (blog index) variant ---------- */
.eb-bn[data-variant='card'] .eb-bn-term {
  bottom: auto;
  top: 50%;
  font-size: 3.6em;
  transform: translate(-50%, -50%);
}
.eb-bn[data-variant='card'] .eb-bn-body { padding: 1.2em 1.4em 2.2em; }

@media (prefers-reduced-motion: reduce) {
  .eb-bn-dots, .eb-bn-spark, .eb-bn-term, .eb-bn-caret { animation: none !important; }
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

function easeOutBack (p) {
  const c = 1.70158
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2)
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-bn-head">
        <span class="eb-bn-brand">electerm</span>
        <h2 class="eb-bn-h1">Read any <em>timestamp</em> at a glance</h2>
        <p class="eb-bn-sub">Select a number in the terminal to read it as a date.</p>
      </div>`
  return `
    <div class="eb-bn-deco">
      <span class="eb-bn-blob eb-bn-blob-a"></span>
      <span class="eb-bn-blob eb-bn-blob-b"></span>
      <span class="eb-bn-dots"></span>
      <span class="eb-bn-spark eb-bn-spark-a"></span>
      <span class="eb-bn-spark eb-bn-spark-b"></span>
      <span class="eb-bn-spark eb-bn-spark-c"></span>
    </div>
    ${head}
    <div class="eb-bn-term">
      <div class="eb-bn-bar">
        <span class="eb-bn-dot" style="background:#ff5f57"></span>
        <span class="eb-bn-dot" style="background:#febc2e"></span>
        <span class="eb-bn-dot" style="background:#28c840"></span>
        <span class="eb-bn-title">app@web-01 — zsh</span>
      </div>
      <div class="eb-bn-body">
        <div class="eb-bn-l1">
          <span class="eb-bn-prompt">$</span><span class="eb-bn-cmd"></span><span class="eb-bn-caret"></span>
        </div>
        <div class="eb-bn-l2">
          <span class="eb-bn-out">${OUT}<span class="eb-bn-sel"></span><span class="eb-bn-ripple"></span><span class="eb-bn-cursor"><svg viewBox="-3 -3 29 39" width="100%" height="100%"><path d="${CURSOR_PATH}" fill="#fff" stroke="#16233a" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span><span class="eb-bn-tip" data-copied="0"><span class="eb-bn-tip-main"><span>${FORMATTED}</span>${COPY_ICON}</span><span class="eb-bn-tip-copied">${CHECK_ICON}<span>Copied!</span></span><span class="eb-bn-tip-arrow"></span></span></span>
        </div>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-bn'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    `electerm terminal: selecting the timestamp ${TS} shows the tooltip ${FORMATTED}`)
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    cmd: root.querySelector('.eb-bn-cmd'),
    caret: root.querySelector('.eb-bn-caret'),
    l2: root.querySelector('.eb-bn-l2'),
    sel: root.querySelector('.eb-bn-sel'),
    tip: root.querySelector('.eb-bn-tip'),
    cursor: root.querySelector('.eb-bn-cursor'),
    ripple: root.querySelector('.eb-bn-ripple')
  }

  el.sel.style.left = SEL_LEFT + '%'
  el.tip.style.left = TIP_CENTER + '%'

  // 1em === 1% of the banner width, so the whole design scales with it.
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
    // command being typed, caret only while the shell is still "waiting"
    const typed = Math.round(easeOut(seg(t, T.typeFrom, T.typeTo)) * CMD.length)
    el.cmd.textContent = CMD.slice(0, typed)
    el.caret.style.display = t < T.outFrom ? '' : 'none'

    // the log line slides in
    const outP = easeOut(seg(t, T.outFrom, T.outTo))
    el.l2.style.opacity = outP
    el.l2.style.transform = 'translateY(' + ((1 - outP) * 0.5).toFixed(3) + 'em)'

    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))

    // selection sweeping across the digits
    const selP = easeInOut(seg(t, T.selFrom, T.selTo))
    el.sel.style.width = (selP * SEL_WIDTH).toFixed(3) + '%'
    el.sel.style.opacity = (selP > 0 ? 1 - gone : 0).toFixed(3)

    // tooltip popping up above the selection
    const tipP = seg(t, T.tipFrom, T.tipTo)
    el.tip.style.opacity = (tipP * (1 - gone)).toFixed(3)
    const tipScale = 0.72 + 0.28 * easeOutBack(tipP)
    el.tip.style.transform = 'translate(-50%, 0) scale(' + tipScale.toFixed(3) + ')'
    el.tip.setAttribute('data-copied', t >= T.copyAt ? '1' : '0')

    // cursor travelling to the tooltip, then clicking it
    const curP = easeInOut(seg(t, T.curFrom, T.curTo))
    el.cursor.style.opacity = (seg(t, T.curFrom, T.curFrom + 220) * (1 - gone)).toFixed(3)
    el.cursor.style.left = (CUR_X0 + (CUR_X1 - CUR_X0) * curP).toFixed(3) + '%'
    el.cursor.style.top = (CUR_Y0 + (CUR_Y1 - CUR_Y0) * curP).toFixed(3) + 'em'

    // click ripple
    const ripP = seg(t, T.curTo, T.curTo + 430)
    el.ripple.style.opacity = (ripP > 0 && ripP < 1 ? 1 - ripP : 0).toFixed(3)
    el.ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.4 + ripP * 2.6).toFixed(3) + ')'
    el.ripple.style.left = CUR_X1 + '%'
    el.ripple.style.top = RIPPLE_Y + 'em'
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.copyAt + 200)
    return
  }

  // Pause the loop while the banner is scrolled out of view.
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

export function initBanners (doc = document) {
  injectStyle()
  const hosts = doc.querySelectorAll('[data-eb-banner]')
  for (const host of hosts) mount(host)
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initBanners())
  } else {
    initBanners()
  }
}
