/**
 * Animated banner for the "Workspaces in Electerm" blog post.
 *
 * Everything is generated here — no image, no GIF, no canvas: the background,
 * the headline, the mock electerm window (tab bar + 2x2 pane grid + footer),
 * the layout dropdown with its save card, the toast and the pointer are plain
 * DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * One loop tells the article's story in three phases:
 *
 *   1. BUILD   — a 2x2 grid is set up and four bookmark sessions open into it,
 *                one per pane, tabs appearing as they land.
 *   2. SAVE    — the pointer opens the layout dropdown in the tab bar, switches
 *                to Workspaces, hits save, names it "prod-web" and commits. The
 *                entry appears in the list and a "saved" toast fires.
 *   3. RESTORE — clicking "prod-web" tears the grid down (loading a workspace
 *                closes every tab first) and rebuilds layout + sessions from
 *                the saved preset.
 *
 * Modelled on the real electerm UI / code:
 *   store ....... src/client/store/workspace.js
 *                 (getCurrentWorkspaceState: layout + tabsByBatch of
 *                  { srcId, sshSftpSplitView }; loadWorkspace: removeTabs(() =>
 *                  true) -> setLayout -> openTabBatch per pane ->
 *                  onSelectBookmark -> updateTab sshSftpSplitView)
 *   dropdown .... src/client/components/tabs/layout-menu.jsx
 *                 (Layout dropdown icon in the tab bar, two tabs: layout /
 *                  workspaces) + workspace-select.jsx (full-width save button,
 *                  list, hover delete icon with a Popconfirm) +
 *                  workspace-save-modal.jsx (Save as new / overwrite, name)
 *   styles ...... src/client/components/tabs/tabs.styl
 *                 (.layout-workspace-dropdown --main bg, 4px radius, 8px
 *                  padding, min-width 200px; .workspace-item hover bg
 *                  --main-dark; .workspace-delete-icon opacity 0 -> 1)
 *   layouts ..... src/client/common/constants.js (splitMapDesc + splitConfig;
 *                 c2x2 = 4 panes) with the icons in
 *                 src/client/components/icons/split-icons.jsx
 *   tab bar ..... src/client/components/tabs/tabs.styl (36px bar, 14px font,
 *                 min-width 100px, count pill radii 10px 2px 2px 10px,
 *                 16px close disc)
 *   pane bar .... src/client/components/terminal/terminal.styl
 *                 (.terminal-control --main, line-height 32px, padding 0 10px)
 *   toast ....... src/client/components/common/message.styl
 *                 (--main-lighter, pinned 20px from the top of the window,
 *                  green CheckCircleFilled)
 *   theme ....... src/client/css/includes/theme.styl + theme-defaults.js
 *                 (--main #121214, --text #ddd, --primary #08c, --success
 *                  #06d6a0) and the terminal palette (bg #20111b)
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + full window (blog post page)
 *   data-eb-banner="card"  -> window only         (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src — otherwise the first script to run
 * would claim every card.
 *
 * Layout is in `em`, root font-size is 1% of banner width.
 */

const STYLE_ID = 'eb-ws-style'

// One full pass of the story (build -> save -> restore), in ms.
const PERIOD = 16000

// Timeline, in ms into the loop. Pointer stops and click rings live in
// PATH / RINGS below, so this only holds the state changes.
const T = {
  tabs: [200, 3000], // tabs + panes land one by one
  ddOpen: [4200, 4700], // dropdown grows in
  card: [6000, 7000], // save card grows in
  type: [6900, 8300], // the name gets typed
  commit: [9300, 9750], // card collapses, the entry lands in the list
  toast1: [9750, 11100], // "saved"
  ddClose: [12600, 13100], // dropdown fades out
  wipe: [13050, 13500], // tabs + panes collapse (loading closes everything)
  back: [13700, 15100], // preset rebuilds layout + sessions
  fadeOut: [15300, 15900] // whole banner fades out for the loop
}

// Pointer stops, in app-em (the window is 92em wide). Ring times are separate.
const P = {
  start: [46, 21],
  dd: [87.6, 1.3],
  save: [78.4, 8.25],
  ok: [78.4, 14.75],
  item: [78.4, 11.7]
}

const PATH = [
  [3000, P.start],
  [4200, P.dd],
  [4700, P.dd],
  [5600, P.save],
  [6900, P.save],
  [7700, P.ok],
  [11100, P.ok],
  [12200, P.item]
]

const RINGS = [4600, 5600, 9200, 12200]

// Caption switch points: build -> save -> restore.
const PHASE_AT = [4200, 12200]

const NAME = 'prod-web'

// The four sessions of the saved workspace, in pane order.
const SESSIONS = [
  {
    title: 'root@web-01:22',
    prompt: 'root@web-01',
    cmd: 'uptime',
    out: [' 13:42:01 up 41 days,  2:14,  1 user']
  },
  {
    title: 'root@web-02:22',
    prompt: 'root@web-02',
    cmd: 'df -h /',
    out: ['/dev/vda1  40G  21G  17G  56% /']
  },
  {
    title: 'dbadmin@db-01:22',
    prompt: 'dbadmin@db-01',
    cmd: 'psql -c "select 1"',
    out: [' ?column?', '----------']
  },
  {
    title: 'ops@cache-01:22',
    prompt: 'ops@cache-01',
    cmd: 'redis-cli ping',
    out: ['PONG']
  }
]

const CLOSE_PATH = 'M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M192 474h672q8 0 8 8v60q0 8-8 8H160q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const CHECK_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z'
const SAVE_PATH = 'M893.3 293.3L730.7 130.7c-7.5-7.5-16.7-13-26.7-16V112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V338.5c0-17-6.7-33.2-18.7-45.2zM384 184h256v104H384V184zm456 656H184V184h136v136c0 17.7 14.3 32 32 32h320c17.7 0 32-14.3 32-32V205.8l136 136V840zM512 442c-79.5 0-144 64.5-144 144s64.5 144 144 144 144-64.5 144-144-64.5-144-144-144zm0 224c-44.2 0-80-35.8-80-80s35.8-80 80-80 80 35.8 80 80-35.8 80-80 80z'
const APPSTORE_PATH = 'M464 144H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H212V212h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H612V212h200v200zM464 544H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H212V612h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H612V612h200v200z'
const LAYOUT_PATH = 'M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-696 72h136v656H184V184zm656 656H384V384h456v456zM384 320V184h456v136H384z'

// grid2x2, from src/client/components/icons/split-icons.jsx (stroked, 24x24)
const GRID_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

const CSS = `
.eb-ws {
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
  --eb-term-blue: #6fc1ff;
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
.eb-ws-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-ws-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-ws-drift 34s linear infinite;
}
@keyframes eb-ws-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-ws-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-ws-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-ws-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-ws-spark {
  position: absolute;
  width: 1.7em; height: 1.7em; background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-ws-twinkle 3.6s ease-in-out infinite;
}
.eb-ws-spark-a { right: 7.5em; top: 4.6em; }
.eb-ws-spark-b { right: 15.5em; top: 12em; width: 1.05em; height: 1.05em; background: #14b8a6; animation-delay: 0.9s; }
@keyframes eb-ws-twinkle { 0%,100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; } 50% { transform: scale(1.16) rotate(35deg); opacity: 1; } }
.eb-ws-head { position: absolute; left: 5em; right: 5em; top: 3.2em; }
.eb-ws-brand { display: inline-flex; align-items: center; gap: 0.45em; font-size: 1.4em; font-weight: 800; color: #2563eb; }
.eb-ws-brand::before { content: ''; width: 1.05em; height: 1.05em; border-radius: 50%; background: #2563eb; box-shadow: inset 0 0 0 0.32em #fff; }
.eb-ws-h1 { margin: 0.24em 0 0; font-size: 3.1em; font-weight: 800; line-height: 1.05; letter-spacing: -0.025em; color: #0f172a; }
.eb-ws-h1 em { font-style: normal; background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.eb-ws-sub { margin: 0.5em 0 0; max-width: 66em; font-size: 1.5em; line-height: 1.4; color: #475569; }
.eb-ws-sub b { color: #0f172a; }
.eb-ws-sub code { font-family: Menlo, Monaco, monospace; font-size: 0.85em; background: rgba(37,99,235,0.1); border-radius: 0.3em; padding: 0.05em 0.35em; color: #1d4ed8; }

/* ---- window ---- */
.eb-ws-app {
  position: absolute; left: 50%; bottom: 5.4%; transform: translateX(-50%);
  width: 92em; height: 38.6em; background: var(--eb-term-bg); border-radius: 0.8em; overflow: hidden; text-align: left;
  box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.2);
  animation: eb-ws-glow 4.4s ease-in-out infinite;
}
@keyframes eb-ws-glow { 0%,100% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.32), 0 0 2.2em rgba(37,99,235,0.18); } 50% { box-shadow: 0 1.3em 2.6em rgba(15,23,42,0.34), 0 0 3.4em rgba(124,58,237,0.4); } }
.eb-ws-tabbar { display: flex; align-items: stretch; height: 2.6em; padding: 0 0.5em; background: var(--eb-main-dark); }
.eb-ws-tab { position: relative; display: flex; align-items: center; gap: 0.4em; height: 100%; padding: 0 0.9em; border-radius: 0.21em 0.21em 0 0; background: var(--eb-main); color: var(--eb-text); white-space: nowrap; }
.eb-ws-tab-dot { position: absolute; left: 0.14em; top: 0.14em; width: 0.4em; height: 0.4em; border-radius: 50%; background: var(--eb-success); }
.eb-ws-tab-count { flex: none; height: 1.4em; padding: 0 0.34em; border-radius: 0.7em 0.14em 0.14em 0.7em; background: var(--eb-primary); color: #fff; line-height: 1.4em; font-size: 1.15em; font-weight: 700; }
.eb-ws-tab-title { font-size: 1.2em; font-weight: 700; }
.eb-ws-tab-close { display: inline-flex; align-items: center; justify-content: center; width: 1.2em; height: 1.2em; border-radius: 50%; background: var(--eb-main-dark); color: var(--eb-text); }
.eb-ws-tab-close svg { width: 0.62em; height: 0.62em; fill: currentColor; }
.eb-ws-tab-add { display: inline-flex; align-items: center; align-self: center; width: 1.6em; margin-left: 0.35em; color: var(--eb-text); }
.eb-ws-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-ws-dd-icon { display: inline-flex; align-items: center; align-self: center; gap: 0.3em; margin-left: auto; height: 1.9em; padding: 0 0.5em; border-radius: 0.35em; color: var(--eb-text); }
.eb-ws-dd-icon svg.eb-ws-layout { width: 1.2em; height: 1.2em; }
.eb-ws-dd-icon svg.eb-ws-caret { width: 0.8em; height: 0.8em; fill: currentColor; }
.eb-ws.is-dd .eb-ws-dd-icon { background: rgba(255,255,255,0.14); }

/* ---- panes ---- */
.eb-ws-body { position: relative; height: 33.8em; background: var(--eb-main); }
.eb-ws-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 0.28em; height: 100%; }
.eb-ws-pane { position: relative; background: var(--eb-term-bg); overflow: hidden; opacity: 0; }
.eb-ws-pane-bar { display: flex; align-items: center; gap: 0.6em; height: 2.5em; padding: 0 0.7em; background: var(--eb-main); }
.eb-ws-pane-tabs { display: flex; align-items: center; gap: 0.9em; }
.eb-ws-pane-tab { font-size: 1.15em; font-weight: 700; color: var(--eb-text-dark); }
.eb-ws-pane-tab.on { color: var(--eb-text-light); box-shadow: inset 0 -0.09em 0 var(--eb-primary); }
.eb-ws-pane-icons { display: flex; align-items: center; gap: 0.35em; margin-left: auto; }
.eb-ws-pane-icon { width: 1.35em; height: 1.35em; border-radius: 0.24em; background: rgba(255,255,255,0.1); }
.eb-ws-pane-icon.warm { background: rgba(229,89,52,0.75); }
.eb-ws-screen { padding: 0.5em 0.7em; font-family: Menlo, Monaco, 'Courier New', monospace; font-size: 1.18em; line-height: 1.55; color: var(--eb-term-fg); }
.eb-ws-ps { color: var(--eb-term-green); }
.eb-ws-cursor { display: inline-block; width: 0.55em; height: 1.05em; margin-left: 0.1em; vertical-align: -0.15em; background: #b5bd68; }

/* ---- footer ---- */
.eb-ws-foot { display: flex; align-items: center; height: 2.2em; padding: 0 0.8em; background: var(--eb-main); }
.eb-ws-foot span { font-size: 1.1em; color: var(--eb-text-dark); }
.eb-ws-foot b { color: var(--eb-term-green); font-weight: 700; }
.eb-ws-foot-right { margin-left: auto; }

/* ---- layout dropdown (tabs.styl .layout-workspace-dropdown) ---- */
.eb-ws-dd {
  position: absolute; right: 0.6em; top: 3em; width: 26em; height: 21em; padding: 0.9em;
  background: var(--eb-main); border-radius: 0.55em; z-index: 6;
  box-shadow: 0 0.4em 1.6em rgba(0,0,0,0.5);
  transform-origin: 100% 0;
  opacity: 0;
}
.eb-ws-dd-tabs { display: flex; align-items: center; gap: 1.2em; height: 2.2em; border-bottom: 1px solid rgba(255,255,255,0.14); }
.eb-ws-dd-tab { display: inline-flex; align-items: center; gap: 0.35em; height: 100%; }
.eb-ws-dd-tab svg { width: 1.05em; height: 1.05em; fill: currentColor; }
.eb-ws-dd-tab span { font-size: 1.22em; color: var(--eb-text-dark); }
.eb-ws-dd-tab.on span { color: var(--eb-text-light); }
.eb-ws-dd-tab.on { box-shadow: inset 0 -0.14em 0 var(--eb-primary); }
.eb-ws-save { display: flex; align-items: center; justify-content: center; gap: 0.5em; height: 2.5em; margin: 0.9em 0; border-radius: 0.4em; background: var(--eb-primary); color: #fff; }
.eb-ws-save svg { width: 1.15em; height: 1.15em; fill: #fff; }
.eb-ws-save span { font-size: 1.2em; font-weight: 700; }
.eb-ws-empty { display: flex; align-items: center; justify-content: center; height: 6em; }
.eb-ws-empty span { font-size: 1.15em; color: var(--eb-text-dark); }
.eb-ws-list { display: flex; flex-direction: column; gap: 0.4em; }
.eb-ws-item { display: flex; align-items: center; justify-content: space-between; height: 2.6em; padding: 0 0.8em; border-radius: 0.4em; opacity: 0; }
.eb-ws-item.on { opacity: 1; background: rgba(255,255,255,0.09); }
.eb-ws-item-name { font-size: 1.25em; color: var(--eb-text-light); }
.eb-ws-item-del { width: 1.2em; height: 1.2em; fill: var(--eb-text-dark); opacity: 0; transition: opacity 0.2s; }
.eb-ws-item.on.hot .eb-ws-item-del { opacity: 1; }
.eb-ws.is-card .eb-ws-save, .eb-ws.is-card .eb-ws-empty, .eb-ws.is-card .eb-ws-list { visibility: hidden; }
.eb-ws.is-list .eb-ws-empty { display: none; }

/* ---- save card (workspace-save-modal.jsx) ---- */
.eb-ws-card {
  position: absolute; left: 0.9em; right: 0.9em; top: 3.6em; padding: 0.9em;
  background: var(--eb-main-light); border-radius: 0.5em; z-index: 7;
  box-shadow: 0 0.35em 1.2em rgba(0,0,0,0.5);
  opacity: 0;
}
.eb-ws-card-row { display: flex; align-items: center; gap: 0.55em; height: 2.1em; }
.eb-ws-radio { width: 1.05em; height: 1.05em; border-radius: 50%; border: 0.12em solid var(--eb-primary); box-shadow: inset 0 0 0 0.2em var(--eb-main-light), inset 0 0 0 0.5em var(--eb-primary); background: var(--eb-primary); }
.eb-ws-card-row span { font-size: 1.2em; color: var(--eb-text); }
.eb-ws-input { display: flex; align-items: center; height: 2.6em; margin-top: 0.7em; padding: 0 0.6em; background: #0c0c0e; border: 1px solid rgba(255,255,255,0.16); border-radius: 0.35em; }
.eb-ws-input span { font-size: 1.25em; color: var(--eb-text-light); }
.eb-ws-card-ok { display: flex; align-items: center; justify-content: center; height: 2.3em; margin-top: 0.7em; border-radius: 0.35em; background: var(--eb-primary); }
.eb-ws-card-ok span { font-size: 1.2em; font-weight: 700; color: #fff; }

/* ---- toast (common/message.styl) ---- */
.eb-ws-toast {
  position: absolute; left: 50%; top: 2.6em; transform: translateX(-50%);
  display: flex; align-items: center; gap: 0.45em; height: 2.5em; padding: 0 0.9em;
  background: #4a4a4f; border-radius: 0.35em; z-index: 9;
  box-shadow: 0 0.25em 0.9em rgba(0,0,0,0.4);
  opacity: 0;
}
.eb-ws-toast svg { width: 1.15em; height: 1.15em; fill: var(--eb-success); }
.eb-ws-toast span { font-size: 1.2em; color: var(--eb-text-light); white-space: nowrap; }

/* ---- pointer ---- */
.eb-ws-cursor-dot { position: absolute; left: 0; top: 0; width: 1.9em; height: 1.9em; margin: -0.95em 0 0 -0.95em; z-index: 10; opacity: 0; }
.eb-ws-cursor-dot svg { width: 100%; height: 100%; fill: #0f172a; stroke: #fff; stroke-width: 0.07em; }
.eb-ws-ring { position: absolute; left: 0; top: 0; width: 1.6em; height: 1.6em; margin: -0.8em 0 0 -0.8em; border-radius: 50%; border: 0.16em solid var(--eb-primary); opacity: 0; z-index: 9; }

/* ---- card variant: no headline, window centred ---- */
.eb-ws[data-variant='card'] .eb-ws-app { bottom: auto; top: 50%; transform: translate(-50%, -50%); }
@media (prefers-reduced-motion: reduce) { .eb-ws-dots, .eb-ws-spark, .eb-ws-app { animation: none !important; } }
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

function pane (s, i) {
  const ps = `<span class="eb-ws-ps">${s.prompt}</span>:<span class="eb-ws-ps">~</span>$ `
  const out = s.out.map((l) => `<div>${l}</div>`).join('')
  return `
    <div class="eb-ws-pane" data-pane="${i}">
      <div class="eb-ws-pane-bar">
        <span class="eb-ws-pane-tabs">
          <span class="eb-ws-pane-tab on">SSH</span>
          <span class="eb-ws-pane-tab">SFTP</span>
        </span>
        <span class="eb-ws-pane-icons">
          <i class="eb-ws-pane-icon"></i>
          <i class="eb-ws-pane-icon"></i>
          <i class="eb-ws-pane-icon warm"></i>
        </span>
      </div>
      <div class="eb-ws-screen">
        <div>${ps}${s.cmd}</div>
        ${out}
        <div>${ps}<span class="eb-ws-cursor"></span></div>
      </div>
    </div>`
}

function tab (s, i) {
  return `
    <span class="eb-ws-tab" data-tab="${i}">
      <span class="eb-ws-tab-dot"></span>
      <span class="eb-ws-tab-count">${i + 1}</span>
      <span class="eb-ws-tab-title">${s.title}</span>
      <span class="eb-ws-tab-close">${icon(CLOSE_PATH, '')}</span>
    </span>`
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-ws-head">
        <span class="eb-ws-brand">electerm</span>
        <h2 class="eb-ws-h1">Save the whole <em>arrangement</em></h2>
        <p class="eb-ws-sub"><b>layout + sessions</b> in one named preset — build a 2x2 grid, save it, click it back.</p>
      </div>`
  return `
    <div class="eb-ws-deco">
      <span class="eb-ws-blob eb-ws-blob-a"></span>
      <span class="eb-ws-blob eb-ws-blob-b"></span>
      <span class="eb-ws-dots"></span>
      <span class="eb-ws-spark eb-ws-spark-a"></span>
      <span class="eb-ws-spark eb-ws-spark-b"></span>
    </div>
    ${head}
    <div class="eb-ws-app">
      <div class="eb-ws-tabbar">
        ${SESSIONS.map(tab).join('')}
        <span class="eb-ws-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-ws-dd-icon">${GRID_ICON}${icon(CARET_PATH, 'eb-ws-caret')}</span>
      </div>
      <div class="eb-ws-body">
        <div class="eb-ws-grid">
          ${SESSIONS.map(pane).join('')}
        </div>
      </div>
      <div class="eb-ws-foot">
        <span>◉ <b class="eb-ws-mode">2x2 grid</b><span class="eb-ws-hint"> — 4 bookmarks, one per pane</span></span>
        <span class="eb-ws-foot-right">UTF-8</span>
      </div>
      <div class="eb-ws-dd">
        <div class="eb-ws-dd-tabs">
          <span class="eb-ws-dd-tab">${icon(LAYOUT_PATH, '')}<span>layout</span></span>
          <span class="eb-ws-dd-tab on">${icon(APPSTORE_PATH, '')}<span>Workspaces</span></span>
        </div>
        <div class="eb-ws-save">${icon(SAVE_PATH, '')}<span>save</span></div>
        <div class="eb-ws-empty"><span>No items</span></div>
        <div class="eb-ws-list">
          <div class="eb-ws-item">
            <span class="eb-ws-item-name">prod-web</span>
            ${icon('M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z', 'eb-ws-item-del')}
          </div>
        </div>
        <div class="eb-ws-card">
          <div class="eb-ws-card-row">
            <i class="eb-ws-radio"></i>
            <span>Save as new</span>
          </div>
          <div class="eb-ws-input">
            <span class="eb-ws-typed"></span><span class="eb-ws-cursor"></span>
          </div>
          <div class="eb-ws-card-ok"><span>save</span></div>
        </div>
      </div>
      <div class="eb-ws-toast">${icon(CHECK_PATH, '')}<span class="eb-ws-toast-t">saved</span></div>
      <div class="eb-ws-ring"></div>
      <div class="eb-ws-cursor-dot">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2l0 17 4.2-4.2 2.6 6.1 3.4-1.5-2.7-6 6-0.4z"/></svg>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-ws'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', 'electerm workspaces: a 2x2 grid of four sessions is saved as the workspace prod-web from the layout dropdown, then restored in one click')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    panes: [...root.querySelectorAll('.eb-ws-pane')],
    tabs: [...root.querySelectorAll('.eb-ws-tab')],
    item: root.querySelector('.eb-ws-item'),
    dd: root.querySelector('.eb-ws-dd'),
    card: root.querySelector('.eb-ws-card'),
    typed: root.querySelector('.eb-ws-typed'),
    toast: root.querySelector('.eb-ws-toast'),
    toastT: root.querySelector('.eb-ws-toast-t'),
    dot: root.querySelector('.eb-ws-cursor-dot'),
    ring: root.querySelector('.eb-ws-ring'),
    mode: root.querySelector('.eb-ws-mode'),
    hint: root.querySelector('.eb-ws-hint')
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

  function place (at) {
    el.dot.style.left = at[0] + 'em'
    el.dot.style.top = at[1] + 'em'
  }

  // Where the pointer is at time t, in app-em, or null while it is parked away.
  function pointerAt (t) {
    if (t < PATH[0][0] || t > T.ddClose[1]) return null
    const last = PATH[PATH.length - 1]
    if (t >= last[0]) return last[1]
    for (let i = 0; i < PATH.length - 1; i++) {
      const t0 = PATH[i][0]
      const t1 = PATH[i + 1][0]
      if (t >= t0 && t <= t1) {
        const p = easeInOut(seg(t, t0, t1))
        const a = PATH[i][1]
        const b = PATH[i + 1][1]
        return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p]
      }
    }
    return PATH[0][1]
  }

  function pulse (t, at) {
    const p = seg(t, at, at + 420)
    if (p <= 0 || p >= 1) {
      el.ring.style.opacity = 0
      el.ring.style.transform = 'scale(0)'
      return
    }
    el.ring.style.opacity = (1 - p).toFixed(3)
    el.ring.style.transform = 'scale(' + (0.4 + p * 1.7).toFixed(3) + ')'
  }

  // Fade in, hold, fade out — 0 outside the window.
  function pop (t, from, to) {
    if (t < from || t > to) return 0
    return easeOut(seg(t, from, from + 260)) * (1 - seg(t, to - 260, to))
  }

  const TOASTS = [
    { label: 'saved', from: T.toast1[0], to: T.toast1[1] },
    { label: 'workspace loaded', from: 13900, to: 15000 }
  ]

  const captions = ['2x2 grid', 'saving prod-web', 'restoring prod-web']
  const hints = [' — 4 bookmarks, one per pane', ' — layout + sessions in one preset', ' — one click, everything back']

  function frame (t) {
    const vis = Math.min(seg(t, 0, 420), 1 - easeInOut(seg(t, T.fadeOut[0], T.fadeOut[1])))
    root.style.opacity = vis.toFixed(3)

    // 1. panes + tabs land; loading a workspace wipes everything first
    const wipeP = seg(t, T.wipe[0], T.wipe[1])
    const reveal = (i, n, buildFrom, buildTo, backFrom, backTo) => {
      if (t < T.back[0]) return stagger(t, i, n, buildFrom, buildTo) * (1 - wipeP)
      return stagger(t, i, n, backFrom, backTo)
    }
    for (let i = 0; i < el.panes.length; i++) {
      const op = reveal(i, el.panes.length, T.tabs[0], T.tabs[1], T.back[0], T.back[1])
      el.panes[i].style.opacity = op.toFixed(3)
    }
    for (let i = 0; i < el.tabs.length; i++) {
      const op = reveal(i, el.tabs.length, T.tabs[0] + 150, T.tabs[1] + 150, T.back[0] + 150, T.back[1] + 150)
      el.tabs[i].style.opacity = op.toFixed(3)
    }

    // 2. dropdown
    const ddP = easeOut(seg(t, T.ddOpen[0], T.ddOpen[1])) * (1 - seg(t, T.ddClose[0], T.ddClose[1]))
    el.dd.style.opacity = ddP.toFixed(3)
    el.dd.style.transform = 'scale(' + (0.92 + ddP * 0.08).toFixed(3) + ')'
    root.classList.toggle('is-dd', ddP > 0.6)

    // 3. save card
    const cardP = easeOut(seg(t, T.card[0], T.card[1])) * (1 - seg(t, T.commit[0], T.commit[0] + 220))
    el.card.style.opacity = cardP.toFixed(3)
    el.card.style.transform = 'translateY(' + ((1 - cardP) * -0.6).toFixed(2) + 'em)'
    root.classList.toggle('is-card', cardP > 0.5)
    // type the name only once the card has started arriving
    const tp = seg(t, T.type[0], T.type[1])
    el.typed.textContent = tp > 0 ? NAME.slice(0, Math.ceil(tp * NAME.length)) : ''

    // 4. the entry lands in the list (the empty state gives up its place)
    const listed = t >= T.commit[0] + 260
    el.item.classList.toggle('on', listed)
    // the row's delete icon is hover-only, as in workspace-select.jsx
    el.item.classList.toggle('hot', t >= 11600 && t < T.ddClose[0])
    root.classList.toggle('is-list', listed)

    // 5. toast
    let shown = null
    for (const tst of TOASTS) {
      if (pop(t, tst.from, tst.to) > 0) shown = tst
    }
    if (shown) {
      const p = pop(t, shown.from, shown.to)
      el.toast.style.opacity = p.toFixed(3)
      el.toast.style.transform = 'translateX(-50%) translateY(' + ((1 - p) * -0.7).toFixed(2) + 'em)'
      if (el.toastT.textContent !== shown.label) el.toastT.textContent = shown.label
    } else {
      el.toast.style.opacity = 0
    }

    // 6. pointer
    const at = pointerAt(t)
    if (at) {
      el.dot.style.opacity = '1'
      el.dot.style.left = at[0].toFixed(2) + 'em'
      el.dot.style.top = at[1].toFixed(2) + 'em'
    } else if (t > T.ddClose[1] && t < T.back[1]) {
      el.dot.style.opacity = (1 - seg(t, T.ddClose[1], T.ddClose[1] + 400)).toFixed(3)
      place(P.item)
    } else {
      el.dot.style.opacity = 0
    }

    for (const rt of RINGS) pulse(t, rt)

    // 7. caption
    const phase = t < PHASE_AT[0] ? 0 : (t < PHASE_AT[1] ? 1 : 2)
    if (el.mode.textContent !== captions[phase]) el.mode.textContent = captions[phase]
    if (el.hint.textContent !== hints[phase]) el.hint.textContent = hints[phase]
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // settle on the frame that shows the point: the saved entry in the list
    frame(T.toast1[0] + 400)
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
