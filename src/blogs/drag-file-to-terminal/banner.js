/**
 * Animated banner for the "drag file to terminal" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the electerm window (tab bar + one terminal pane), the dragged
 * file chip, the drop highlight, the drop-file dialog (trz / rz / paste path),
 * the pointer, the typed `trz` command and the upload progress bar are all
 * plain DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * One act, in the order the article introduces the feature:
 *
 *   1. A file chip (`deploy.tar.gz`) slides in from the top-right and is
 *      dragged into the terminal pane — the terminal edge glows: drop target.
 *   2. The drop dialog pops over the pane: `trz` / `rz` / `paste path`.
 *   3. The pointer glides to `trz` and clicks it — the dialog fades, `trz`
 *      is typed into the shell and Enter lands.
 *   4. The progress bar runs 0 → 100%, the shell prints `done` and returns
 *      to a prompt. That is the whole feature: drag, pick, uploaded.
 *
 * The window is modelled on the real electerm UI, and the colours and metrics
 * below are taken from the app itself:
 *   tab bar / tabs ..... src/client/components/tabs/tabs.styl
 *   session control bar  src/client/components/terminal/terminal.styl
 *                        (.terminal-control: --main, line-height 32px,
 *                         padding 0 10px)
 *   UI theme ........... src/client/css/includes/theme.styl, with the shipped
 *                        dark theme (src/client/common/theme-defaults.js,
 *                        defaultThemeDark) injected over it at runtime
 *   terminal theme ..... src/client/common/theme-defaults.js (defaultThemeDarkTerminal)
 *   cursor ............. src/client/common/default-setting.js
 *                        (cursorStyle: 'block', cursorBlink: false)
 *   dialog ............. src/client/components/terminal/drop-file-modal.jsx
 *                        (trz / rz / inputOnly footer for ssh sessions)
 *   decision logic ..... src/client/components/terminal/mixins/term-file-drop.js
 *                        (dragDropBehavior ask/trz/rz/inputOnly; stages the
 *                        file list then sends `trz`/`rz` + Enter)
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + full window (blog post page)
 *   data-eb-banner="card"  -> window only         (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales to any container.
 */

const STYLE_ID = 'eb-df-style'

// One full pass of the story, in ms.
const PERIOD = 9800

const T = {
  chipFrom: 300, // file chip slides in, top-right
  chipTo: 1000,
  dragFrom: 1100, // chip is dragged into the terminal pane
  dragTo: 2600,
  dropHotFrom: 2400, // terminal edge glows: valid drop target
  dropHotTo: 3000,
  chipGoneFrom: 2700, // chip dissolves into the terminal
  chipGoneTo: 3000,
  modalFrom: 3050, // the trz / rz / paste-path dialog pops
  modalTo: 3500,
  ptrFrom: 4000, // pointer glides in toward the trz button
  ptrTo: 4700,
  clickAt: 4850, // ... and clicks trz
  clickLen: 320,
  modalOutFrom: 5050, // dialog fades
  modalOutTo: 5400,
  typeFrom: 5500, // `trz` is typed into the shell
  typeTo: 6000,
  enterAt: 6150, // Enter lands
  barFrom: 6300, // upload progress runs 0 -> 100%
  barTo: 7900,
  doneFrom: 8000, // `done`, prompt returns
  doneTo: 8350,
  fadeFrom: 8900,
  fadeTo: 9400
}

const CMD = 'trz'
const FILE_NAME = 'deploy.tar.gz'
const FILE_SIZE = '18.4 MB'
const LINE = 1.45
const VISIBLE_LINES = 5

const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8 8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
// File icon: a rounded document with a folded corner.
const FILE_PATH = 'M534 64H278c-23.6 0-43 19.4-43 43v782c0 23.6 19.4 43 43 43h468c23.6 0 43-19.4 43-43V342L534 64zM592 378V128l168 168H624c-17.6 0-32 14.4-32 32v50z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

const CSS = `
.eb-df {
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-text: #ddd;
  --eb-text-light: #fff;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-cursor: #b5bd68;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  --eb-term-yellow: #ffd479;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e8f1ff 0%, #f2ecff 52%, #fdeef5 100%);
  color: #16233a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-df-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-df-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-df-drift 34s linear infinite;
}
@keyframes eb-df-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-df-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-df-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-df-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-df-spark {
  position: absolute;
  width: 1.7em;
  height: 1.7em;
  background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-df-twinkle 3.6s ease-in-out infinite;
}
.eb-df-spark-a { right: 7.5em; top: 4.6em; }
.eb-df-spark-b { right: 14.5em; top: 12em; width: 1.05em; height: 1.05em; background: #ec4899; animation-delay: 0.7s; }
@keyframes eb-df-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}
.eb-df-head { position: absolute; left: 5em; right: 5em; top: 3.2em; }
.eb-df-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #2563eb;
}
.eb-df-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-df-h1 {
  margin: 0.24em 0 0;
  font-size: 3.2em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-df-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-df-sub {
  margin: 0.5em 0 0;
  max-width: 64em;
  font-size: 1.55em;
  line-height: 1.4;
  color: #475569;
}
.eb-df-sub b { color: #0f172a; font-weight: 700; }
.eb-df-app {
  position: absolute;
  left: 50%;
  bottom: 5.4%;
  transform: translateX(-50%);
  width: 92em;
  background: var(--eb-term-bg);
  border-radius: 0.8em;
  box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.2);
  overflow: hidden;
  text-align: left;
  animation: eb-df-glow 4.4s ease-in-out infinite;
}
@keyframes eb-df-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.34), 0 0 3.4em rgba(124, 58, 237, 0.4); }
}
.eb-df-tabbar {
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.3em;
  line-height: 1;
}
.eb-df-tab {
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
.eb-df-tab.is-active {
  background: var(--eb-main);
  color: var(--eb-text);
  font-weight: 700;
}
.eb-df-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-df-tab-close {
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
.eb-df-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-df-tab-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 1.5em;
  height: 1.6em;
  margin-left: 0.3em;
  color: var(--eb-text);
}
.eb-df-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-df-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 1.4em;
  height: 1.6em;
  margin-left: auto;
  color: var(--eb-text-dark);
}
.eb-df-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }
.eb-df-pane {
  position: relative;
  box-sizing: border-box;
  height: ${(VISIBLE_LINES * LINE + 2.1).toFixed(2)}em;
  padding: 1.05em 1em;
  background: var(--eb-term-bg);
  font-size: 1.9em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: ${LINE};
  color: var(--eb-term-fg);
  white-space: nowrap;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.eb-df-pane.is-hot { box-shadow: inset 0 0 0 0.14em var(--eb-success); }
.eb-df-screen { will-change: transform; }
.eb-df-line { line-height: ${LINE}; }
.eb-df-ps1 { color: var(--eb-term-green); }
.eb-df-ps1-path { color: var(--eb-term-blue); }
.eb-df-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.04em;
  vertical-align: -0.26em;
  background: var(--eb-term-cursor);
}
/* the dragged file chip: an OS file floating over the banner */
.eb-df-chip {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 0.55em;
  padding: 0.5em 0.8em 0.5em 0.55em;
  border-radius: 0.55em;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #cbd5e1;
  box-shadow: 0 0.5em 1.2em rgba(15, 23, 42, 0.28);
  font-size: 1.5em;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  z-index: 8;
  will-change: transform, opacity;
  pointer-events: none;
}
.eb-df-chip svg { width: 1.5em; height: 1.5em; fill: #2563eb; }
.eb-df-chip-name { font-weight: 700; }
.eb-df-chip-size { color: #64748b; font-size: 0.85em; }
/* the drop dialog: DropFileModal for an ssh session */
.eb-df-modal {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 34em;
  border-radius: 0.6em;
  background: rgba(18, 18, 20, 0.97);
  border: 1px solid #3a3a3d;
  box-shadow: 0 0.8em 2em rgba(0, 0, 0, 0.5);
  font-size: 1.55em;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--eb-text);
  z-index: 6;
  opacity: 0;
  overflow: hidden;
}
.eb-df-modal-file {
  padding: 0.7em 0.9em;
  border-bottom: 1px solid #2c2c2e;
  color: #fff;
  font-family: Menlo, Monaco, monospace;
  font-size: 0.85em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eb-df-modal-btns { display: flex; gap: 0.5em; padding: 0.7em 0.9em; }
.eb-df-btn {
  flex: 1;
  padding: 0.42em 0;
  border-radius: 0.35em;
  border: 1px solid #4a4a4d;
  background: #2c2c2e;
  color: var(--eb-text);
  font-size: 0.95em;
  font-weight: 700;
  text-align: center;
  transition: transform 0.12s, background 0.12s, box-shadow 0.12s;
}
.eb-df-btn.is-primary { background: var(--eb-primary); border-color: var(--eb-primary); color: #fff; }
.eb-df-btn.is-clicked { transform: scale(0.92); box-shadow: 0 0 1em rgba(0, 136, 204, 0.7); }
/* the pointer: a small cursor dot with a ring */
.eb-df-ptr {
  position: absolute;
  width: 1.5em;
  height: 1.5em;
  margin: -0.4em 0 0 -0.4em;
  border-radius: 50%;
  background: #fff;
  border: 0.22em solid var(--eb-primary);
  box-shadow: 0 0 0.6em rgba(0, 136, 204, 0.8);
  z-index: 9;
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity;
}
/* upload progress row inside the terminal pane */
.eb-df-up { opacity: 0; }
.eb-df-up-top { display: flex; justify-content: space-between; color: var(--eb-term-yellow); font-weight: 700; }
.eb-df-bar {
  height: 0.5em;
  margin-top: 0.35em;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
}
.eb-df-bar-fill {
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--eb-success), var(--eb-term-green));
}
.eb-df-done { color: var(--eb-term-green); opacity: 0; }
.eb-df[data-variant='card'] .eb-df-app {
  bottom: auto;
  top: 50%;
  transform: translate(-50%, -50%);
}
.eb-df[data-variant='card'] .eb-df-tabbar { font-size: 1.6em; }
.eb-df[data-variant='card'] .eb-df-pane { font-size: 2.4em; }
.eb-df[data-variant='card'] .eb-df-modal { font-size: 2em; }
.eb-df[data-variant='card'] .eb-df-chip { font-size: 1.9em; }
@media (prefers-reduced-motion: reduce) {
  .eb-df-dots, .eb-df-spark, .eb-df-app { animation: none !important; }
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

function prompt () {
  return `<span class="eb-df-ps1">zxd@web-01</span>:<span class="eb-df-ps1-path">~/releases</span>$&nbsp;`
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-df-head">
        <span class="eb-df-brand">electerm</span>
        <h2 class="eb-df-h1">Drag a file, <em>pick what happens</em></h2>
        <p class="eb-df-sub"><b>Drop onto the terminal</b> — upload with trz / rz, or just paste the path.</p>
      </div>`
  return `
    <div class="eb-df-deco">
      <span class="eb-df-blob eb-df-blob-a"></span>
      <span class="eb-df-blob eb-df-blob-b"></span>
      <span class="eb-df-dots"></span>
      <span class="eb-df-spark eb-df-spark-a"></span>
      <span class="eb-df-spark eb-df-spark-b"></span>
    </div>
    ${head}
    <div class="eb-df-app">
      <div class="eb-df-tabbar">
        <span class="eb-df-tab is-active">
          <span class="eb-df-tab-count">1</span>
          <span>zxd@web-01:22</span>
          <span class="eb-df-tab-close">${icon(CLOSE_PATH, '')}</span>
        </span>
        <span class="eb-df-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-df-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-df-pane">
        <div class="eb-df-screen">
          <div class="eb-df-line">${prompt()}<span class="eb-df-cmd"></span><span class="eb-df-caret eb-df-caret1"></span></div>
          <div class="eb-df-line eb-df-up">
            <div class="eb-df-up-top"><span>↑ ${FILE_NAME}</span><span class="eb-df-pct">0%</span></div>
            <div class="eb-df-bar"><div class="eb-df-bar-fill"></div></div>
          </div>
          <div class="eb-df-line eb-df-done">${prompt()}<span>✓ upload complete — ${FILE_NAME}</span></div>
        </div>
        <div class="eb-df-modal">
          <div class="eb-df-modal-file">▸ ${FILE_NAME}</div>
          <div class="eb-df-modal-btns">
            <span class="eb-df-btn is-primary eb-df-btn-trz">trz</span>
            <span class="eb-df-btn">rz</span>
            <span class="eb-df-btn">paste path</span>
          </div>
        </div>
        <div class="eb-df-ptr"></div>
      </div>
    </div>
    <div class="eb-df-chip">${icon(FILE_PATH, '')}<span class="eb-df-chip-name">${FILE_NAME}</span><span class="eb-df-chip-size">${FILE_SIZE}</span></div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-df'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm: a file is dragged onto the terminal, trz is picked in the dialog, and the upload completes')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    app: root.querySelector('.eb-df-app'),
    pane: root.querySelector('.eb-df-pane'),
    chip: root.querySelector('.eb-df-chip'),
    modal: root.querySelector('.eb-df-modal'),
    btnTrz: root.querySelector('.eb-df-btn-trz'),
    ptr: root.querySelector('.eb-df-ptr'),
    cmd: root.querySelector('.eb-df-cmd'),
    caret1: root.querySelector('.eb-df-caret1'),
    up: root.querySelector('.eb-df-up'),
    fill: root.querySelector('.eb-df-bar-fill'),
    pct: root.querySelector('.eb-df-pct'),
    done: root.querySelector('.eb-df-done'),
    screen: root.querySelector('.eb-df-screen')
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

  // Chip flight path, measured in fractions of the banner box. The chip is
  // absolutely positioned in root coordinates (chip is a child of root).
  function chipXY (p) {
    // start: top-right, above the window; end: centre of the terminal pane.
    const paneRect = el.pane.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    const startX = rootRect.width * 0.78
    const startY = rootRect.height * 0.06
    const endX = (paneRect.left - rootRect.left) + paneRect.width * 0.42
    const endY = (paneRect.top - rootRect.top) + paneRect.height * 0.34
    const e = easeInOut(p)
    // slight arc: rise a touch mid-flight
    const lift = Math.sin(p * Math.PI) * rootRect.height * 0.06
    return { x: startX + (endX - startX) * e, y: startY + (endY - startY) * e - lift }
  }

  // Pointer flight path inside the pane (pane-relative em-ish px).
  function ptrXY (p) {
    const paneRect = el.pane.getBoundingClientRect()
    const modalRect = el.modal.getBoundingClientRect()
    const trzRect = el.btnTrz.getBoundingClientRect()
    // start: bottom-right of the pane; end: centre of the trz button.
    const sx = paneRect.width * 0.86
    const sy = paneRect.height * 0.88
    const ex = (trzRect.left - paneRect.left) + trzRect.width * 0.5
    const ey = (modalRect.top - paneRect.top) + modalRect.height * 0.68
    const e = easeInOut(p)
    return { x: sx + (ex - sx) * e, y: sy + (ey - sy) * e }
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    const vis = 1 - gone
    root.style.opacity = vis.toFixed(3)

    // 1. chip slides in, then is dragged into the pane.
    const inP = easeOut(seg(t, T.chipFrom, T.chipTo))
    const dragP = seg(t, T.dragFrom, T.dragTo)
    const goneP = seg(t, T.chipGoneFrom, T.chipGoneTo)
    const pos = chipXY(Math.max(dragP, 0.0001))
    el.chip.style.opacity = (inP * (1 - goneP) * vis).toFixed(3)
    el.chip.style.transform =
      'translate(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px)' +
      ' scale(' + (1 - goneP * 0.25).toFixed(3) + ')' +
      ' rotate(' + (-4 + dragP * 4).toFixed(2) + 'deg)'

    // terminal glows while the chip hovers over it.
    el.pane.classList.toggle('is-hot', t >= T.dropHotFrom && t < T.dropHotTo + 400)

    // 2. the drop dialog pops.
    const mIn = easeOut(seg(t, T.modalFrom, T.modalTo))
    const mOut = seg(t, T.modalOutFrom, T.modalOutTo)
    el.modal.style.opacity = (mIn * (1 - mOut) * vis).toFixed(3)
    el.modal.style.transform = 'translate(-50%,-50%) scale(' + (0.9 + mIn * 0.1).toFixed(3) + ')'

    // 3. pointer glides to trz and clicks.
    const pP = seg(t, T.ptrFrom, T.ptrTo)
    const pp = ptrXY(Math.max(pP, 0.0001))
    const ptrVis = seg(t, T.ptrFrom, T.ptrFrom + 250) * (1 - seg(t, T.modalOutFrom, T.modalOutFrom + 250))
    el.ptr.style.opacity = (ptrVis * vis).toFixed(3)
    el.ptr.style.transform = 'translate(' + pp.x.toFixed(1) + 'px,' + pp.y.toFixed(1) + 'px)'
    const clicked = t >= T.clickAt && t < T.clickAt + T.clickLen
    el.btnTrz.classList.toggle('is-clicked', clicked)

    // 4. `trz` typed + Enter, caret hides, progress row appears.
    const typed = Math.round(easeOut(seg(t, T.typeFrom, T.typeTo)) * CMD.length)
    const hasEntered = t >= T.enterAt
    el.cmd.textContent = hasEntered ? CMD : CMD.slice(0, typed)
    el.caret1.style.opacity = (t < T.typeFrom ? 1 : (hasEntered ? 0 : 1)) * vis

    const barP = easeInOut(seg(t, T.barFrom, T.barTo))
    el.up.style.opacity = (seg(t, T.enterAt, T.enterAt + 300) * vis).toFixed(3)
    el.fill.style.width = (barP * 100).toFixed(1) + '%'
    el.pct.textContent = Math.round(barP * 100) + '%'

    // progress row scrolls up slightly as the done line arrives.
    const doneP = easeOut(seg(t, T.doneFrom, T.doneTo))
    el.done.style.opacity = (doneP * vis).toFixed(3)
    el.screen.style.transform = 'translateY(' + (-doneP * LINE * 0.9).toFixed(3) + 'em)'
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.doneTo + 200)
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
