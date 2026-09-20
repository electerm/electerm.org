/**
 * Animated banner for the "batch input & mirror input" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the electerm window (tab bar + four terminal panes + footer),
 * the session control bars, the mirror tooltip, the batch input panel, the
 * tick-list, the typed commands and the four outputs are all plain DOM + CSS
 * driven by one requestAnimationFrame timeline.
 *
 * Two acts, in the order the article introduces them:
 *
 *   1. MIRROR INPUT — the broadcast icon in web-01's session control bar is
 *      clicked (it turns --warn orange, tooltip "mirror input to all
 *      terminals"), the other three panes flash once to show they now
 *      receive, and then "hostname" is typed ONCE and appears character by
 *      character in all four panes in lockstep. That is the whole feature:
 *      a live broadcast from the active terminal, not a copy.
 *
 *   2. BATCH INPUT — the footer box opens, four tabs are ticked, one command
 *      is typed into the panel, Enter is pressed, the panel collapses and the
 *      line lands in all four panes AT ONCE (no per-character typing — the
 *      contrast with act 1 is the point). Each pane then prints its own
 *      answer.
 *
 * The window is modelled on the real electerm UI, and the colours and metrics
 * below are taken from the app itself:
 *   tab bar / tabs ..... src/client/components/tabs/tabs.styl
 *   tab title .......... src/client/components/tabs/tab-title.jsx + tab.jsx
 *                        (count pill, then create-title.jsx -> user@host:port)
 *   session control bar  src/client/components/terminal/terminal.styl
 *                        (.terminal-control: --main, line-height 32px,
 *                         padding 0 10px) rendered once per session by
 *                        src/client/components/session/session-control.jsx
 *   pane tabs .......... session.styl .type-tab (14px, padding-right 20px,
 *                        1px --text-dark underline on the active one)
 *   icon row ........... session-control.jsx render order — paperclip,
 *                        split-view, heartbeat, broadcast, wrap, then
 *                        fullscreen + search on the right — and session.styl
 *                        .sess-icon (margin-right 10px; .active -> --warn)
 *   mirror toggle ...... session-control.jsx renderBroadcastIcon()
 *                        (ApartmentOutlined, tooltip = locales
 *                         broadcastInput = "mirror input to all terminals")
 *   UI theme ........... src/client/css/includes/theme.styl, with the shipped
 *                        dark theme (src/client/common/theme-defaults.js,
 *                        defaultThemeDark) injected over it at runtime
 *   terminal theme ..... src/client/common/theme-defaults.js (defaultThemeDarkTerminal)
 *   cursor ............. src/client/common/default-setting.js
 *                        (cursorStyle: 'block', cursorBlink: false)
 *   batch input ....... src/client/components/footer/batch-input.jsx
 *                        (footer placeholder, panel opens above the footer,
 *                         panel background --main, 4px/4px/0/0 radius)
 *   footer ............. src/client/components/footer/footer.styl
 *                        (36px bar, 26px textarea, min-width 360px panel)
 *   tick list .......... src/client/components/footer/batch-item.jsx
 *                        (antd small Button, antd primary when selected,
 *                         CheckCircleOutlined, "N. title")
 *
 * One deliberate liberty, noted so nobody mistakes it for UI: the one-off
 * --warn flash on each pane when the broadcast is switched on is an animation,
 * not a UI state. The app's only indicator is the icon turning --warn.
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

const STYLE_ID = 'eb-bm-style'

// One full pass of the story (both acts), in ms.
const PERIOD = 9600

const T = {
  // ---- act 1: mirror input ----
  toggleOn: 550, // the broadcast icon in web-01's control bar is clicked
  toggleLen: 280,
  tipFrom: 850, // tooltip "mirror input to all terminals"
  tipTo: 1180,
  pulseFrom: 1200, // the four panes light up, one after another
  pulseStep: 130,
  pulseLen: 420,
  type1From: 1700, // "hostname" is typed into all four panes at once
  type1To: 2650,
  out1From: 2800, // each pane prints its own hostname
  out1To: 3000,
  prompt1From: 3100, // ... and comes back to a prompt
  prompt1To: 3300,
  tipOutFrom: 3350,
  tipOutTo: 3700,
  toggleOff: 3550, // mirror input switched back off

  // ---- act 2: batch input ----
  panelInFrom: 3900, // the batch input panel slides up from the footer
  panelInTo: 4350,
  tickFrom: 4400, // ... the four tabs are ticked, one after another
  tickStep: 190,
  tickLen: 260,
  type2From: 5300, // the command is typed into the panel textarea
  type2To: 6200,
  enterFrom: 6350, // Enter collapses the panel
  panelOutTo: 6750,
  run2From: 6800, // the whole line lands in all four panes at once
  run2To: 7100,
  out2From: 7250, // each pane prints its own answer
  out2To: 7500,
  prompt2From: 7600, // ... and goes back to a prompt
  prompt2To: 7800,
  fadeFrom: 8350,
  fadeTo: 8850
}

// Act 1 command. Typed once, mirrored live into every pane — the four panes
// fill in the same characters at the same moment, which is the feature.
const CMD1 = 'hostname'

// Act 2 command. Written once into the batch panel, then delivered to every
// ticked tab in a single write.
const CMD2 = 'uname -r'

// The four sessions. Only the host differs, which is exactly what makes the
// four outputs worth looking at.
const HOSTS = ['web-01', 'web-02', 'web-03', 'web-04']

// `uname -r` on the same fleet after a partial upgrade — the kind of thing you
// batch out precisely because you do not want to ssh into four boxes to ask.
const KERNELS = [
  '6.8.0-45-generic',
  '6.8.0-45-generic',
  '6.8.0-52-generic',
  '6.8.0-45-generic'
]

// How many lines of scrollback the pane window shows; the screen scrolls up by
// one line each time the shell emits past the bottom, exactly like a terminal.
const VISIBLE_LINES = 3
const LINE = 1.45

// antd CloseOutlined / PlusOutlined / DownOutlined / CheckCircleOutlined, the
// same glyphs the app renders (via @ant-design/icons). The batch input tick
// list uses the check icon for a selected tab (batch-item.jsx).
const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const CHECK_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 0 1-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z'

// The session control bar's icon row, in session-control.jsx render order.
// PaperClipOutlined (sftpPathFollowSsh), ApartmentOutlined (broadcastInput),
// ColumnWidthOutlined (wrap), FullscreenOutlined, SearchOutlined.
const PAPERCLIP_PATH = 'M779.3 196.6c-94.2-94.2-247.6-94.2-341.7 0l-261 260.8c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l261-260.8c32.4-32.4 75.5-50.2 121.3-50.2s88.9 17.8 121.2 50.2c32.4 32.4 50.2 75.5 50.2 121.2 0 45.8-17.8 88.8-50.2 121.2l-266 265.9-43.1 43.1c-40.3 40.3-105.8 40.3-146.1 0-19.5-19.5-30.2-45.4-30.2-73s10.7-53.5 30.2-73l263.9-263.8c6.7-6.6 15.5-10.3 24.9-10.3h.1c9.4 0 18.1 3.7 24.7 10.3 6.7 6.7 10.3 15.5 10.3 24.9 0 9.3-3.7 18.1-10.3 24.7L372.4 653c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l215.6-215.6c19.9-19.9 30.8-46.3 30.8-74.4s-11-54.6-30.8-74.4c-41.1-41.1-107.9-41-149 0L463 364 224.8 602.1A172.22 172.22 0 00174 724.8c0 46.3 18.1 89.8 50.8 122.5 33.9 33.8 78.3 50.7 122.7 50.7 44.4 0 88.8-16.9 122.6-50.7l309.2-309C824.8 492.7 850 432 850 367.5c.1-64.6-25.1-125.3-70.7-170.9z'
const APARTMENT_PATH = 'M908 640H804V488c0-4.4-3.6-8-8-8H548v-96h108c8.8 0 16-7.2 16-16V80c0-8.8-7.2-16-16-16H368c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h108v96H228c-4.4 0-8 3.6-8 8v152H116c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h288c8.8 0 16-7.2 16-16V656c0-8.8-7.2-16-16-16H292v-88h440v88H620c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h288c8.8 0 16-7.2 16-16V656c0-8.8-7.2-16-16-16zm-564 76v168H176V716h168zm84-408V140h168v168H428zm420 576H680V716h168v168z'
const COLWIDTH_PATH = 'M180 176h-60c-4.4 0-8 3.6-8 8v656c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V184c0-4.4-3.6-8-8-8zm724 0h-60c-4.4 0-8 3.6-8 8v656c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V184c0-4.4-3.6-8-8-8zM785.3 504.3L657.7 403.6a7.23 7.23 0 00-11.7 5.7V476H378v-62.8c0-6-7-9.4-11.7-5.7L238.7 508.3a7.14 7.14 0 000 11.3l127.5 100.8c4.7 3.7 11.7.4 11.7-5.7V548h268v62.8c0 6 7 9.4 11.7 5.7l127.5-100.8c3.8-2.9 3.8-8.5.2-11.4z'
const FULLSCREEN_PATH = 'M290 236.4l43.9-43.9a8.01 8.01 0 00-4.7-13.6L169 160c-5.1-.6-9.5 3.7-8.9 8.9L179 329.1c.8 6.6 8.9 9.4 13.6 4.7l43.7-43.7L370 423.7c3.1 3.1 8.2 3.1 11.3 0l42.4-42.3c3.1-3.1 3.1-8.2 0-11.3L290 236.4zm352.7 187.3c3.1 3.1 8.2 3.1 11.3 0l133.7-133.6 43.7 43.7a8.01 8.01 0 0013.6-4.7L863.9 169c.6-5.1-3.7-9.5-8.9-8.9L694.8 179c-6.6.8-9.4 8.9-4.7 13.6l43.9 43.9L600.3 370a8.03 8.03 0 000 11.3l42.4 42.4zM845 694.9c-.8-6.6-8.9-9.4-13.6-4.7l-43.7 43.7L654 600.3a8.03 8.03 0 00-11.3 0l-42.4 42.3a8.03 8.03 0 000 11.3L734 787.6l-43.9 43.9a8.01 8.01 0 004.7 13.6L855 864c5.1.6 9.5-3.7 8.9-8.9L845 694.9zm-463.7-94.6a8.03 8.03 0 00-11.3 0L236.3 733.9l-43.7-43.7a8.01 8.01 0 00-13.6 4.7L160.1 855c-.6 5.1 3.7 9.5 8.9 8.9L329.2 845c6.6-.8 9.4-8.9 4.7-13.6L290 787.6 423.7 654c3.1-3.1 3.1-8.2 0-11.3l-42.4-42.4z'
const SEARCH_PATH = 'M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z'

// antd seed token — the app renders antd without a ConfigProvider, so a
// selected batch input tab button is antd's default primary blue.
const ANTD_PRIMARY = '#1677ff'
const ANTD_BORDER = '#d9d9d9'
const ANTD_INK = 'rgba(0, 0, 0, 0.88)'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

// The two icons the app draws itself, copied from
// src/client/components/icons/{split-view,heartbeat}.jsx
const SPLIT_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true">
  <rect x="1" y="1" width="14" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" stroke-width="1"/>
  <polyline points="3,5 5,7 3,9" stroke="currentColor" stroke-width="1" fill="none"/>
  <path d="M9 4H14V12H9V4Z" stroke="currentColor" stroke-width="1" fill="none"/>
  <path d="M9 6H14" stroke="currentColor" stroke-width="1"/>
</svg>`
const HEARTBEAT_ICON = `<svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
  <path d="M923 283.6a260.1 260.1 0 00-56.9-82.8 264.4 264.4 0 00-84-55.5A265.3 265.3 0 00679.7 128c-38.1 0-75.4 7.5-109.8 22.3a274.5 274.5 0 00-87.7 60.8l-12.1 12.5-12.1-12.5a260.5 260.5 0 00-87.7-60.8c-34.4-14.8-71.7-22.3-109.8-22.3-38.2 0-75.5 7.5-109.9 22.3-33.4 14.3-63.3 34.9-88.9 61-25.6 26.1-45.7 56.4-59.9 90.5A278.3 278.3 0 000 416.5c0 39.6 7.7 77.2 22.9 111.6 12.8 29.6 31.5 57 55.5 81.5l356.2 358.5c12.2 12.3 29.7 19.4 47.8 19.4 18.1 0 35.6-7.1 47.7-19.4L886 609.6c24-24.5 42.7-51.9 55.5-81.5C956.3 493.7 964 456.1 964 416.5c0-37.9-7.4-74.7-22-109zM880 497.9c-10.4 24.1-26 46-46.5 65.2L480 920.7 193.5 563.1C173 543.9 157.4 522 147 497.9c-12.1-27.9-18.2-57.8-18.2-88.6 0-30 5.8-59 17.3-86.3 11.1-26.5 27.2-50.3 47.8-70.8 20.6-20.4 44.6-36.5 71.4-47.8 27.7-11.7 57.2-17.7 87.8-17.7 32.3 0 63.7 6.5 93.2 19.3 29 12.5 55 30.9 77.2 54.4l73.9 76.5 73.9-76.5c22.2-23.5 48.2-41.9 77.2-54.4 29.5-12.8 60.9-19.3 93.2-19.3 30.6 0 60.1 6 87.8 17.7 26.8 11.3 50.8 27.4 71.4 47.8 20.6 20.5 36.7 44.3 47.8 70.8 11.5 27.3 17.3 56.3 17.3 86.3 0 30.8-6.1 60.7-18.2 88.6z"/>
  <polyline points="160,512 310,512 370,310 450,714 530,512 594,512 654,360 714,664 774,512 864,512" fill="none" stroke="currentColor" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const CSS = `
.eb-bm {
  /* real electerm UI theme — src/client/css/includes/theme.styl, with the
     shipped dark theme (src/client/common/theme-defaults.js, defaultThemeDark)
     injected over it at runtime, which is where --main #121214 comes from. */
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-text: #ddd;
  --eb-text-light: #fff;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-error: #ef476f;
  /* .sess-icon.active — what the broadcast icon turns when mirror input is on */
  --eb-warn: #e55934;
  /* real electerm default terminal theme — src/client/common/theme-defaults.js */
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-cursor: #b5bd68;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  /* panes are inset 2px either side of a split line, and the wrapper behind
     them is the UI background, so the seam is --main (layout-alg.js c2x2 +
     layout.styl .layout-item) */
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
.eb-bm-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-bm-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-bm-drift 34s linear infinite;
}
@keyframes eb-bm-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-bm-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-bm-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-bm-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-bm-spark {
  position: absolute;
  width: 1.7em;
  height: 1.7em;
  background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-bm-twinkle 3.6s ease-in-out infinite;
}
.eb-bm-spark-a { right: 7.5em; top: 4.6em; }
.eb-bm-spark-b { right: 14.5em; top: 12em; width: 1.05em; height: 1.05em; background: #ec4899; animation-delay: 0.7s; }
.eb-bm-spark-c { right: 4.2em; top: 15.5em; width: 1.25em; height: 1.25em; background: #14b8a6; animation-delay: 1.4s; }
@keyframes eb-bm-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}

/* ---------- headline ---------- */
.eb-bm-head { position: absolute; left: 5em; right: 5em; top: 3.2em; }
.eb-bm-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #2563eb;
}
.eb-bm-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-bm-h1 {
  margin: 0.24em 0 0;
  font-size: 3.2em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-bm-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-bm-sub {
  margin: 0.5em 0 0;
  max-width: 64em;
  font-size: 1.55em;
  line-height: 1.4;
  color: #475569;
}
.eb-bm-sub b { color: #0f172a; font-weight: 700; }

/* ---------- the electerm window ----------
   Chrome, panes and footer are one piece, sized from the banner's em, so the
   whole window scales as a unit. */
.eb-bm-app {
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
  animation: eb-bm-glow 4.4s ease-in-out infinite;
}
@keyframes eb-bm-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.34), 0 0 3.4em rgba(124, 58, 237, 0.4); }
}

/* ---------- tab bar ----------
   1em here is the tab font size, exactly as in the app's tabs.styl where the
   bar is 36px tall against a 14px font. One tab per pane: a 2x2 split layout
   gives four tabs. */
.eb-bm-tabbar {
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.3em;
  line-height: 1;
}
.eb-bm-tab {
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
.eb-bm-tab.is-active {
  background: var(--eb-main);
  color: var(--eb-text);
  font-weight: 700;
}
.eb-bm-tab-name { overflow: hidden; text-overflow: ellipsis; }
.eb-bm-tab-status {
  position: absolute;
  left: 0.14em;
  top: 0.14em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-text-dark);
}
.eb-bm-tab-status.is-connected { background: var(--eb-success); }
/* .tab-count — 20px pill against a 14px font, radii 10px/2px */
.eb-bm-tab-count {
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
.eb-bm-tab-close {
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
.eb-bm-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-bm-tab-add,
.eb-bm-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  height: 1.6em;
  color: var(--eb-text);
}
.eb-bm-tab-add { width: 1.5em; margin-left: 0.3em; }
.eb-bm-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-bm-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); }
.eb-bm-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }

/* ---------- panes ----------
   A 2x2 split layout. Each cell is one session: the session control bar
   (terminal.styl .terminal-control) above the terminal, which is what the app
   renders per batch (layout.jsx -> TabsWrap -> SessionWrapper). */
.eb-bm-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1fr;
  /* the app insets each pane 2px from the split line, against a ~1200px
     window — 4px of --main showing through */
  gap: 0.4em;
  background: var(--eb-split);
}
.eb-bm-cell {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ---------- session control bar ----------
   32px tall against the app's 12px base font, --main, padding 0 10px. One per
   session, so four of them in a 2x2 layout. */
.eb-bm-ctl {
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
/* .type-tab — 14px, 20px right padding, 1px --text-dark underline when active */
.eb-bm-type-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding-right: 1.43em;
  font-size: 1.17em;
  color: var(--eb-text);
}
.eb-bm-type-tab.is-active { color: var(--eb-text-light); }
.eb-bm-type-tab.is-active .eb-bm-type-tab-txt::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -0.32em;
  height: 1px;
  background: var(--eb-text-dark);
}
.eb-bm-type-tab-txt { position: relative; display: inline-block; }
/* in the app the pane tabs float left and the icon row flows right after
   them, while fullscreen/search float right — so the row is left-aligned */
.eb-bm-ctl-row { display: inline-flex; align-items: center; margin-left: 0.47em; }
/* .sess-icon — antd outlined icons at the 12px base font, 10px apart */
.eb-bm-sess-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.13em;
  height: 1.13em;
  margin-right: 0.94em;
  color: var(--eb-text);
  transition: color 0.22s ease;
}
.eb-bm-sess-icon svg { width: 100%; height: 100%; fill: currentColor; }
/* the broadcast icon while mirror input is on (.sess-icon.active -> --warn) */
.eb-bm-broadcast.is-on { color: var(--eb-warn); }
/* the app's icons are not dimmed, but at thumbnail size the row reads better
   if only the broadcast icon carries weight */
.eb-bm-ctl-tail { display: inline-flex; align-items: center; margin-left: auto; }
.eb-bm-ctl-tail .eb-bm-sess-icon:last-child { margin-right: 0; }

/* antd Tooltip — colorBgSpotlight rgba(0,0,0,.85), radius 6, padding 6px/8px,
   min-height 32px, white text, arrow above (antd's default placement is top).
   It lands over the tab bar, which is what the app does too; putting it below
   the icon would sit on the terminal line the banner is trying to show. */
.eb-bm-tip {
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
  font-size: 1.13em;
  line-height: 1.5;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  z-index: 9;
}
.eb-bm-tip::before {
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

/* ---------- terminal ----------
   1em here is the terminal font. The pane shows VISIBLE_LINES lines and the
   inner screen scrolls up by one line when the shell emits past the bottom,
   exactly like a real terminal — that is how two commands fit in one crop. */
.eb-bm-pane {
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
}
.eb-bm-screen { will-change: transform; }
.eb-bm-line { line-height: ${LINE}; }
.eb-bm-ps1 { color: var(--eb-term-green); }
.eb-bm-ps1-path { color: var(--eb-term-blue); }
/* xterm's cursor: a solid block, cursorBlink is off by default */
.eb-bm-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.04em;
  vertical-align: -0.26em;
  background: var(--eb-term-cursor);
}
/* act 1 types into all four panes at once, so every cmd1 grows together;
   act 2 writes the whole line in one go, so cmd2 is revealed by opacity.
   The prompt on the line act 2 types into does not exist until act 1's
   command has returned — the shell prints it, it is not there from the
   start — so that whole line fades in with it. */
.eb-bm-out1,
.eb-bm-out2,
.eb-bm-cmd2,
.eb-bm-prompt2 { opacity: 0; }
.eb-bm-caret1,
.eb-bm-caret2,
.eb-bm-caret3 { opacity: 0; }
/* a one-off --warn flash when the broadcast is switched on — an animation, not
   a UI state (the app's only indicator is the icon) */
.eb-bm-flash {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  opacity: 0;
  box-shadow: inset 0 0 0 0.16em var(--eb-warn);
}

/* ---------- footer ----------
   36px bar against a 14px font, exactly as footer.styl. */
.eb-bm-foot {
  position: relative;
  display: flex;
  align-items: center;
  height: 2.6em;
  padding: 0 0.8em;
  background: var(--eb-main);
  font-size: 1.3em;
  color: var(--eb-text-dark);
}
/* the batch input trigger is a borderless, input-shaped affordance 100px wide
   (batch-input.jsx + footer.styl .batch-input-holder) */
.eb-bm-batch {
  position: relative;
  display: flex;
  align-items: center;
  width: 7.14em;
  color: var(--eb-text-dark);
}
.eb-bm-batch-label { white-space: nowrap; }
.eb-bm-foot-encode { margin-left: auto; }

/* ---------- batch input panel ----------
   Opens above the footer, left-aligned with the trigger: background --main,
   padding 8px/10px, radius 4px 4px 0 0, and the shadow that lifts it off the
   terminal (footer.styl .batch-input-outer.bi-show). The app's min-width is
   360px, which is what makes two tick buttons fit per row; this panel is sized
   the same way, for the same reason. */
.eb-bm-panel {
  position: absolute;
  bottom: 100%;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 0.43em;
  min-width: 28em;
  padding: 0.57em 0.71em;
  border-radius: 0.29em 0.29em 0 0;
  background: var(--eb-main);
  box-shadow: 0 -0.15em 0.6em rgba(0, 0, 0, 0.2);
  opacity: 0;
  pointer-events: none;
  z-index: 6;
}
/* the textarea — antd Input.TextArea, small: 6px radius, 4px/11px padding,
   min-height 26px (footer.styl forces the height down to 26px) */
.eb-bm-panel-box {
  display: flex;
  align-items: center;
  min-height: 1.86em;
  padding: 0.29em 0.79em;
  border: 1px solid #d9d9d9;
  border-radius: 0.43em;
  background: #fff;
  color: rgba(0, 0, 0, 0.88);
  font-size: 1em;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
}
/* a real text caret blinks, unlike xterm's solid block */
.eb-bm-panel-caret {
  display: inline-block;
  width: 0.07em;
  height: 1.15em;
  margin-left: 0.05em;
  background: #000;
  animation: eb-bm-blink 1.06s steps(1, end) infinite;
}
@keyframes eb-bm-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
/* the tick list: a block "All / None" row (tab-select.jsx renderBtns is a
   div, so the buttons start on their own line) above a wrapping row of tab
   buttons, right-aligned like the app's .alignright container */
.eb-bm-panel-list { padding: 0 0.36em; text-align: right; }
.eb-bm-panel-actions {
  display: block;
  padding: 0.36em 0 0.71em;
  font-size: 0.86em;
  color: var(--eb-text);
}
.eb-bm-panel-actions span { margin-right: 0.36em; }
/* antd small Button, default and primary */
.eb-bm-tabbtn {
  display: inline-flex;
  align-items: center;
  gap: 0.36em;
  height: 1.71em;
  margin: 0 0.36em 0.36em 0;
  padding: 0 0.5em;
  border: 1px solid ${ANTD_BORDER};
  border-radius: 0.43em;
  background: #fff;
  color: ${ANTD_INK};
  font-size: 1em;
  line-height: 1;
  white-space: nowrap;
  /* an inline-flex box takes its baseline from its first flex item, which is
     text in the starred button and a replaced SVG in the others — align on the
     top edge instead so a row of buttons sits level */
  vertical-align: top;
  transition: background 0.18s, border-color 0.18s, color 0.18s;
}
.eb-bm-tabbtn svg { width: 0.93em; height: 0.93em; fill: currentColor; opacity: 0; }
/* batch-item.jsx marks the tab you are on with a leading "*" */
.eb-bm-tabbtn b { font-weight: 700; }
.eb-bm-tabbtn.is-ticked {
  border-color: ${ANTD_PRIMARY};
  background: ${ANTD_PRIMARY};
  color: #fff;
}
.eb-bm-tabbtn.is-ticked svg { opacity: 1; }

/* ---------- card (blog index) variant ---------- */
.eb-bm[data-variant='card'] .eb-bm-app {
  bottom: auto;
  top: 50%;
  width: 92em;
  transform: translate(-50%, -50%);
}
/* the thumbnail has no headline to share the height with, so everything in
   the window scales up until it nearly fills the card — but only as far as
   four tabs still fit across the tab bar and the control bar's icon row
   still reads */
.eb-bm[data-variant='card'] .eb-bm-tabbar { font-size: 1.6em; }
.eb-bm[data-variant='card'] .eb-bm-foot { font-size: 1.8em; }
.eb-bm[data-variant='card'] .eb-bm-ctl { font-size: 1.25em; }
.eb-bm[data-variant='card'] .eb-bm-pane { font-size: 2.4em; }

@media (prefers-reduced-motion: reduce) {
  .eb-bm-dots, .eb-bm-spark, .eb-bm-app, .eb-bm-panel-caret { animation: none !important; }
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

// A single 0 -> 1 -> 0 pulse, used for the one-off broadcast flash.
function pulse (p) {
  return Math.sin(Math.PI * clamp(p, 0, 1))
}

function prompt (host) {
  return `<span class="eb-bm-ps1">zxd@${host}</span>:<span class="eb-bm-ps1-path">~</span>$&nbsp;`
}

// One session: session control bar, then the terminal it belongs to.
function cell (host, index) {
  const tip = index === 0
    ? '<span class="eb-bm-tip">mirror input to all terminals</span>'
    : ''
  return `
    <div class="eb-bm-cell">
      <div class="eb-bm-ctl">
        <span class="eb-bm-type-tab is-active"><span class="eb-bm-type-tab-txt">SSH</span></span>
        <span class="eb-bm-type-tab"><span class="eb-bm-type-tab-txt">SFTP</span></span>
        <span class="eb-bm-ctl-row">
          <span class="eb-bm-sess-icon">${icon(PAPERCLIP_PATH, '')}</span>
          <span class="eb-bm-sess-icon">${SPLIT_ICON}</span>
          <span class="eb-bm-sess-icon">${HEARTBEAT_ICON}</span>
          <span class="eb-bm-sess-icon eb-bm-broadcast" data-broadcast="${index}">${icon(APARTMENT_PATH, '')}${tip}</span>
          <span class="eb-bm-sess-icon">${icon(COLWIDTH_PATH, '')}</span>
        </span>
        <span class="eb-bm-ctl-tail">
          <span class="eb-bm-sess-icon">${icon(FULLSCREEN_PATH, '')}</span>
          <span class="eb-bm-sess-icon">${icon(SEARCH_PATH, '')}</span>
        </span>
      </div>
      <div class="eb-bm-pane" data-pane="${index}">
        <div class="eb-bm-screen">
          <div class="eb-bm-line">${prompt(host)}<span class="eb-bm-cmd1"></span><span class="eb-bm-caret eb-bm-caret1"></span></div>
          <div class="eb-bm-line eb-bm-out1">${host}</div>
          <div class="eb-bm-line eb-bm-prompt2">${prompt(host)}<span class="eb-bm-cmd2"></span><span class="eb-bm-caret eb-bm-caret2"></span></div>
          <div class="eb-bm-line eb-bm-out2">${KERNELS[index]}</div>
          <div class="eb-bm-line eb-bm-prompt3">${prompt(host)}<span class="eb-bm-caret eb-bm-caret3"></span></div>
        </div>
        <span class="eb-bm-flash"></span>
      </div>
    </div>`
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-bm-head">
        <span class="eb-bm-brand">electerm</span>
        <h2 class="eb-bm-h1">Type once, <em>drive many terminals</em></h2>
        <p class="eb-bm-sub"><b>Mirror input</b> broadcasts every keystroke as you type. <b>Batch input</b> sends one command to the terminals you tick.</p>
      </div>`
  const tabs = HOSTS.map((host, i) => `
        <span class="eb-bm-tab${i === 0 ? ' is-active' : ''}">
          <span class="eb-bm-tab-status is-connected"></span>
          <span class="eb-bm-tab-count">${i + 1}</span>
          <span class="eb-bm-tab-name">zxd@${host}:22</span>
          ${i === 0 ? `<span class="eb-bm-tab-close">${icon(CLOSE_PATH, '')}</span>` : ''}
        </span>`).join('')
  // batch-item.jsx renders "{*} {check} {tabCount}. {title}", the * marking
  // the tab you are currently on
  const tabbtns = HOSTS.map((host, i) => `
        <span class="eb-bm-tabbtn" data-tick="${i}">${i === 0 ? '<b>*</b>' : ''}${icon(CHECK_PATH, '')}<span>${i + 1}. zxd@${host}:22</span></span>`).join('')
  return `
    <div class="eb-bm-deco">
      <span class="eb-bm-blob eb-bm-blob-a"></span>
      <span class="eb-bm-blob eb-bm-blob-b"></span>
      <span class="eb-bm-dots"></span>
      <span class="eb-bm-spark eb-bm-spark-a"></span>
      <span class="eb-bm-spark eb-bm-spark-b"></span>
      <span class="eb-bm-spark eb-bm-spark-c"></span>
    </div>
    ${head}
    <div class="eb-bm-app">
      <div class="eb-bm-tabbar">
        ${tabs}
        <span class="eb-bm-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-bm-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-bm-panes">
        ${HOSTS.map(cell).join('')}
      </div>
      <div class="eb-bm-foot">
        <span class="eb-bm-batch">
          <span class="eb-bm-batch-label">batch input</span>
          <span class="eb-bm-panel">
            <span class="eb-bm-panel-box"><span class="eb-bm-panel-cmd"></span><span class="eb-bm-panel-caret"></span></span>
            <span class="eb-bm-panel-list">
              <span class="eb-bm-panel-actions"><span>All</span><span>None</span></span>
              ${tabbtns}
            </span>
          </span>
        </span>
        <span class="eb-bm-foot-encode">UTF-8</span>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-bm'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    `electerm: mirror input broadcasts one typed command live into ${HOSTS.length} terminals, and batch input sends one command to the terminals you tick`)
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    panel: root.querySelector('.eb-bm-panel'),
    panelCmd: root.querySelector('.eb-bm-panel-cmd'),
    broadcasts: root.querySelectorAll('.eb-bm-broadcast'),
    tip: root.querySelector('.eb-bm-tip'),
    screens: root.querySelectorAll('.eb-bm-screen'),
    flashes: root.querySelectorAll('.eb-bm-flash'),
    cmds1: root.querySelectorAll('.eb-bm-cmd1'),
    cmds2: root.querySelectorAll('.eb-bm-cmd2'),
    outs1: root.querySelectorAll('.eb-bm-out1'),
    outs2: root.querySelectorAll('.eb-bm-out2'),
    prompts2: root.querySelectorAll('.eb-bm-prompt2'),
    prompts3: root.querySelectorAll('.eb-bm-prompt3'),
    carets1: root.querySelectorAll('.eb-bm-caret1'),
    carets2: root.querySelectorAll('.eb-bm-caret2'),
    carets3: root.querySelectorAll('.eb-bm-caret3'),
    ticks: root.querySelectorAll('.eb-bm-tabbtn')
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

  const setOpacity = (nodes, v) => {
    const s = v.toFixed(3)
    for (const n of nodes) n.style.opacity = s
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    const vis = 1 - gone

    // ================= act 1: mirror input =================

    // the broadcast icon in web-01's control bar is clicked on ... and off
    const onP = easeOut(seg(t, T.toggleOn, T.toggleOn + T.toggleLen))
    const offP = easeOut(seg(t, T.toggleOff, T.toggleOff + T.toggleLen))
    el.broadcasts[0].classList.toggle('is-on', onP > 0.5 && offP < 0.5)

    // the tooltip names the feature (antd Tooltip on the icon)
    const tipIn = easeOut(seg(t, T.tipFrom, T.tipTo))
    const tipOut = easeInOut(seg(t, T.tipOutFrom, T.tipOutTo))
    const tipP = tipIn * (1 - tipOut)
    el.tip.style.opacity = (tipP * vis).toFixed(3)
    el.tip.style.transform =
      'translateX(-50%) translateY(' + ((1 - tipP) * 0.35).toFixed(3) + 'em)'

    // each pane flashes once, in order, as the broadcast reaches it
    for (let i = 0; i < el.flashes.length; i++) {
      const from = T.pulseFrom + i * T.pulseStep
      const p = pulse(seg(t, from, from + T.pulseLen))
      el.flashes[i].style.opacity = (p * vis * 0.9).toFixed(3)
    }

    // "hostname" is typed ONCE: the same characters land in all four panes in
    // lockstep, because the write is mirrored, not copied
    const typed = Math.round(easeOut(seg(t, T.type1From, T.type1To)) * CMD1.length)
    const typedTxt = CMD1.slice(0, typed)
    for (const c of el.cmds1) c.textContent = typedTxt

    // Enter: the cursor drops to the next line, so caret1 hands over to the
    // prompt on the line below
    const out1P = easeOut(seg(t, T.out1From, T.out1To))
    setOpacity(el.carets1, (1 - out1P) * vis)

    // each pane prints its own hostname ...
    for (const o of el.outs1) {
      o.style.opacity = (out1P * vis).toFixed(3)
      o.style.transform = 'translateY(' + ((1 - out1P) * 0.3).toFixed(3) + 'em)'
    }

    // ... and comes back to a prompt, ready for the next command
    const p1 = easeOut(seg(t, T.prompt1From, T.prompt1To))
    setOpacity(el.prompts2, p1 * vis)

    // ================= act 2: batch input =================

    // the panel slides up out of the footer, then collapses on Enter
    const panelIn = easeOut(seg(t, T.panelInFrom, T.panelInTo))
    const panelOut = easeInOut(seg(t, T.enterFrom, T.panelOutTo))
    const panelP = panelIn * (1 - panelOut)
    el.panel.style.opacity = (panelP * vis).toFixed(3)
    el.panel.style.transform =
      'translateY(' + ((1 - panelP) * 0.5).toFixed(3) + 'em)'

    // the four tabs are ticked, one after another
    for (let i = 0; i < el.ticks.length; i++) {
      const from = T.tickFrom + i * T.tickStep
      const on = seg(t, from, from + T.tickLen)
      el.ticks[i].classList.toggle('is-ticked', on > 0.5)
    }

    // the command is typed into the textarea (a real caret blinks after it)
    const typed2 = Math.round(easeOut(seg(t, T.type2From, T.type2To)) * CMD2.length)
    el.panelCmd.textContent = CMD2.slice(0, typed2)

    // Enter: the whole line lands in every pane at once — no character-by-
    // character there. That contrast with act 1 is the point of the banner.
    // The text is only written once the reveal starts: an opacity-0 span still
    // takes up its own width, which would push the cursor down the line.
    const run2 = easeOut(seg(t, T.run2From, T.run2To))
    if (run2 > 0) {
      for (const c of el.cmds2) c.textContent = CMD2
    }
    setOpacity(el.cmds2, run2 * vis)
    // that Enter moves the cursor off the command line too
    setOpacity(el.carets2, p1 * (1 - run2) * vis)

    // ... and the terminal scrolls one line each time the shell emits past the
    // bottom of the crop
    const scroll = easeOut(seg(t, T.out2From, T.out2To)) +
      easeOut(seg(t, T.prompt2From, T.prompt2To))
    for (const s of el.screens) {
      s.style.transform = 'translateY(' + (-scroll * LINE).toFixed(3) + 'em)'
    }

    // each pane prints its own answer ...
    const out2P = easeOut(seg(t, T.out2From, T.out2To))
    for (const o of el.outs2) {
      o.style.opacity = (out2P * vis).toFixed(3)
      o.style.transform = 'translateY(' + ((1 - out2P) * 0.3).toFixed(3) + 'em)'
    }

    // a fresh prompt with the cursor back at the bottom
    const p3 = easeOut(seg(t, T.prompt2From, T.prompt2To))
    setOpacity(el.prompts3, p3 * vis)
    setOpacity(el.carets3, p3 * vis)
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // settle on a frame that shows both features: four panes, four answers
    frame(T.prompt2To + 200)
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
