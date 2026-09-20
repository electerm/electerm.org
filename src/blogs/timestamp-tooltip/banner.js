/**
 * Animated banner for the "Unix timestamp tooltip" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the electerm window (tab bar + terminal), the typed command,
 * the drag selection, the tooltip, the cartoon pointer and the copy toast
 * are all plain DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * The window is modelled on the real electerm UI, and the colours and
 * metrics below are taken from the app itself:
 *   tab bar / tabs ..... src/client/components/tabs/tabs.styl
 *   UI theme ........... src/client/css/includes/theme.styl (--main, --main-dark, ...)
 *   terminal theme ..... src/client/common/theme-defaults.js (defaultThemeDarkTerminal)
 *   cursor ............. src/client/common/default-setting.js
 *                        (cursorStyle: 'block', cursorBlink: false)
 *   tooltip ............ src/client/components/terminal/unix-timestamp-tooltip.jsx
 *                        (rgba(0,0,0,.75), 4px radius, 12px, copy icon, no arrow)
 *   "Copied" toast ..... src/client/common/clipboard.js + components/common/message.styl
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + full window (blog post page)
 *   data-eb-banner="card"  -> window only         (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * One deliberate liberty: the terminal tails two log lines rather than one, so
 * that the tooltip — which is a line tall and opens a line above the cursor,
 * exactly as it does in the app — lands on log output instead of covering the
 * command you just watched being typed.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales to any container.
 */

const STYLE_ID = 'eb-bn-style'

// One full pass of the story, in ms.
const PERIOD = 7900

const T = {
  typeFrom: 420, // the command is typed out
  typeTo: 1420,
  outFrom: 1700, // the log tail arrives, a line at a time
  outTo: 2000,
  out2From: 1980,
  out2To: 2280,
  enterFrom: 2400, // the pointer arrives from the right of the line
  enterTo: 2750,
  dragFrom: 2750, // ... and drags the timestamp
  dragTo: 3400,
  tipFrom: 3400, // the tooltip pops in the moment the selection is complete
  tipTo: 3800,
  liftFrom: 4850, // the pointer travels up to the copy icon
  liftTo: 5400,
  copyAt: 5520, // ... and copies the formatted string
  toastTo: 5820,
  toastOutFrom: 6450,
  toastOutTo: 6700,
  fadeFrom: 7000,
  fadeTo: 7450
}

const CMD = 'tail -n2 app.log'
const OUT1 = '{"ts":1789821083907,"msg":"ok"}'
const OUT = '{"ts":1789821105611,"msg":"ok"}'
const TS = '1789821105611'
const FORMATTED = '2026/9/19 20:31:45'

// Monospace, so character offsets are exact fractions of the line width.
const SEL_LEFT = (OUT.indexOf(TS) / OUT.length) * 100
const SEL_WIDTH = (TS.length / OUT.length) * 100
const DRAG_END = SEL_LEFT + SEL_WIDTH
// Where the pointer waits before the drag starts (just past the end of the line).
const PTR_X0 = 96

// The real tooltip sits 36px above the mouse, and is ~20px tall. Both scale
// with the terminal font, which the banner renders ~1.7x life size. The lift
// is pulled in a touch from 3 to 2.8 so the tooltip's top edge clears the
// descenders of the line above instead of slicing through them.
const TIP_LIFT = 33.6 / 12 // in tooltip font-sizes
const TIP_FONT = 0.85 // tooltip font, as a fraction of the terminal font

const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'
// antd CopyOutlined / CloseOutlined / PlusOutlined / DownOutlined / CheckCircleFilled,
// the same glyphs the app renders (via @ant-design/icons).
const COPY_PATH = 'M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530c0 17.7 14.3 32 32 32h512c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zm-40 554H232V232h432v514z'
const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const CHECK_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 0 1-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

const CSS = `
.eb-bn {
  /* real electerm UI theme — src/client/css/includes/theme.styl, with the
     shipped dark theme (src/client/common/theme-defaults.js, defaultThemeDark)
     injected over it at runtime, which is where --main #121214 comes from.
     --main-lighter is only defined in theme.styl, so #5b5a5b is what ships. */
  --eb-ink: #16233a;
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-main-lighter: #5b5a5b;
  --eb-text: #ddd;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-error: #ef476f;
  /* real electerm default terminal theme — src/client/common/theme-defaults.js */
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-cursor: #b5bd68;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  --eb-term-sel: rgba(200, 200, 200, 0.6);
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
.eb-bn-head { position: absolute; left: 5em; right: 5em; top: 3.6em; }
.eb-bn-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
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
  margin: 0.26em 0 0;
  font-size: 3.6em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-bn-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-bn-sub {
  margin: 0.55em 0 0;
  max-width: 56em;
  font-size: 1.6em;
  line-height: 1.4;
  color: #475569;
}

/* ---------- the electerm window ----------
   Chrome and terminal are one piece, sized from the banner's em, so the whole
   window scales as a unit. */
.eb-bn-app {
  position: absolute;
  left: 50%;
  bottom: 5.4%;
  transform: translateX(-50%);
  width: 68em;
  background: var(--eb-term-bg);
  border-radius: 0.8em;
  box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.2);
  overflow: hidden;
  text-align: left;
  animation: eb-bn-glow 4.4s ease-in-out infinite;
}
@keyframes eb-bn-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.34), 0 0 3.4em rgba(124, 58, 237, 0.4); }
}

/* ---------- tab bar ----------
   1em here is the tab font size, exactly as in the app's tabs.styl where the
   bar is 36px tall against a 14px font. */
.eb-bn-tabbar {
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.3em;
  line-height: 1;
}
.eb-bn-tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.42em;
  height: 100%;
  min-width: 8.4em;
  max-width: 15em;
  padding: 0 1em;
  border-radius: 0.21em 0.21em 0 0;
  background: var(--eb-main-dark);
  color: var(--eb-text-dark);
  white-space: nowrap;
}
/* the app bolds the tab of the focused batch (tabs.styl .tab.active-all) */
.eb-bn-tab.is-active {
  background: var(--eb-main);
  color: var(--eb-text);
  font-weight: 700;
}
.eb-bn-tab-name { overflow: hidden; text-overflow: ellipsis; }
.eb-bn-tab-status {
  position: absolute;
  left: 0.14em;
  top: 0.14em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-text-dark);
}
.eb-bn-tab-status.is-connected { background: var(--eb-success); }
/* .tab-count — 20px pill against a 14px font, radii 10px/2px */
.eb-bn-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
/* .tab-close — 16px disc; the app only reveals it on hover, we keep it on the
   focused tab so the tab reads as a tab at thumbnail size */
.eb-bn-tab-close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15em;
  height: 1.15em;
  border-radius: 50%;
  background: var(--eb-main);
  color: var(--eb-text);
}
.eb-bn-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-bn-tab-add,
.eb-bn-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  height: 1.6em;
  color: var(--eb-text);
}
.eb-bn-tab-add { width: 1.5em; margin-left: 0.3em; }
.eb-bn-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-bn-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); }
.eb-bn-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }

/* ---------- terminal ----------
   1em here is the terminal font. It is rendered well above life size so the
   command and the log line stay legible in a 780px banner. */
.eb-bn-term {
  position: relative;
  padding: 1.3em 1.5em 1.4em;
  font-size: 3em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.45;
  color: var(--eb-term-fg);
  white-space: nowrap;
}
.eb-bn-line { line-height: 1.45; }
/* the tailed lines are revealed by the timeline */
.eb-bn-line-out1, .eb-bn-line-out { opacity: 0; }
.eb-bn-line-out { position: relative; }
.eb-bn-ps1 { color: var(--eb-term-green); }
.eb-bn-ps1-path { color: var(--eb-term-blue); }
/* xterm's cursor: a solid block, cursorBlink is off by default */
.eb-bn-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.04em;
  vertical-align: -0.26em;
  background: var(--eb-term-cursor);
}
.eb-bn-out { position: relative; display: inline-block; white-space: nowrap; }

/* the terminal selection: xterm paints it at the theme's selectionBackground,
   which for the default theme is a 60% white over the terminal background */
.eb-bn-sel {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: var(--eb-term-sel);
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}

/* ---------- tooltip ----------
   1em here is the tooltip font, 0.85 x the terminal font (12px against the
   terminal's 14px in the app). Offsets read as 0.85 x terminal units. */
.eb-bn-tip {
  position: absolute;
  left: 0;
  top: calc(50% - 3em);
  display: flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.22em 0.44em;
  border-radius: 0.22em;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 0.85em;
  line-height: 1.3;
  white-space: nowrap;
  opacity: 0;
  box-shadow: 0 0.4em 1em rgba(0, 0, 0, 0.36);
  transform: translate(-50%, 0) scale(0.72);
  transform-origin: 50% 100%;
  pointer-events: none;
  z-index: 2;
}
.eb-bn-tip-icon { width: 0.85em; height: 0.85em; fill: currentColor; opacity: 0.85; flex: none; }

/* ---------- cartoon pointer + click ripple ---------- */
.eb-bn-pointer {
  position: absolute;
  left: 100%;
  top: 50%;
  width: 1.1em;
  height: 1.5em;
  margin: -0.12em 0 0 -0.12em;
  opacity: 0;
  filter: drop-shadow(0 0.08em 0.16em rgba(0, 0, 0, 0.42));
  pointer-events: none;
  z-index: 3;
}
.eb-bn-ripple {
  position: absolute;
  left: 0;
  top: 50%;
  width: 0.9em;
  height: 0.9em;
  border: 0.14em solid var(--eb-term-blue);
  border-radius: 50%;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4);
  pointer-events: none;
  z-index: 4;
}

/* ---------- "Copied" toast ----------
   electerm's own message component: main-lighter pill, 4px radius, success
   check, pinned 20px from the top of the window. */
.eb-bn-toast {
  position: absolute;
  left: 50%;
  top: 1.72em;
  opacity: 0;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 5;
}
.eb-bn-toast-inner {
  display: flex;
  align-items: center;
  gap: 0.55em;
  padding: 0.55em 1.1em;
  border-radius: 0.29em;
  background: var(--eb-main-lighter);
  color: var(--eb-text);
  font-size: 1.2em;
  line-height: 1.3;
  white-space: nowrap;
  box-shadow: 0 0.34em 1em rgba(0, 0, 0, 0.24);
}
.eb-bn-toast-icon { width: 1.1em; height: 1.1em; fill: var(--eb-success); flex: none; }

/* ---------- card (blog index) variant ---------- */
.eb-bn[data-variant='card'] .eb-bn-app {
  bottom: auto;
  top: 50%;
  width: 88em;
  transform: translate(-50%, -50%);
}
/* the thumbnail has no headline to share the height with, so the window
   scales up until it nearly fills the card */
.eb-bn[data-variant='card'] .eb-bn-term { font-size: 3.8em; }

@media (prefers-reduced-motion: reduce) {
  .eb-bn-dots, .eb-bn-spark, .eb-bn-app { animation: none !important; }
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
        <p class="eb-bn-sub">Select a number in the terminal and a tooltip tells you the moment it is.</p>
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
    <div class="eb-bn-app">
      <div class="eb-bn-tabbar">
        <span class="eb-bn-tab">
          <span class="eb-bn-tab-status"></span>
          <span class="eb-bn-tab-count">1</span>
          <span class="eb-bn-tab-name">local</span>
        </span>
        <span class="eb-bn-tab is-active">
          <span class="eb-bn-tab-status is-connected"></span>
          <span class="eb-bn-tab-count">2</span>
          <span class="eb-bn-tab-name">zxd@web-01:22</span>
          <span class="eb-bn-tab-close">${icon(CLOSE_PATH, '')}</span>
        </span>
        <span class="eb-bn-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-bn-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-bn-term">
        <div class="eb-bn-line"><span class="eb-bn-ps1">zxd@web-01</span>:<span class="eb-bn-ps1-path">~</span>$&nbsp;docker ps -q</div>
        <div class="eb-bn-line">3f2a91c4b7d1</div>
        <div class="eb-bn-line"><span class="eb-bn-ps1">zxd@web-01</span>:<span class="eb-bn-ps1-path">~</span>$&nbsp;<span class="eb-bn-cmd"></span><span class="eb-bn-caret"></span></div>
        <div class="eb-bn-line eb-bn-line-out1">${OUT1}</div>
        <div class="eb-bn-line eb-bn-line-out">
          <span class="eb-bn-out">${OUT}<span class="eb-bn-sel"></span><span class="eb-bn-ripple"></span><span class="eb-bn-pointer"><svg viewBox="-3 -3 29 39" width="100%" height="100%"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span><span class="eb-bn-tip"><span>${FORMATTED}</span>${icon(COPY_PATH, 'eb-bn-tip-icon')}</span></span>
        </div>
      </div>
      <div class="eb-bn-toast">
        <span class="eb-bn-toast-inner">${icon(CHECK_PATH, 'eb-bn-toast-icon')}<span>Copied</span></span>
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
    `electerm: selecting the timestamp ${TS} in the terminal shows the tooltip ${FORMATTED}`)
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    cmd: root.querySelector('.eb-bn-cmd'),
    caret: root.querySelector('.eb-bn-caret'),
    lineOut1: root.querySelector('.eb-bn-line-out1'),
    lineOut: root.querySelector('.eb-bn-line-out'),
    out: root.querySelector('.eb-bn-out'),
    sel: root.querySelector('.eb-bn-sel'),
    tip: root.querySelector('.eb-bn-tip'),
    pointer: root.querySelector('.eb-bn-pointer'),
    ripple: root.querySelector('.eb-bn-ripple'),
    toast: root.querySelector('.eb-bn-toast'),
    term: root.querySelector('.eb-bn-term')
  }

  el.sel.style.left = SEL_LEFT + '%'
  // The real tooltip is placed at the mouse position (unix-timestamp-tooltip.jsx
  // uses the last mousemove x), and a drag ends on the right edge of what it
  // selected — so the tooltip hangs off the end of the timestamp, not its middle.
  el.tip.style.left = DRAG_END + '%'

  // Geometry that depends on the rendered text and font metrics: where the
  // copy icon sits inside the tooltip, and how far above the line the pointer
  // has to travel to reach it. Recomputed whenever the banner is resized.
  const geom = { x1: DRAG_END, y1: 0 }
  const measure = () => {
    const outW = el.out.offsetWidth
    const tipW = el.tip.offsetWidth
    const termFont = parseFloat(window.getComputedStyle(el.term).fontSize)
    if (!outW || !tipW || !termFont) return
    const tipFont = termFont * TIP_FONT
    // right-hand copy icon: tooltip padding + half the icon, in from the edge
    const inset = (0.44 + 0.425) * tipFont
    geom.x1 = DRAG_END + ((tipW / 2 - inset) / outW) * 100
    // the tooltip's vertical middle, relative to the middle of the log line
    geom.y1 = -(TIP_LIFT * tipFont - el.tip.offsetHeight / 2)
  }

  // 1em === 1% of the banner width, so the whole design scales with it.
  const fit = () => {
    const w = root.clientWidth
    if (w) root.style.fontSize = (w / 100) + 'px'
    measure()
  }
  fit()
  if (window.ResizeObserver) {
    new window.ResizeObserver(fit).observe(root)
  } else {
    window.addEventListener('resize', fit)
  }
  // geom is measured off rendered text, so re-measure once webfonts settle
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure)
  }

  function frame (t) {
    // command being typed, block cursor only while the shell is still waiting
    const typed = Math.round(easeOut(seg(t, T.typeFrom, T.typeTo)) * CMD.length)
    el.cmd.textContent = CMD.slice(0, typed)
    el.caret.style.display = t < T.outFrom ? '' : 'none'

    // the log tail arrives, one line at a time
    const outP1 = easeOut(seg(t, T.outFrom, T.outTo))
    el.lineOut1.style.opacity = outP1
    el.lineOut1.style.transform = 'translateY(' + ((1 - outP1) * 0.4).toFixed(3) + 'em)'
    const outP = easeOut(seg(t, T.out2From, T.out2To))
    el.lineOut.style.opacity = outP
    el.lineOut.style.transform = 'translateY(' + ((1 - outP) * 0.4).toFixed(3) + 'em)'

    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))

    // the pointer arrives, then drags the timestamp
    const arrive = easeOut(seg(t, T.enterFrom, T.enterTo))
    const dragP = easeInOut(seg(t, T.dragFrom, T.dragTo))
    const px0 = PTR_X0 + (SEL_LEFT - PTR_X0) * arrive
    // While the pointer is still travelling in, dragP is 0 and this is just
    // px0; from dragFrom on it is exactly the right edge of the selection.
    const dragX = px0 + dragP * SEL_WIDTH

    // selection sweeping across the digits as the pointer drags
    el.sel.style.width = (dragP * SEL_WIDTH).toFixed(3) + '%'
    el.sel.style.opacity = (dragP > 0 ? 1 - gone : 0).toFixed(3)

    // the pointer lifts off the line and lands on the tooltip's copy icon
    const liftP = easeInOut(seg(t, T.liftFrom, T.liftTo))
    el.pointer.style.left = (dragX + (geom.x1 - dragX) * liftP).toFixed(3) + '%'
    el.pointer.style.transform = 'translateY(' + (geom.y1 * liftP).toFixed(2) + 'px)'
    el.pointer.style.opacity =
      (seg(t, T.enterFrom, T.enterFrom + 240) * (1 - gone)).toFixed(3)

    // tooltip popping up the instant the whole timestamp is selected
    const tipP = seg(t, T.tipFrom, T.tipTo)
    const copied = t >= T.copyAt
    el.tip.style.opacity = (tipP * (copied ? 0 : 1) * (1 - gone)).toFixed(3)
    const tipScale = 0.72 + 0.28 * easeOutBack(tipP)
    el.tip.style.transform = 'translate(-50%, 0) scale(' + tipScale.toFixed(3) + ')'

    // click ripple at the copy icon
    const ripP = seg(t, T.copyAt, T.copyAt + 430)
    el.ripple.style.opacity = (ripP > 0 && ripP < 1 ? (1 - ripP) * (1 - gone) : 0).toFixed(3)
    el.ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.4 + ripP * 2.6).toFixed(3) + ')'
    el.ripple.style.left = geom.x1.toFixed(3) + '%'
    el.ripple.style.marginTop = geom.y1.toFixed(2) + 'px'

    // ... and the app's "Copied" toast
    const inP = easeOut(seg(t, T.copyAt, T.toastTo))
    const outP2 = easeInOut(seg(t, T.toastOutFrom, T.toastOutTo))
    const toast = inP * (1 - outP2) * (1 - gone)
    el.toast.style.opacity = toast.toFixed(3)
    el.toast.style.transform =
      'translateX(-50%) translateY(' + ((1 - inP) * -0.9).toFixed(3) + 'em)'
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.tipTo + 200)
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

// The path this module was served from, e.g. /blogs/my-post/banner.js.
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
    // The blog index loads every post's banner module, so a mount has to be
    // the one this module was loaded for. A host with no data-eb-banner-src
    // (a test harness) is fair game for any module.
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
