/**
 * Animated banner for the "widgets.electerm.org" blog post.
 *
 * Everything here is generated DOM + CSS — no image, no GIF, no canvas: a light
 * dotted backdrop, one dark electerm settings window (Widgets / Online / running
 * instances), the registry list, the confirm dialog, the verification panel and
 * a cartoon pointer that drives the story:
 *
 *   1. the Online tab loads and its three real rows land (name, version, commit,
 *      file count and size straight from /api/v1/index.json);
 *   2. the pointer clicks Install on Local TFTP Server;
 *   3. the confirm dialog opens with the app's own wording — full Node
 *      permissions, version, author, repository, the 40-char sha, file count,
 *      and View source at this commit;
 *   4. the pointer confirms; the dialog closes and the right panel checks off
 *      package.json, main.js and sha256 for every file;
 *   5. the digest lands, Installed / commit pinned appears, and the row is
 *      tagged installed.
 *
 * All numbers and strings come from the source, not from guesswork:
 *   registry data .......... https://widgets.electerm.org/api/v1/index.json,
 *                            built 2026-11-09T10:45:45.961Z
 *   Online tab ............. electerm src/client/components/widgets/online-widgets.jsx
 *                            (formatSize, the confirm dialog, Install / Source,
 *                            "Nothing is installed until you confirm")
 *   tabs / id rules ........ widgets-list.jsx, common/widget-registry.js
 *   verification ........... app/widgets/widget-registry.js
 *                            (computeDigest, verifyWidgetTree, fileCount)
 *   ui theme ............... src/client/css/includes/theme.styl + theme-defaults.js
 *                            (main #121214, main-light #2E3338, text #ddd,
 *                            text-dark #888, primary #08c, success #06D6A0,
 *                            error #EF476F)
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + chips + window (blog post page)
 *   data-eb-banner="card"  -> window only              (blog index thumbnail)
 * The blog index loads every post's module, so a mount must also match
 * data-eb-banner-src; otherwise the first module to run would claim every card.
 *
 * Layout is in em with the root font-size held at 1% of the banner width, so one
 * design scales from the hero to the card. Geometry is only ever declared on
 * wrappers without a font-size of their own; text sits in inner <b> elements, so
 * an em width can never silently resolve against a scaled font. Pointer targets
 * are measured from the DOM, never hard-coded.
 */

const STYLE_ID = 'eb-wr-style'

// One full pass of the story, in ms.
const PERIOD = 12800

const T = {
  winFrom: 200,
  winTo: 800,
  rowFrom: 900,
  rowGap: 180,
  rowDur: 420,
  ptr1From: 1900,
  ptr1To: 2350,
  clickInstall: 2400,
  popFrom: 2500,
  popTo: 2960,
  popRowFrom: 2920,
  popRowGap: 130,
  ptr2From: 4600,
  ptr2To: 5000,
  clickOk: 5100,
  popCloseFrom: 5220,
  popCloseTo: 5640,
  ptrOutFrom: 5700,
  ptrOutTo: 6150,
  verifyFrom: 5720,
  verifyGap: 300,
  verifyDur: 420,
  digestFrom: 6720,
  installedFrom: 7360,
  fadeFrom: 11800,
  fadeTo: 12600
}

// Real records from the 2026-11-09 index build. Sizes are rendered exactly as
// the app's formatSize() does: totalSize/1024, 0 decimals below 1MB, 1 above.
const WIDGETS = [
  {
    name: 'Local TFTP Server',
    version: '1.0.0',
    desc: 'Serve a folder over TFTP',
    meta: 'ZHAO Xudong · 62957d6 · 17 files / 88 KB'
  },
  {
    name: 'Passbolt Search',
    version: '0.1.0',
    desc: 'Search Passbolt resources locally',
    meta: 'unknown · c18acfd · 60 files / 16768.3 KB'
  },
  {
    name: 'Docker Cockpit',
    version: '1.0.0',
    desc: 'Your local containers at a glance',
    meta: 'unknown · 9da2111 · 9 files / 26 KB'
  }
]

const DIALOG_ROWS = [
  'Version: 1.0.0',
  'Author: ZHAO Xudong',
  'Repository: github.com/electerm/electerm-widget-tftp',
  'Commit: 62957d636a30...',
  'Files: 17 (88 KB), pinned and verified'
]

const CHECKS = ['package.json', 'main.js', 'sha256 · every file']

const CHIPS = [
  { text: '3 widgets indexed', from: 1000, to: 1450, outFrom: 2700, outTo: 3100 },
  { text: 'pinned commit', from: 2600, to: 3050, outFrom: 4400, outTo: 4800 },
  { text: 'sha256 · every file', from: 5800, to: 6250, outFrom: 9500, outTo: 9900 }
]

const STATUS = [
  { at: 0, text: 'GET /api/v1/index.json  ·  3 widgets  ·  generatedAt 2026-11-09' },
  { at: T.clickInstall, text: 'Install Local TFTP Server?  ·  main.js has full Node permissions' },
  { at: T.popFrom, text: 'commit 62957d636a302d43e606615857e32963950ef37c  ·  17 files' },
  { at: T.clickOk, text: 'importWidgetFromRegistry  ·  verify the tree before copying' },
  { at: T.verifyFrom, text: 'sha256:548b89e8...  ·  every path, size and hash compared' },
  { at: T.installedFrom, text: 'installed  ·  tftp-server v1.0.0  ·  commit pinned' }
]

const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

const CSS = `
.eb-wr {
  /* the app's shipped dark ui theme, from theme-defaults.js */
  --wr-main: #121214;
  --wr-dark: #000000;
  --wr-light: #2e3338;
  --wr-text: #dddddd;
  --wr-dim: #888888;
  --wr-disabled: #777777;
  --wr-primary: #08c;
  --wr-success: #06d6a0;
  --wr-error: #ef476f;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #eaf3ff 0%, #f2ecff 52%, #fdeef5 100%);
  color: var(--color-text, #16233a);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}

/* ---------- background ---------- */
.eb-wr-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-wr-dots {
  position: absolute; inset: -6em;
  background-image: radial-gradient(rgba(8, 136, 204, 0.2) 0.16em, transparent 0.16em);
  background-size: 4.1em 4.1em;
  animation: eb-wr-drift 34s linear infinite;
}
@keyframes eb-wr-drift { to { transform: translate3d(4.1em, 4.1em, 0); } }
.eb-wr-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-wr-blob-a { width: 30em; height: 30em; right: -10em; top: -13em; }
.eb-wr-blob-b { width: 23em; height: 23em; left: -9em; bottom: -12em; }
.eb-wr-spark {
  position: absolute;
  width: 1.7em; height: 1.7em;
  background: var(--wr-success);
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-wr-twinkle 3.6s ease-in-out infinite;
}
.eb-wr-spark-a { right: 8em; top: 4.2em; }
.eb-wr-spark-b { right: 16em; top: 12.2em; width: 1.05em; height: 1.05em; background: #ec4899; animation-delay: 0.7s; }
.eb-wr-spark-c { right: 4.4em; top: 15.6em; width: 1.25em; height: 1.25em; background: #8884d8; animation-delay: 1.4s; }
@keyframes eb-wr-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}

/* ---------- headline (hero only) ---------- */
.eb-wr-head { position: absolute; left: 5em; right: 5em; top: 2.4em; z-index: 2; pointer-events: none; }
.eb-wr-badge {
  display: inline-block;
  font-size: 1.3em; font-weight: 800; letter-spacing: 0.1em;
  color: #ffffff;
  background: linear-gradient(96deg, #2563eb, #7c3aed 55%, #ec4899);
  border-radius: 999px; padding: 0.3em 1em;
}
.eb-wr-h1 {
  margin: 0.24em 0 0;
  font-size: 3.25em; font-weight: 800; letter-spacing: -0.025em;
  line-height: 1.03; color: #0f172a;
}
.eb-wr-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #0888cc, #7c3aed 55%, #ec4899);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-wr-sub { margin: 0.42em 0 0; font-size: 1.42em; color: #475569; max-width: 76em; }
.eb-wr-sub b { color: #0f172a; }

/* ---------- annotation chips: a row ABOVE the window, never inside it ----------
   The window clips its children, so a chip anchored to a row would be sliced. */
.eb-wr-chips { position: absolute; left: 9em; top: 12.4em; display: flex; gap: 0.8em; z-index: 2; }
.eb-wr-chip {
  display: flex; align-items: center; gap: 0.45em;
  height: 2.45em; padding: 0 0.9em;
  border-radius: 999px; background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(8, 136, 204, 0.28);
  box-shadow: 0 0.2em 0.6em rgba(15, 23, 42, 0.1);
  opacity: 0; white-space: nowrap;
}
.eb-wr-chip i { width: 0.5em; height: 0.5em; border-radius: 50%; background: var(--wr-primary); flex: none; }
.eb-wr-chip b { font-size: 1.12em; font-weight: 700; color: #1e3a5f; }

/* ---------- the electerm window ---------- */
.eb-wr-frame {
  position: absolute; left: 50%; bottom: 3.2em;
  width: 82em; height: 36em;
  transform: translate(-50%, 0);
  z-index: 3;
}
.eb-wr-app {
  position: relative; display: flex; flex-direction: column;
  width: 100%; height: 100%;
  background: var(--wr-main);
  border-radius: 0.8em; overflow: hidden;
  box-shadow: 0 1.2em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(124, 58, 237, 0.22);
}
.eb-wr-tabbar {
  flex: none; display: flex; align-items: stretch;
  height: 3.2em; padding: 0 0.7em;
  background: var(--wr-dark);
}
.eb-wr-tab { display: flex; align-items: center; padding: 0 0.95em; border-radius: 0.2em 0.2em 0 0; }
.eb-wr-tab.is-on { background: var(--wr-main); box-shadow: inset 0 -0.15em 0 0 var(--wr-primary); }
.eb-wr-tab b { font-size: 1.24em; color: var(--wr-dim); white-space: nowrap; }
.eb-wr-tab.is-on b { color: var(--wr-text); font-weight: 700; }
.eb-wr-tab-end { margin-left: auto; display: flex; align-items: center; padding: 0 0.6em; }
.eb-wr-tab-end b { font-size: 1.05em; color: var(--wr-disabled); font-family: Menlo, Monaco, monospace; white-space: nowrap; }

/* The dialog is a floating layer inside the body. The body itself must NOT
   clip: the outer app does that, and the dialog stays inside its bounds. */
.eb-wr-body {
  position: relative; flex: 1; min-height: 0;
  display: grid; grid-template-columns: 1fr 0.88fr;
}
.eb-wr-left, .eb-wr-right { min-width: 0; overflow: hidden; position: relative; }
.eb-wr-left { padding: 0.7em 0.8em; border-right: 1px solid var(--wr-light); background: #17171b; }
.eb-wr-right { padding: 1em 1.1em; background: #141418; }
/* A real antd modal dims everything behind it. Without this, the two em of
   right-column heading peeking out beside the dialog reads as a bug. */
.eb-wr-scrim {
  position: absolute; inset: 0;
  background: rgba(0, 0, 0, 0.55);
  opacity: 0; z-index: 3; pointer-events: none;
}

.eb-wr-search {
  display: flex; align-items: center;
  height: 2.5em; padding: 0 0.7em;
  background: #101014; border: 1px solid var(--wr-light); border-radius: 0.3em;
}
.eb-wr-search b { font-size: 1.12em; color: #6b7280; font-weight: 400; white-space: nowrap; }
.eb-wr-note { margin: 0.5em 0 0.3em; }
.eb-wr-note b { font-size: 1.02em; color: var(--wr-dim); white-space: nowrap; }
.eb-wr-left-foot {
  position: absolute; left: 0.8em; right: 0.8em; bottom: 0.5em;
  display: flex; align-items: center; height: 1.8em; min-width: 0;
}
.eb-wr-left-foot b {
  font-size: 0.94em; font-weight: 400; color: #6b7280;
  font-family: Menlo, Monaco, monospace;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}

.eb-wr-row {
  height: 6.5em; padding: 0.3em 0.55em;
  border-radius: 0.3em;
  opacity: 0;
}
.eb-wr-row.is-hot { background: #1f2730; }
.eb-wr-line { display: flex; align-items: center; height: 1.5em; min-width: 0; }
.eb-wr-name { font-size: 1.28em; font-weight: 700; color: var(--wr-text); white-space: nowrap; }
.eb-wr-ver { font-size: 1.02em; color: var(--wr-dim); margin-left: 0.55em; white-space: nowrap; }
.eb-wr-tag {
  font-size: 0.95em; color: var(--wr-success); margin-left: 0.55em;
  border: 1px solid rgba(6, 214, 160, 0.5); border-radius: 0.3em; padding: 0 0.35em;
  opacity: 0; white-space: nowrap;
}
.eb-wr-desc, .eb-wr-meta {
  display: block; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.eb-wr-desc { font-size: 1.02em; color: var(--wr-dim); line-height: 1.45; }
.eb-wr-meta { font-size: 0.94em; color: var(--wr-disabled); line-height: 1.45; font-family: Menlo, Monaco, monospace; }
.eb-wr-actions { display: flex; align-items: center; gap: 0.5em; height: 2.1em; margin-top: 0.3em; }
.eb-wr-install, .eb-wr-source, .eb-wr-btn {
  display: flex; align-items: center; justify-content: center;
  height: 100%; padding: 0 0.8em; border-radius: 0.25em;
}
.eb-wr-install { background: var(--wr-primary); }
.eb-wr-install.is-hot { background: #0a9ad9; }
.eb-wr-install b, .eb-wr-source b, .eb-wr-btn b { font-size: 1.08em; font-weight: 600; white-space: nowrap; }
.eb-wr-install b { color: #ffffff; }
.eb-wr-source b, .eb-wr-btn b { color: var(--wr-primary); font-weight: 400; }
.eb-wr-source { padding: 0 0.55em; }

/* ---------- verification panel ---------- */
.eb-wr-right-head { display: flex; align-items: center; height: 2.2em; }
.eb-wr-right-head b { font-size: 1.3em; font-weight: 700; color: var(--wr-text); }
.eb-wr-check {
  display: flex; align-items: center; gap: 0.55em;
  height: 2.7em; border-bottom: 1px solid var(--wr-light);
  opacity: 0.28;
}
.eb-wr-check::before {
  content: '○'; width: 1.1em; text-align: center;
  font-size: 1.15em; color: var(--wr-disabled); flex: none;
}
.eb-wr-check.is-ok::before { content: '✓'; color: var(--wr-success); }
.eb-wr-check b { font-size: 1.12em; color: var(--wr-text); white-space: nowrap; }
.eb-wr-digest { display: flex; align-items: center; height: 2.2em; margin-top: 0.7em; opacity: 0; }
.eb-wr-digest b {
  font-size: 1.02em; font-family: Menlo, Monaco, monospace; color: var(--wr-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
.eb-wr-installed {
  display: flex; align-items: center; gap: 0.5em;
  height: 2.4em; padding: 0 0.7em; margin-top: 0.5em;
  background: rgba(6, 214, 160, 0.1); border: 1px solid rgba(6, 214, 160, 0.65);
  border-radius: 0.3em; opacity: 0;
}
.eb-wr-installed i { width: 0.45em; height: 0.45em; border-radius: 50%; background: var(--wr-success); flex: none; }
.eb-wr-installed b { font-size: 1.08em; color: var(--wr-success); white-space: nowrap; }
.eb-wr-summary { display: flex; align-items: center; height: 1.9em; opacity: 0; min-width: 0; }
.eb-wr-summary b {
  font-size: 0.98em; font-weight: 400; color: var(--wr-dim);
  font-family: Menlo, Monaco, monospace;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}

/* ---------- confirm dialog ---------- */
.eb-wr-dialog {
  position: absolute; right: 1.4em; top: 1.3em;
  /* 37em starts exactly where the right grid column starts on the hero, so no
     half-cut heading peeks out from behind the modal */
  width: 37em; height: 24em; padding: 1em 1.1em;
  background: #1f1f25; border: 1px solid #3a4046; border-radius: 0.45em;
  box-shadow: 0 1em 2.4em rgba(0, 0, 0, 0.55);
  transform-origin: 80% 20%;
  opacity: 0; z-index: 4; pointer-events: none;
}
.eb-wr-dialog-title { display: flex; align-items: center; height: 1.8em; }
.eb-wr-dialog-title b { font-size: 1.32em; font-weight: 700; color: var(--wr-text); white-space: nowrap; }
.eb-wr-dialog-warn {
  margin: 0.35em 0 0.55em; padding: 0.45em 0.6em;
  border-left: 0.2em solid var(--wr-error); background: rgba(239, 71, 111, 0.09);
}
.eb-wr-dialog-warn b { font-size: 1.02em; line-height: 1.35; color: #f3a9bd; font-weight: 400; }
.eb-wr-drow { display: flex; align-items: center; height: 1.7em; opacity: 0; }
.eb-wr-drow b {
  font-size: 1.02em; font-family: Menlo, Monaco, monospace; color: #c8cdd4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
.eb-wr-dialog-link { display: flex; align-items: center; height: 1.6em; }
.eb-wr-dialog-link b { font-size: 1.02em; color: var(--wr-primary); white-space: nowrap; }
.eb-wr-dialog-buttons { display: flex; justify-content: flex-end; gap: 0.6em; height: 2.4em; margin-top: 0.45em; }
.eb-wr-btn { height: 100%; padding: 0 0.9em; border: 1px solid #3a4046; }
.eb-wr-btn.is-ok { background: var(--wr-primary); border-color: var(--wr-primary); }
.eb-wr-btn.is-ok b { color: #ffffff; font-weight: 600; }
.eb-wr-btn.is-hot { background: #0a9ad9; }

/* ---------- status bar ---------- */
.eb-wr-status {
  flex: none; display: flex; align-items: center; gap: 0.6em;
  height: 2.4em; padding: 0 0.9em; overflow: hidden;
  background: #0c0c0f; border-top: 1px solid #000000;
}
.eb-wr-status i {
  width: 0.45em; height: 0.45em; border-radius: 50%;
  background: var(--wr-success); flex: none;
  animation: eb-wr-blink 1.3s ease-in-out infinite;
}
@keyframes eb-wr-blink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
.eb-wr-status b {
  flex: 1; min-width: 0; font-size: 1.08em; font-weight: 400;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', monospace; color: #9aa4b2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ---------- pointer and ripples ---------- */
.eb-wr-pointer {
  position: absolute; width: 1.9em; height: 1.9em;
  margin: -0.2em 0 0 -0.35em; opacity: 0; z-index: 6; pointer-events: none;
  filter: drop-shadow(0 0.12em 0.25em rgba(15, 23, 42, 0.45));
}
.eb-wr-ripple {
  position: absolute; width: 3.4em; height: 3.4em; border-radius: 50%;
  border: 0.16em solid rgba(8, 136, 204, 0.8);
  opacity: 0; z-index: 5; pointer-events: none;
}

/* ---------- card variant: no headline, no chips, fewer rows, taller window ---------- */
.eb-wr[data-variant='card'] .eb-wr-head,
.eb-wr[data-variant='card'] .eb-wr-chips { display: none; }
.eb-wr[data-variant='card'] .eb-wr-frame {
  top: 50%; bottom: auto;
  width: 92em; height: 38em;
}
/* Zoom the whole app, text and geometry together, so a 311px thumbnail does
   not render four-pixel labels. A card has no status bar, so the body gains
   that height back. */
.eb-wr[data-variant='card'] .eb-wr-app { font-size: 1.22em; }
.eb-wr[data-variant='card'] .eb-wr-status { display: none; }
.eb-wr[data-variant='card'] .eb-wr-row { height: 7.4em; }
.eb-wr[data-variant='card'] .eb-wr-check { height: 3em; }
.eb-wr[data-variant='card'] .eb-wr-dialog { top: 2em; }
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

// Every transient label gets an explicit out phase. A fade-in with no fade-out
// strands the chip on screen for the rest of the loop.
function chipOpacity (t, c) {
  const inP = easeOut(seg(t, c.from, c.to))
  const outP = easeInOut(seg(t, c.outFrom, c.outTo))
  return inP * (1 - outP)
}

function esc (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-wr-head">
        <span class="eb-wr-badge">widgets.electerm.org</span>
        <h2 class="eb-wr-h1">Pinned commit. <em>Every file verified.</em></h2>
        <p class="eb-wr-sub">Settings → Widgets → Online reads the index, then <b>Install</b> hashes the whole tree before anything is copied.</p>
      </div>
      <div class="eb-wr-chips">
        ${CHIPS.map(c => `<span class="eb-wr-chip"><i></i><b>${esc(c.text)}</b></span>`).join('')}
      </div>`

  // The card is a thumbnail: drop one row so nothing silently overflows it.
  const rows = (variant === 'card' ? WIDGETS.slice(0, 2) : WIDGETS)
    .map((w, i) => `
      <div class="eb-wr-row" data-row="${i}">
        <div class="eb-wr-line">
          <b class="eb-wr-name">${esc(w.name)}</b>
          <b class="eb-wr-ver">${esc(w.version)}</b>
          <b class="eb-wr-tag">installed</b>
        </div>
        <b class="eb-wr-desc">${esc(w.desc)}</b>
        <b class="eb-wr-meta">${esc(w.meta)}</b>
        <div class="eb-wr-actions">
          <span class="eb-wr-install"><b>Install</b></span>
          <span class="eb-wr-source"><b>Source</b></span>
        </div>
      </div>`).join('')

  const checks = CHECKS.map(text =>
    `<div class="eb-wr-check"><b>${esc(text)}</b></div>`).join('')

  const drows = DIALOG_ROWS.map(text =>
    `<div class="eb-wr-drow"><b>${esc(text)}</b></div>`).join('')

  return `
    <div class="eb-wr-deco">
      <span class="eb-wr-dots"></span>
      <span class="eb-wr-blob eb-wr-blob-a"></span>
      <span class="eb-wr-blob eb-wr-blob-b"></span>
      <span class="eb-wr-spark eb-wr-spark-a"></span>
      <span class="eb-wr-spark eb-wr-spark-b"></span>
      <span class="eb-wr-spark eb-wr-spark-c"></span>
    </div>
    ${head}
    <div class="eb-wr-frame">
      <div class="eb-wr-app">
        <div class="eb-wr-tabbar">
          <span class="eb-wr-tab"><b>widgets</b></span>
          <span class="eb-wr-tab is-on"><b>Online</b></span>
          <span class="eb-wr-tab"><b>running instances (0)</b></span>
          <span class="eb-wr-tab-end"><b>widgets.electerm.org</b></span>
        </div>
        <div class="eb-wr-body">
          <div class="eb-wr-left">
            <div class="eb-wr-search"><b>Search online widgets...</b></div>
            <div class="eb-wr-note"><b>indexed at widgets.electerm.org · metadata only</b></div>
            ${rows}
            <div class="eb-wr-left-foot"><b>GET /api/v1/index.json · status: public</b></div>
          </div>
          <div class="eb-wr-right">
            <div class="eb-wr-right-head"><b>Import from registry</b></div>
            ${checks}
            <div class="eb-wr-digest"><b>sha256:548b89e8f72d676b...</b></div>
            <div class="eb-wr-installed"><i></i><b>Installed · commit pinned</b></div>
            <div class="eb-wr-summary"><b>commit 62957d636a302d43e...</b></div>
            <div class="eb-wr-summary"><b>17 files · 89,749 bytes · digest matches</b></div>
          </div>
          <div class="eb-wr-scrim"></div>
          <div class="eb-wr-dialog">
            <div class="eb-wr-dialog-title"><b>Install Local TFTP Server?</b></div>
            <div class="eb-wr-dialog-warn">
              <b>A widget's main.js runs in the main process<br>with full Node permissions — it can read files<br>and run commands. Install only source you trust.</b>
            </div>
            ${drows}
            <div class="eb-wr-dialog-link"><b>View source at this commit</b></div>
            <div class="eb-wr-dialog-buttons">
              <span class="eb-wr-btn"><b>Cancel</b></span>
              <span class="eb-wr-btn is-ok"><b>Import</b></span>
            </div>
          </div>
        </div>
        <div class="eb-wr-status"><i></i><b></b></div>
      </div>
      <span class="eb-wr-pointer">
        <svg viewBox="-3 -3 29 39" width="100%" height="100%" aria-hidden="true">
          <path d="${CURSOR_PATH}" fill="#ffffff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
        </svg>
      </span>
      <span class="eb-wr-ripple" data-ripple="1"></span>
      <span class="eb-wr-ripple" data-ripple="2"></span>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-wr'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm Widgets Online tab: three registry rows, an install confirmation dialog with the pinned commit, per-file sha256 verification and the installed widget')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const el = {
    frame: q('.eb-wr-frame'),
    rows: [...root.querySelectorAll('.eb-wr-row')],
    chips: [...root.querySelectorAll('.eb-wr-chip')],
    installBtn: q('.eb-wr-install'),
    rowTag: q('.eb-wr-tag'),
    checks: [...root.querySelectorAll('.eb-wr-check')],
    digest: q('.eb-wr-digest'),
    installed: q('.eb-wr-installed'),
    summaries: [...root.querySelectorAll('.eb-wr-summary')],
    scrim: q('.eb-wr-scrim'),
    dialog: q('.eb-wr-dialog'),
    drows: [...root.querySelectorAll('.eb-wr-drow')],
    okBtn: q('.eb-wr-btn.is-ok'),
    statusText: q('.eb-wr-status b'),
    pointer: q('.eb-wr-pointer'),
    ripples: [...root.querySelectorAll('.eb-wr-ripple')]
  }

  // 1em === 1% of the banner width, so the whole scene scales with its host.
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

  // The pointer lands on the real Install button and the real Import button.
  // Both are measured in the frame's own coordinates after layout.
  const targets = { p1: { x: 12, y: 18 }, p2: { x: 70, y: 22 } }
  const measure = () => {
    const frameBox = el.frame.getBoundingClientRect()
    const scale = root.clientWidth / 100 || 1
    const toFrame = (box, ax, ay) => ({
      x: (box.left + box.width * ax - frameBox.left) / scale,
      y: (box.top + box.height * ay - frameBox.top) / scale
    })
    const installBox = el.installBtn.getBoundingClientRect()
    const okBox = el.okBtn.getBoundingClientRect()
    if (installBox.width) targets.p1 = toFrame(installBox, 0.5, 0.5)
    if (okBox.width) targets.p2 = toFrame(okBox, 0.5, 0.5)
  }
  measure()
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure)
  }

  function ripple (node, t, at, target, gone) {
    const p = seg(t, at, at + 460)
    node.style.opacity = (p > 0 && p < 1 ? (1 - p) * (1 - gone) : 0).toFixed(3)
    node.style.transform = 'translate(-50%, -50%) scale(' + (0.4 + p * 2.6).toFixed(3) + ')'
    node.style.left = target.x.toFixed(2) + 'em'
    node.style.top = target.y.toFixed(2) + 'em'
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    root.style.opacity = (1 - gone).toFixed(3)

    // The card frame is centred with a -50% Y offset of its own, so the inline
    // transform has to carry that base rather than clobber it.
    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    const baseY = variant === 'card' ? -50 : 0
    el.frame.style.transform =
      `translate(-50%, ${baseY}%) translateY(${((1 - winP) * 3).toFixed(2)}em)`

    // Registry rows land one by one.
    el.rows.forEach((node, index) => {
      const p = easeOut(seg(t, T.rowFrom + index * T.rowGap,
        T.rowFrom + index * T.rowGap + T.rowDur))
      node.style.opacity = (p * (1 - gone)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.45).toFixed(3) + 'em)'
    })

    // Chips in the gutter above the window; every one has an out phase.
    el.chips.forEach((node, index) => {
      const p = chipOpacity(t, CHIPS[index])
      node.style.opacity = (p * (1 - gone)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.4).toFixed(3) + 'em)'
    })

    // Pointer: Install, then the dialog's Import button.
    const move = easeInOut(seg(t, T.ptr2From, T.ptr2To))
    const px = targets.p1.x + (targets.p2.x - targets.p1.x) * move
    const py = targets.p1.y + (targets.p2.y - targets.p1.y) * move
    const ptrIn = seg(t, T.ptr1From, T.ptr1From + 260)
    // The pointer leaves with the dialog. Leaving it parked in the empty
    // verification panel for the rest of the loop looks like a frozen cursor.
    const ptrOut = easeInOut(seg(t, T.ptrOutFrom, T.ptrOutTo))
    el.pointer.style.left = px.toFixed(2) + 'em'
    el.pointer.style.top = py.toFixed(2) + 'em'
    el.pointer.style.opacity = (ptrIn * (1 - ptrOut) * (1 - gone)).toFixed(3)
    const arrive = Math.max(
      easeOut(seg(t, T.ptr1From, T.ptr1To)),
      easeOut(seg(t, T.ptr2From, T.ptr2To))
    )
    el.pointer.style.transform = 'scale(' + (0.86 + 0.14 * arrive).toFixed(3) + ')'
    el.installBtn.classList.toggle('is-hot', t >= T.ptr1To && t < T.clickInstall)
    el.rows[0].classList.toggle('is-hot', t >= T.ptr1To && t < T.clickInstall)
    el.okBtn.classList.toggle('is-hot', t >= T.ptr2To && t < T.clickOk)
    ripple(el.ripples[0], t, T.clickInstall, targets.p1, gone)
    ripple(el.ripples[1], t, T.clickOk, targets.p2, gone)

    // Confirm dialog: opens on the click, closes after the second one.
    const popP = seg(t, T.popFrom, T.popTo)
    const popOut = 1 - easeInOut(seg(t, T.popCloseFrom, T.popCloseTo))
    el.dialog.style.opacity = (popP * popOut * (1 - gone)).toFixed(3)
    el.dialog.style.transform = 'scale(' + (0.86 + 0.14 * easeOutBack(popP)).toFixed(3) + ')'
    el.scrim.style.opacity = (popP * popOut * 0.9 * (1 - gone)).toFixed(3)
    el.drows.forEach((node, index) => {
      const p = easeOut(seg(t, T.popRowFrom + index * T.popRowGap,
        T.popRowFrom + index * T.popRowGap + 340))
      node.style.opacity = (p * (1 - gone)).toFixed(3)
    })

    // Verification: three checks, the digest, then the installed state.
    el.checks.forEach((node, index) => {
      const at = T.verifyFrom + index * T.verifyGap
      const p = easeOut(seg(t, at, at + T.verifyDur))
      node.style.opacity = (0.28 + 0.72 * p * (1 - gone)).toFixed(3)
      node.classList.toggle('is-ok', p > 0.55)
    })
    el.digest.style.opacity = (easeOut(seg(t, T.digestFrom, T.digestFrom + 400)) * (1 - gone)).toFixed(3)
    const done = easeOut(seg(t, T.installedFrom, T.installedFrom + 500))
    el.installed.style.opacity = (done * (1 - gone)).toFixed(3)
    el.rowTag.style.opacity = (done * (1 - gone)).toFixed(3)
    el.summaries.forEach(node => {
      node.style.opacity = (done * (1 - gone)).toFixed(3)
    })

    // The status bar narrates the beat, so a frozen frame still teaches.
    let text = STATUS[0].text
    for (const item of STATUS) {
      if (t >= item.at) text = item.text
    }
    el.statusText.textContent = text
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

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // One settled frame: the dialog open with its commit details AND the
    // verification panel completed, so the whole point is visible at a glance.
    frame(T.popRowFrom + 1000)
    el.checks.forEach(node => {
      node.style.opacity = '1'
      node.classList.add('is-ok')
    })
    el.digest.style.opacity = '1'
    el.installed.style.opacity = '1'
    el.rowTag.style.opacity = '1'
    el.summaries.forEach(node => { node.style.opacity = '1' })
    el.chips.forEach(node => { node.style.opacity = '0' })
    el.pointer.style.opacity = '0'
    el.ripples.forEach(node => { node.style.opacity = '0' })
    el.statusText.textContent = STATUS[STATUS.length - 1].text
    return
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
    // A host with no data-eb-banner-src (a test harness) is fair game for any
    // module; on the blog index only the matching module may claim a card.
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
