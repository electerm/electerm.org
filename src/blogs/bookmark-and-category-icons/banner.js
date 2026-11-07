/**
 * Animated banner for the "Bookmark and category icons" blog post.
 *
 * Plain DOM + CSS, one requestAnimationFrame timeline: no image, no GIF, no
 * canvas. The scene is the real shape of the feature — a bookmark tree whose
 * rows carry colour squares, the appearance button next to a bookmark title,
 * and the picker that opens from it with color / icon tabs, a search box and
 * a grid of icons. Picking Ubuntu replaces the square on that bookmark, on the
 * appearance button and on the tab title.
 *
 * Two details are deliberately faithful to the app:
 *   - a category that already has an icon is inherited by its child rows, and
 *     one row still wears its own colour square until it is edited here;
 *   - the value the picker writes is `icon:ubuntu`, not a remote URL.
 *
 * Colours and metrics come from electerm itself: --main #121214, --main-dark
 * #000, --text #ddd (src/client/common/theme-defaults.js), the 36px tab bar
 * (src/client/components/tabs/tabs.styl), the 26px bookmark row
 * (src/client/components/tree-list/tree-list.styl), and antd's white popover
 * with #1677ff primary. The icon glyphs are simplified, hand-drawn SVG shapes
 * standing in for the electerm-icons set; the app renders the real logos.
 *
 * Mount points: [data-eb-banner="hero"] on the post, "card" on the index.
 * The index loads every post's module, so a host is only mounted when its
 * data-eb-banner-src matches this module's own path.
 *
 * 1em === 1% of the banner width, so one design scales from 780px to 418px.
 */

const STYLE_ID = 'eb-bc-style'

const PERIOD = 9200

const T = {
  ptrFrom: 420, // cursor travels in from the right
  ptrTo: 1050,
  click1: 1120, // the appearance button is clicked
  pickFrom: 1220, // picker opens
  pickTo: 1700,
  tabAt: 1760, // color -> icon tab
  typeFrom: 1950, // "ubuntu" typed into search
  typeTo: 2850,
  ptr2From: 2950, // cursor moves to the Ubuntu tile
  ptr2To: 3400,
  click2: 3480,
  applyFrom: 4100, // icon replaces the colour square
  applyTo: 4700,
  fadeFrom: 8000,
  fadeTo: 8900
}

const SEARCH = 'ubuntu'

const I18N = {
  en: {
    h1: 'Give every bookmark <em>an icon</em>',
    sub: 'Built-in set, a local file, or a URL',
    corner: '5.9.1  ·  NEW FEATURE',
    cap0: 'Colour squares only',
    cap1: '95 built-in icons, searchable',
    cap2: 'The icon follows the bookmark into its tab',
    color: 'color',
    icon: 'icon',
    search: 'search',
    choose: 'choose file',
    reset: 'default',
    download: 'download',
    url: 'https://example.com/icon.svg',
    field: 'icon',
    empty: '—',
    icons: '95 built-in icons',
    legend: 'a category passes its icon to new bookmarks'
  },
  cn: {
    h1: '给书签和目录选 <em>一个图标</em>',
    sub: '内置图标、本地文件，或者一个网址',
    corner: '5.9.1  ·  新特性',
    cap0: '只有颜色方块',
    cap1: '95 个内置图标，可搜索',
    cap2: '图标会跟着书签进入标签页标题',
    color: '颜色',
    icon: '图标',
    search: '搜索',
    choose: '选择文件',
    reset: '默认',
    download: '下载',
    url: 'https://example.com/icon.svg',
    field: 'icon',
    empty: '—',
    icons: '95 个内置图标',
    legend: '分类的图标会传给新建的书签'
  }
}

// Simplified glyphs for the picker grid. viewBox 0 0 24 24, one string each.
const G = {
  ubuntu: '<circle cx="12" cy="12" r="10" fill="#E95420"/><circle cx="12" cy="12" r="5.3" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="4.5" r="1.4" fill="#fff"/><circle cx="5.5" cy="16.3" r="1.4" fill="#fff"/><circle cx="18.5" cy="16.3" r="1.4" fill="#fff"/>',
  debian: '<circle cx="12" cy="12" r="10" fill="#A80030"/><path d="M7 8.8c3.7-2.7 8.7-1.5 10.5 1.7 1.7 2.9.2 6.5-2.7 7.5-2.6.9-5.3-.5-5.9-3-.6-2.1.5-4 2.4-4.5 1.5-.4 2.9.4 3 1.7" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
  docker: '<rect x="1.5" y="5.5" width="21" height="13" rx="2.2" fill="#2496ED"/><g fill="#fff"><rect x="5" y="9" width="2.6" height="2.6" rx=".3"/><rect x="8.6" y="9" width="2.6" height="2.6" rx=".3"/><rect x="12.2" y="9" width="2.6" height="2.6" rx=".3"/><rect x="8.6" y="5.9" width="2.6" height="2.4" rx=".3"/><rect x="5" y="12.4" width="2.6" height="2.6" rx=".3"/><rect x="8.6" y="12.4" width="2.6" height="2.6" rx=".3"/><rect x="12.2" y="12.4" width="2.6" height="2.6" rx=".3"/></g><path d="M15.6 12.2c2.4-.5 4.3.3 5.4 2.1" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
  python: '<rect x="2" y="2.6" width="11.4" height="9.6" rx="4.8" fill="#3776AB"/><rect x="10.6" y="11.8" width="11.4" height="9.6" rx="4.8" fill="#FFD43B"/><circle cx="6.5" cy="7.2" r="1.15" fill="#fff"/><circle cx="17.5" cy="16.6" r="1.15" fill="#fff"/>',
  kubernetes: '<path d="M12 1.8l8.8 5.1v10.2L12 22.2l-8.8-5.1V6.9z" fill="#326CE5"/><circle cx="12" cy="12" r="2.2" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M12 4.6v5.2M12 14.2v5.2M5.5 8.7l4.5 2.5M14 12.8l4.5 2.5M5.5 15.3l4.5-2.5M14 11.2l4.5-2.5" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>',
  postgresql: '<circle cx="12" cy="12" r="10" fill="#336791"/><text x="12" y="16" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#fff">Pg</text>',
  redis: '<rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#DC382D"/><path d="M12 5.2l8 3.3-8 3.3-8-3.3zM4 11.3l8 3.3 8-3.3M4 14.6l8 3.3 8-3.3" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>',
  nginx: '<circle cx="12" cy="12" r="10" fill="#009639"/><path d="M6.5 17.5V6.5l11 11V6.5" fill="none" stroke="#fff" stroke-width="2.3" stroke-linejoin="round"/>',
  aws: '<circle cx="12" cy="12" r="10" fill="#232F3E"/><text x="12" y="12.4" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.5" font-weight="700" fill="#fff">aws</text><path d="M4.6 16c4.2 2.6 10.6 2.6 14.8 0" fill="none" stroke="#FF9900" stroke-width="1.7" stroke-linecap="round"/><path d="M17.4 14.4l1.9 1.7-2.4.7" fill="none" stroke="#FF9900" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  server: '<rect x="2" y="3" width="20" height="7.4" rx="1.2" fill="#5b6472"/><rect x="2" y="13.6" width="20" height="7.4" rx="1.2" fill="#5b6472"/><g fill="#dfe6ee"><circle cx="5.5" cy="6.7" r="1"/><rect x="8.4" y="6" width="10.5" height="1.5" rx=".7"/><circle cx="5.5" cy="17.3" r="1"/><rect x="8.4" y="16.6" width="10.5" height="1.5" rx=".7"/></g>',
  cloud: '<circle cx="12" cy="12" r="10" fill="#08c"/><path d="M6.8 16.4h10.1a3.1 3.1 0 00.3-6.2 4.6 4.6 0 00-8.7-1.1 3.7 3.7 0 00-1.7 7.3z" fill="#fff"/>',
  folder: '<circle cx="12" cy="12" r="10" fill="#f0a020"/><path d="M3.6 7.6h6l1.6 1.8h9.2v8.1a1 1 0 01-1 1H4.6a1 1 0 01-1-1z" fill="#fff"/>'
}

const TILES = [
  { name: 'ubuntu', label: 'Ubuntu', keys: 'ubuntu linux' },
  { name: 'debian', label: 'Debian', keys: 'debian linux' },
  { name: 'docker', label: 'Docker', keys: 'docker container' },
  { name: 'python', label: 'Python', keys: 'python py' },
  { name: 'kubernetes', label: 'Kubernetes', keys: 'kubernetes k8s' },
  { name: 'postgresql', label: 'PostgreSQL', keys: 'postgresql postgres pg' },
  { name: 'redis', label: 'Redis', keys: 'redis cache' },
  { name: 'nginx', label: 'Nginx', keys: 'nginx web' },
  { name: 'aws', label: 'AWS', keys: 'aws amazon cloud' },
  { name: 'server', label: 'Server', keys: 'server host' },
  { name: 'cloud', label: 'Cloud', keys: 'cloud' },
  { name: 'folder', label: 'Folder', keys: 'folder dir' }
]

// The bookmark tree: prod has a Docker icon that its children inherited, one
// row is still a colour square, and db is a plain colour category.
const ROWS = [
  { text: 'prod', group: true, open: true, glyph: 'docker' },
  { text: 'prod-web - deploy@10.0.4.21:22', selected: true, color: '#06d6a0', morph: true, indent: 1 },
  { text: 'prod-api - deploy@10.0.4.22:22', glyph: 'docker', indent: 1 },
  { text: 'db', group: true, color: '#ef476f' },
  { text: 'db-primary - deploy@10.0.4.8:22', color: '#ef476f', indent: 1 },
  { text: 'local', color: '#08c' }
]

const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${G[name]}</svg>`

const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

const antdIcon = (path) => `<svg viewBox="64 64 896 896" aria-hidden="true"><path d="${path}"/></svg>`

// A mark is either a colour square, an icon, or (for the row being edited)
// both stacked in one box so the two can crossfade without moving anything.
function mark (opts) {
  const sq = opts.color
    ? `<span class="eb-bc-sq${opts.morph ? ' is-morph' : ''}" style="background:${opts.color}"></span>`
    : ''
  const gly = opts.glyph
    ? `<span class="eb-bc-gly${opts.morph ? ' is-morph' : ''}">${svg(opts.glyph)}</span>`
    : ''
  return `<span class="eb-bc-mark">${sq}${gly}</span>`
}

const CSS = `
.eb-bc {
  --eb-bc-dark: #121214;
  --eb-bc-line: #2b2f36;
  --eb-bc-text: #ddd;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: .8em;
  background: radial-gradient(circle at 78% 18%, #1d2b3f 0, transparent 38%), #101319;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  /* /blogs/ cards centre their text; the banner owns its own alignment. */
  text-align: left;
  box-sizing: border-box;
}
.eb-bc *, .eb-bc *::before, .eb-bc *::after { box-sizing: border-box; }
.eb-bc-scene { position: absolute; inset: 0; }

/* decorative background */
.eb-bc-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-bc-blob {
  position: absolute; border-radius: 50%; filter: blur(2em);
  background: rgba(8, 136, 204, .16);
}
.eb-bc-blob-a { width: 34em; height: 34em; top: -14em; right: -8em; }
.eb-bc-blob-b { width: 24em; height: 24em; bottom: -12em; left: -6em; background: rgba(233, 84, 32, .13); }
.eb-bc-dots {
  position: absolute; inset: -6em;
  background-image: radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px);
  background-size: 2.2em 2.2em;
  transform: rotate(-8deg);
}

/* headline, hero only */
.eb-bc-head { position: absolute; left: 4.6%; top: 6%; z-index: 4; }
.eb-bc-brand {
  font-size: 1.45em; font-weight: 800; letter-spacing: .2em;
  color: #f0f3f8; text-transform: lowercase;
}
.eb-bc-h1 {
  font-size: 3.75em; line-height: 1.08; font-weight: 750;
  letter-spacing: -.02em; margin: .3em 0 .18em; color: #fff;
}
.eb-bc-h1 em { font-style: normal; color: #ff8a4c; }
.eb-bc-sub { font-size: 1.4em; color: #a9b0bd; margin: 0; }
.eb-bc-corner {
  position: absolute; right: 4.6%; top: 7.5%; z-index: 4;
  font-size: 1em; letter-spacing: .18em; color: #788392;
}
.eb-bc-cap {
  position: absolute; left: 4.6%; bottom: 1.6%; z-index: 4;
  font-size: 1.08em; letter-spacing: .04em; color: #8d97a6;
}

/* left: the electerm bookmark tree */
.eb-bc-tree {
  --eb-bc-row-h: 2.9em;
  position: absolute; left: 4%; top: 33%; bottom: 7%; width: 31%;
  background: var(--eb-bc-dark); border: 1px solid var(--eb-bc-line);
  border-radius: .8em; overflow: hidden;
  box-shadow: 0 1.2em 3em rgba(0,0,0,.4);
}
.eb-bc-tabs {
  position: absolute; top: 0; left: 0; right: 0; height: 3.1em;
  background: #000; display: flex; align-items: center; padding: 0 .9em;
  border-bottom: 1px solid #23262c;
}
.eb-bc-tab {
  display: flex; align-items: center; height: 2.4em; padding: 0 .7em;
  background: #1c1e24; border-radius: .3em .3em 0 0;
  font-size: 1.05em; color: #d5d8de; white-space: nowrap;
}
.eb-bc-tab .eb-bc-mark { width: 1.3em; height: 1.3em; margin-right: .5em; }
.eb-bc-tab-add { margin-left: .8em; color: #8b9099; width: 1.1em; height: 1.1em; }
.eb-bc-tab-add svg, .eb-bc-caret svg { width: 100%; height: 100%; fill: currentColor; display: block; }
.eb-bc-edit {
  position: absolute; top: 3.9em; left: 1.1em; right: 1.1em; height: 2.9em;
  display: flex; align-items: center; padding: 0 .6em;
  background: #1c1e24; border: 1px solid #3a3e46; border-radius: .35em;
}
.eb-bc-edit .eb-bc-mark { width: 1.7em; height: 1.7em; }
.eb-bc-editlabel { margin-left: .7em; font-size: 1.05em; color: #e3e6eb; }
.eb-bc-editpencil { margin-left: auto; font-size: 1em; color: #7b818b; }
.eb-bc-rows { position: absolute; top: 7.6em; left: 0; right: 0; }
.eb-bc-row {
  height: var(--eb-bc-row-h); display: flex; align-items: center;
  padding: 0 .9em; font-size: 1.05em; color: var(--eb-bc-text);
  white-space: nowrap; border-radius: .25em;
}
.eb-bc-row.is-sel { background: #000; }
.eb-bc-row.is-group { font-weight: 700; color: #f0f1f4; }
.eb-bc-caret {
  width: .9em; height: .9em; margin-right: .3em; color: #a2a7b0; flex: none;
}
.eb-bc-caret.is-open { transform: rotate(0deg); }
.eb-bc-caret.is-closed { transform: rotate(-90deg); }
.eb-bc-indent { width: 1.2em; flex: none; }
.eb-bc-rowtext { overflow: hidden; text-overflow: ellipsis; }
.eb-bc-mark { position: relative; width: 1.6em; height: 1.6em; margin-right: .55em; flex: none; }
.eb-bc-sq, .eb-bc-gly { position: absolute; inset: 0; border-radius: .22em; }
.eb-bc-gly { border-radius: 0; }
.eb-bc-gly svg { width: 100%; height: 100%; display: block; }
.eb-bc-gly.is-morph { opacity: 0; }
.eb-bc-legend {
  position: absolute; bottom: 1em; left: 1.1em; right: 1.1em;
  font-size: .92em; color: #757c88; line-height: 1.5;
}

/* right: the antd appearance picker */
.eb-bc-pick {
  position: absolute; left: 39%; right: 4%; top: 33%; bottom: 7%;
  background: #fff; color: rgba(0,0,0,.88); border-radius: .8em;
  border: 1px solid #e5e7eb; box-shadow: 0 1.4em 3.4em rgba(0,0,0,.45);
  font-size: 1em;
}
.eb-bc-arrow {
  position: absolute; left: -.75em; top: 5.2em; width: 1.5em; height: 1.5em;
  background: #fff; transform: rotate(45deg); border-left: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}
.eb-bc-ptabs {
  position: absolute; top: 1.1em; left: 1.6em; right: 1.6em; height: 2.7em;
  display: flex; align-items: flex-start; gap: 1.8em;
  border-bottom: 1px solid #eee;
}
.eb-bc-ptab {
  position: relative; font-size: 1.2em; line-height: 2.1em; height: 2.2em;
  color: #666; cursor: default;
}
.eb-bc-ptab.is-active { color: #1677ff; font-weight: 600; }
.eb-bc-ptab.is-active::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: -.05em;
  height: .14em; background: #1677ff; border-radius: .1em;
}
.eb-bc-panels { position: absolute; top: 4.5em; left: 1.6em; right: 1.6em; bottom: 1.3em; }
.eb-bc-panel { position: absolute; inset: 0; }
.eb-bc-panel-color { z-index: 2; background: #fff; }
.eb-bc-panel-icon { z-index: 1; display: flex; flex-direction: column; justify-content: space-between; gap: .5em; }
.eb-bc-swatches { display: flex; gap: .7em; flex-wrap: wrap; margin-top: .5em; }
.eb-bc-swatch { width: 2.5em; height: 2.5em; border-radius: .35em; border: 1px solid #e5e7eb; }
.eb-bc-colorhint { margin-top: 1.2em; font-size: 1.1em; color: #8a8f98; }
.eb-bc-search {
  height: 2.8em; flex: none; display: flex; align-items: center; gap: .5em;
  padding: 0 .7em; border: 1px solid #d9d9d9; border-radius: .35em;
  background: #fff; font-size: 1.1em; color: #333;
}
.eb-bc-search.is-focused { border-color: #1677ff; box-shadow: 0 0 0 .15em rgba(22,119,255,.12); }
.eb-bc-searchicon { width: 1.1em; height: 1.1em; color: #a6acb5; flex: none; }
.eb-bc-searchicon svg { width: 100%; height: 100%; fill: currentColor; display: block; }
.eb-bc-typed { white-space: pre; }
.eb-bc-caret2 { width: .09em; height: 1.2em; background: #1677ff; }
.eb-bc-grid {
  display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: .5em; justify-items: center; align-content: start; flex: none;
}
.eb-bc-tile {
  /* A <button> does not inherit font-size: without this its 4.1em is
     Chrome's 13.3px UA default rather than 1% of the banner width, and the
     grid stops scaling down for the card variant. */
  font-size: 1em;
  width: 4.1em; height: 4.1em; padding: .7em; border: 1px solid #e9ebef;
  border-radius: .4em; background: #fafbfc; position: relative;
  display: flex; align-items: center; justify-content: center;
  color: inherit; line-height: 1;
}
.eb-bc-tile svg { width: 100%; height: 100%; display: block; }
.eb-bc-tile.is-picked { border-color: #1677ff; background: #eef5ff; box-shadow: 0 0 0 .18em rgba(22,119,255,.18); }
.eb-bc-count { flex: none; font-size: 1.05em; color: #a6acb5; }
.eb-bc-actions { display: flex; gap: .7em; flex: none; }
.eb-bc-btn {
  font-size: 1.05em; height: 2.5em; padding: 0 .9em; border-radius: .3em;
  border: 1px solid #d9d9d9; background: #fff; color: #333;
  display: flex; align-items: center; gap: .4em;
}
.eb-bc-btn svg { width: 1.1em; height: 1.1em; fill: currentColor; }
.eb-bc-btn.is-primary { background: #1677ff; border-color: #1677ff; color: #fff; }
.eb-bc-url { display: flex; gap: .6em; flex: none; }
.eb-bc-urlinput {
  flex: 1; min-width: 0; height: 2.5em; display: flex; align-items: center;
  padding: 0 .7em; border: 1px solid #d9d9d9; border-radius: .3em;
  font-size: 1.02em; color: #9aa0a8; overflow: hidden; white-space: nowrap;
}
.eb-bc-value {
  flex: none; height: 2.3em;
  display: flex; align-items: center; gap: .8em;
  border-top: 1px dashed #e5e7eb; font-size: 1.05em; color: #7a808a;
}
.eb-bc-value b { color: #1677ff; font-weight: 600; }

/* cursor, click ripple */
.eb-bc-pointer {
  position: absolute; width: 1.9em; height: 2.6em; z-index: 8;
  pointer-events: none; opacity: 0;
}
.eb-bc-pointer svg { width: 100%; height: 100%; display: block; }
.eb-bc-rip {
  position: absolute; width: 1.6em; height: 1.6em; border-radius: 50%;
  border: .16em solid rgba(22,119,255,.75); z-index: 7;
  pointer-events: none; opacity: 0; transform: translate(-50%,-50%) scale(0);
}

/* card variant: no headline, panels take the full height, rows breathe */
.eb-bc[data-variant='card'] .eb-bc-head,
.eb-bc[data-variant='card'] .eb-bc-corner,
.eb-bc[data-variant='card'] .eb-bc-cap { display: none; }
.eb-bc[data-variant='card'] .eb-bc-tree,
.eb-bc[data-variant='card'] .eb-bc-pick { top: 6%; bottom: 6%; }
.eb-bc[data-variant='card'] .eb-bc-tree { --eb-bc-row-h: 4.1em; }
`

function injectStyle (doc) {
  if (doc.getElementById(STYLE_ID)) return
  const style = doc.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  doc.head.appendChild(style)
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

function markup (variant, i) {
  const head = variant === 'card'
    ? ''
    : `<div class="eb-bc-head">
        <div class="eb-bc-brand">electerm</div>
        <h2 class="eb-bc-h1">${i.h1}</h2>
        <p class="eb-bc-sub">${i.sub}</p>
      </div>
      <div class="eb-bc-corner">${i.corner}</div>`
  const rows = ROWS.map(r => {
    const caret = r.group
      ? `<span class="eb-bc-caret ${r.open ? 'is-open' : 'is-closed'}">${antdIcon(CARET_PATH)}</span>`
      : ''
    const indent = r.indent ? '<span class="eb-bc-indent"></span>' : ''
    const opts = r.morph
      ? { color: r.color, glyph: 'ubuntu', morph: true }
      : { color: r.color, glyph: r.glyph }
    return `<div class="eb-bc-row${r.selected ? ' is-sel' : ''}${r.group ? ' is-group' : ''}">${indent}${caret}${mark(opts)}<span class="eb-bc-rowtext">${r.text}</span></div>`
  }).join('')
  const tiles = TILES.map(t =>
    `<button type="button" class="eb-bc-tile" data-name="${t.name}" data-keys="${t.keys}" title="${t.label}">${svg(t.name)}</button>`
  ).join('')
  const swatches = ['#06d6a0', '#08c', '#7c3aed', '#ef476f', '#f0a020', '#1677ff', '#00b894', '#e55934']
    .map(c => `<span class="eb-bc-swatch" style="background:${c}"></span>`).join('')

  return `
    <div class="eb-bc-deco">
      <span class="eb-bc-blob eb-bc-blob-a"></span>
      <span class="eb-bc-blob eb-bc-blob-b"></span>
      <span class="eb-bc-dots"></span>
    </div>
    <div class="eb-bc-scene">
      ${head}
      <div class="eb-bc-tree">
        <div class="eb-bc-tabs">
          <span class="eb-bc-tab">${mark({ color: '#06d6a0', glyph: 'ubuntu', morph: true })}deploy@10.0.4.21:22</span>
          <span class="eb-bc-tab-add">${antdIcon(PLUS_PATH)}</span>
        </div>
        <div class="eb-bc-edit">
          ${mark({ color: '#06d6a0', glyph: 'ubuntu', morph: true })}
          <span class="eb-bc-editlabel">prod-web</span>
          <span class="eb-bc-editpencil">✎</span>
        </div>
        <div class="eb-bc-rows">${rows}</div>
        <div class="eb-bc-legend">${i.legend}</div>
      </div>
      <div class="eb-bc-pick">
        <span class="eb-bc-arrow"></span>
        <div class="eb-bc-ptabs">
          <span class="eb-bc-ptab is-active" data-tab="color">${i.color}</span>
          <span class="eb-bc-ptab" data-tab="icon">${i.icon}</span>
        </div>
        <div class="eb-bc-panels">
          <div class="eb-bc-panel eb-bc-panel-color">
            <div class="eb-bc-swatches">${swatches}</div>
            <div class="eb-bc-colorhint">${i.reset} · ${i.color}</div>
          </div>
          <div class="eb-bc-panel eb-bc-panel-icon">
            <div class="eb-bc-search">
              <span class="eb-bc-searchicon">${antdIcon('M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z')}</span>
              <span class="eb-bc-typed"></span>
              <span class="eb-bc-caret2"></span>
            </div>
            <div class="eb-bc-grid">${tiles}</div>
            <div class="eb-bc-count"></div>
            <div class="eb-bc-actions">
              <span class="eb-bc-btn">${i.choose}</span>
              <span class="eb-bc-btn">${i.reset}</span>
            </div>
            <div class="eb-bc-url">
              <span class="eb-bc-urlinput">${i.url}</span>
              <span class="eb-bc-btn is-primary">${i.download}</span>
            </div>
            <div class="eb-bc-value">${i.field} <b data-value>${i.empty}</b></div>
          </div>
        </div>
      </div>
      <div class="eb-bc-cap"></div>
    </div>
    <div class="eb-bc-rip"></div>
    <div class="eb-bc-pointer"><svg viewBox="-3 -3 29 39"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></div>`
}

function mount (host, doc) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const zh = /^zh/i.test(doc.documentElement.lang || '')
  const i = zh ? I18N.cn : I18N.en
  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = doc.createElement('div')
  root.className = 'eb-bc'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm bookmark icon picker: choosing Ubuntu replaces the colour square on the bookmark, the appearance button and the tab title')
  root.innerHTML = markup(variant, i)
  host.appendChild(root)

  const q = (s) => root.querySelector(s)
  const qa = (s) => Array.from(root.querySelectorAll(s))
  const el = {
    scene: q('.eb-bc-scene'),
    cap: q('.eb-bc-cap'),
    pick: q('.eb-bc-pick'),
    tabColor: q('[data-tab="color"]'),
    tabIcon: q('[data-tab="icon"]'),
    panelColor: q('.eb-bc-panel-color'),
    search: q('.eb-bc-search'),
    typed: q('.eb-bc-typed'),
    caret: q('.eb-bc-caret2'),
    tiles: qa('.eb-bc-tile'),
    grid: q('.eb-bc-grid'),
    count: q('.eb-bc-count'),
    value: q('[data-value]'),
    squares: qa('.eb-bc-sq.is-morph'),
    glyphs: qa('.eb-bc-gly.is-morph'),
    trigger: q('.eb-bc-trigger, .eb-bc-edit .eb-bc-mark'),
    ubuntuTile: q('[data-name="ubuntu"]'),
    pointer: q('.eb-bc-pointer'),
    rip: q('.eb-bc-rip')
  }

  // Geometry is read off the rendered DOM, so the cursor lands on the real
  // button and the real tile in both the hero and the narrower card layout.
  const geom = {
    trigger: { x: 6, y: 24 },
    ubuntu: { x: 46, y: 28 }
  }
  const measure = () => {
    const rr = root.getBoundingClientRect()
    const scale = rr.width / 100
    if (!scale) return
    const centre = (node) => {
      if (!node) return null
      const r = node.getBoundingClientRect()
      if (!r.width) return null
      return {
        x: (r.left + r.width / 2 - rr.left) / scale,
        y: (r.top + r.height / 2 - rr.top) / scale
      }
    }
    const a = centre(el.trigger)
    const b = centre(el.ubuntuTile)
    if (a) geom.trigger = a
    if (b) geom.ubuntu = b
  }
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
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(measure)
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    // Fade in at t=0 too: the timeline loops, so a scene that ends blank
    // must not snap back to full on the first frame of the next pass.
    const appear = easeInOut(seg(t, 0, 460))
    el.scene.style.opacity = (appear * (1 - gone)).toFixed(3)

    // the appearance button is clicked, then the picker opens over the form.
    // It stays open for the settled beat so the right half of the banner is
    // never empty while the icon is being applied on the left.
    const shown = easeOutBack(seg(t, T.pickFrom, T.pickTo))
    el.pick.style.opacity = shown.toFixed(3)
    el.pick.style.transform = 'scale(' + (0.92 + 0.08 * clamp(shown, 0, 1)).toFixed(3) + ')'
    el.pick.style.pointerEvents = t >= T.click1 && shown > 0.1 ? 'auto' : 'none'

    // two tabs: colour first, then icon. Both panels stay laid out so the tile
    // geometry is measurable from the very first frame.
    const onIcon = t >= T.tabAt
    el.tabColor.classList.toggle('is-active', !onIcon)
    el.tabIcon.classList.toggle('is-active', onIcon)
    el.panelColor.style.opacity = (1 - seg(t, T.tabAt, T.tabAt + 280)).toFixed(3)
    el.panelColor.style.pointerEvents = onIcon ? 'none' : 'auto'

    // search text is typed one letter at a time; non-matching tiles are
    // removed from the grid rather than dimmed, exactly like a real filter.
    const typed = Math.round(easeOut(seg(t, T.typeFrom, T.typeTo)) * SEARCH.length)
    const kw = SEARCH.slice(0, typed)
    el.typed.textContent = kw
    el.caret.style.opacity = (kw && typed < SEARCH.length ? 1 : 0).toFixed(3)
    el.search.classList.toggle('is-focused', typed > 0)
    let visible = 0
    for (const tile of el.tiles) {
      const keys = tile.getAttribute('data-keys') || ''
      const show = !kw || keys.includes(kw)
      tile.style.display = show ? '' : 'none'
      if (show) visible++
    }
    el.count.textContent = kw
      ? (zh ? `${visible} / 95 个结果` : `${visible} of 95`)
      : i.icons
    el.ubuntuTile.classList.toggle('is-picked', t >= T.click2)
    el.value.textContent = t >= T.click2 ? 'icon:ubuntu' : i.empty

    // the icon takes over from the colour square on three marks at once
    const ap = easeOut(seg(t, T.applyFrom, T.applyTo))
    for (const sq of el.squares) sq.style.opacity = (1 - ap).toFixed(3)
    for (const gly of el.glyphs) gly.style.opacity = ap.toFixed(3)

    // cursor: in from the right to the appearance button, then to the tile
    const p1 = easeInOut(seg(t, T.ptrFrom, T.ptrTo))
    const p2 = easeInOut(seg(t, T.ptr2From, T.ptr2To))
    let px = 78 + (geom.trigger.x - 78) * p1
    let py = 42 + (geom.trigger.y - 42) * p1
    if (t >= T.ptr2From) {
      px = geom.trigger.x + (geom.ubuntu.x - geom.trigger.x) * p2
      py = geom.trigger.y + (geom.ubuntu.y - geom.trigger.y) * p2
    }
    el.pointer.style.left = px.toFixed(2) + 'em'
    el.pointer.style.top = py.toFixed(2) + 'em'
    el.pointer.style.opacity = (seg(t, 260, 560) * (1 - seg(t, 3800, 4200)) * (1 - gone)).toFixed(3)

    // one ripple, re-targeted at the second click
    let ripFrom = T.click1
    let rx = geom.trigger.x
    let ry = geom.trigger.y
    if (t >= T.click2) {
      ripFrom = T.click2
      rx = geom.ubuntu.x
      ry = geom.ubuntu.y
    }
    const rp = seg(t, ripFrom, ripFrom + 460)
    el.rip.style.left = rx.toFixed(2) + 'em'
    el.rip.style.top = ry.toFixed(2) + 'em'
    el.rip.style.opacity = (rp > 0 && rp < 1 ? (1 - rp) * 0.8 * (1 - gone) : 0).toFixed(3)
    el.rip.style.transform = 'translate(-50%,-50%) scale(' +
      (rp > 0 && rp < 1 ? (0.4 + rp * 2.6).toFixed(3) : '0') + ')'

    el.cap.textContent = t < T.pickFrom
      ? i.cap0
      : (t < T.applyFrom ? i.cap1 : i.cap2)
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
    // one settled frame that shows the point: icons applied AND the picker
    // still open with Ubuntu selected
    frame(T.applyTo + 200)
    el.pick.style.opacity = '1'
    el.pick.style.transform = 'scale(1)'
    el.pointer.style.opacity = '0'
    el.panelColor.style.opacity = '0'
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
  injectStyle(doc)
  const self = selfPath()
  const hosts = doc.querySelectorAll('[data-eb-banner]')
  for (const host of hosts) {
    // The blog index loads every post's banner module, so a mount has to be
    // the one this module was loaded for. A host with no data-eb-banner-src
    // (a test harness) is fair game for any module.
    const src = host.getAttribute('data-eb-banner-src')
    if (src && self && src !== self) continue
    mount(host, doc)
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initBanners())
  } else {
    initBanners()
  }
}
