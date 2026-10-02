/**
 * Animated banner for the "What opens when electerm starts" blog post.
 *
 * Everything is generated here — no image, no GIF, no canvas: the background,
 * the headline, the mock electerm window (tab bar + panes + footer), the
 * Settings panel beside it and the highlight ring are plain DOM + CSS driven by
 * one requestAnimationFrame timeline.
 *
 * One loop tells the article's story in three phases, and the panel on the
 * right is always showing the setting that decides the window on the left:
 *
 *   1. DEFAULT — nothing configured, "open default tab when app start" on, so
 *                launch gives one local terminal.
 *   2. NOTHING — the toggle goes off. Launch gives an empty window: the
 *                "no session" panel (new tab / new bookmark / AI / history).
 *   3. WORKSPACE — a workspace is picked under "open bookmarks on startup", so
 *                launch restores the layout and all four sessions at once.
 *
 * Modelled on the real electerm UI / code:
 *   launch chain . src/client/store/load-data.js
 *                  (openInitSessions: a string onStartSessions is a workspace
 *                   id -> loadWorkspace; an array is bookmark ids ->
 *                   onSelectBookmark each; otherwise initFirstTab() only when
 *                   config.initDefaultTabOnStart)
 *   first tab .... src/client/store/tab.js (initFirstTab creates one tab per
 *                  pane: splitConfig[layout].children)
 *   picker ....... src/client/components/setting-panel/start-session-select.jsx
 *                  (Tabs: bookmarks / Workspaces; SHOW_CHILD tree select vs a
 *                   single workspace Select; switching tabs clears the other)
 *   toggle ....... src/client/components/setting-panel/setting-common.jsx
 *                  (the onStartBookmarks heading, then the general toggle list
 *                   containing initDefaultTabOnStart)
 *   no session ... src/client/components/tabs/no-session.jsx
 *                  (new tab / new bookmark / create bookmark by AI buttons,
 *                   logo, then the connection history)
 *   strings ...... node_modules/@electerm/electerm-locales/dist/esm/en_us.mjs
 *                  (onStartBookmarks "open bookmarks on startup",
 *                   initDefaultTabOnStart "open default tab when app start")
 *   theme ........ src/client/css/includes/theme.styl + theme-defaults.js
 *                  (--main #121214, --text #ddd, --primary #08c, --success
 *                   #06d6a0) and the terminal palette (bg #20111b)
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + window + panel (blog post page)
 *   data-eb-banner="card"  -> window + panel only     (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src — otherwise the first script to run
 * would claim every card.
 *
 * Layout is in `em`, root font-size is 1% of banner width.
 */

const STYLE_ID = 'eb-st-style'

// One full pass of the story (default -> nothing -> workspace), in ms.
const PERIOD = 13000

// Caption / highlight switch points: default -> nothing -> workspace.
const PHASE_AT = [4300, 8600]

const T = {
  single: [150, 900], // the default local tab lands
  off: [4300, 4800], // the toggle flips off, the window empties
  pick: [8600, 9300], // a workspace is picked, the grid starts rebuilding
  tabs2: [9000, 10900], // the four sessions land
  fadeOut: [12350, 12900] // whole banner fades out for the loop
}

const CAPTIONS = [
  'nothing picked — one local terminal',
  'toggle off — the window opens empty',
  'a workspace — layout and sessions restored'
]

const HINTS = [
  'onStartSessions: [] · default tab: true',
  'initDefaultTabOnStart: false',
  'onStartSessions: "prod-web"'
]

const WINDOW_TABS = ['local', 'root@web-01:22', 'root@web-02:22', 'dbadmin@db-01:22', 'ops@cache-01:22']

// The four sessions a restored workspace opens, in pane order.
const PANES = [
  { prompt: 'root@web-01', cmd: 'uptime', out: [' 13:42:01 up 41 days,  2:14'] },
  { prompt: 'root@web-02', cmd: 'df -h /', out: ['/dev/vda1  40G  21G  17G  56% /'] },
  { prompt: 'dbadmin@db-01', cmd: 'psql -c "select 1"', out: [' ?column?'] },
  { prompt: 'ops@cache-01', cmd: 'redis-cli ping', out: ['PONG'] }
]

const CLOSE_PATH = 'M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M192 474h672q8 0 8 8v60q0 8-8 8H160q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const BOOK_PATH = 'M832 64H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zm-260 72h96v209.9L621.5 312 572 347.4V136zm220 752H232V136h280v296.9c0 3.3 1 6.6 3 9.3a15.9 15.9 0 0022.3 3.7l83.8-59.9 81.4 59.4c2.7 2 6 3.1 9.4 3.1 8.8 0 16-7.2 16-16V136h64v752z'
const APPSTORE_PATH = 'M464 144H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H212V212h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H612V212h200v200zM464 544H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H212V612h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H612V612h200v200z'
const CHECK_PATH = 'M912 190h-69.9c-9.8 0-19.1 4.5-25.1 12.2L404.7 724.5 207 474a32 32 0 00-25.1-12.2H112c-6.7 0-10.4 7.7-6.3 12.9l273.9 347c12.8 16.2 37.4 16.2 50.3 0l488.4-618.9c4.1-5.1.4-12.8-6.3-12.8z'
const HISTORY_PATH = 'M536.1 273H488c-4.4 0-8 3.6-8 8v275.3c0 2.6 1.2 5 3.3 6.5l165.3 120.7c3.6 2.6 8.6 1.9 11.2-1.7l28.6-39c2.7-3.7 1.9-8.7-1.7-11.2L544.1 528.5V281c0-4.4-3.6-8-8-8zm219.8 75.2l156.8 38.3c5 1.2 9.9-2.6 9.9-7.7l.8-161.5c0-6.7-7.7-10.5-12.9-6.3L752.9 334.1a8 8 0 003 14.1zm167.7 301.1l-56.7-19.5a8 8 0 00-10.1 4.8c-1.9 5.1-3.9 10.1-6 15.1-17.8 42.1-43.3 80-75.9 112.5a353 353 0 01-112.5 75.9 352.18 352.18 0 01-137.7 27.8c-47.8 0-94.1-9.3-137.7-27.8a353 353 0 01-112.5-75.9c-32.5-32.5-58-70.4-75.9-112.5A353.44 353.44 0 01171 512c0-47.8 9.3-94.2 27.8-137.8 17.8-42.1 43.3-80 75.9-112.5a353 353 0 01112.5-75.9C430.6 167.3 477 158 524.8 158s94.1 9.3 137.7 27.8A353 353 0 01775 261.7c10.2 10.3 19.8 21 28.6 32.3l59.8-46.8C784.7 146.6 662.2 81.9 524.6 82 285 82.1 92.6 276.7 95 516.4 97.4 751.9 288.9 942 524.8 942c185.5 0 343.5-117.6 403.7-282.3 1.5-4.2-.7-8.9-4.9-10.4z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

const CSS = `
.eb-st {
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-main-light: #202024;
  --eb-text: #ddd;
  --eb-text-light: #fff;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-green: #19f9d8;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e8f1ff 0%, #eef2ff 50%, #fdf0f6 100%);
  color: #16233a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-st-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-st-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-st-drift 34s linear infinite;
}
@keyframes eb-st-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-st-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-st-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-st-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-st-spark {
  position: absolute;
  width: 1.7em; height: 1.7em; background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-st-twinkle 3.6s ease-in-out infinite;
}
.eb-st-spark-a { right: 7.5em; top: 4.6em; }
.eb-st-spark-b { right: 15.5em; top: 11.4em; width: 1.05em; height: 1.05em; background: #14b8a6; animation-delay: 0.9s; }
@keyframes eb-st-twinkle { 0%,100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; } 50% { transform: scale(1.16) rotate(35deg); opacity: 1; } }
.eb-st-head { position: absolute; left: 4em; right: 4em; top: 2.9em; }
.eb-st-brand { display: inline-flex; align-items: center; gap: 0.45em; font-size: 1.4em; font-weight: 800; color: #2563eb; }
.eb-st-brand::before { content: ''; width: 1.05em; height: 1.05em; border-radius: 50%; background: #2563eb; box-shadow: inset 0 0 0 0.32em #fff; }
.eb-st-h1 { margin: 0.24em 0 0; font-size: 3.1em; font-weight: 800; line-height: 1.05; letter-spacing: -0.025em; color: #0f172a; }
.eb-st-h1 em { font-style: normal; background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.eb-st-sub { margin: 0.5em 0 0; max-width: 70em; font-size: 1.5em; line-height: 1.4; color: #475569; }
.eb-st-sub b { color: #0f172a; }
.eb-st-sub code { font-family: Menlo, Monaco, monospace; font-size: 0.85em; background: rgba(37,99,235,0.1); border-radius: 0.3em; padding: 0.05em 0.35em; color: #1d4ed8; }

/* ---- window ---- */
.eb-st-app {
  position: absolute; left: 3em; top: 14.2em; width: 58.5em; height: 38.6em;
  background: var(--eb-term-bg); border-radius: 0.8em; overflow: hidden; text-align: left;
  box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.2);
  animation: eb-st-glow 4.4s ease-in-out infinite;
}
@keyframes eb-st-glow { 0%,100% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.18); } 50% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.34), 0 0 3.4em rgba(124,58,237,0.4); } }
.eb-st-tabbar { display: flex; align-items: stretch; height: 2.6em; padding: 0 0.5em; background: var(--eb-main-dark); }
.eb-st-tab { position: relative; display: flex; align-items: center; gap: 0.4em; height: 100%; padding: 0 0.8em; border-radius: 0.21em 0.21em 0 0; background: var(--eb-main); color: var(--eb-text); white-space: nowrap; }
.eb-st-tab-dot { position: absolute; left: 0.14em; top: 0.14em; width: 0.4em; height: 0.4em; border-radius: 50%; background: var(--eb-success); }
.eb-st-tab-count { flex: none; height: 1.4em; padding: 0 0.34em; border-radius: 0.7em 0.14em 0.14em 0.7em; background: var(--eb-primary); color: #fff; line-height: 1.4em; font-size: 1.15em; font-weight: 700; }
.eb-st-tab-title { font-size: 1.15em; font-weight: 700; }
.eb-st-tab-close { display: inline-flex; align-items: center; justify-content: center; width: 1.15em; height: 1.15em; border-radius: 50%; background: var(--eb-main-dark); color: var(--eb-text); }
.eb-st-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-st-tab-add { display: inline-flex; align-items: center; align-self: center; width: 1.6em; margin-left: 0.3em; color: var(--eb-text); }
.eb-st-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-st-tabbar-caret { display: inline-flex; align-items: center; align-self: center; width: 1.4em; margin-left: auto; color: var(--eb-text-dark); }
.eb-st-tabbar-caret svg { width: 0.8em; height: 0.8em; fill: currentColor; }
.eb-st-body { position: relative; height: 33.8em; background: var(--eb-main); }
.eb-st-view { position: absolute; inset: 0; opacity: 0; }

.eb-st-pane { position: relative; background: var(--eb-term-bg); overflow: hidden; height: 100%; }
.eb-st-pane-bar { display: flex; align-items: center; gap: 0.6em; height: 2.5em; padding: 0 0.7em; background: var(--eb-main); }
.eb-st-pane-tab { font-size: 1.12em; font-weight: 700; color: var(--eb-text-dark); }
.eb-st-pane-tab.on { color: var(--eb-text-light); box-shadow: inset 0 -0.09em 0 var(--eb-primary); }
.eb-st-pane-icons { display: flex; align-items: center; gap: 0.35em; margin-left: auto; }
.eb-st-pane-icon { width: 1.3em; height: 1.3em; border-radius: 0.24em; background: rgba(255,255,255,0.1); }
.eb-st-pane-icon.warm { background: rgba(229,89,52,0.75); }
.eb-st-screen { padding: 0.5em 0.7em; font-family: Menlo, Monaco, 'Courier New', monospace; font-size: 1.15em; line-height: 1.55; color: var(--eb-term-fg); }
.eb-st-ps { color: var(--eb-term-green); }
.eb-st-cur { display: inline-block; width: 0.55em; height: 1.05em; margin-left: 0.1em; vertical-align: -0.15em; background: #b5bd68; }
.eb-st-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 0.28em; height: 100%; }

/* no session (tabs/no-session.jsx) */
.eb-st-nos { display: flex; flex-direction: column; align-items: center; padding: 3.2em 2em 0; }
.eb-st-nos-btns { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6em; }
.eb-st-btn { display: inline-flex; align-items: center; gap: 0.4em; height: 2.6em; padding: 0 0.9em; border-radius: 0.4em; background: var(--eb-primary); }
.eb-st-btn svg { width: 1.1em; height: 1.1em; fill: #fff; }
.eb-st-btn span { font-size: 1.15em; font-weight: 700; color: #fff; }
.eb-st-btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,0.28); }
.eb-st-btn.ghost span { color: var(--eb-text); }
.eb-st-btn.ghost svg { fill: var(--eb-text); }
.eb-st-nos-logo { display: flex; align-items: center; justify-content: center; width: 5.2em; height: 5.2em; margin: 2.4em 0; border-radius: 1.1em; background: var(--eb-main-dark); border: 1px solid rgba(255,255,255,0.14); }
.eb-st-nos-logo span { font-size: 2.4em; font-weight: 800; color: var(--eb-primary); letter-spacing: -0.04em; }
.eb-st-nos-h { display: flex; align-items: center; gap: 0.5em; }
.eb-st-nos-h svg { width: 1.15em; height: 1.15em; fill: var(--eb-text-dark); }
.eb-st-nos-h span { font-size: 1.1em; color: var(--eb-text-dark); }
.eb-st-hist { width: 88%; margin-top: 0.9em; display: flex; flex-direction: column; gap: 0.45em; }
.eb-st-hist-row { display: flex; align-items: center; gap: 0.6em; height: 2.4em; padding: 0 0.8em; border-radius: 0.4em; background: rgba(255,255,255,0.05); }
.eb-st-hist-dot { width: 0.5em; height: 0.5em; border-radius: 50%; background: var(--eb-text-dark); }
.eb-st-hist-row span { font-size: 1.1em; color: var(--eb-text); }
.eb-st-hist-time { margin-left: auto; color: var(--eb-text-dark); }

/* ---- footer ---- */
.eb-st-foot { display: flex; align-items: center; height: 2.2em; padding: 0 0.8em; background: var(--eb-main); }
.eb-st-foot span { font-size: 1.08em; color: var(--eb-text-dark); }
.eb-st-foot b { color: var(--eb-term-green); font-weight: 700; }
.eb-st-foot-right { margin-left: auto; }

/* ---- settings panel ---- */
.eb-st-panel {
  position: absolute; right: 3em; top: 14.2em; width: 32.5em; height: 38.6em;
  padding: 1.2em; background: var(--eb-main); border-radius: 0.8em; text-align: left;
  box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.3), 0 0 2em rgba(124,58,237,0.16);
}
.eb-st-panel-h { font-size: 1.45em; font-weight: 700; color: var(--eb-text-light); }
.eb-st-sep { height: 1px; margin: 0.9em 0 1.1em; background: rgba(255,255,255,0.14); }
.eb-st-lbl { font-size: 1.22em; color: var(--eb-text); }
.eb-st-tabs { display: flex; gap: 0.5em; margin-top: 0.9em; }
.eb-st-tab2 { display: inline-flex; align-items: center; gap: 0.35em; height: 2.5em; padding: 0 0.8em; border: 1px solid rgba(255,255,255,0.14); border-bottom: none; border-radius: 0.45em 0.45em 0 0; background: var(--eb-main-dark); }
.eb-st-tab2 svg { width: 1em; height: 1em; fill: var(--eb-text-dark); }
.eb-st-tab2 span { font-size: 1.12em; color: var(--eb-text-dark); }
.eb-st-tab2.on { background: var(--eb-main-light); }
.eb-st-tab2.on svg { fill: var(--eb-text-light); }
.eb-st-tab2.on span { color: var(--eb-text-light); }
.eb-st-select { display: flex; align-items: center; height: 2.8em; padding: 0 0.8em; background: var(--eb-main-dark); border: 1px solid rgba(255,255,255,0.16); border-radius: 0 0.45em 0.45em 0.45em; }
.eb-st-select span { font-size: 1.18em; color: var(--eb-text-dark); }
.eb-st-select.on span { color: var(--eb-text-light); }
.eb-st-select svg { width: 0.8em; height: 0.8em; margin-left: auto; fill: var(--eb-text-dark); }
.eb-st-opt { display: flex; align-items: center; gap: 0.5em; height: 2.6em; margin-top: 0.4em; padding: 0 0.8em; border-radius: 0.35em; background: var(--eb-primary); opacity: 0; }
.eb-st-opt svg { width: 1em; height: 1em; fill: #fff; }
.eb-st-opt span { font-size: 1.18em; color: #fff; }
.eb-st-toggle { display: inline-flex; align-items: center; gap: 0.6em; height: 2.4em; margin-top: 1.6em; }
.eb-st-check { display: flex; align-items: center; justify-content: center; width: 1.5em; height: 1.5em; border-radius: 0.25em; background: var(--eb-primary); border: 1px solid var(--eb-primary); }
.eb-st-check svg { width: 1em; height: 1em; }
.eb-st-toggle span { font-size: 1.18em; color: var(--eb-text); }
.eb-st-ghost { display: flex; align-items: center; gap: 0.6em; height: 2.5em; }
.eb-st-ghost i { width: 1.4em; height: 1.4em; border-radius: 0.25em; border: 1px solid rgba(255,255,255,0.3); }
.eb-st-ghost span { font-size: 1.15em; color: var(--eb-text-dark); }
.eb-st-hl { position: absolute; left: 1.2em; top: 1.2em; width: 10em; height: 2.4em; border: 0.14em solid var(--eb-primary); border-radius: 0.55em; opacity: 0.9; }
.eb-st-cap-sep { position: absolute; left: 1.2em; right: 1.2em; bottom: 6.2em; height: 1px; background: rgba(255,255,255,0.14); }
.eb-st-cap { position: absolute; left: 1.2em; right: 1.2em; bottom: 3.5em; font-size: 1.18em; color: var(--eb-text-light); }
.eb-st-hint { position: absolute; left: 1.2em; right: 1.2em; bottom: 1.4em; font-family: Menlo, Monaco, monospace; font-size: 1.02em; color: #7fb2e0; }

/* ---- card variant: no headline, both boxes centred ---- */
.eb-st[data-variant='card'] .eb-st-app { top: 50%; transform: translateY(-50%); }
.eb-st[data-variant='card'] .eb-st-panel { top: 50%; transform: translateY(-50%); }
@media (prefers-reduced-motion: reduce) { .eb-st-dots, .eb-st-spark, .eb-st-app { animation: none !important; } }
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

function easeInOut (p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

function easeOut (p) {
  return 1 - Math.pow(1 - p, 3)
}

// 0..1 for item i of n, spread across [from, to]
function stagger (t, i, n, from, to) {
  const span = (to - from) * 0.55
  const step = (to - from) - span
  const start = from + (n <= 1 ? 0 : step * (i / (n - 1)))
  return seg(t, start, start + span)
}

function pane (s) {
  const ps = `<span class="eb-st-ps">${s.prompt}</span>:<span class="eb-st-ps">~</span>$ `
  const out = s.out.map((l) => `<div>${l}</div>`).join('')
  return `
    <div class="eb-st-pane">
      <div class="eb-st-pane-bar">
        <span class="eb-st-pane-tab on">SSH</span>
        <span class="eb-st-pane-tab">SFTP</span>
        <span class="eb-st-pane-icons">
          <i class="eb-st-pane-icon"></i>
          <i class="eb-st-pane-icon warm"></i>
        </span>
      </div>
      <div class="eb-st-screen">
        <div>${ps}${s.cmd}</div>
        ${out}
        <div>${ps}<span class="eb-st-cur"></span></div>
      </div>
    </div>`
}

function localPane () {
  return `
    <div class="eb-st-pane">
      <div class="eb-st-pane-bar">
        <span class="eb-st-pane-tab on">terminal</span>
        <span class="eb-st-pane-icons">
          <i class="eb-st-pane-icon"></i>
          <i class="eb-st-pane-icon warm"></i>
        </span>
      </div>
      <div class="eb-st-screen">
        <div><span class="eb-st-ps">~</span> $ pwd</div>
        <div>/Users/you</div>
        <div><span class="eb-st-ps">~</span> $ <span class="eb-st-cur"></span></div>
      </div>
    </div>`
}

function tab (title, i) {
  return `
    <span class="eb-st-tab" data-tab="${i}">
      <span class="eb-st-tab-dot"></span>
      <span class="eb-st-tab-count">${i + 1}</span>
      <span class="eb-st-tab-title">${title}</span>
      <span class="eb-st-tab-close">${icon(CLOSE_PATH, '')}</span>
    </span>`
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-st-head">
        <span class="eb-st-brand">electerm</span>
        <h2 class="eb-st-h1">Decide what opens <em>at launch</em></h2>
        <p class="eb-st-sub">No tab, one local shell, or a whole saved workspace — three settings in <code>Settings → setting</code>.</p>
      </div>`
  return `
    <div class="eb-st-deco">
      <span class="eb-st-blob eb-st-blob-a"></span>
      <span class="eb-st-blob eb-st-blob-b"></span>
      <span class="eb-st-dots"></span>
      <span class="eb-st-spark eb-st-spark-a"></span>
      <span class="eb-st-spark eb-st-spark-b"></span>
    </div>
    ${head}
    <div class="eb-st-app">
      <div class="eb-st-tabbar">
        ${WINDOW_TABS.map(tab).join('')}
        <span class="eb-st-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-st-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-st-body">
        <div class="eb-st-view" data-view="single">${localPane()}</div>
        <div class="eb-st-view" data-view="empty">
          <div class="eb-st-nos">
            <div class="eb-st-nos-btns">
              <span class="eb-st-btn">new tab</span>
              <span class="eb-st-btn ghost">${icon(BOOK_PATH, '')}<span>new bookmark</span></span>
            </div>
            <div class="eb-st-nos-logo"><span>et</span></div>
            <div class="eb-st-nos-h">${icon(HISTORY_PATH, '')}<span>connection history</span></div>
            <div class="eb-st-hist">
              <div class="eb-st-hist-row"><i class="eb-st-hist-dot"></i><span>root@web-01:22</span><span class="eb-st-hist-time">09:12</span></div>
              <div class="eb-st-hist-row"><i class="eb-st-hist-dot"></i><span>dbadmin@db-01:22</span><span class="eb-st-hist-time">08:41</span></div>
              <div class="eb-st-hist-row"><i class="eb-st-hist-dot"></i><span>ops@cache-01:22</span><span class="eb-st-hist-time">昨天</span></div>
            </div>
          </div>
        </div>
        <div class="eb-st-view" data-view="grid">
          <div class="eb-st-grid">${PANES.map(pane).join('')}</div>
        </div>
      </div>
      <div class="eb-st-foot">
        <span>◉ <b class="eb-st-mode">one local terminal</b><span class="eb-st-what"> — nothing configured</span></span>
        <span class="eb-st-foot-right">UTF-8</span>
      </div>
    </div>
    <div class="eb-st-panel">
      <div class="eb-st-panel-h">Settings</div>
      <div class="eb-st-sep"></div>
      <div class="eb-st-lbl">open bookmarks on startup</div>
      <div class="eb-st-tabs">
        <span class="eb-st-tab2" data-ptab="bookmarks">${icon(BOOK_PATH, '')}<span>bookmarks</span></span>
        <span class="eb-st-tab2" data-ptab="workspaces">${icon(APPSTORE_PATH, '')}<span>Workspaces</span></span>
      </div>
      <div class="eb-st-select" data-ctl="select">
        <span class="eb-st-select-t">please select</span>
        ${icon(CARET_PATH, '')}
      </div>
      <div class="eb-st-opt">${icon(CHECK_PATH, '')}<span>prod-web</span></div>
      <div class="eb-st-toggle" data-ctl="toggle">
        <span class="eb-st-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5,13 10,18 19,6"/></svg>
        </span>
        <span>open default tab when app start</span>
      </div>
      <div class="eb-st-ghost"><i></i><span>disable connection history</span></div>
      <div class="eb-st-ghost"><i></i><span>check update on app start</span></div>
      <div class="eb-st-ghost"><i></i><span>use system title bar</span></div>
      <span class="eb-st-hl"></span>
      <div class="eb-st-cap-sep"></div>
      <div class="eb-st-cap"></div>
      <div class="eb-st-hint"></div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-st'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm startup behaviour: with nothing configured the app opens one local terminal, with the default tab switched off it opens empty, and with a workspace selected it restores the layout and four sessions')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    views: [...root.querySelectorAll('.eb-st-view')],
    tabs: [...root.querySelectorAll('.eb-st-tab')],
    gridPanes: [...root.querySelectorAll('[data-view="grid"] .eb-st-pane')],
    pTabs: [...root.querySelectorAll('.eb-st-tab2')],
    select: root.querySelector('.eb-st-select'),
    selectT: root.querySelector('.eb-st-select-t'),
    opt: root.querySelector('.eb-st-opt'),
    toggle: root.querySelector('.eb-st-toggle'),
    check: root.querySelector('.eb-st-check'),
    hl: root.querySelector('.eb-st-hl'),
    cap: root.querySelector('.eb-st-cap'),
    hint: root.querySelector('.eb-st-hint'),
    mode: root.querySelector('.eb-st-mode'),
    what: root.querySelector('.eb-st-what')
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

  // Measure the two controls the highlight ring travels between, in em
  // relative to the panel -- font-size / padding can change, so read them.
  const panel = root.querySelector('.eb-st-panel')
  const emRect = (node) => {
    const px = parseFloat(window.getComputedStyle(root).fontSize) || 1
    const a = node.getBoundingClientRect()
    const b = panel.getBoundingClientRect()
    return [
      (a.left - b.left) / px - 0.3,
      (a.top - b.top) / px - 0.3,
      a.width / px + 0.6,
      a.height / px + 0.6
    ]
  }
  let rects = null
  const measure = () => {
    rects = { toggle: emRect(el.toggle), select: emRect(el.select) }
  }
  measure()
  if (window.ResizeObserver) {
    new window.ResizeObserver(() => {
      fit()
      measure()
    }).observe(root)
  }

  const MODES = ['one local terminal', 'no session', 'workspace restored']
  const WHATS = [' — nothing configured', ' — the window opens empty', ' — layout + sessions back']

  // Cross-fade between the three window views: single -> empty -> grid.
  const VIEW_AT = [
    { in: [0, 0], out: [T.off[0], T.off[1]] },
    { in: [T.off[0], T.off[1]], out: [T.pick[0], T.pick[1]] },
    { in: [T.pick[0], T.pick[1]], out: [0, 0] }
  ]

  function viewOpacity (i, t) {
    const v = VIEW_AT[i]
    let p = 1
    if (v.in[1] > v.in[0]) p = easeOut(seg(t, v.in[0], v.in[1]))
    if (v.out[1] > v.out[0]) p = Math.min(p, 1 - easeInOut(seg(t, v.out[0], v.out[1])))
    return p
  }

  function frame (t) {
    const vis = Math.min(seg(t, 0, 420), 1 - easeInOut(seg(t, T.fadeOut[0], T.fadeOut[1])))
    root.style.opacity = vis.toFixed(3)

    const phase = t < PHASE_AT[0] ? 0 : (t < PHASE_AT[1] ? 1 : 2)

    // window views
    for (let i = 0; i < el.views.length; i++) {
      el.views[i].style.opacity = viewOpacity(i, t).toFixed(3)
    }

    // tab bar: one tab, none, then all four
    el.tabs[0].style.opacity = (1 - seg(t, T.off[0], T.off[1])).toFixed(3)
    for (let i = 1; i < el.tabs.length; i++) {
      el.tabs[i].style.opacity = stagger(t, i - 1, 4, T.tabs2[0], T.tabs2[1]).toFixed(3)
    }

    // grid panes land one by one when the workspace is picked
    for (let i = 0; i < el.gridPanes.length; i++) {
      el.gridPanes[i].style.opacity = stagger(t, i, el.gridPanes.length, T.tabs2[0], T.tabs2[1]).toFixed(3)
    }

    // panel: the toggle goes off, then the picker switches to Workspaces
    const offP = seg(t, T.off[0], T.off[1])
    el.check.style.opacity = (1 - offP).toFixed(3)
    el.check.style.background = offP > 0.5 ? 'transparent' : 'var(--eb-primary)'
    const wsP = easeOut(seg(t, T.pick[0], T.pick[1]))
    el.pTabs[1].classList.toggle('on', t >= T.pick[0])
    el.pTabs[0].classList.toggle('on', t < T.pick[0])
    el.opt.style.opacity = wsP.toFixed(3)
    el.opt.style.transform = 'translateY(' + ((1 - wsP) * -0.4).toFixed(2) + 'em)'
    if (wsP > 0.6) {
      if (el.selectT.textContent !== 'prod-web') el.selectT.textContent = 'prod-web'
      el.select.classList.add('on')
    } else {
      if (el.selectT.textContent !== 'please select') el.selectT.textContent = 'please select'
      el.select.classList.remove('on')
    }

    // highlight ring: sits on the toggle, then slides to the picker
    if (rects) {
      const to = phase === 2 ? rects.select : rects.toggle
      const p = phase === 2 ? easeInOut(seg(t, PHASE_AT[1] - 500, PHASE_AT[1] - 60)) : 0
      const a = rects.toggle
      const b = to
      const r = [0, 1, 2, 3].map((k) => a[k] + (b[k] - a[k]) * p)
      el.hl.style.left = r[0].toFixed(2) + 'em'
      el.hl.style.top = r[1].toFixed(2) + 'em'
      el.hl.style.width = r[2].toFixed(2) + 'em'
      el.hl.style.height = r[3].toFixed(2) + 'em'
    }
    el.hl.style.opacity = (0.55 + 0.35 * Math.sin(t / 620)).toFixed(3)

    // captions
    if (el.cap.textContent !== CAPTIONS[phase]) el.cap.textContent = CAPTIONS[phase]
    if (el.hint.textContent !== HINTS[phase]) el.hint.textContent = HINTS[phase]
    if (el.mode.textContent !== MODES[phase]) el.mode.textContent = MODES[phase]
    if (el.what.textContent !== WHATS[phase]) el.what.textContent = WHATS[phase]
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // settle on the frame that shows the point: the restored workspace
    frame(T.tabs2[1] + 600)
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
