/**
 * Animated banner for the "User widgets" blog post.
 *
 * Everything is generated DOM + CSS — no image, no canvas, no GIF: a light
 * dotted backdrop and one electerm window (settings tabs + widget list +
 * widget panel + status bar) with a pointer that drives the whole story:
 *
 *   1. the pointer hits **Import**, a folder lands in the list as a row;
 *   2. it selects **Passbolt Search**, and the right panel fills with the form
 *      that `electerm.configs` generates — five fields, no HTML anywhere;
 *   3. it submits, the main process answers, and the result table lands with
 *      per-row buttons;
 *   4. it clicks a row's **SSH**, and a tab appears in the title bar.
 *
 * The status bar says what just happened in the same words the docs use, so the
 * banner still teaches something when the animation is frozen for a screenshot.
 *
 * Every number in the copy comes from the electerm source (user-widget.js,
 * custom-widget-form.jsx, widget-open-tab.js): the manifest key names, the
 * `from: widget:<id>` tag, "copy, .git skipped".
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + window (post page)
 *   data-eb-banner="card"  -> window only       (blog index thumbnail)
 * The index loads every post's banner module, so a mount must also match
 * data-eb-banner-src — otherwise the first module to run claims every card.
 *
 * Layout is expressed in em, and the root font-size is 1% of the banner width,
 * so one design scales from hero to card. Geometry that depends on a target's
 * position (the pointer) is measured, never hard-coded.
 */

const STYLE_ID = 'eb-uw-style'

// One full pass of the story, in ms.
const PERIOD = 13200

const T = {
  winFrom: 0,
  winTo: 700,
  listFrom: 800,
  listGap: 130,
  ptr1From: 1500,
  ptr1To: 1900,
  clickImport: 1950,
  rowIn: 2050,
  ptr2From: 2250,
  ptr2To: 2600,
  clickRow: 2650,
  formFrom: 2700,
  formTo: 3300,
  fieldFrom: 2850,
  fieldGap: 150,
  ptr3From: 3700,
  ptr3To: 4050,
  clickSubmit: 4100,
  busyFrom: 4150,
  resultFrom: 4600,
  resultTo: 4900,
  rowsFrom: 4750,
  rowsGap: 230,
  ptr4From: 5600,
  ptr4To: 5950,
  clickSsh: 6000,
  tabFrom: 6080,
  tabTo: 6420,
  fadeFrom: 11800,
  fadeTo: 13000
}

const WIDGETS = [
  { name: 'Passbolt Search', badge: 'widget' },
  { name: 'Docker Cockpit', badge: 'widget' },
  { name: 'File Renamer', badge: 'widget' },
  { name: 'Static File Server', badge: 'widget' },
  { name: 'Local FTP Server', badge: 'widget' }
]

const BUILTINS = ['MCP Server', 'SSH Server']

const FIELDS = [
  { label: 'Server URL', value: 'https://passbolt.example.com' },
  { label: 'User ID', value: '3f7c21a4-…-8b9e01' },
  { label: 'GPG key file', value: 'me.asc' },
  { label: 'Key passphrase', value: '••••••••', secret: true },
  { label: 'Search', value: '10.0.0.12' }
]

const ROWS = [
  { name: 'Router', user: 'root', uri: '10.0.0.12:2222', action: 'SSH' },
  { name: 'Jump host', user: 'deploy', uri: '10.0.0.9:22', action: 'SSH' },
  { name: 'NAS', user: 'admin', uri: '10.0.0.20:21', action: 'FTP' }
]

const STATUS = [
  { at: 0, text: 'import  ./passbolt-search  →  <data dir>/widgets/passbolt-search/  (copied, .git skipped)' },
  { at: T.clickRow, text: 'config mode  ·  5 fields rendered from package.json  ·  no HTML, no build' },
  { at: T.clickSubmit, text: 'run(config)  ·  decrypted in the main process, keys never leave the machine' },
  { at: T.rowsFrom, text: 'row buttons  ·  details / SSH  ·  callWidgetFunc(row, values)' },
  { at: T.clickSsh, text: 'openTab  ·  from: widget:passbolt-search  ·  not written to connection history' }
]

const CSS = `
.eb-uw {
  --uw-main: #121214;
  --uw-dark: #000;
  --uw-light: #2e3338;
  --uw-text: #dddddd;
  --uw-dim: #888888;
  --uw-primary: #08c;
  --uw-ok: #06d6a0;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #eef4ff 0%, #f2ecff 52%, #fdeef6 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-uw-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-uw-dots {
  position: absolute; inset: -6em;
  background-image: radial-gradient(rgba(37,99,235,.22) 0.16em, transparent 0.16em);
  background-size: 4em 4em;
  animation: eb-uw-drift 32s linear infinite;
}
@keyframes eb-uw-drift { to { transform: translate3d(4em, 4em, 0); } }
.eb-uw-blob { position: absolute; border-radius: 50%; background: rgba(255,255,255,.6); }
.eb-uw-blob-a { width: 30em; height: 30em; right: -11em; top: -13em; }
.eb-uw-blob-b { width: 22em; height: 22em; left: -9em; bottom: -11em; }

.eb-uw-head { position: absolute; left: 5em; right: 5em; top: 2.4em; }
.eb-uw-badge {
  display: inline-block; font-size: 1.35em; font-weight: 800; letter-spacing: .14em;
  color: #fff; background: linear-gradient(96deg, #2563eb, #7c3aed 55%, #ec4899);
  border-radius: 999px; padding: .32em 1.05em;
}
.eb-uw-h1 { margin: .24em 0 0; font-size: 3.3em; font-weight: 800; letter-spacing: -.025em; color: #0f172a; line-height: 1.02; }
.eb-uw-h1 em { font-style: normal; background: linear-gradient(96deg, #2563eb, #7c3aed 52%, #ec4899); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.eb-uw-sub { margin: .42em 0 0; font-size: 1.45em; color: #475569; max-width: 74em; }
.eb-uw-sub b { color: #0f172a; }
.eb-uw-sub code { font-family: Menlo, Monaco, monospace; font-size: .92em; background: rgba(37,99,235,.10); border-radius: .3em; padding: .05em .35em; color: #1d4ed8; }

.eb-uw-app {
  position: absolute; left: 50%; top: 15.4em; transform: translateX(-50%);
  width: 88em; height: 35.4em;
  display: flex; flex-direction: column;
  border-radius: .8em; overflow: hidden;
  background: var(--uw-main);
  box-shadow: 0 1.2em 2.6em rgba(15,23,42,.32), 0 0 2.2em rgba(124,58,237,.22);
}
.eb-uw-titlebar {
  display: flex; align-items: stretch; height: 2.9em; padding: 0 .6em;
  background: var(--uw-dark); color: var(--uw-dim); font-size: 1.35em; flex-shrink: 0;
}
.eb-uw-tab { display: flex; align-items: center; padding: 0 .95em; white-space: nowrap; border-radius: .2em .2em 0 0; }
.eb-uw-tab.is-on { background: var(--uw-main); color: var(--uw-text); font-weight: 700; box-shadow: inset 0 -2px 0 0 var(--uw-primary); }
.eb-uw-beta { margin-left: .45em; font-size: .72em; color: var(--uw-primary); border: 1px solid rgba(0,136,204,.55); border-radius: .35em; padding: 0 .35em; }
.eb-uw-newtab {
  display: flex; align-items: center; gap: .4em; margin-left: .5em; padding: 0 .8em;
  color: var(--uw-text); background: var(--uw-main); border-radius: .2em .2em 0 0;
  opacity: 0; white-space: nowrap;
}
.eb-uw-newtab i { width: .42em; height: .42em; border-radius: 50%; background: var(--uw-ok); }

.eb-uw-body { display: grid; grid-template-columns: 1fr 1.5fr; flex: 1; min-height: 0; }
.eb-uw-list { padding: .7em .65em; border-right: 1px solid var(--uw-light); background: #17171b; overflow: hidden; }
.eb-uw-import {
  display: flex; align-items: center; justify-content: center; gap: .5em;
  height: 2.3em; font-size: 1.34em; color: var(--uw-text);
  background: #1f1f25; border: 1px solid var(--uw-light); border-radius: .35em;
  transition: none;
}
.eb-uw-import.is-hot { border-color: var(--uw-primary); color: #fff; background: #22303a; }
.eb-uw-import.is-hit { border-color: var(--uw-ok); }
.eb-uw-import-help { color: var(--uw-dim); font-size: .9em; }
.eb-uw-search {
  margin: .5em 0 .4em; height: 2.15em; display: flex; align-items: center; padding: 0 .7em;
  font-size: 1.26em; color: #6b7280; background: #101014; border: 1px solid var(--uw-light); border-radius: .3em;
}
.eb-uw-row {
  display: flex; align-items: center; gap: .55em; padding: .32em .55em;
  font-size: 1.32em; color: var(--uw-text); border-radius: .28em;
  opacity: 0; transform: translateY(.35em);
}
.eb-uw-row.is-on { background: var(--uw-primary); color: #fff; }
.eb-uw-row.is-builtin { color: #6b7280; }
.eb-uw-row i { width: .3em; height: .3em; border-radius: 50%; background: currentColor; opacity: .55; flex-shrink: 0; }
.eb-uw-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.eb-uw-panel { position: relative; padding: 1.1em 1.4em; overflow: hidden; }
.eb-uw-form, .eb-uw-result { position: absolute; inset: 1.1em 1.4em; }
.eb-uw-form { opacity: 0; }
.eb-uw-title { font-size: 1.6em; font-weight: 700; color: var(--uw-text); margin-bottom: .1em; }
.eb-uw-ver { margin-left: .45em; font-size: .68em; font-weight: 400; color: var(--uw-dim); }
.eb-uw-desc { font-size: 1.15em; color: var(--uw-dim); margin: .2em 0 .8em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.eb-uw-field { display: flex; align-items: center; gap: .7em; margin-bottom: .42em; opacity: 0; }
.eb-uw-field label { flex: 0 0 7.6em; font-size: 1.18em; color: var(--uw-dim); text-align: right; white-space: nowrap; }
.eb-uw-input {
  flex: 1; min-width: 0; height: 1.95em; display: flex; align-items: center; padding: 0 .6em;
  font-size: 1.25em; font-family: Menlo, Monaco, monospace; color: #cfd4da;
  background: #101014; border: 1px solid var(--uw-light); border-radius: .26em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.eb-uw-submit {
  display: inline-flex; align-items: center; justify-content: center; gap: .45em;
  margin-top: .75em; height: 2.3em; padding: 0 1.2em;
  font-size: 1.32em; color: #fff; background: var(--uw-primary); border-radius: .3em;
  box-shadow: 0 0 0 0 rgba(0,136,204,.5);
}
.eb-uw-submit.is-hot { background: #0a9ad9; }
.eb-uw-spin {
  width: .8em; height: .8em; border-radius: 50%; border: .16em solid rgba(255,255,255,.35);
  border-top-color: #fff; opacity: 0;
}
.eb-uw-submit.is-busy .eb-uw-spin { opacity: 1; animation: eb-uw-spin .7s linear infinite; }
@keyframes eb-uw-spin { to { transform: rotate(360deg); } }

.eb-uw-empty {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 1.35em; color: #6b7280; letter-spacing: .02em;
}
.eb-uw-result { display: flex; flex-direction: column; justify-content: center; opacity: 0; }
.eb-uw-note { font-size: 1.18em; color: var(--uw-ok); margin-bottom: .55em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.eb-uw-tr {
  display: grid; grid-template-columns: 1.05fr .95fr 1.35fr 2.9em;
  gap: .5em; align-items: center; padding: .34em .35em;
  font-size: 1.25em; color: var(--uw-text); border-bottom: 1px solid var(--uw-light);
  opacity: 0;
}
.eb-uw-tr > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eb-uw-th { color: var(--uw-dim); font-size: 1.1em; border-bottom-color: #3a4046; }
.eb-uw-act { color: var(--uw-primary); text-align: right; }
.eb-uw-act.is-hot { color: var(--uw-ok); font-weight: 700; }

.eb-uw-footbtn {
  align-self: flex-start; margin-top: .9em; height: 2.05em; padding: 0 1em;
  display: inline-flex; align-items: center; font-size: 1.18em;
  color: var(--uw-text); border: 1px solid var(--uw-light); border-radius: .3em; opacity: 0;
}
.eb-uw-status {
  display: flex; align-items: center; gap: .55em; flex-shrink: 0;
  height: 2.2em; padding: 0 .9em;
  font-size: 1.2em; font-family: Menlo, Monaco, 'DejaVu Sans Mono', monospace; color: #9aa4b2;
  background: #0c0c0f; border-top: 1px solid #000;
  white-space: nowrap; overflow: hidden;
}
.eb-uw-status i { width: .42em; height: .42em; border-radius: 50%; background: var(--uw-ok); flex-shrink: 0; animation: eb-uw-blink 1.3s ease-in-out infinite; }
@keyframes eb-uw-blink { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
.eb-uw-status span { overflow: hidden; text-overflow: ellipsis; }

.eb-uw-ptr {
  position: absolute; width: 1.9em; height: 1.9em; margin: -.2em 0 0 -.35em;
  pointer-events: none; opacity: 0; z-index: 5;
  filter: drop-shadow(0 .12em .25em rgba(15,23,42,.45));
}
.eb-uw-ripple {
  position: absolute; width: 3.4em; height: 3.4em; border-radius: 50%;
  border: .16em solid rgba(0,136,204,.75); opacity: 0; pointer-events: none; z-index: 4;
}

.eb-uw[data-variant='card'] .eb-uw-head { display: none; }
/* margin instead of translate(-50%,-50%): the frame loop writes transform */
.eb-uw[data-variant='card'] .eb-uw-app {
  top: 50%; margin-top: -23em; transform: translateX(-50%); width: 92em; height: 46em;
}
/* scaling a container's font-size scales every em inside it uniformly — text
   and geometry together — which is the only safe way to zoom this layout */
.eb-uw[data-variant='card'] .eb-uw-list { font-size: 1.16em; }
.eb-uw[data-variant='card'] .eb-uw-panel { font-size: 1.34em; }
.eb-uw[data-variant='card'] .eb-uw-row.is-builtin { display: none; }
.eb-uw[data-variant='card'] .eb-uw-status { display: none; }
.eb-uw[data-variant='card'] .eb-uw-desc { display: none; }
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

function esc (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

function pointerSvg () {
  return '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">' +
    '<path d="M4 2.5 20.2 11.4 12.7 12.9 9.4 20.6 4 2.5Z" fill="#ffffff" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round"/>' +
    '</svg>'
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : '<div class="eb-uw-head">' +
      '<span class="eb-uw-badge">WIDGETS</span>' +
      '<h2 class="eb-uw-h1">Your terminal, <em>extensible</em></h2>' +
      '<p class="eb-uw-sub">Drop a folder in, hit <b>Import</b>, and get a generated form or your own panel — <b>no rebuild, no fork</b>.</p>' +
      '</div>'
  const rows = WIDGETS.map((w, i) =>
    '<div class="eb-uw-row" data-row="' + i + '"><i></i><span>' + esc(w.name) + '</span></div>'
  ).join('')
  const builtins = BUILTINS.map(name =>
    '<div class="eb-uw-row is-builtin" data-row="b-' + esc(name) + '"><i></i><span>' + esc(name) + '</span></div>'
  ).join('')
  const fields = FIELDS.map((f, i) =>
    '<div class="eb-uw-field" data-f="' + i + '"><label>' + esc(f.label) + '</label>' +
    '<div class="eb-uw-input">' + esc(f.value) + '</div></div>'
  ).join('')
  const trs = ROWS.map((r, i) =>
    '<div class="eb-uw-tr" data-r="' + i + '">' +
    '<span>' + esc(r.name) + '</span><span>' + esc(r.user) + '</span><span>' + esc(r.uri) + '</span>' +
    '<span class="eb-uw-act" data-act="' + i + '">' + esc(r.action) + '</span></div>'
  ).join('')

  return (
    '<div class="eb-uw-deco"><span class="eb-uw-blob eb-uw-blob-a"></span>' +
    '<span class="eb-uw-blob eb-uw-blob-b"></span><span class="eb-uw-dots"></span></div>' +
    head +
    '<div class="eb-uw-app" data-app>' +
    '<div class="eb-uw-titlebar">' +
    '<span class="eb-uw-tab">Bookmarks</span>' +
    '<span class="eb-uw-tab">Setting</span>' +
    '<span class="eb-uw-tab">UI Themes</span>' +
    '<span class="eb-uw-tab is-on">Widgets<span class="eb-uw-beta">Beta</span></span>' +
    '<span class="eb-uw-newtab" data-newtab><i></i>1 Router:22</span>' +
    '</div>' +
    '<div class="eb-uw-body">' +
    '<div class="eb-uw-list">' +
    '<div class="eb-uw-import" data-import>' +
    '<svg viewBox="0 0 24 24" width="1.05em" height="1.05em" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M4 17v3h16v-3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    'Import<span class="eb-uw-import-help">?</span></div>' +
    '<div class="eb-uw-search">Search widgets…</div>' +
    rows + builtins +
    '</div>' +
    '<div class="eb-uw-panel">' +
    '<div class="eb-uw-empty" data-empty>Select a widget to configure</div>' +
    '<div class="eb-uw-form" data-form>' +
    '<div class="eb-uw-title">Passbolt Search<span class="eb-uw-ver">0.1.0</span></div>' +
    '<div class="eb-uw-desc">Search Passbolt resources and open SSH / FTP / Telnet / RDP.</div>' +
    fields +
    '<div class="eb-uw-submit" data-submit><span class="eb-uw-spin"></span>Connect / search</div>' +
    '</div>' +
    '<div class="eb-uw-result" data-result>' +
    '<div class="eb-uw-note">Scanned 128 entries, decrypted 128. 1 match.</div>' +
    '<div class="eb-uw-tr eb-uw-th" data-th><span>Name</span><span>Username</span><span>URI</span><span></span></div>' +
    trs +
    '<div class="eb-uw-footbtn" data-footbtn>Lock and disconnect</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="eb-uw-status"><i></i><span data-status>' + esc(STATUS[0].text) + '</span></div>' +
    '</div>' +
    '<div class="eb-uw-ptr" data-ptr>' + pointerSvg() + '</div>' +
    '<div class="eb-uw-ripple" data-ripple></div>'
  )
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-uw'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm widget panel: a folder is imported, the Passbolt Search widget renders a form from package.json, its result table lists Router 10.0.0.12 as root, and one click opens an SSH tab')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const el = {
    app: q('[data-app]'),
    importBtn: q('[data-import]'),
    form: q('[data-form]'),
    empty: q('[data-empty]'),
    footbtn: q('[data-footbtn]'),
    result: q('[data-result]'),
    submit: q('[data-submit]'),
    newTab: q('[data-newtab]'),
    status: q('[data-status]'),
    ptr: q('[data-ptr]'),
    ripple: q('[data-ripple]'),
    rows: Array.prototype.slice.call(root.querySelectorAll('.eb-uw-row[data-row]')),
    fields: Array.prototype.slice.call(root.querySelectorAll('.eb-uw-field')),
    trs: Array.prototype.slice.call(root.querySelectorAll('.eb-uw-tr[data-r]')),
    acts: Array.prototype.slice.call(root.querySelectorAll('[data-act]'))
  }

  // Root font-size is 1% of banner width: every size above is in em.
  const fit = () => {
    const w = root.clientWidth
    if (w) root.style.fontSize = (w / 100) + 'px'
  }
  fit()

  // Pointer targets are measured, not guessed: the panel is a flex/grid layout,
  // so its boxes move with the variant and the user's font scaling.
  const targets = { import: [0, 0], row: [0, 0], submit: [0, 0], ssh: [0, 0] }
  const measure = () => {
    fit()
    const base = root.getBoundingClientRect()
    const unit = root.clientWidth / 100
    const at = (node) => {
      if (!node) return
      const r = node.getBoundingClientRect()
      return [(r.left - base.left + r.width / 2) / unit, (r.top - base.top + r.height / 2) / unit]
    }
    targets.import = at(el.importBtn) || targets.import
    targets.row = at(el.rows[0]) || targets.row
    targets.submit = at(el.submit) || targets.submit
    targets.ssh = at(el.acts[0]) || targets.ssh
  }
  measure()
  if (window.ResizeObserver) {
    new window.ResizeObserver(measure).observe(root)
  } else {
    window.addEventListener('resize', measure)
  }

  let statusIndex = 0
  const setStatus = (index) => {
    if (index === statusIndex) return
    statusIndex = index
    el.status.textContent = STATUS[index].text
  }

  const setOp = (node, v) => {
    if (node) node.style.opacity = v.toFixed(3)
  }

  function frame (t) {
    const gone = 1 - easeInOut(seg(t, T.fadeFrom, T.fadeTo))

    // window in
    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    el.app.style.opacity = (winP * gone).toFixed(3)
    el.app.style.transform = 'translateX(-50%) translateY(' + ((1 - winP) * 1.4).toFixed(3) + 'em)'

    // list rows stagger in; row 0 is the one the import creates, so it is
    // handled by the import beat below instead
    el.rows.forEach((node, i) => {
      if (i === 0) return
      const isBuiltin = node.classList.contains('is-builtin')
      const from = T.listFrom + i * T.listGap + (isBuiltin ? 260 : 0)
      const p = easeOut(seg(t, from, from + 300))
      setOp(node, p * gone)
      node.style.transform = 'translateY(' + ((1 - p) * 0.35).toFixed(3) + 'em)'
    })

    // selected row: follows the row click, stays on
    el.rows.forEach((node, i) => {
      node.classList.toggle('is-on', i === 0 && t >= T.clickRow)
    })

    // import: pointer lands on it, then the row appears
    el.importBtn.classList.toggle('is-hot', t >= T.ptr1From && t < T.clickImport)
    el.importBtn.classList.toggle('is-hit', t >= T.clickImport && t < T.rowIn)
    if (t >= T.rowIn) {
      const p = easeOut(seg(t, T.rowIn, T.rowIn + 380))
      setOp(el.rows[0], p * gone)
    }

    // form: slides up after the row click, fields stagger
    const formIn = easeOut(seg(t, T.formFrom, T.formTo))
    setOp(el.empty, (1 - formIn) * gone)
    setOp(el.form, formIn * (1 - easeInOut(seg(t, T.resultFrom, T.resultTo))) * gone)
    el.form.style.transform = 'translateY(' + ((1 - formIn) * 0.6).toFixed(3) + 'em)'
    el.fields.forEach((node, i) => {
      const from = T.fieldFrom + i * T.fieldGap
      const p = easeOut(seg(t, from, from + 300))
      setOp(node, p * formIn * (1 - easeInOut(seg(t, T.resultFrom, T.resultTo))) * gone)
    })
    const submitIn = easeOut(seg(t, T.fieldFrom + FIELDS.length * T.fieldGap, T.fieldFrom + FIELDS.length * T.fieldGap + 300))
    setOp(el.submit, submitIn * (1 - easeInOut(seg(t, T.resultFrom, T.resultTo))) * gone)
    el.submit.classList.toggle('is-hot', t >= T.ptr3From && t < T.clickSubmit)
    el.submit.classList.toggle('is-busy', t >= T.busyFrom && t < T.resultFrom)

    // result: table lands, rows stagger, the note first
    const resIn = easeOut(seg(t, T.resultFrom, T.resultTo))
    setOp(el.result, resIn * gone)
    setOp(q('[data-th]'), resIn * gone)
    setOp(q('.eb-uw-note'), resIn * gone)
    setOp(el.footbtn, resIn * gone)
    el.trs.forEach((node, i) => {
      const from = T.rowsFrom + i * T.rowsGap
      const p = easeOut(seg(t, from, from + 320))
      setOp(node, p * gone)
      node.style.transform = 'translateY(' + ((1 - p) * 0.3).toFixed(3) + 'em)'
    })

    // the SSH row button is hovered, then clicked: a tab joins the title bar
    el.acts.forEach((node, i) => {
      node.classList.toggle('is-hot', i === 0 && t >= T.ptr4From && t < T.tabTo)
    })
    const tabP = easeOut(seg(t, T.tabFrom, T.tabTo))
    setOp(el.newTab, tabP * gone)
    el.newTab.style.transform = 'translateY(' + ((1 - tabP) * -0.4).toFixed(3) + 'em)'

    // pointer: import -> row -> submit -> ssh, then out
    const path = [
      { from: T.ptr1From, to: T.ptr1To, a: targets.import, b: targets.import },
      { from: T.ptr1To, to: T.ptr2From, a: targets.import, b: targets.row },
      { from: T.ptr2From, to: T.ptr2To, a: targets.row, b: targets.row },
      { from: T.ptr2To, to: T.ptr3From, a: targets.row, b: targets.submit },
      { from: T.ptr3From, to: T.ptr3To, a: targets.submit, b: targets.submit },
      { from: T.ptr3To, to: T.ptr4From, a: targets.submit, b: targets.ssh },
      { from: T.ptr4From, to: T.ptr4To, a: targets.ssh, b: targets.ssh }
    ]
    let px = targets.import[0]
    let py = targets.import[1]
    for (const step of path) {
      if (t >= step.to) {
        px = step.b[0]
        py = step.b[1]
        continue
      }
      if (t >= step.from) {
        const p = easeInOut(seg(t, step.from, step.to))
        px = step.a[0] + (step.b[0] - step.a[0]) * p
        py = step.a[1] + (step.b[1] - step.a[1]) * p
      }
      break
    }
    const ptrIn = seg(t, T.ptr1From, T.ptr1From + 240)
    const ptrOut = easeInOut(seg(t, T.tabTo + 100, T.tabTo + 460))
    el.ptr.style.left = px.toFixed(2) + 'em'
    el.ptr.style.top = py.toFixed(2) + 'em'
    el.ptr.style.opacity = (ptrIn * (1 - ptrOut) * gone).toFixed(3)

    // ripples on the four clicks
    const clicks = [
      { at: T.clickImport, p: targets.import },
      { at: T.clickRow, p: targets.row },
      { at: T.clickSubmit, p: targets.submit },
      { at: T.clickSsh, p: targets.ssh }
    ]
    let rip = null
    for (const c of clicks) {
      if (t >= c.at && t < c.at + 460) {
        rip = { at: c.at, p: c.p }
        break
      }
    }
    if (rip) {
      const p = seg(t, rip.at, rip.at + 460)
      el.ripple.style.opacity = ((1 - p) * gone).toFixed(3)
      el.ripple.style.left = rip.p[0].toFixed(2) + 'em'
      el.ripple.style.top = rip.p[1].toFixed(2) + 'em'
      el.ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.35 + p * 1.9).toFixed(3) + ')'
    } else {
      el.ripple.style.opacity = '0'
    }

    // status line: the story in the docs' own words
    let idx = 0
    for (let i = 0; i < STATUS.length; i++) {
      if (t >= STATUS[i].at) idx = i
    }
    setStatus(idx)
  }

  const reduce = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduce) {
    // one representative frame: result table up, SSH tab open, no loop
    frame(T.tabTo + 400)
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
