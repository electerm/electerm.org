/**
 * Animated banner for the "terminal + SFTP split view" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the electerm window (tab bar + session control bar + a
 * terminal pane and an SFTP pane), the split-view icon, the cartoon pointer,
 * the sync flash and the mode badge are all plain DOM + CSS driven by one
 * requestAnimationFrame timeline.
 *
 * Two acts, matching the toggle this article describes:
 *
 *   1. TABS -> SPLIT — the pointer clicks the split-view icon in the session
 *      control bar. The icon turns --warn (session-control.jsx .sess-icon
 *      .active), a flash sweeps the content area, and the full-width terminal
 *      shrinks to the left half while the SFTP file manager slides in on the
 *      right. Badge: "split view: both together".
 *
 *   2. SPLIT -> TABS — the pointer clicks the icon again. The panes morph
 *      back to a single full-width terminal, the SFTP pane collapses away,
 *      and the icon cools down. Badge: "tab view: one at a time". Then the
 *      loop restarts, so the difference between the two modes is always one
 *      glance away.
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
 *   split toggle ....... session-control.jsx icon row (paperclip, split-view,
 *                        heartbeat, broadcast, wrap, ...) — .sess-icon.active
 *                        turns --warn; the glyph itself is
 *                        src/client/components/icons/split-view.jsx
 *                        (two side-by-side rectangles, stroked)
 *   sftp file list ..... src/client/components/sftp/file-list.jsx + sftp.styl
 *                        (address bar, column header, row hover, folder icon)
 *
 * One deliberate liberty, noted so nobody mistakes it for UI: the sweeping
 * flash and the mode badge are an animation of "the layout just changed", not
 * a UI state. The app's only indicator is the split-view icon staying
 * highlighted while split is on.
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

const STYLE_ID = 'eb-sv-style'

// One full pass of the story (tabs -> split -> tabs), in ms.
const PERIOD = 9600

const T = {
  // ---- act 1: tabs -> split ----
  tipFrom: 500, // "split view" tooltip over the icon
  tipTo: 950,
  tipOutFrom: 1500,
  tipOutTo: 1900,
  ptr1From: 600, // pointer glides to the split-view icon
  ptr1To: 1150,
  click1At: 1250, // ... and clicks it
  morph1From: 1350, // content morphs tabs -> split
  morph1To: 2100,
  flash1From: 1400, // content-area flash marks the switch
  flash1Len: 500,
  sftpInFrom: 1700, // sftp rows fade/slide in
  sftpInTo: 2300,
  badge1From: 2000, // "split view: both together"
  badge1To: 2400,
  badge1OutFrom: 5200,
  badge1OutTo: 5550,

  // ---- act 2: split -> tabs ----
  ptr2From: 5600, // pointer returns to the icon
  ptr2To: 6050,
  click2At: 6150,
  morph2From: 6250, // content morphs split -> tabs
  morph2To: 7000,
  flash2From: 6300,
  flash2Len: 500,
  badge2From: 6900, // "tab view: one at a time"
  badge2To: 7300,
  badge2OutFrom: 8300,
  badge2OutTo: 8650,

  fadeFrom: 8800,
  fadeTo: 9300
}

const FILES = [
  { name: 'app.js', dir: false, size: '18 KB' },
  { name: 'logs', dir: true, size: '—' },
  { name: 'public', dir: true, size: '—' },
  { name: 'package.json', dir: false, size: '2.1 KB' }
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
const LINK_PATH = 'M574 665.4a8.03 8.03 0 00-11.3 0L446.5 781.6c-53.8 53.8-141 53.8-194.8 0s-53.8-141 0-194.8l139.9-139.9a8.03 8.03 0 000-11.3l-34.4-34.4a8.03 8.03 0 00-11.3 0L206 541.1c-84.6 84.6-84.6 221.5 0 306s221.5 84.6 306 0l116.2-116.2a8.03 8.03 0 000-11.3l-54.2-54.2zm-20.5-280.4a8.03 8.03 0 00-11.3 0L342.2 585c-53.8 53.8-53.8 141 0 194.8 53.8 53.8 141 53.8 194.8 0l139.9-139.9a8.03 8.03 0 000-11.3l-34.4-34.4a8.03 8.03 0 000-11.3L758.7 466.7c-53.8-53.8-141-53.8-194.8 0l-116.2 116.2a8.03 8.03 0 000 11.3l54.2 54.2a8.03 8.03 0 0011.3 0l116.2-116.2c53.8-53.8 53.8-141 0-194.8s-141-53.8-194.8 0L438.5 437.5c-2.9 2.9-2.9 7.6 0 10.5l34.4 34.4a8.03 8.03 0 0011.3 0l116.2-116.2c27-27 70.7-27 97.7 0 27 27 27 70.7 0 97.7l-97.7 97.7zM480 512a32 32 0 1032 32 32 32 0 00-32-32z'
const CHECK_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z'

// Stroked two-rectangle glyph in the spirit of
// src/client/components/icons/split-view.jsx (viewBox 0 0 16 16).
const SPLIT_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="1.5" y="2.5" width="5.2" height="11" rx="1"/><rect x="9.3" y="2.5" width="5.2" height="11" rx="1"/></svg>'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

function fileRow (f) {
  const glyph = f.dir
    ? `<span class="eb-sv-ficon is-dir">${icon(FOLDER_PATH, '')}</span>`
    : `<span class="eb-sv-ficon">${icon(FILE_PATH, '')}</span>`
  return `<div class="eb-sv-frow">${glyph}<span class="eb-sv-fname">${f.name}</span><span class="eb-sv-fsize">${f.size}</span></div>`
}

const CSS = `
.eb-sv {
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-text: #ddd;
  --eb-text-light: #fff;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-warn: #e55934;
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
.eb-sv-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-sv-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-sv-drift 34s linear infinite;
}
@keyframes eb-sv-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-sv-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-sv-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-sv-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-sv-spark {
  position: absolute;
  width: 1.7em;
  height: 1.7em;
  background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-sv-twinkle 3.6s ease-in-out infinite;
}
.eb-sv-spark-a { right: 7.5em; top: 4.6em; }
.eb-sv-spark-b { right: 14.5em; top: 12em; width: 1.05em; height: 1.05em; background: #ec4899; animation-delay: 0.7s; }
.eb-sv-spark-c { right: 4.2em; top: 15.5em; width: 1.25em; height: 1.25em; background: #14b8a6; animation-delay: 1.4s; }
@keyframes eb-sv-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}
.eb-sv-head { position: absolute; left: 5em; right: 5em; top: 3em; }
.eb-sv-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #2563eb;
}
.eb-sv-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-sv-h1 {
  margin: 0.24em 0 0;
  font-size: 3.2em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-sv-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-sv-sub {
  margin: 0.5em 0 0;
  max-width: 62em;
  font-size: 1.55em;
  line-height: 1.4;
  color: #475569;
}
.eb-sv-sub b { color: #0f172a; font-weight: 700; }
.eb-sv-app {
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
  animation: eb-sv-glow 4.4s ease-in-out infinite;
}
@keyframes eb-sv-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.34), 0 0 3.4em rgba(124, 58, 237, 0.4); }
}
.eb-sv-tabbar {
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.3em;
  line-height: 1;
}
.eb-sv-tab {
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
.eb-sv-tab-status {
  position: absolute;
  left: 0.14em;
  top: 0.14em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-success);
}
.eb-sv-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-sv-tab-name { overflow: hidden; text-overflow: ellipsis; }
.eb-sv-tab-close {
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
.eb-sv-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-sv-tab-add,
.eb-sv-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  height: 1.6em;
  color: var(--eb-text);
}
.eb-sv-tab-add { width: 1.5em; margin-left: 0.3em; }
.eb-sv-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-sv-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); }
.eb-sv-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }
.eb-sv-ctl {
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
.eb-sv-type-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding-right: 1.43em;
  font-size: 1.17em;
  color: var(--eb-text-dark);
}
.eb-sv-type-tab.is-active { color: var(--eb-text-light); }
.eb-sv-type-tab.is-active .eb-sv-type-tab-txt::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -0.32em;
  height: 1px;
  background: var(--eb-text-dark);
}
.eb-sv-type-tab-txt { position: relative; display: inline-block; }
.eb-sv-ctl-row { display: inline-flex; align-items: center; margin-left: 0.47em; }
.eb-sv-sess-icon {
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
.eb-sv-sess-icon svg { width: 1.13em; height: 1.13em; fill: currentColor; }
.eb-sv-sess-icon.eb-sv-split svg { fill: none; }
.eb-sv-split.is-on { color: var(--eb-warn); background: rgba(229, 89, 52, 0.16); }
.eb-sv-split.pulse { box-shadow: 0 0 0 0.28em rgba(229, 89, 52, 0.55); }
.eb-sv-tip {
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
.eb-sv-tip::before {
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
.eb-sv-panes {
  position: relative;
  display: flex;
  background: var(--eb-split);
  min-height: 10.4em;
  overflow: hidden;
}
.eb-sv-term {
  position: relative;
  flex: none;
  padding: 1em 1em 1.1em;
  background: var(--eb-term-bg);
  font-size: 1.9em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.45;
  color: var(--eb-term-fg);
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
}
.eb-sv-line { line-height: 1.45; }
.eb-sv-ps1 { color: var(--eb-term-green); }
.eb-sv-ps1-path { color: var(--eb-term-blue); }
.eb-sv-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.04em;
  vertical-align: -0.26em;
  background: var(--eb-term-cursor);
}
.eb-sv-seam {
  flex: none;
  width: 0.4em;
  background: var(--eb-split);
}
.eb-sv-sftp {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  background: #1a1a1e;
  overflow: hidden;
  min-width: 0;
}
.eb-sv-addr {
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
.eb-sv-addr-lock { width: 0.9em; height: 0.9em; fill: var(--eb-success); flex: none; }
.eb-sv-addr-path { overflow: hidden; text-overflow: ellipsis; }
.eb-sv-cols {
  display: flex;
  padding: 0.4em 0.9em;
  font-size: 1.05em;
  color: var(--eb-text-dark);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.eb-sv-cols span:last-child { margin-left: auto; }
.eb-sv-flist { position: relative; flex: 1; font-size: 1.45em; }
.eb-sv-frow {
  display: flex;
  align-items: center;
  gap: 0.55em;
  padding: 0.32em 0.9em;
  color: #d7d7db;
  white-space: nowrap;
}
.eb-sv-ficon { width: 1em; height: 1em; flex: none; }
.eb-sv-ficon svg { width: 100%; height: 100%; fill: #9aa4b2; }
.eb-sv-ficon.is-dir svg { fill: var(--eb-term-blue); }
.eb-sv-fname { overflow: hidden; text-overflow: ellipsis; }
.eb-sv-fsize { margin-left: auto; color: var(--eb-text-dark); font-size: 0.82em; flex: none; }
.eb-sv-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  box-shadow: inset 0 0 0 0.18em var(--eb-warn);
  z-index: 5;
}
.eb-sv-badge {
  position: absolute;
  left: 50%;
  top: 58%;
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
.eb-sv-badge svg { width: 1em; height: 1em; fill: var(--eb-success); }
.eb-sv-pointer {
  position: absolute;
  width: 1.15em;
  height: 1.55em;
  opacity: 0;
  filter: drop-shadow(0 0.08em 0.16em rgba(0, 0, 0, 0.42));
  pointer-events: none;
  z-index: 7;
}
.eb-sv-ripple {
  position: absolute;
  width: 0.9em;
  height: 0.9em;
  border: 0.14em solid var(--eb-warn);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  z-index: 8;
}
.eb-sv[data-variant='card'] .eb-sv-app {
  bottom: auto;
  top: 50%;
  width: 92em;
  transform: translate(-50%, -50%);
}
@media (prefers-reduced-motion: reduce) {
  .eb-sv-dots, .eb-sv-spark, .eb-sv-app { animation: none !important; }
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
      <div class="eb-sv-head">
        <span class="eb-sv-brand">electerm</span>
        <h2 class="eb-sv-h1">Terminal + SFTP, <em>side by side</em></h2>
        <p class="eb-sv-sub">One toggle in the session toolbar flips classic <b>tabs</b> into a <b>split view</b> — no reconnect, no re-navigation.</p>
      </div>`
  return `
    <div class="eb-sv-deco">
      <span class="eb-sv-blob eb-sv-blob-a"></span>
      <span class="eb-sv-blob eb-sv-blob-b"></span>
      <span class="eb-sv-dots"></span>
      <span class="eb-sv-spark eb-sv-spark-a"></span>
      <span class="eb-sv-spark eb-sv-spark-b"></span>
      <span class="eb-sv-spark eb-sv-spark-c"></span>
    </div>
    ${head}
    <div class="eb-sv-app">
      <div class="eb-sv-tabbar">
        <span class="eb-sv-tab">
          <span class="eb-sv-tab-status"></span>
          <span class="eb-sv-tab-count">2</span>
          <span class="eb-sv-tab-name">zxd@web-01:22</span>
          <span class="eb-sv-tab-close">${icon(CLOSE_PATH, '')}</span>
        </span>
        <span class="eb-sv-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-sv-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-sv-ctl">
        <span class="eb-sv-type-tab eb-sv-type-ssh is-active"><span class="eb-sv-type-tab-txt">SSH</span></span>
        <span class="eb-sv-type-tab eb-sv-type-sftp"><span class="eb-sv-type-tab-txt">SFTP</span></span>
        <span class="eb-sv-ctl-row">
          <span class="eb-sv-sess-icon">${icon(PAPERCLIP_PATH, '')}</span>
          <span class="eb-sv-sess-icon eb-sv-split">${SPLIT_SVG}<span class="eb-sv-tip">split view: terminal + sftp</span></span>
        </span>
      </div>
      <div class="eb-sv-panes">
        <div class="eb-sv-term">
          <div class="eb-sv-line"><span class="eb-sv-ps1">zxd@web-01</span>:<span class="eb-sv-ps1-path">/var/www/app</span>$&nbsp;tar xzf release.tar.gz</div>
          <div class="eb-sv-line">release/&nbsp;&nbsp;app.js&nbsp;&nbsp;public/</div>
          <div class="eb-sv-line"><span class="eb-sv-ps1">zxd@web-01</span>:<span class="eb-sv-ps1-path">/var/www/app</span>$&nbsp;<span class="eb-sv-caret"></span></div>
        </div>
        <div class="eb-sv-seam"></div>
        <div class="eb-sv-sftp">
          <div class="eb-sv-addr"><span class="eb-sv-addr-lock">${icon(CHECK_PATH, '')}</span><span class="eb-sv-addr-path">/var/www/app</span></div>
          <div class="eb-sv-cols"><span>Name</span><span>Size</span></div>
          <div class="eb-sv-flist">${FILES.map(fileRow).join('')}</div>
        </div>
        <span class="eb-sv-flash"></span>
        <div class="eb-sv-badge">${icon(LINK_PATH, '')}<span class="eb-sv-badge-txt">split view: both together</span></div>
        <span class="eb-sv-pointer"><svg viewBox="-3 -3 29 39" width="100%" height="100%"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
        <span class="eb-sv-ripple"></span>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-sv'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm: clicking the split-view icon in the session toolbar turns the full-width terminal tab into a terminal plus SFTP side-by-side view, and clicking again turns it back')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    split: root.querySelector('.eb-sv-split'),
    tip: root.querySelector('.eb-sv-tip'),
    panes: root.querySelector('.eb-sv-panes'),
    term: root.querySelector('.eb-sv-term'),
    seam: root.querySelector('.eb-sv-seam'),
    sftp: root.querySelector('.eb-sv-sftp'),
    flist: root.querySelector('.eb-sv-flist'),
    tabSftp: root.querySelector('.eb-sv-type-sftp'),
    flash: root.querySelector('.eb-sv-flash'),
    badge: root.querySelector('.eb-sv-badge'),
    badgeTxt: root.querySelector('.eb-sv-badge-txt'),
    pointer: root.querySelector('.eb-sv-pointer'),
    ripple: root.querySelector('.eb-sv-ripple'),
    ctl: root.querySelector('.eb-sv-ctl')
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

  // Pointer geometry in % of the panes box: park bottom-right, click the
  // split-view icon up in the control bar.
  function iconGeom () {
    const box = el.panes.getBoundingClientRect()
    const r = el.split.getBoundingClientRect()
    const ctl = el.ctl.getBoundingClientRect()
    if (!box.width || !r.width) return { x0: 88, y0: 88, x1: 30, y1: 10 }
    const cx = ((r.left + r.width / 2 - box.left) / box.width) * 100
    // the icon lives above the panes box — express it just above the top edge
    const above = ((ctl.top + ctl.height / 2 - box.top) / box.height) * 100
    return {
      x0: 88,
      y0: 88,
      x1: clamp(cx, 8, 92),
      y1: clamp(above, -22, 30)
    }
  }
  let geom = iconGeom()
  window.addEventListener('resize', () => { geom = iconGeom() })
  // geometry depends on fonts/layout settling — re-measure shortly after mount
  setTimeout(() => { geom = iconGeom() }, 400)

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    const vis = 1 - gone

    // split amount: 0 = classic tabs (terminal full width), 1 = split view.
    // up in act 1, back down in act 2.
    const m1 = easeInOut(seg(t, T.morph1From, T.morph1To))
    const m2 = easeInOut(seg(t, T.morph2From, T.morph2To))
    const m = m1 * (1 - m2)

    // panes: terminal flexes 1 -> ~1.05 weight, sftp 0% -> 48% of the box.
    // done with explicit widths so the morph is a smooth slide, not a snap.
    const sftpW = m * 48
    const termW = 100 - sftpW - (m > 0.01 ? 1.2 : 0)
    el.term.style.width = termW.toFixed(2) + '%'
    el.sftp.style.width = sftpW.toFixed(2) + '%'
    el.seam.style.display = m > 0.01 ? '' : 'none'
    el.sftp.style.opacity = (seg(t, T.morph1From, T.morph1From + 300) * (1 - m2) * vis).toFixed(3)
    el.flist.style.opacity = (seg(t, T.sftpInFrom, T.sftpInTo) * (1 - easeInOut(seg(t, T.morph2From, T.morph2From + 350))) * vis).toFixed(3)
    el.flist.style.transform = 'translateX(' + ((1 - easeOut(seg(t, T.sftpInFrom, T.sftpInTo))) * 1.2).toFixed(3) + 'em)'

    // the SFTP type-tab lights up once its pane exists; SSH stays lit.
    const sftpActive = m > 0.5
    el.tabSftp.classList.toggle('is-active', sftpActive || t < T.morph1From)

    // split icon: off -> on at click 1, back off at click 2.
    const isOn = t >= T.click1At && t < T.click2At
    el.split.classList.toggle('is-on', isOn)
    const pu1 = pulse(seg(t, T.click1At, T.click1At + 420))
    const pu2 = pulse(seg(t, T.click2At, T.click2At + 420))
    el.split.classList.toggle('pulse', Math.max(pu1, pu2) > 0.4)
    el.split.style.opacity = vis.toFixed(3)

    // tooltip naming the feature, shown briefly at the start
    const tipP = easeOut(seg(t, T.tipFrom, T.tipTo)) * (1 - easeInOut(seg(t, T.tipOutFrom, T.tipOutTo)))
    el.tip.style.opacity = (tipP * vis).toFixed(3)

    // content flash on each switch
    const f1 = pulse(seg(t, T.flash1From, T.flash1From + T.flash1Len))
    const f2 = pulse(seg(t, T.flash2From, T.flash2From + T.flash2Len))
    el.flash.style.opacity = (Math.max(f1, f2) * 0.9 * vis).toFixed(3)

    // mode badge over the content area
    const bd1 = easeOut(seg(t, T.badge1From, T.badge1To)) * (1 - easeInOut(seg(t, T.badge1OutFrom, T.badge1OutTo)))
    const bd2 = easeOut(seg(t, T.badge2From, T.badge2To)) * (1 - easeInOut(seg(t, T.badge2OutFrom, T.badge2OutTo)))
    const bd = Math.max(bd1, bd2)
    el.badge.style.opacity = (bd * vis).toFixed(3)
    el.badge.style.transform = 'translate(-50%, -50%) scale(' + (0.8 + 0.2 * bd).toFixed(3) + ')'
    if (bd2 > 0.5) el.badgeTxt.textContent = 'tab view: one at a time'
    else el.badgeTxt.textContent = 'split view: both together'

    // pointer: glide in, click, linger, glide back for click 2, then park.
    let px
    let py
    let pop
    if (t < T.click2At) {
      const arrive = easeOut(seg(t, T.ptr1From, T.ptr1To))
      px = geom.x0 + (geom.x1 - geom.x0) * arrive
      py = geom.y0 + (geom.y1 - geom.y0) * arrive
      pop = seg(t, T.ptr1From, T.ptr1From + 260)
    } else {
      const arrive = easeOut(seg(t, T.ptr2From, T.ptr2To))
      px = geom.x0 + (geom.x1 - geom.x0) * arrive
      py = geom.y0 + (geom.y1 - geom.y0) * arrive
      pop = seg(t, T.ptr2From, T.ptr2From + 260)
    }
    el.pointer.style.left = px.toFixed(2) + '%'
    el.pointer.style.top = py.toFixed(2) + '%'
    el.pointer.style.opacity = (pop * (1 - gone)).toFixed(3)

    // click ripples on the icon
    const r1 = seg(t, T.click1At, T.click1At + 430)
    const r2 = seg(t, T.click2At, T.click2At + 430)
    const rip = (r1 > 0 && r1 < 1) ? r1 : ((r2 > 0 && r2 < 1) ? r2 : -1)
    if (rip >= 0) {
      el.ripple.style.opacity = ((1 - rip) * vis).toFixed(3)
      el.ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.4 + rip * 2.6).toFixed(3) + ')'
      el.ripple.style.left = geom.x1.toFixed(2) + '%'
      el.ripple.style.top = Math.max(geom.y1, 4).toFixed(2) + '%'
    } else {
      el.ripple.style.opacity = 0
    }
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame(T.badge1To + 200)
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
