/**
 * Animated banner for the "command history and quick commands dock in the
 * right panel" blog post (new in v5.5.35).
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * electerm window (tab bar + terminal + footer), the footer history popover,
 * the floating quick-commands box, the sliding right panel, the cartoon
 * pointer and the click ripples are all plain DOM + CSS driven by one
 * requestAnimationFrame timeline.
 *
 * The window is modelled on the real electerm UI:
 *   ui theme ............... src/client/css/includes/theme.styl +
 *                           src/client/common/theme-defaults.js
 *                           (main #121214, main-light #2E3338, text #ddd,
 *                           primary #08c, success #06D6A0)
 *   terminal theme ......... theme-defaults.js (defaultThemeDarkTerminal:
 *                           bg #20111b, fg #bbbbbb, green #19f9d8)
 *   footer height .......... src/client/common/constants.js (footerHeight 36)
 *   cmd history ............ components/footer/cmd-history.jsx (popover with
 *                           search, sort-by-frequency, clear, move icon)
 *   quick commands ......... components/quick-commands/quick-commands-box.jsx
 *                           (floating box with search, label filter, actions)
 *   right panel ............ components/side-panel-r/side-panel-r.jsx +
 *                           right-side-panel.styl (overlay from below the top
 *                           bar to above the footer, pin + close, one glyph
 *                           per tab: history / thunder)
 *
 * The story, in four beats:
 *   1. the command history popover opens above the footer, rows landing one
 *      by one — the footer home every user knows;
 *   2. the pointer clicks the "move to right panel" icon in the popover
 *      header: the popover closes and the right panel slides in with the
 *      same history rows, while the footer history icon stays lit;
 *   3. the floating quick-commands box opens above the footer; the pointer
 *      clicks its move icon too, the box closes and the panel switches to
 *      the quick-commands tab (thunder glyph), rows landing again;
 *   4. a hint badge pulses next to the panel's "move back to footer" icon —
 *      the trip is reversible with one click.
 *
 * Two deliberate liberties: fonts are rendered above life size (at banner
 * scale the real 12px footer text would be illegible), and the panels show
 * four rows each instead of a scrollable list, for the same reason. The
 * icons are hand-drawn stand-ins for the antd glyphs the app uses
 * (HistoryOutlined / ThunderboltOutlined / VerticalLeftOutlined /
 * VerticalAlignBottomOutlined) — same meaning, same slots.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + full window (blog post page)
 *   data-eb-banner="card"  -> window only           (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales to any container.
 */

const STYLE_ID = 'eb-rp-style'

// One full pass of the story, in ms.
const PERIOD = 11600

const T = {
  winFrom: 200, // the window rises into place
  winTo: 700,
  popFrom: 1200, // history popover opens above the footer
  popTo: 1650,
  rowFrom: 1700, // its rows land one by one
  rowGap: 130,
  rowDur: 320,
  ptr1From: 2800, // pointer travels to the popover's move icon
  ptr1To: 3300,
  click1At: 3400, // ... and clicks it
  popOutFrom: 3500, // popover closes...
  popOutTo: 3900,
  panelFrom: 3600, // ...as the right panel slides in
  panelTo: 4300,
  prowFrom: 4350, // docked history rows land
  prowGap: 120,
  prowDur: 320,
  qmFrom: 5400, // quick-commands box opens above the footer
  qmTo: 5800,
  ptr2From: 5900, // pointer travels to the box's move icon
  ptr2To: 6400,
  click2At: 6500, // ... and clicks it
  qmOutFrom: 6600, // box closes...
  qmOutTo: 7000,
  tabAt: 6700, // ...and the panel switches to the quick-commands tab
  qmrowFrom: 7000, // docked quick-command chips land
  qmrowGap: 120,
  qmrowDur: 320,
  badgeFrom: 8000, // "one click to move back" hint pulses
  badgeTo: 10000,
  ptrFadeFrom: 10100,
  ptrFadeTo: 10500,
  fadeFrom: 10700,
  fadeTo: 11200
}

const HIST_ROWS = [
  'git status',
  'docker ps --format "table {{.Names}}\\t{{.Status}}"',
  'kubectl get pods -n prod',
  'ssh zxd@web-01'
]

const QM_ROWS = [
  { name: 'deploy', cmd: 'npm run build && rsync -a dist/ web-01:/srv/app' },
  { name: 'logs', cmd: 'journalctl -u app -f' },
  { name: 'restart nginx', cmd: 'sudo systemctl restart nginx' },
  { name: 'disk check', cmd: 'df -h / /var' }
]

// Hand-drawn stand-ins for the antd glyphs (24x24 viewBox): a clock for
// command history, a bolt for quick commands, an arrow-into-right-bar for
// "move to right panel" and an arrow-into-bottom-bar for "move to footer".
const SVG_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true">'
const ICON_CLOCK = SVG_OPEN +
  '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
  '<path d="M12 7.5 V12 L15.5 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
const ICON_BOLT = SVG_OPEN +
  '<polygon points="13,2 5,13.5 11,13.5 9.5,22 19,9.5 13,9.5" fill="currentColor"/></svg>'
const ICON_TO_RIGHT = SVG_OPEN +
  '<rect x="17" y="4" width="2.6" height="16" rx="1" fill="currentColor"/>' +
  '<path d="M3 12 H13 M10 7.5 L14.5 12 L10 16.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ICON_TO_FOOTER = SVG_OPEN +
  '<rect x="4" y="17" width="16" height="2.6" rx="1" fill="currentColor"/>' +
  '<path d="M12 3 V13 M7.5 10 L12 14.5 L16.5 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ICON_PIN = SVG_OPEN +
  '<path d="M14.5 3 L21 9.5 L17.5 11 L15 16.5 L12.5 14 L9 20 L7 18 L13 14.5 L10.5 12 Z" fill="currentColor"/></svg>'
const ICON_CLOSE = SVG_OPEN +
  '<path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

const CSS = `
.eb-rp {
  --eb-main: #121214;
  --eb-main-dark: #000;
  --eb-main-light: #2e3338;
  --eb-text: #ddd;
  --eb-text-dark: #888;
  --eb-text-disabled: #777;
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
  background: linear-gradient(135deg, #e0f2fe 0%, #f2ecff 52%, #fdf0f6 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-rp-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-rp-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(8, 136, 204, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-rp-drift 34s linear infinite;
}
@keyframes eb-rp-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-rp-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.6); }
.eb-rp-blob-a { width: 30em; height: 30em; right: -9em; top: -13em; }
.eb-rp-blob-b { width: 26em; height: 26em; left: -10em; bottom: -12em; }
.eb-rp-head { position: absolute; left: 5em; right: 5em; top: 3.2em; pointer-events: none; }
.eb-rp-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
  font-weight: 800;
  color: var(--eb-primary);
}
.eb-rp-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: var(--eb-primary);
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-rp-h1 {
  margin: 0.26em 0 0;
  font-size: 3.4em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-rp-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #0888cc, #7c3aed 55%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-rp-sub {
  margin: 0.5em 0 0;
  max-width: 58em;
  font-size: 1.5em;
  line-height: 1.4;
  color: #475569;
}

/* ---------- the electerm window ---------- */
.eb-rp-frame {
  position: absolute;
  left: 50%;
  bottom: 3.4em;
  width: 80em;
  height: 36em;
  transform: translateX(-50%);
}
.eb-rp-app {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  font-size: 1em;
  background: var(--eb-term-bg);
  border-radius: 0.7em;
  box-shadow: 0 1.2em 2.4em rgba(9, 20, 40, 0.34), 0 0 2.4em rgba(8, 136, 204, 0.18);
  overflow: hidden;
  text-align: left;
}
.eb-rp-tabbar {
  flex: none;
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.3em;
  line-height: 1;
}
.eb-rp-tab {
  display: flex;
  align-items: center;
  gap: 0.42em;
  height: 100%;
  padding: 0 1em;
  border-radius: 0.21em 0.21em 0 0;
  background: var(--eb-main-dark);
  color: var(--eb-text-dark);
  white-space: nowrap;
}
.eb-rp-tab.is-active { background: var(--eb-main); color: var(--eb-text); font-weight: 700; }
.eb-rp-tab-status {
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-success);
}
.eb-rp-tab-count {
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-rp-main { position: relative; flex: 1; min-height: 0; }
.eb-rp-term {
  position: absolute;
  inset: 0;
  padding: 1.1em 1.4em;
  font-size: 2em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.5;
  color: var(--eb-term-fg);
  white-space: nowrap;
}
.eb-rp-ps1 { color: var(--eb-term-green); }
.eb-rp-path { color: var(--eb-term-blue); }
.eb-rp-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.06em;
  vertical-align: -0.26em;
  background: #b5bd68;
}

/* ---------- footer homes: history popover + quick-commands box ---------- */
.eb-rp-pop {
  position: absolute;
  left: 1.2em;
  bottom: 1.2em;
  width: 30em;
  padding: 0.7em 0.9em 0.6em;
  border-radius: 0.35em;
  background: var(--eb-main);
  color: var(--eb-text);
  font-size: 1.05em;
  box-shadow: 0 0.6em 1.6em rgba(0, 0, 0, 0.42), 0 0 0 1px var(--eb-main-dark);
  transform-origin: 15% 100%;
  opacity: 0;
  z-index: 3;
}
.eb-rp-pop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.45em;
  font-weight: 600;
}
.eb-rp-pop-icons { display: inline-flex; align-items: center; gap: 0.55em; }
.eb-rp-pop-icons svg { width: 1em; height: 1em; }
.eb-rp-move { color: var(--eb-primary); border-radius: 0.2em; }
.eb-rp-move.is-hovered { background: var(--eb-main-light); }
.eb-rp-search {
  height: 1.9em;
  margin-bottom: 0.5em;
  padding: 0 0.6em;
  border-radius: 0.25em;
  background: var(--eb-main-light);
  color: var(--eb-text-disabled);
  font-size: 0.95em;
  line-height: 1.9em;
  white-space: nowrap;
  overflow: hidden;
}
.eb-rp-hrow {
  padding: 0.22em 0.3em;
  border-radius: 0.2em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', monospace;
  font-size: 0.92em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
}
.eb-rp-hrow.is-hovered { background: var(--eb-main-light); }
.eb-rp-qmbox {
  position: absolute;
  left: 1.2em;
  right: 14em;
  bottom: 1.2em;
  padding: 0.7em 0.9em 0.6em;
  border-radius: 0.35em;
  background: var(--eb-main);
  color: var(--eb-text);
  font-size: 1.05em;
  box-shadow: 0 0.6em 1.6em rgba(0, 0, 0, 0.42), 0 0 0 1px var(--eb-main-dark);
  transform-origin: 30% 100%;
  opacity: 0;
  z-index: 3;
}
.eb-rp-qm-head { display: flex; align-items: center; gap: 0.6em; margin-bottom: 0.5em; }
.eb-rp-qm-head .eb-rp-search { flex: 1; margin-bottom: 0; }
.eb-rp-qm-head svg { width: 1em; height: 1em; }
.eb-rp-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  max-width: 100%;
  margin: 0 0.4em 0.4em 0;
  padding: 0.25em 0.6em;
  border-radius: 0.25em;
  background: var(--eb-main-light);
  font-size: 0.92em;
  white-space: nowrap;
  opacity: 0;
}
.eb-rp-chip svg { width: 0.95em; height: 0.95em; color: var(--eb-primary); }
.eb-rp-chip span { overflow: hidden; text-overflow: ellipsis; }

/* ---------- right panel: the second home ---------- */
.eb-rp-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 27em;
  z-index: 4;
  display: flex;
  flex-direction: column;
  background: var(--eb-main);
  color: var(--eb-text);
  border-left: 1px solid var(--eb-main-dark);
  box-shadow: -0.6em 0 1.6em rgba(0, 0, 0, 0.34);
  font-size: 1.05em;
  transform: translateX(104%);
}
.eb-rp-panel-title {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 2.6em;
  padding: 0 0.7em;
  border-bottom: 1px solid var(--eb-main-dark);
}
.eb-rp-panel-name { display: inline-flex; align-items: center; gap: 0.45em; font-weight: 600; }
.eb-rp-panel-name svg { width: 1em; height: 1em; }
.eb-rp-panel-icons { display: inline-flex; align-items: center; gap: 0.6em; color: var(--eb-text-dark); }
.eb-rp-panel-icons svg { width: 0.95em; height: 0.95em; }
.eb-rp-back { color: var(--eb-primary); border-radius: 0.2em; }
.eb-rp-tabs { flex: none; display: flex; gap: 0.4em; padding: 0.5em 0.7em 0; }
.eb-rp-ptab {
  padding: 0.2em 0.7em;
  border-radius: 0.25em;
  color: var(--eb-text-dark);
  font-size: 0.9em;
  white-space: nowrap;
}
.eb-rp-ptab.is-active { background: var(--eb-main-light); color: var(--eb-text); font-weight: 700; }
.eb-rp-panel-body { flex: 1; min-height: 0; overflow: hidden; padding: 0.5em 0.7em; }
.eb-rp-pane .eb-rp-hrow,
.eb-rp-pane .eb-rp-chip { opacity: 0; }
.eb-rp-pane { display: none; }
.eb-rp-pane.is-active { display: block; }
.eb-rp-badge {
  position: absolute;
  right: 27.8em;
  top: 0.6em;
  z-index: 5;
  padding: 0.3em 0.8em;
  border-radius: 1em;
  background: rgba(6, 214, 160, 0.95);
  color: #052e22;
  font-size: 1em;
  font-weight: 800;
  white-space: nowrap;
  opacity: 0;
  box-shadow: 0 0.4em 1em rgba(0, 0, 0, 0.35);
}

/* ---------- footer ---------- */
.eb-rp-footer {
  flex: none;
  display: flex;
  align-items: center;
  height: 2.4em;
  padding: 0 0.5em;
  background: var(--eb-main);
  color: var(--eb-text);
  font-size: 1.2em;
}
.eb-rp-footer svg { width: 1em; height: 1em; }
.eb-rp-funit { display: inline-flex; align-items: center; padding: 0 0.4em; color: var(--eb-text-dark); }
.eb-rp-funit.is-active { color: var(--eb-success); }
.eb-rp-fbatch {
  flex: 1;
  min-width: 0;
  margin: 0 0.5em;
  padding: 0 0.55em;
  height: 1.75em;
  border-radius: 0.25em;
  background: var(--eb-main-light);
  color: var(--eb-text-disabled);
  font-size: 0.95em;
  line-height: 1.75em;
  overflow: hidden;
  white-space: nowrap;
}

/* ---------- cartoon pointer + click ripple ---------- */
.eb-rp-pointer {
  position: absolute;
  left: 0;
  top: 0;
  width: 1.05em;
  height: 1.42em;
  margin: -0.1em 0 0 -0.1em;
  opacity: 0;
  filter: drop-shadow(0 0.08em 0.16em rgba(0, 0, 0, 0.45));
  pointer-events: none;
  z-index: 9;
}
.eb-rp-pointer svg { display: block; width: 100%; height: 100%; }
.eb-rp-ripple {
  position: absolute;
  width: 0.9em;
  height: 0.9em;
  border: 0.14em solid var(--eb-primary);
  border-radius: 50%;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4);
  pointer-events: none;
  z-index: 8;
}

/* ---------- card (blog index) variant ---------- */
.eb-rp[data-variant='card'] .eb-rp-frame {
  bottom: auto;
  top: 50%;
  width: 100em;
  height: 52em;
  transform: translate(-50%, -50%);
}
.eb-rp[data-variant='card'] .eb-rp-app { font-size: 1.28em; }
.eb-rp[data-variant='card'] .eb-rp-badge { right: 28.5em; }

@media (prefers-reduced-motion: reduce) {
  .eb-rp-dots { animation: none !important; }
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
      <div class="eb-rp-head">
        <span class="eb-rp-brand">electerm</span>
        <h2 class="eb-rp-h1">From the footer, <em>into the side panel</em></h2>
        <p class="eb-rp-sub">Command history and quick commands each get a second home in the right panel — one click moves them there, one click moves them back.</p>
      </div>`

  const histRows = HIST_ROWS
    .map((cmd) => `<div class="eb-rp-hrow">${cmd}</div>`)
    .join('')
  const paneHistRows = HIST_ROWS
    .map((cmd) => `<div class="eb-rp-hrow" data-prow="1">${cmd}</div>`)
    .join('')
  const qmChips = QM_ROWS
    .map((qm) => `<span class="eb-rp-chip" data-qmchip="1">${ICON_BOLT}<span><b>${qm.name}</b>&nbsp;·&nbsp;${qm.cmd}</span></span>`)
    .join('')
  const paneQmChips = QM_ROWS
    .map((qm) => `<span class="eb-rp-chip" data-pqmchip="1">${ICON_BOLT}<span><b>${qm.name}</b>&nbsp;·&nbsp;${qm.cmd}</span></span>`)
    .join('')

  return `
    <div class="eb-rp-deco">
      <span class="eb-rp-dots"></span>
      <span class="eb-rp-blob eb-rp-blob-a"></span>
      <span class="eb-rp-blob eb-rp-blob-b"></span>
    </div>
    ${head}
    <div class="eb-rp-frame">
      <div class="eb-rp-app">
        <div class="eb-rp-tabbar">
          <span class="eb-rp-tab">
            <span class="eb-rp-tab-status"></span>
            <span class="eb-rp-tab-count">1</span>
            <span>local</span>
          </span>
          <span class="eb-rp-tab is-active">
            <span class="eb-rp-tab-status"></span>
            <span class="eb-rp-tab-count">2</span>
            <span>zxd@web-01:22</span>
          </span>
        </div>
        <div class="eb-rp-main">
          <div class="eb-rp-term">
            <div><span class="eb-rp-ps1">zxd@web-01</span>:<span class="eb-rp-path">~</span>$ kubectl get pods -n prod</div>
            <div>web-01&nbsp;&nbsp;Running&nbsp;&nbsp;12d</div>
            <div>web-02&nbsp;&nbsp;Running&nbsp;&nbsp;12d<span class="eb-rp-caret"></span></div>
          </div>
          <div class="eb-rp-pop">
            <div class="eb-rp-pop-head">
              <span>command history</span>
              <span class="eb-rp-pop-icons">
                <span class="eb-rp-move" data-move1="1">${ICON_TO_RIGHT}</span>
              </span>
            </div>
            <div class="eb-rp-search">search history…</div>
            ${histRows}
          </div>
          <div class="eb-rp-qmbox">
            <div class="eb-rp-qm-head">
              <div class="eb-rp-search">search quick commands…</div>
              <span class="eb-rp-move" data-move2="1">${ICON_TO_RIGHT}</span>
            </div>
            <div>${qmChips}</div>
          </div>
          <div class="eb-rp-panel">
            <div class="eb-rp-panel-title">
              <span class="eb-rp-panel-name">
                <span class="eb-rp-glyph-hist">${ICON_CLOCK}</span>
                <span class="eb-rp-glyph-qm" style="display:none">${ICON_BOLT}</span>
                <span class="eb-rp-panel-tabname">history</span>
              </span>
              <span class="eb-rp-panel-icons">
                <span class="eb-rp-back" data-back="1">${ICON_TO_FOOTER}</span>
                <span>${ICON_PIN}</span>
                <span>${ICON_CLOSE}</span>
              </span>
            </div>
            <div class="eb-rp-tabs">
              <span class="eb-rp-ptab" data-ptab-hist="1">history</span>
              <span class="eb-rp-ptab" data-ptab-qm="1">quick commands</span>
            </div>
            <div class="eb-rp-panel-body">
              <div class="eb-rp-pane" data-pane-hist="1">${paneHistRows}</div>
              <div class="eb-rp-pane" data-pane-qm="1">${paneQmChips}</div>
            </div>
          </div>
          <div class="eb-rp-badge">one click moves it back</div>
        </div>
        <div class="eb-rp-footer">
          <span class="eb-rp-funit eb-rp-fhist">${ICON_CLOCK}</span>
          <span class="eb-rp-funit eb-rp-fqm">${ICON_BOLT}</span>
          <span class="eb-rp-fbatch">send to all sessions…</span>
        </div>
      </div>
      <span class="eb-rp-pointer"><svg viewBox="-3 -3 29 39"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
      <span class="eb-rp-ripple" data-ripple1="1"></span>
      <span class="eb-rp-ripple" data-ripple2="1"></span>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-rp'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm: the command history popover moves from the footer into the right side panel, then the quick commands box follows it')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const qa = (sel) => Array.prototype.slice.call(root.querySelectorAll(sel))
  const el = {
    frame: q('.eb-rp-frame'),
    app: q('.eb-rp-app'),
    pop: q('.eb-rp-pop'),
    popRows: qa('.eb-rp-pop .eb-rp-hrow'),
    move1: q('[data-move1]'),
    qmbox: q('.eb-rp-qmbox'),
    qmChips: qa('.eb-rp-qmbox .eb-rp-chip'),
    move2: q('[data-move2]'),
    panel: q('.eb-rp-panel'),
    paneHist: q('[data-pane-hist]'),
    paneQm: q('[data-pane-qm]'),
    prowRows: qa('[data-prow]'),
    pqmChips: qa('[data-pqmchip]'),
    ptabHist: q('[data-ptab-hist]'),
    ptabQm: q('[data-ptab-qm]'),
    glyphHist: q('.eb-rp-glyph-hist'),
    glyphQm: q('.eb-rp-glyph-qm'),
    tabName: q('.eb-rp-panel-tabname'),
    back: q('[data-back]'),
    badge: q('.eb-rp-badge'),
    fhist: q('.eb-rp-fhist'),
    fqm: q('.eb-rp-fqm'),
    pointer: q('.eb-rp-pointer'),
    ripple1: q('[data-ripple1]'),
    ripple2: q('[data-ripple2]')
  }

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

  // The pointer travels in the frame's own coordinates, which are also the
  // app's (the app fills the frame). Both targets are measured off the DOM
  // once the banner is laid out, so the pointer lands on the real move icons
  // rather than on hand-written coordinates.
  const targets = { p1: { x: 10, y: 28 }, p2: { x: 24, y: 28 } }
  const measure = () => {
    const frameBox = el.frame.getBoundingClientRect()
    const scale = root.clientWidth / 100 || 1
    const toFrame = (box, ax, ay) => ({
      x: (box.left + box.width * ax - frameBox.left) / scale,
      y: (box.top + box.height * ay - frameBox.top) / scale
    })
    const b1 = el.move1.getBoundingClientRect()
    const b2 = el.move2.getBoundingClientRect()
    if (b1.width) targets.p1 = toFrame(b1, 0.5, 0.5)
    if (b2.width) targets.p2 = toFrame(b2, 0.5, 0.5)
  }
  measure()
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure)
  }

  function placeRipple (node, target, t, clickAt) {
    const p = seg(t, clickAt, clickAt + 460)
    node.style.opacity = (p > 0 && p < 1 ? (1 - p).toFixed(3) : 0)
    node.style.transform = 'translate(-50%, -50%) scale(' + (0.4 + p * 2.6).toFixed(3) + ')'
    node.style.left = target.x.toFixed(2) + 'em'
    node.style.top = target.y.toFixed(2) + 'em'
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    root.style.opacity = (1 - gone).toFixed(3)

    // the window rises — the card variant is centred with a -50% Y offset of
    // its own, so the inline transform has to carry it
    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    const baseY = variant === 'card' ? -50 : 0
    el.frame.style.transform =
      `translate(-50%, ${baseY}%) translateY(${((1 - winP) * 3.2).toFixed(2)}em)`

    // beat 1: history popover opens above the footer, rows landing in turn
    const popP = seg(t, T.popFrom, T.popTo)
    const popOut = easeInOut(seg(t, T.popOutFrom, T.popOutTo))
    const popScale = 0.86 + 0.14 * easeOutBack(popP)
    el.pop.style.opacity = (popP * (1 - popOut) * (1 - gone)).toFixed(3)
    el.pop.style.transform = 'scale(' + popScale.toFixed(3) + ')'
    el.popRows.forEach((node, index) => {
      const p = easeOut(seg(t, T.rowFrom + index * T.rowGap,
        T.rowFrom + index * T.rowGap + T.rowDur))
      node.style.opacity = (p * (1 - popOut) * (1 - gone)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.3).toFixed(3) + 'em)'
    })

    // beat 2: the right panel slides in with the same history rows
    const panelP = easeInOut(seg(t, T.panelFrom, T.panelTo))
    el.panel.style.transform = 'translateX(' + ((1 - panelP) * 104).toFixed(2) + '%)'
    const histActive = t >= T.panelFrom && t < T.tabAt
    el.paneHist.classList.toggle('is-active', t >= T.panelFrom)
    el.prowRows.forEach((node, index) => {
      const p = easeOut(seg(t, T.prowFrom + index * T.prowGap,
        T.prowFrom + index * T.prowGap + T.prowDur))
      node.style.opacity = (p * (t < T.tabAt ? 1 : 0) * (1 - gone)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.3).toFixed(3) + 'em)'
    })

    // beat 3: quick-commands box opens, then docks — the panel switches tabs
    const qmP = seg(t, T.qmFrom, T.qmTo)
    const qmOut = easeInOut(seg(t, T.qmOutFrom, T.qmOutTo))
    const qmScale = 0.86 + 0.14 * easeOutBack(qmP)
    el.qmbox.style.opacity = (qmP * (1 - qmOut) * (1 - gone)).toFixed(3)
    el.qmbox.style.transform = 'scale(' + qmScale.toFixed(3) + ')'
    el.qmChips.forEach((node, index) => {
      const p = easeOut(seg(t, (T.qmFrom + 200) + index * T.qmrowGap,
        (T.qmFrom + 200) + index * T.qmrowGap + T.qmrowDur))
      node.style.opacity = (p * (1 - qmOut) * (1 - gone)).toFixed(3)
    })
    const qmActive = t >= T.tabAt
    el.paneQm.classList.toggle('is-active', qmActive)
    el.ptabHist.classList.toggle('is-active', histActive || (!qmActive && t >= T.panelFrom))
    el.ptabQm.classList.toggle('is-active', qmActive)
    el.glyphHist.style.display = qmActive ? 'none' : ''
    el.glyphQm.style.display = qmActive ? '' : 'none'
    el.tabName.textContent = qmActive ? 'quick commands' : 'history'
    el.pqmChips.forEach((node, index) => {
      const p = easeOut(seg(t, T.qmrowFrom + index * T.qmrowGap,
        T.qmrowFrom + index * T.qmrowGap + T.qmrowDur))
      node.style.opacity = (p * (1 - gone)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.3).toFixed(3) + 'em)'
    })

    // footer buttons stay lit while their panel lives in the side panel
    el.fhist.classList.toggle('is-active', t >= T.panelFrom && t < T.tabAt)
    el.fqm.classList.toggle('is-active', t >= T.tabAt)

    // move icons greet the pointer on hover
    el.move1.classList.toggle('is-hovered', t >= T.ptr1To && t < T.click1At + 200)
    el.move2.classList.toggle('is-hovered', t >= T.ptr2To && t < T.click2At + 200)

    // the pointer: popover move icon -> quick-commands move icon -> out
    const leg1 = easeInOut(seg(t, T.ptr1From, T.ptr1To))
    const leg2 = easeInOut(seg(t, T.ptr2From, T.ptr2To))
    const px = targets.p1.x + (targets.p2.x - targets.p1.x) * leg2
    const py = targets.p1.y + (targets.p2.y - targets.p1.y) * leg2
    const parked = { x: (px + targets.p2.x) / 2 + 6, y: py - 6 }
    const park = easeInOut(seg(t, T.badgeFrom, T.badgeFrom + 800))
    const ptrIn = seg(t, T.ptr1From, T.ptr1From + 260)
    const ptrOut = easeInOut(seg(t, T.ptrFadeFrom, T.ptrFadeTo))
    el.pointer.style.left = (px + (parked.x - px) * park).toFixed(2) + 'em'
    el.pointer.style.top = (py + (parked.y - py) * park).toFixed(2) + 'em'
    el.pointer.style.opacity = (ptrIn * (1 - ptrOut) * (1 - gone)).toFixed(3)
    el.pointer.style.transform = 'scale(' + (0.86 + 0.14 * Math.max(leg1, leg2)).toFixed(3) + ')'
    placeRipple(el.ripple1, targets.p1, t, T.click1At)
    placeRipple(el.ripple2, targets.p2, t, T.click2At)

    // beat 4: the "move back" hint pulses next to the panel's footer icon
    const badgeP = seg(t, T.badgeFrom, T.badgeFrom + 350) *
      (1 - seg(t, T.badgeTo, T.badgeTo + 350))
    el.badge.style.opacity = (badgeP * (1 - gone)).toFixed(3)
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // a static frame: history docked, quick commands about to follow
    frame(T.qmFrom + 100)
    el.pointer.style.opacity = '0'
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
