/**
 * Animated banner for the "SFTP path follow terminal" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the electerm window (tab bar + session control bar + a
 * terminal/SFTP split view), the typed `cd`, the SFTP address bar, the file
 * rows, the link badge, the cartoon pointer and the sync flashes are all
 * plain DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * Two acts, matching the two directions the article describes:
 *
 *   1. TERMINAL -> SFTP — `cd /var/www/app` is typed in the shell. The moment
 *      Enter lands, the paperclip link icon pulses, a beam sweeps across the
 *      split seam, and the SFTP address bar rewrites itself to the same path
 *      while its file list cross-fades to the new folder.
 *
 *   2. SFTP -> TERMINAL — the pointer clicks the `logs/` folder in the SFTP
 *      pane. The address bar descends one level, the beam fires back the other
 *      way, and the terminal answers with the matching `cd` on its next
 *      prompt line. That is the whole feature: one location, two views.
 *
 * The window is modelled on the real electerm UI, and the colours and metrics
 * below are taken from the app itself:
 *   tab bar / tabs ..... src/client/components/tabs/tabs.styl
 *   UI theme ........... src/client/css/includes/theme.styl (--main, --main-dark, ...)
 *                        with the shipped dark theme (src/client/common/theme-defaults.js,
 *                        defaultThemeDark) injected over it at runtime
 *   terminal theme ..... src/client/common/theme-defaults.js (defaultThemeDarkTerminal)
 *   cursor ............. src/client/common/default-setting.js
 *                        (cursorStyle: 'block', cursorBlink: false)
 *   session control bar  src/client/components/terminal/terminal.styl
 *                        (.terminal-control: --main, line-height 32px,
 *                         padding 0 10px) rendered by session-control.jsx
 *   follow toggle ...... session-control.jsx (PaperclipOutlined, tooltip
 *                        sftpPathFollowSsh; .sess-icon.active -> --warn)
 *   sftp file list ..... src/client/components/sftp/file-list.jsx + sftp.styl
 *                        (address bar, column header, row hover, folder icon)
 *   path tracking ...... OSC 633 shell integration reporting Cwd=
 *                        (src/client/components/terminal/shell.js)
 *
 * One deliberate liberty, noted so nobody mistakes it for UI: the light beam
 * sweeping across the split seam and the one-off flashes are an animation of
 * "the paths just synced", not a UI state. The app's only indicator is the
 * paperclip icon staying highlighted while follow is on.
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

const STYLE_ID = 'eb-sf-style'

// One full pass of the story (both directions), in ms.
const PERIOD = 10200

const T = {
  // ---- act 1: terminal -> sftp ----
  type1From: 700, // `cd /var/www/app` is typed in the shell
  type1To: 2100,
  enterAt: 2260, // Enter: prompt returns on the new path
  linkPulseFrom: 2280, // the paperclip icon pulses once
  linkPulseLen: 520,
  beam1From: 2320, // sync beam sweeps terminal -> sftp
  beam1To: 2920,
  addr1From: 2720, // sftp address bar rewrites to the new path
  addr1To: 3220,
  list1From: 3000, // ... and its file list cross-fades
  list1To: 3500,
  flash1From: 3050, // sftp pane edge flashes to mark the sync
  flash1Len: 480,
  badge1From: 2900, // "synced" badge pops over the seam
  badge1To: 3300,
  badge1OutFrom: 4300,
  badge1OutTo: 4650,

  // ---- act 2: sftp -> terminal ----
  ptrFrom: 5000, // pointer glides in over the logs/ row
  ptrTo: 5560,
  clickAt: 5700, // ... and clicks it
  addr2From: 5780, // address bar descends into logs/
  addr2To: 6280,
  list2From: 6000, // file list follows
  list2To: 6500,
  beam2From: 6100, // sync beam sweeps sftp -> terminal
  beam2To: 6700,
  linkPulse2From: 6150,
  linkPulse2Len: 520,
  cmd2From: 6600, // terminal answers with the matching cd
  cmd2To: 7200,
  out2From: 7300, // ... prints the folder, prompt returns
  out2To: 7650,
  flash2From: 6650,
  flash2Len: 480,
  badge2From: 6500,
  badge2To: 6900,
  badge2OutFrom: 8100,
  badge2OutTo: 8450,

  fadeFrom: 9200,
  fadeTo: 9700
}

const CMD1 = 'cd /var/www/app'
const PATH_HOME = '/home/zxd'
const PATH_APP = '/var/www/app'
const PATH_LOGS = '/var/www/app/logs'
const CMD2 = 'cd /var/www/app/logs'

// Home folder vs app folder vs logs folder listings.
const FILES_HOME = [
  { name: '.bashrc', dir: false, size: '3.7 KB' },
  { name: '.ssh', dir: true, size: '—' },
  { name: 'notes.txt', dir: false, size: '1.2 KB' },
  { name: 'sites', dir: true, size: '—' }
]
const FILES_APP = [
  { name: 'logs', dir: true, size: '—' },
  { name: 'public', dir: true, size: '—' },
  { name: 'app.js', dir: false, size: '18 KB' },
  { name: 'package.json', dir: false, size: '2.1 KB' }
]
const FILES_LOGS = [
  { name: 'app.log', dir: false, size: '4.2 MB' },
  { name: 'error.log', dir: false, size: '812 KB' },
  { name: 'access.log', dir: false, size: '2.9 MB' },
  { name: '..', dir: true, size: '—' }
]

const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

// antd CloseOutlined / PlusOutlined / DownOutlined / PaperclipOutlined, the
// same glyphs the app renders (via @ant-design/icons).
const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const PAPERCLIP_PATH = 'M779.3 196.6c-94.2-94.2-247.6-94.2-341.7 0l-261 260.8c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l261-260.8c32.4-32.4 75.5-50.2 121.3-50.2s88.9 17.8 121.2 50.2c32.4 32.4 50.2 75.5 50.2 121.2 0 45.8-17.8 88.8-50.2 121.2l-266 265.9-43.1 43.1c-40.3 40.3-105.8 40.3-146.1 0-19.5-19.5-30.2-45.4-30.2-73s10.7-53.5 30.2-73l263.9-263.8c6.7-6.6 15.5-10.3 24.9-10.3h.1c9.4 0 18.1 3.7 24.7 10.3 6.7 6.7 10.3 15.5 10.3 24.9 0 9.3-3.7 18.1-10.3 24.7L372.4 653c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l215.6-215.6c19.9-19.9 30.8-46.3 30.8-74.4s-11-54.6-30.8-74.4c-41.1-41.1-107.9-41-149 0L463 364 224.8 602.1A172.22 172.22 0 00174 724.8c0 46.3 18.1 89.8 50.8 122.5 33.9 33.8 78.3 50.7 122.7 50.7 44.4 0 88.8-16.9 122.6-50.7l309.2-309C824.8 492.7 850 432 850 367.5c.1-64.6-25.1-125.3-70.7-170.9z'
const FOLDER_PATH = 'M880 298.4H521L403.7 186.2a8.15 8.15 0 00-5.5-2.2H144c-17.7 0-32 14.3-32 32v592c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V330.4c0-17.7-14.3-32-32-32z'
const FILE_PATH = 'M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494z'
const LINK_PATH = 'M574 665.4a8.03 8.03 0 00-11.3 0L446.5 781.6c-53.8 53.8-141 53.8-194.8 0s-53.8-141 0-194.8l139.9-139.9a8.03 8.03 0 000-11.3l-34.4-34.4a8.03 8.03 0 00-11.3 0L206 541.1c-84.6 84.6-84.6 221.5 0 306s221.5 84.6 306 0l116.2-116.2a8.03 8.03 0 000-11.3l-54.2-54.2zm-20.5-280.4a8.03 8.03 0 00-11.3 0L342.2 585c-53.8 53.8-53.8 141 0 194.8 53.8 53.8 141 53.8 194.8 0l139.9-139.9a8.03 8.03 0 000-11.3l-34.4-34.4a8.03 8.03 0 000-11.3L758.7 466.7c-53.8-53.8-141-53.8-194.8 0l-116.2 116.2a8.03 8.03 0 000 11.3l54.2 54.2a8.03 8.03 0 0011.3 0l116.2-116.2c53.8-53.8 53.8-141 0-194.8s-141-53.8-194.8 0L438.5 437.5c-2.9 2.9-2.9 7.6 0 10.5l34.4 34.4a8.03 8.03 0 0011.3 0l116.2-116.2c27-27 70.7-27 97.7 0 27 27 27 70.7 0 97.7l-116.2 116.2a8.03 8.03 0 000 11.3l54.2 54.2c3.1 3.1 8.2 3.1 11.3 0l116.2-116.2c84.6-84.6 84.6-221.5 0-306s-221.5-84.6-306 0L341.4 343.6c-3.1 3.1-3.1 8.2 0 11.3l54.2 54.2c3.1 3.1 8.2 3.1 11.3 0l146.6-146.7c27-27 70.7-27 97.7 0s27 70.7 0 97.7l-97.7 97.7zM480 512a32 32 0 1032 32 32 32 0 00-32-32z'
const CHECK_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

function fileRow (f, i) {
  const glyph = f.dir
    ? `<span class="eb-sf-ficon is-dir">${icon(FOLDER_PATH, '')}</span>`
    : `<span class="eb-sf-ficon">${icon(FILE_PATH, '')}</span>`
  return `<div class="eb-sf-frow${i === 0 && f.dir && f.name === 'logs' ? ' is-target' : ''}" data-frow="${f.name}">${glyph}<span class="eb-sf-fname">${f.name}</span><span class="eb-sf-fsize">${f.size}</span></div>`
}

const CSS = `
.eb-sf {
  /* real electerm UI theme — src/client/css/includes/theme.styl, with the
     shipped dark theme (src/client/common/theme-defaults.js, defaultThemeDark)
     injected over it at runtime, which is where --main #121214 comes from. */
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-main-lighter: #5b5a5b;
  --eb-text: #ddd;
  --eb-text-light: #fff;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  /* .sess-icon.active — what the paperclip follow icon turns while on */
  --eb-warn: #e55934;
  /* real electerm default terminal theme — src/client/common/theme-defaults.js */
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-cursor: #b5bd68;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  --eb-split: #121214;
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

/* ---------- background decoration ---------- */
.eb-sf-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-sf-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-sf-drift 34s linear infinite;
}
@keyframes eb-sf-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-sf-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-sf-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-sf-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-sf-spark {
  position: absolute;
  width: 1.7em;
  height: 1.7em;
  background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-sf-twinkle 3.6s ease-in-out infinite;
}
.eb-sf-spark-a { right: 7.5em; top: 4.6em; }
.eb-sf-spark-b { right: 14.5em; top: 12em; width: 1.05em; height: 1.05em; background: #ec4899; animation-delay: 0.7s; }
.eb-sf-spark-c { right: 4.2em; top: 15.5em; width: 1.25em; height: 1.25em; background: #14b8a6; animation-delay: 1.4s; }
@keyframes eb-sf-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}

/* ---------- headline ---------- */
.eb-sf-head { position: absolute; left: 5em; right: 5em; top: 3em; }
.eb-sf-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #2563eb;
}
.eb-sf-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-sf-h1 {
  margin: 0.24em 0 0;
  font-size: 3.2em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-sf-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-sf-sub {
  margin: 0.5em 0 0;
  max-width: 62em;
  font-size: 1.55em;
  line-height: 1.4;
  color: #475569;
}
.eb-sf-sub b { color: #0f172a; font-weight: 700; }

/* ---------- the electerm window ---------- */
.eb-sf-app {
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
  animation: eb-sf-glow 4.4s ease-in-out infinite;
}
@keyframes eb-sf-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.34), 0 0 3.4em rgba(124, 58, 237, 0.4); }
}

/* ---------- tab bar ---------- */
.eb-sf-tabbar {
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.3em;
  line-height: 1;
}
.eb-sf-tab {
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
  background: var(--eb-main);
  color: var(--eb-text);
  font-weight: 700;
  white-space: nowrap;
}
.eb-sf-tab-name { overflow: hidden; text-overflow: ellipsis; }
.eb-sf-tab-status {
  position: absolute;
  left: 0.14em;
  top: 0.14em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-success);
}
.eb-sf-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-sf-tab-close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15em;
  height: 1.15em;
  border-radius: 50%;
  background: var(--eb-main-dark);
  color: var(--eb-text);
}
.eb-sf-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-sf-tab-add,
.eb-sf-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  height: 1.6em;
  color: var(--eb-text);
}
.eb-sf-tab-add { width: 1.5em; margin-left: 0.3em; }
.eb-sf-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-sf-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); }
.eb-sf-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }

/* ---------- session control bar ---------- */
.eb-sf-ctl {
  position: relative;
  display: flex;
  align-items: center;
  height: 3em;
  padding: 0 0.94em;
  background: var(--eb-main);
  color: var(--eb-text);
  white-space: nowrap;
  z-index: 4;
}
.eb-sf-type-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding-right: 1.43em;
  font-size: 1.17em;
  color: var(--eb-text);
}
.eb-sf-type-tab.is-active { color: var(--eb-text-light); }
.eb-sf-type-tab.is-active .eb-sf-type-tab-txt::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -0.32em;
  height: 1px;
  background: var(--eb-text-dark);
}
.eb-sf-type-tab-txt { position: relative; display: inline-block; }
.eb-sf-ctl-row { display: inline-flex; align-items: center; margin-left: 0.47em; }
.eb-sf-sess-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5em;
  height: 1.5em;
  margin-right: 0.7em;
  border-radius: 0.3em;
  color: var(--eb-text);
  transition: color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
}
.eb-sf-sess-icon svg { width: 1.13em; height: 1.13em; fill: currentColor; }
/* the paperclip follow toggle, on (session-control.jsx .sess-icon.active) */
.eb-sf-follow { color: var(--eb-warn); background: rgba(229, 89, 52, 0.16); }
.eb-sf-follow.pulse {
  box-shadow: 0 0 0 0.28em rgba(229, 89, 52, 0.55);
}
.eb-sf-ctl-tail { display: inline-flex; align-items: center; margin-left: auto; }
.eb-sf-ctl-tail .eb-sf-sess-icon:last-child { margin-right: 0; }
.eb-sf-tip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.95em;
  display: inline-flex;
  align-items: center;
  min-height: 2.67em;
  padding: 0.5em 0.67em;
  border-radius: 0.5em;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 1em;
  line-height: 1.5;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  z-index: 9;
}
.eb-sf-tip::before {
  content: '';
  position: absolute;
  bottom: -0.24em;
  left: 50%;
  width: 0.48em;
  height: 0.48em;
  margin-left: -0.24em;
  background: rgba(0, 0, 0, 0.85);
  transform: rotate(45deg);
}

/* ---------- split panes ---------- */
.eb-sf-panes {
  position: relative;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 0.4em;
  background: var(--eb-split);
}
.eb-sf-cell { display: flex; flex-direction: column; min-width: 0; }

/* ---------- terminal ---------- */
.eb-sf-term {
  position: relative;
  padding: 1em 1em 1.1em;
  background: var(--eb-term-bg);
  font-size: 1.9em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.45;
  color: var(--eb-term-fg);
  white-space: nowrap;
  overflow: hidden;
  min-height: 9.6em;
}
.eb-sf-line { line-height: 1.45; }
.eb-sf-ps1 { color: var(--eb-term-green); }
.eb-sf-ps1-path { color: var(--eb-term-blue); }
.eb-sf-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.04em;
  vertical-align: -0.26em;
  background: var(--eb-term-cursor);
}
.eb-sf-prompt2, .eb-sf-cmd2, .eb-sf-ls, .eb-sf-prompt3 { opacity: 0; }

/* ---------- sftp pane ---------- */
.eb-sf-sftp {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #1a1a1e;
  min-height: 9.6em;
  overflow: hidden;
}
.eb-sf-addr {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.55em 0.7em;
  background: #232329;
  border-bottom: 1px solid #34343c;
  font-size: 1.35em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  color: #e8e8ea;
  white-space: nowrap;
  overflow: hidden;
}
.eb-sf-addr-lock { width: 0.9em; height: 0.9em; fill: var(--eb-success); flex: none; }
.eb-sf-addr-path { overflow: hidden; text-overflow: ellipsis; }
.eb-sf-addr-path .hl { color: var(--eb-term-blue); }
.eb-sf-cols {
  display: flex;
  padding: 0.4em 0.9em;
  font-size: 1.05em;
  color: var(--eb-text-dark);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.eb-sf-cols span:last-child { margin-left: auto; }
.eb-sf-flist { position: relative; flex: 1; font-size: 1.45em; }
.eb-sf-fset { position: absolute; inset: 0; }
.eb-sf-frow {
  display: flex;
  align-items: center;
  gap: 0.55em;
  padding: 0.32em 0.9em;
  color: #d7d7db;
  border-left: 0.18em solid transparent;
  white-space: nowrap;
}
.eb-sf-frow.is-target { border-left-color: var(--eb-warn); background: rgba(229, 89, 52, 0.14); }
.eb-sf-frow.is-open { background: rgba(8, 204, 170, 0.14); border-left-color: var(--eb-success); }
.eb-sf-ficon { width: 1em; height: 1em; flex: none; }
.eb-sf-ficon svg { width: 100%; height: 100%; fill: #9aa4b2; }
.eb-sf-ficon.is-dir svg { fill: var(--eb-term-blue); }
.eb-sf-fname { overflow: hidden; text-overflow: ellipsis; }
.eb-sf-fsize { margin-left: auto; color: var(--eb-text-dark); font-size: 0.82em; flex: none; }
.eb-sf-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  box-shadow: inset 0 0 0 0.18em var(--eb-warn);
}

/* ---------- sync beam + badge + pointer ---------- */
.eb-sf-beam {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 0.35em;
  background: linear-gradient(180deg, transparent, var(--eb-warn) 30%, #fbbf24 50%, var(--eb-warn) 70%, transparent);
  opacity: 0;
  pointer-events: none;
  z-index: 5;
  filter: blur(0.06em);
}
.eb-sf-badge {
  position: absolute;
  left: 50%;
  top: 46%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.4em 0.8em;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(229, 89, 52, 0.7);
  color: #fff;
  font-size: 1.25em;
  white-space: nowrap;
  opacity: 0;
  z-index: 6;
  pointer-events: none;
}
.eb-sf-badge svg { width: 1em; height: 1em; fill: var(--eb-success); }
.eb-sf-pointer {
  position: absolute;
  width: 1.15em;
  height: 1.55em;
  opacity: 0;
  filter: drop-shadow(0 0.08em 0.16em rgba(0, 0, 0, 0.42));
  pointer-events: none;
  z-index: 7;
}
.eb-sf-ripple {
  position: absolute;
  width: 0.9em;
  height: 0.9em;
  border: 0.14em solid var(--eb-term-blue);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  z-index: 8;
}

/* ---------- card (blog index) variant ---------- */
.eb-sf[data-variant='card'] .eb-sf-app {
  bottom: auto;
  top: 50%;
  width: 92em;
  transform: translate(-50%, -50%);
}
.eb-sf[data-variant='card'] .eb-sf-term { font-size: 2.2em; min-height: 8.6em; }
.eb-sf[data-variant='card'] .eb-sf-sftp { min-height: 8.6em; }
.eb-sf[data-variant='card'] .eb-sf-addr { font-size: 1.6em; }
.eb-sf[data-variant='card'] .eb-sf-flist { font-size: 1.7em; }

@media (prefers-reduced-motion: reduce) {
  .eb-sf-dots, .eb-sf-spark, .eb-sf-app { animation: none !important; }
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

function pulse (p) {
  return Math.sin(Math.PI * clamp(p, 0, 1))
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-sf-head">
        <span class="eb-sf-brand">electerm</span>
        <h2 class="eb-sf-h1">SFTP that <em>follows your shell</em></h2>
        <p class="eb-sf-sub"><b>cd</b> in the terminal and the file panel moves with you — click a folder and the terminal follows back.</p>
      </div>`
  return `
    <div class="eb-sf-deco">
      <span class="eb-sf-blob eb-sf-blob-a"></span>
      <span class="eb-sf-blob eb-sf-blob-b"></span>
      <span class="eb-sf-dots"></span>
      <span class="eb-sf-spark eb-sf-spark-a"></span>
      <span class="eb-sf-spark eb-sf-spark-b"></span>
      <span class="eb-sf-spark eb-sf-spark-c"></span>
    </div>
    ${head}
    <div class="eb-sf-app">
      <div class="eb-sf-tabbar">
        <span class="eb-sf-tab">
          <span class="eb-sf-tab-status"></span>
          <span class="eb-sf-tab-count">2</span>
          <span class="eb-sf-tab-name">zxd@web-01:22</span>
          <span class="eb-sf-tab-close">${icon(CLOSE_PATH, '')}</span>
        </span>
        <span class="eb-sf-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-sf-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-sf-ctl">
        <span class="eb-sf-type-tab is-active"><span class="eb-sf-type-tab-txt">SSH</span></span>
        <span class="eb-sf-type-tab is-active"><span class="eb-sf-type-tab-txt">SFTP</span></span>
        <span class="eb-sf-ctl-row">
          <span class="eb-sf-sess-icon eb-sf-follow">${icon(PAPERCLIP_PATH, '')}<span class="eb-sf-tip">sftp path follow terminal</span></span>
        </span>
      </div>
      <div class="eb-sf-panes">
        <div class="eb-sf-cell">
          <div class="eb-sf-term">
            <div class="eb-sf-line"><span class="eb-sf-ps1">zxd@web-01</span>:<span class="eb-sf-ps1-path">~</span>$&nbsp;<span class="eb-sf-cmd1"></span><span class="eb-sf-caret eb-sf-caret1"></span></div>
            <div class="eb-sf-line eb-sf-prompt2"><span class="eb-sf-ps1">zxd@web-01</span>:<span class="eb-sf-ps1-path">/var/www/app</span>$&nbsp;<span class="eb-sf-caret eb-sf-caret-idle"></span></div>
            <div class="eb-sf-line eb-sf-cmd2"><span class="eb-sf-ps1">zxd@web-01</span>:<span class="eb-sf-ps1-path">/var/www/app</span>$&nbsp;<span class="eb-sf-cmd2-txt"></span></div>
            <div class="eb-sf-line eb-sf-ls">app.js&nbsp;&nbsp;logs/&nbsp;&nbsp;public/&nbsp;&nbsp;package.json</div>
            <div class="eb-sf-line eb-sf-prompt3"><span class="eb-sf-ps1">zxd@web-01</span>:<span class="eb-sf-ps1-path">/var/www/app/logs</span>$&nbsp;<span class="eb-sf-caret eb-sf-caret3"></span></div>
          </div>
        </div>
        <div class="eb-sf-cell">
          <div class="eb-sf-sftp">
            <div class="eb-sf-addr"><span class="eb-sf-addr-lock">${icon(CHECK_PATH, '')}</span><span class="eb-sf-addr-path"></span></div>
            <div class="eb-sf-cols"><span>Name</span><span>Size</span></div>
            <div class="eb-sf-flist">
              <div class="eb-sf-fset eb-sf-fset-home">${FILES_HOME.map(fileRow).join('')}</div>
              <div class="eb-sf-fset eb-sf-fset-app">${FILES_APP.map(fileRow).join('')}</div>
              <div class="eb-sf-fset eb-sf-fset-logs">${FILES_LOGS.map(fileRow).join('')}</div>
            </div>
            <span class="eb-sf-flash"></span>
            <span class="eb-sf-pointer"><svg viewBox="-3 -3 29 39" width="100%" height="100%"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
            <span class="eb-sf-ripple"></span>
          </div>
        </div>
        <div class="eb-sf-beam"></div>
        <div class="eb-sf-badge">${icon(LINK_PATH, '')}<span class="eb-sf-badge-txt">paths synced</span></div>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-sf'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm: typing cd slash var slash www slash app in the terminal moves the SFTP panel to the same folder, and clicking the logs folder moves the terminal there too')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    cmd1: root.querySelector('.eb-sf-cmd1'),
    caret1: root.querySelector('.eb-sf-caret1'),
    caretIdle: root.querySelector('.eb-sf-caret-idle'),
    prompt2: root.querySelector('.eb-sf-prompt2'),
    cmd2row: root.querySelector('.eb-sf-cmd2'),
    cmd2txt: root.querySelector('.eb-sf-cmd2-txt'),
    ls: root.querySelector('.eb-sf-ls'),
    prompt3: root.querySelector('.eb-sf-prompt3'),
    caret3: root.querySelector('.eb-sf-caret3'),
    follow: root.querySelector('.eb-sf-follow'),
    tip: root.querySelector('.eb-sf-tip'),
    addr: root.querySelector('.eb-sf-addr-path'),
    setHome: root.querySelector('.eb-sf-fset-home'),
    setApp: root.querySelector('.eb-sf-fset-app'),
    setLogs: root.querySelector('.eb-sf-fset-logs'),
    panes: root.querySelector('.eb-sf-panes'),
    sftp: root.querySelector('.eb-sf-sftp'),
    flash: root.querySelector('.eb-sf-flash'),
    beam: root.querySelector('.eb-sf-beam'),
    badge: root.querySelector('.eb-sf-badge'),
    badgeTxt: root.querySelector('.eb-sf-badge-txt'),
    pointer: root.querySelector('.eb-sf-pointer'),
    ripple: root.querySelector('.eb-sf-ripple'),
    target: root.querySelector('[data-frow="logs"]')
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

  // Pointer geometry in % of the sftp pane: park bottom-right, click logs/ row.
  function pointerGeom () {
    const pane = el.sftp.getBoundingClientRect()
    const row = el.target ? el.target.getBoundingClientRect() : pane
    if (!pane.width) return { x0: 88, y0: 88, x1: 40, y1: 30 }
    const cx = (r) => ((r.left + r.width / 2 - pane.left) / pane.width) * 100
    const cy = (r) => ((r.top + r.height / 2 - pane.top) / pane.height) * 100
    return {
      x0: 92,
      y0: 90,
      x1: clamp(cx(row), 8, 92),
      y1: clamp(cy(row), 10, 90)
    }
  }
  let geom = pointerGeom()
  window.addEventListener('resize', () => { geom = pointerGeom() })

  function paintAddr (text, hlFrom) {
    if (hlFrom < 0 || hlFrom >= text.length) {
      el.addr.textContent = text
      return
    }
    const a = text.slice(0, hlFrom)
    const b = text.slice(hlFrom)
    el.addr.innerHTML = ''
    el.addr.appendChild(document.createTextNode(a))
    const span = document.createElement('span')
    span.className = 'hl'
    span.textContent = b
    el.addr.appendChild(span)
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    const vis = 1 - gone

    // ================= act 1: terminal -> sftp =================
    const typed1 = Math.round(easeOut(seg(t, T.type1From, T.type1To)) * CMD1.length)
    el.cmd1.textContent = CMD1.slice(0, typed1)
    const entered1 = t >= T.enterAt
    el.caret1.style.display = entered1 ? 'none' : ''
    const p2 = easeOut(seg(t, T.enterAt, T.enterAt + 300))
    el.prompt2.style.opacity = (p2 * vis).toFixed(3)
    el.caretIdle.style.display = (t >= T.cmd2From && t < T.out2From + 200) ? 'none' : ''

    // paperclip follow toggle pulses on each sync (stays on throughout)
    const pu1 = pulse(seg(t, T.linkPulseFrom, T.linkPulseFrom + T.linkPulseLen))
    const pu2 = pulse(seg(t, T.linkPulse2From, T.linkPulse2From + T.linkPulse2Len))
    const pu = Math.max(pu1, pu2)
    el.follow.classList.toggle('pulse', pu > 0.4)
    el.follow.style.opacity = vis.toFixed(3)

    // tooltip naming the feature, shown briefly at the start
    const tipP = easeOut(seg(t, 900, 1250)) * (1 - easeInOut(seg(t, 2600, 3000)))
    el.tip.style.opacity = (tipP * vis).toFixed(3)

    // beam terminal -> sftp, then sftp -> terminal
    const b1 = seg(t, T.beam1From, T.beam1To)
    const b2 = seg(t, T.beam2From, T.beam2To)
    if (b2 > 0 && b2 < 1) {
      const x = 50 - easeInOut(b2) * 44
      el.beam.style.left = x.toFixed(2) + '%'
      el.beam.style.opacity = (Math.sin(Math.PI * b2) * vis).toFixed(3)
    } else if (b1 > 0 && b1 < 1) {
      const x = 50 - 44 + easeInOut(b1) * 44
      el.beam.style.left = x.toFixed(2) + '%'
      el.beam.style.opacity = (Math.sin(Math.PI * b1) * vis).toFixed(3)
    } else {
      el.beam.style.opacity = 0
    }

    // sftp address bar: home -> app -> app/logs
    const a1 = easeInOut(seg(t, T.addr1From, T.addr1To))
    const a2 = easeInOut(seg(t, T.addr2From, T.addr2To))
    if (a2 > 0) {
      const cut = Math.round((1 - a2) * (PATH_LOGS.length - PATH_APP.length))
      paintAddr(PATH_LOGS.slice(0, PATH_LOGS.length - cut), PATH_APP.length)
    } else if (a1 > 0) {
      // address bar morphs character by character to the new path
      const n = Math.round(a1 * PATH_APP.length)
      paintAddr(PATH_APP.slice(0, Math.max(n, 1)), 0)
    } else {
      paintAddr(PATH_HOME, -1)
    }

    // file lists cross-fade home -> app -> logs
    const l1 = easeOut(seg(t, T.list1From, T.list1To))
    const l2 = easeOut(seg(t, T.list2From, T.list2To))
    el.setHome.style.opacity = ((1 - l1) * vis).toFixed(3)
    el.setApp.style.opacity = ((l1 * (1 - l2)) * vis).toFixed(3)
    el.setLogs.style.opacity = ((l2) * vis).toFixed(3)
    el.setHome.style.transform = 'translateY(' + ((1 - (1 - l1)) * 0.3).toFixed(3) + 'em)'
    el.setApp.style.transform = 'translateY(' + ((1 - l1) * 0.4).toFixed(3) + 'em)'
    el.setLogs.style.transform = 'translateY(' + ((1 - l2) * 0.4).toFixed(3) + 'em)'

    // sftp edge flash on each sync
    const f1 = pulse(seg(t, T.flash1From, T.flash1From + T.flash1Len))
    const f2 = pulse(seg(t, T.flash2From, T.flash2From + T.flash2Len))
    el.flash.style.opacity = (Math.max(f1, f2) * 0.9 * vis).toFixed(3)

    // "paths synced" badge over the seam
    const bd1 = easeOut(seg(t, T.badge1From, T.badge1To)) * (1 - easeInOut(seg(t, T.badge1OutFrom, T.badge1OutTo)))
    const bd2 = easeOut(seg(t, T.badge2From, T.badge2To)) * (1 - easeInOut(seg(t, T.badge2OutFrom, T.badge2OutTo)))
    const bd = Math.max(bd1, bd2)
    el.badge.style.opacity = (bd * vis).toFixed(3)
    el.badge.style.transform = 'translate(-50%, -50%) scale(' + (0.8 + 0.2 * bd).toFixed(3) + ')'
    if (bd2 > 0.5) el.badgeTxt.textContent = 'terminal follows sftp'
    else el.badgeTxt.textContent = 'sftp follows terminal'

    // ================= act 2: sftp -> terminal =================
    const arrive = easeOut(seg(t, T.ptrFrom, T.ptrTo))
    const px = geom.x0 + (geom.x1 - geom.x0) * arrive
    const py = geom.y0 + (geom.y1 - geom.y0) * arrive
    // after the click the pointer lingers on the row, then fades with the loop
    el.pointer.style.left = px.toFixed(2) + '%'
    el.pointer.style.top = py.toFixed(2) + '%'
    el.pointer.style.opacity = (seg(t, T.ptrFrom, T.ptrFrom + 260) * (1 - gone)).toFixed(3)

    const clicked = t >= T.clickAt
    if (el.target) el.target.classList.toggle('is-open', clicked && t < T.fadeFrom)

    const rip = seg(t, T.clickAt, T.clickAt + 430)
    el.ripple.style.opacity = (rip > 0 && rip < 1 ? (1 - rip) * vis : 0).toFixed(3)
    el.ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.4 + rip * 2.6).toFixed(3) + ')'
    el.ripple.style.left = geom.x1.toFixed(2) + '%'
    el.ripple.style.top = geom.y1.toFixed(2) + '%'

    // terminal answers with the matching cd + an ls of the new folder
    const showCmd2 = t >= T.cmd2From
    if (showCmd2 && !el.cmd2txt.textContent) el.cmd2txt.textContent = CMD2
    const r2 = easeOut(seg(t, T.cmd2From, T.cmd2To))
    el.cmd2row.style.opacity = ((showCmd2 ? r2 : 0) * vis).toFixed(3)
    const o2 = easeOut(seg(t, T.out2From, T.out2To))
    el.ls.style.opacity = (o2 * vis).toFixed(3)
    el.prompt3.style.opacity = (o2 * vis).toFixed(3)
    el.caret3.style.display = o2 > 0.3 ? '' : 'none'
    if (!showCmd2) el.cmd2txt.textContent = ''
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.out2To + 200)
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
