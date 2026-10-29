/**
 * Animated banner for the "bookmark multi-select" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the settings dialog, the bookmark tree, the toolbar, the
 * selection checklist, the exported JSON card and the cartoon pointer are all
 * plain DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * The dialog is modelled on the real electerm bookmarks tab. Colours and
 * metrics come from the app itself:
 *   ui theme ............... src/client/common/theme-defaults.js
 *                            (defaultThemeDark: main #121214, main-light #2E3338,
 *                            main-darker #0e0d0e, text #ddd, text-dark #888,
 *                            text-disabled #777, primary #08c, success #06D6A0,
 *                            warn #E55934, error #EF476F) over
 *                            src/client/css/includes/theme.styl
 *   tab bar ................ setting-panel/setting-modal.jsx `items` — the seven
 *                            tabs are Bookmarks / Setting / UI Themes / Quick
 *                            commands / Triggers / Profiles / Widgets, and the
 *                            bookmarks tab is the one carrying the toolbar
 *   left icon rail ......... src/client/components/sidebar/sidebar.styl
 *   tree column ............ step screen of the settings dialog: 388px wide at a
 *                            1280px window, rows 23px apart, 14px text, 16px
 *                            checkboxes, 24px indent per level (tree-list.styl:
 *                            line-height 26px, category title bold 14px)
 *   toolbar ................ tree-list/bookmark-toolbar.jsx — new bookmark, new
 *                            category, edit, export, import, ssh configs, menu
 *   edit mode .............. bookmark-form/tree-select.jsx — search input, then
 *                            the button row, then the checkbox tree
 *   button labels .......... locales: delSelected "delete selected", export
 *                            "export", cancel "cancel" (capitalised by
 *                            translate()); the count is the ticked-key count and
 *                            the bookmark count respectively
 *   row titles ............. common/create-title.jsx: a colour dot, then
 *                            "title - user@host:port"
 *   exported file .......... bookmark-form/tree-select.jsx handleExport(): a bare
 *                            JSON array of the selected bookmark objects, named
 *                            bookmarks-YYYY-MM-DD-HH-mm-ss.json, handed to
 *                            common/download.jsx which picks a folder and then
 *                            shows the notification (path + reveal + the
 *                            "plain text, may contain passwords" warning)
 *   icons .................. @ant-design/icons path data, verbatim
 *
 * The story, in four beats:
 *   1. the bookmarks tab is open, the tree is the ordinary tree, and the
 *      pointer lands on the pencil in the toolbar;
 *   2. the tree turns into a checklist — search stays, the toolbar is replaced
 *      by "delete selected (0) / export (0) / cancel" — and the pointer ticks
 *      two bookmarks in two different categories, so both counters read (2);
 *   3. the pointer clicks "export (2)": the JSON card slides in over the form
 *      column, showing what actually lands on disk (a bare array, not the
 *      backup object), and the app's own save notification appears;
 *   4. the selection is still ticked and the dialog is still in edit mode, so
 *      export-then-delete reads as one pass.
 *
 * Two deliberate liberties: the text is rendered well above life size (a 14px
 * label against a 1280px window would be illegible at banner scale), and the
 * form column keeps five fields instead of the full Auth/Settings/tunnels set.
 * The strings, colours, counts and file shape are the app's own.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + dialog (blog post page)
 *   data-eb-banner="card"  -> dialog only         (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for that
 * post) — otherwise the first script to run would claim every card.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at 1%
 * of the banner width, so a single design scales to any container. Elements
 * that carry their own font-size (the list, the JSON card, the notification)
 * are the only places where an em is not a root em; their geometry is written
 * in that element's own unit on purpose.
 */

const STYLE_ID = 'eb-bs-style'

// One full pass of the story, in ms.
const PERIOD = 12800

const T = {
  winFrom: 240, // the dialog rises into place
  winTo: 780,
  toolFrom: 860, // the toolbar icons land
  toolGap: 70,
  toolDur: 300,
  rowFrom: 1120, // the tree fills in
  rowGap: 85,
  rowDur: 320,
  ptr1From: 2040, // pointer travels to the pencil
  ptr1To: 2500,
  editClick: 2560,
  swapFrom: 2600, // tree -> checklist
  swapTo: 3040,
  headFrom: 2820, // search + the three buttons
  headTo: 3260,
  pickRowFrom: 2980,
  pickRowGap: 80,
  pickRowDur: 300,
  ptr2From: 3600,
  ptr2To: 3960,
  check1: 4040, // first bookmark ticked
  ptr3From: 4260,
  ptr3To: 4620,
  check2: 4680, // second bookmark ticked
  ptr4From: 4960,
  ptr4To: 5380,
  expClick: 5460, // export
  fileFrom: 5580,
  fileTo: 6180,
  jsonFrom: 5880,
  jsonGap: 105,
  noteFrom: 6560,
  noteTo: 6960,
  ptrFadeFrom: 11400,
  ptrFadeTo: 11800,
  cardOutFrom: 11760,
  cardOutTo: 12300,
  fadeFrom: 12100,
  fadeTo: 12600
}

// The tree the picker shows: two categories with bookmarks, one of them the
// default category every install has.
const ROWS = [
  { id: 'default', title: 'default', depth: 0, group: true, open: true, color: '#08c' },
  { id: 'prod', title: 'prod', depth: 0, group: true, open: true, color: '#7c3aed' },
  { id: 'p1', title: 'prod-web - deploy@10.0.4.21:22', depth: 1, color: '#06d6a0' },
  { id: 'p2', title: 'prod-api - deploy@10.0.4.22:22', depth: 1, color: '#06d6a0' },
  { id: 'db', title: 'db', depth: 0, group: true, open: true, color: '#e55934' },
  { id: 'd1', title: 'db-primary - deploy@10.0.4.8:22', depth: 1, color: '#e55934' }
]

// The file the app writes: JSON.stringify(array, null, 2) of the selected
// bookmark objects, i.e. a bare array — no bookmarkGroups wrapper.
const EXPORTED = [
  { id: 'p1', title: 'prod-web', host: '10.0.4.21', port: 22, username: 'deploy' },
  { id: 'd1', title: 'db-primary', host: '10.0.4.8', port: 22, username: 'deploy' }
]

// Flattened the way JSON.stringify(array, null, 2) prints it, one entry per
// rendered DOM line so the card can land line by line.
const EXPORT_LINES = (() => {
  const lines = ['[']
  EXPORTED.forEach((item, index) => {
    lines.push('  {')
    const keys = Object.keys(item)
    keys.forEach((key, keyIndex) => {
      const comma = keyIndex < keys.length - 1 ? ',' : ''
      lines.push({
        key: '"' + key + '":',
        value: JSON.stringify(item[key]) + comma
      })
    })
    lines.push(index < EXPORTED.length - 1 ? '  },' : '  }')
  })
  lines.push(']')
  return lines
})()

const TABS = [
  'Bookmarks',
  'Setting',
  'UI Themes',
  'Quick commands',
  'Triggers',
  'Profiles',
  'Widgets'
]

const PILLS = ['Ssh/Sftp', 'Telnet', 'Serial', 'Local', 'Vnc', 'Rdp', 'Ftp', 'Web', 'Spice']
const SECTIONS = ['Auth', 'Settings', 'Quick commands', 'Triggers', 'Ssh tunnel', 'Connection hopping']
const FIELDS = [
  ['Category', 'default'],
  ['Title', ''],
  ['Host', 'hostname or ip'],
  ['Username', ''],
  ['Password', 'Password']
]

// antd icon path data (viewBox 64 64 896 896), the same glyphs the app renders
// through @ant-design/icons.
const EDIT_PATH = 'M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9zm67.4-174.4L687.8 215l73.3 73.3-362.7 362.6-88.9 15.7 15.6-89zM880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z'
const DOWNLOAD_PATH = 'M505.7 661a8 8 0 0012.6 0l112-141.7c4.1-5.2.4-12.9-6.3-12.9h-74.1V168c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v338.3H400c-6.7 0-10.4 7.7-6.3 12.9l112 141.8zM878 626h-60c-4.4 0-8 3.6-8 8v154H214V634c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v198c0 17.7 14.3 32 32 32h684c17.7 0 32-14.3 32-32V634c0-4.4-3.6-8-8-8z'
const IMPORT_PATH = 'M880 912H144c-17.7 0-32-14.3-32-32V144c0-17.7 14.3-32 32-32h360c4.4 0 8 3.6 8 8v56c0 4.4-3.6 8-8 8H184v656h656V520c0-4.4 3.6-8 8-8h56c4.4 0 8 3.6 8 8v360c0 17.7-14.3 32-32 32zM653.3 424.6l52.2 52.2a8.01 8.01 0 01-4.7 13.6l-179.4 21c-5.1.6-9.5-3.7-8.9-8.9l21-179.4c.8-6.6 8.9-9.4 13.6-4.7l52.4 52.4 256.2-256.2c3.1-3.1 8.2-3.1 11.3 0l42.4 42.4c3.1 3.1 3.1 8.2 0 11.3L653.3 424.6z'
const CODE_PATH = 'M516 673c0 4.4 3.4 8 7.5 8h185c4.1 0 7.5-3.6 7.5-8v-48c0-4.4-3.4-8-7.5-8h-185c-4.1 0-7.5 3.6-7.5 8v48zm-194.9 6.1l192-161c3.8-3.2 3.8-9.1 0-12.3l-192-160.9A7.95 7.95 0 00308 351v62.7c0 2.4 1 4.6 2.9 6.1L420.7 512l-109.8 92.2a8.1 8.1 0 00-2.9 6.1V673c0 6.8 7.9 10.5 13.1 6.1zM880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-40 728H184V184h656v656z'
const MENU_PATH = 'M904 160H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0 624H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0-312H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8z'
const BOOK_PATH = 'M832 64H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zm-260 72h96v209.9L621.5 312 572 347.4V136zm220 752H232V136h280v296.9c0 3.3 1 6.6 3 9.3a15.9 15.9 0 0022.3 3.7l83.8-59.9 81.4 59.4c2.7 2 6 3.1 9.4 3.1 8.8 0 16-7.2 16-16V136h64v752z'
const FOLDER_PATH = 'M880 298.4H521L403.7 186.2a8.15 8.15 0 00-5.5-2.2H144c-17.7 0-32 14.3-32 32v592c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V330.4c0-17.7-14.3-32-32-32zM840 768H184V256h188.5l119.6 114.4H840V768z'
const SEARCH_PATH = 'M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z'
const CLOSE_PATH = 'M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z'
const CHECKCIRCLE_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

const icon = (path, cls = '') =>
  `<svg class="${cls}" viewBox="64 64 896 896" aria-hidden="true"><path d="${path}"/></svg>`

const CSS = `
.eb-bs {
  /* real electerm ui theme: theme-defaults.js defaultThemeDark over
     src/client/css/includes/theme.styl */
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-main-light: #2e3338;
  --eb-main-darker: #0e0d0e;
  --eb-text: #ddd;
  --eb-text-light: #fff;
  --eb-text-dark: #888;
  --eb-text-disabled: #777;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-error: #ef476f;
  --eb-warn: #e55934;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e8f1ff 0%, #f2ecff 52%, #fdeef5 100%);
  color: var(--color-text, #16233a);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}

/* ---------- background decoration ---------- */
.eb-bs-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-bs-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(8, 136, 204, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-bs-drift 34s linear infinite;
}
@keyframes eb-bs-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-bs-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-bs-blob-a { width: 30em; height: 30em; right: -9em; top: -13em; }
.eb-bs-blob-b { width: 26em; height: 26em; left: -10em; bottom: -12em; }
.eb-bs-sparkle {
  position: absolute;
  width: 1.6em;
  height: 1.6em;
  background: #06d6a0;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-bs-twinkle 3.8s ease-in-out infinite;
}
.eb-bs-sparkle-a { right: 6.4em; top: 4.2em; }
.eb-bs-sparkle-b { right: 13.6em; top: 11.8em; width: 1em; height: 1em; background: #7c3aed; animation-delay: 0.8s; }
.eb-bs-sparkle-c { left: 4.2em; bottom: 8.4em; width: 1.2em; height: 1.2em; background: #ec4899; animation-delay: 1.6s; }
@keyframes eb-bs-twinkle {
  0%, 100% { transform: scale(0.7) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.15) rotate(35deg); opacity: 1; }
}

/* ---------- headline ---------- */
.eb-bs-head { position: absolute; left: 5em; right: 5em; top: 2.8em; pointer-events: none; }
.eb-bs-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.35em;
  font-weight: 800;
  color: var(--eb-primary);
}
.eb-bs-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: var(--eb-primary);
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-bs-h1 {
  margin: 0.24em 0 0;
  font-size: 3.15em;
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.022em;
  color: #0f172a;
}
.eb-bs-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #0888cc, #7c3aed 55%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-bs-sub {
  margin: 0.42em 0 0;
  max-width: 62em;
  font-size: 1.42em;
  line-height: 1.38;
  color: #475569;
}

/* ---------- the settings dialog ----------
   Sized in root em; only the list, the file card and the notification carry a
   font-size of their own, and their geometry is written in that unit. */
.eb-bs-frame {
  position: absolute;
  left: 50%;
  bottom: 2.2em;
  width: 94em;
  height: 38em;
  transform: translateX(-50%);
}
.eb-bs-modal {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--eb-main-dark);
  border-radius: 0.75em;
  border: 1px solid #26262c;
  box-shadow: 0 1.2em 2.6em rgba(9, 20, 40, 0.42), 0 0 2.2em rgba(8, 136, 204, 0.16);
  overflow: hidden;
  text-align: left;
  animation: eb-bs-glow 5s ease-in-out infinite;
}
@keyframes eb-bs-glow {
  0%, 100% { box-shadow: 0 1.2em 2.6em rgba(9, 20, 40, 0.42), 0 0 2em rgba(8, 136, 204, 0.14); }
  50% { box-shadow: 0 1.2em 2.6em rgba(9, 20, 40, 0.44), 0 0 3.2em rgba(124, 58, 237, 0.3); }
}

/* icon rail, like the app's left activity bar */
.eb-bs-rail {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5em;
  width: 4.3em;
  padding: 0.7em 0;
  background: var(--eb-main-dark);
  border-right: 1px solid #141416;
  color: var(--eb-text-dark);
}
.eb-bs-rail svg { width: 1.15em; height: 1.15em; fill: currentColor; }
.eb-bs-rail-logo { color: #fff; font-size: 1.5em; font-weight: 800; line-height: 1; }
.eb-bs-rail-item.is-active { color: var(--eb-primary); }

.eb-bs-body { flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--eb-main); }

/* tab bar: seven settings tabs, bookmarks active */
.eb-bs-tabs {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.3em;
  height: 3.3em;
  padding: 0 0.7em;
  border-bottom: 1px solid var(--eb-main-darker);
  font-size: 1.08em;
  white-space: nowrap;
}
.eb-bs-tab {
  display: inline-flex;
  align-items: center;
  height: 2.1em;
  padding: 0 0.85em;
  border-radius: 0.25em;
  color: var(--eb-text-dark);
}
.eb-bs-tab.is-active {
  background: rgba(8, 136, 204, 0.2);
  box-shadow: inset 0 0 0 1px rgba(8, 136, 204, 0.5);
  color: var(--eb-primary);
}
.eb-bs-tab sup { margin-left: 0.25em; font-size: 0.62em; color: var(--eb-text-disabled); }
.eb-bs-tabs-close { margin-left: auto; color: var(--eb-text-dark); }
.eb-bs-tabs-close svg { width: 1em; height: 1em; fill: currentColor; }

.eb-bs-content { flex: 1; min-height: 0; display: flex; }

/* ---------- tree column ---------- */
.eb-bs-col {
  position: relative;
  flex: none;
  width: 36em;
  padding: 1.1em 1em;
  border-right: 1px solid var(--eb-main-darker);
  overflow: hidden;
}
/* the list unit: 1em here is 1.5 root em, so every number below is a list em */
.eb-bs-layer {
  position: absolute;
  left: 1em;
  right: 1em;
  top: 1.1em;
  font-size: 1.5em;
}
.eb-bs-layer-out { opacity: 0; }

/* toolbar (browse state) */
.eb-bs-tools { display: flex; align-items: center; gap: 0.3em; margin-bottom: 0.62em; }
.eb-bs-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9em;
  height: 1.9em;
  border-radius: 0.2em;
  border: 1px solid var(--eb-main-light);
  color: var(--eb-text);
  position: relative;
}
.eb-bs-tool svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-bs-tool.is-hover { border-color: var(--eb-primary); color: var(--eb-primary); }
.eb-bs-tool-menu { margin-left: auto; border: 0; color: var(--eb-text-dark); }

/* search row, shared by both states */
.eb-bs-search {
  display: flex;
  align-items: center;
  gap: 0.4em;
  height: 1.9em;
  padding: 0 0.55em;
  border: 1px solid var(--eb-main-light);
  border-radius: 0.2em;
  color: var(--eb-text-disabled);
  font-size: 0.95em;
}
.eb-bs-search svg { width: 0.95em; height: 0.95em; fill: var(--eb-text-dark); margin-left: auto; }

/* the three buttons of the edit mode */
.eb-bs-btns { display: flex; align-items: stretch; margin: 0.62em 0 0.72em; }
.eb-bs-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2em;
  padding: 0 0.62em;
  border: 1px solid var(--eb-main-light);
  color: var(--eb-text);
  white-space: nowrap;
}
.eb-bs-btn + .eb-bs-btn { border-left: 0; }
.eb-bs-btn:first-child { border-radius: 0.2em 0 0 0.2em; }
.eb-bs-btn:last-child { border-radius: 0 0.2em 0.2em 0; }
.eb-bs-btn.is-primary {
  background: var(--eb-primary);
  border-color: var(--eb-primary);
  color: #fff;
}
.eb-bs-btn.is-primary.is-off {
  background: rgba(8, 136, 204, 0.42);
  border-color: rgba(8, 136, 204, 0.42);
  color: rgba(255, 255, 255, 0.62);
}
.eb-bs-btn.is-off { color: var(--eb-text-disabled); }
.eb-bs-btn.is-pressed { background: var(--eb-main-light); }
.eb-bs-btn.is-pressed.is-primary { background: #0699d8; }

/* rows, both states */
.eb-bs-row {
  display: flex;
  align-items: center;
  gap: 0.42em;
  height: 2.35em;
  padding-right: 0.3em;
  border-radius: 0.18em;
  color: var(--eb-text);
  white-space: nowrap;
}
.eb-bs-row.is-group { font-weight: 600; }
.eb-bs-row.is-lit { background: rgba(8, 136, 204, 0.14); }
.eb-bs-caret {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.8em;
  color: var(--eb-text-dark);
}
.eb-bs-caret svg { width: 0.62em; height: 0.62em; fill: currentColor; }
.eb-bs-caret.is-closed svg { transform: rotate(-90deg); }
.eb-bs-check {
  flex: none;
  position: relative;
  width: 1.12em;
  height: 1.12em;
  border-radius: 0.17em;
  border: 1px solid #5d5d66;
  background: transparent;
}
.eb-bs-check::after {
  content: '';
  position: absolute;
  left: 0.3em;
  top: 0.09em;
  width: 0.32em;
  height: 0.6em;
  border: solid #fff;
  border-width: 0 0.12em 0.12em 0;
  transform: rotate(42deg);
  opacity: 0;
}
.eb-bs-check.is-on {
  background: var(--eb-primary);
  border-color: var(--eb-primary);
}
.eb-bs-check.is-on::after { opacity: 1; }
.eb-bs-dot {
  flex: none;
  width: 0.5em;
  height: 0.5em;
  border-radius: 50%;
}
.eb-bs-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }

/* ---------- form column ---------- */
.eb-bs-form {
  flex: 1;
  min-width: 0;
  padding: 1.1em 1.2em;
  overflow: hidden;
}
.eb-bs-pills { display: flex; align-items: center; gap: 0.32em; font-size: 0.92em; color: var(--eb-text-dark); }
.eb-bs-pill { padding: 0.1em 0.35em; border-radius: 0.18em; }
.eb-bs-pill.is-active { background: var(--eb-primary); color: #fff; }
.eb-bs-sections {
  display: flex;
  gap: 1.1em;
  margin: 0.9em 0 1em;
  padding-bottom: 0.45em;
  border-bottom: 1px solid var(--eb-main-light);
  font-size: 0.95em;
  color: var(--eb-text-dark);
}
.eb-bs-section.is-active { color: var(--eb-primary); }
.eb-bs-field { display: flex; align-items: center; gap: 0.7em; margin-bottom: 0.72em; font-size: 0.95em; }
.eb-bs-label { width: 7.4em; text-align: right; color: var(--eb-text); }
.eb-bs-input {
  flex: 1;
  min-width: 0;
  height: 2em;
  padding: 0 0.6em;
  border-radius: 0.2em;
  border: 1px solid var(--eb-main-light);
  color: var(--eb-text-disabled);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.eb-bs-input.is-blank { color: var(--eb-text-disabled); }

/* ---------- exported file card ----------
   font-size is the card's own unit: 1.25 root em per em below */
.eb-bs-file {
  position: absolute;
  right: 1.5em;
  top: 3.4em;
  width: 41em;
  padding: 0.62em 0.7em 0.5em;
  border-radius: 0.35em;
  background: var(--eb-main);
  border: 1px solid var(--eb-main-light);
  box-shadow: 0 0.7em 1.7em rgba(0, 0, 0, 0.45);
  color: var(--eb-text);
  font-size: 1.25em;
  opacity: 0;
  z-index: 4;
}
.eb-bs-file-head {
  display: flex;
  align-items: center;
  gap: 0.34em;
  margin-bottom: 0.32em;
  color: var(--eb-text-light);
  font-weight: 600;
}
.eb-bs-file-head svg { width: 1em; height: 1em; fill: var(--eb-primary); }
.eb-bs-code {
  margin: 0;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  font-size: 0.82em;
  line-height: 1.5;
  color: #c8c8d0;
  white-space: pre;
  overflow: hidden;
}
.eb-bs-code .k { color: #6fc1ff; }
.eb-bs-code .s { color: #06d6a0; }
.eb-bs-code .p { color: #888; }
.eb-bs-file-foot {
  margin-top: 0.36em;
  padding-top: 0.3em;
  border-top: 1px solid var(--eb-main-light);
  font-size: 0.78em;
  color: var(--eb-text-dark);
}

/* ---------- save notification ---------- */
.eb-bs-note {
  position: absolute;
  right: 1.5em;
  bottom: 1.1em;
  width: 35em;
  padding: 0.55em 0.65em;
  border-radius: 0.3em;
  background: #1b1b20;
  border: 1px solid #2c2c33;
  border-left: 0.2em solid var(--eb-success);
  box-shadow: 0 0.6em 1.4em rgba(0, 0, 0, 0.42);
  font-size: 1.05em;
  opacity: 0;
  z-index: 4;
}
.eb-bs-note-head { display: flex; align-items: center; gap: 0.4em; color: var(--eb-success); }
.eb-bs-note-head svg { width: 1em; height: 1em; fill: currentColor; }
.eb-bs-note-head .eb-bs-note-dl { color: var(--eb-text-dark); }
.eb-bs-note-path {
  margin-top: 0.2em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  font-size: 0.8em;
  color: #b9c6d8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.eb-bs-note-warn { margin-top: 0.3em; font-size: 0.75em; line-height: 1.35; color: var(--eb-text-dark); }

/* ---------- cartoon pointer + click ripple ---------- */
.eb-bs-pointer {
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
.eb-bs-pointer svg { display: block; width: 100%; height: 100%; }
.eb-bs-ripple {
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

/* ---------- card (blog index) variant ----------
   The thumbnail has no headline, so the dialog fills it: the form column and
   the icon rail step aside and the checklist gets the whole width at a larger
   scale, which is the only way the counts stay readable at 384px. */
.eb-bs[data-variant='card'] .eb-bs-frame {
  bottom: auto;
  top: 50%;
  width: 100em;
  height: 52em;
  transform: translate(-50%, -50%);
}
.eb-bs[data-variant='card'] .eb-bs-rail,
.eb-bs[data-variant='card'] .eb-bs-form { display: none; }
.eb-bs[data-variant='card'] .eb-bs-col { width: 100%; padding: 1.4em 1.6em; border-right: 0; }
.eb-bs[data-variant='card'] .eb-bs-layer {
  left: 1.6em;
  right: 1.6em;
  top: 1.4em;
  font-size: 2.05em;
}
.eb-bs[data-variant='card'] .eb-bs-tabs { font-size: 1.5em; height: 3.1em; }
.eb-bs[data-variant='card'] .eb-bs-file {
  top: auto;
  bottom: 1.4em;
  width: 62em;
  font-size: 1.5em;
}
.eb-bs[data-variant='card'] .eb-bs-note {
  display: none;
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

/**
 * In-and-out envelope: a label that fades in must also fade out, or it stays
 * on screen for the rest of the loop.
 */
function chip (t, from, to, outFrom, outTo) {
  const fin = easeOut(seg(t, from, to))
  const fout = easeOut(seg(t, outFrom, outTo))
  return fin * (1 - fout)
}

function escapeHtml (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function rowsMarkup (withCheck) {
  return ROWS.map(row => {
    const indent = row.depth * 1.55
    const caret = row.group
      ? `<span class="eb-bs-caret${row.open ? '' : ' is-closed'}">${icon(CARET_PATH)}</span>`
      : '<span class="eb-bs-caret"></span>'
    const check = withCheck
      ? '<span class="eb-bs-check"></span>'
      : ''
    const dot = `<span class="eb-bs-dot" style="background:${row.color}"></span>`
    return `<div class="eb-bs-row${row.group ? ' is-group' : ''}" data-row="${row.id}" style="padding-left:${indent}em">
      ${caret}${check}${dot}<span class="eb-bs-title">${escapeHtml(row.title)}</span>
    </div>`
  }).join('')
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-bs-head">
        <span class="eb-bs-brand">electerm</span>
        <h2 class="eb-bs-h1">Tick many bookmarks, <em>then act once</em></h2>
        <p class="eb-bs-sub">The bookmarks tab has an edit mode: the tree turns into a checklist, and everything you tick can be deleted — or exported as a plain JSON array.</p>
      </div>`

  const tabs = TABS.map((name, index) => {
    const sup = name === 'Triggers' || name === 'Widgets' ? '<sup>Beta</sup>' : ''
    return `<span class="eb-bs-tab${index === 0 ? ' is-active' : ''}">${name}${sup}</span>`
  }).join('')

  // the toolbar order of bookmark-toolbar.jsx: new bookmark, new category,
  // edit (the way into this mode), export, import, ssh configs
  const tools = [
    BOOK_PATH,
    FOLDER_PATH,
    EDIT_PATH,
    DOWNLOAD_PATH,
    IMPORT_PATH,
    CODE_PATH
  ].map((path, index) =>
    `<span class="eb-bs-tool" data-tool="${index}">${icon(path)}</span>`).join('')

  const pills = PILLS.map((name, index) =>
    `<span class="eb-bs-pill${index === 0 ? ' is-active' : ''}">${name}</span>`).join('')

  const sections = SECTIONS.map((name, index) =>
    `<span class="eb-bs-section${index === 0 ? ' is-active' : ''}">${name}</span>`).join('')

  const fields = FIELDS.map(([label, value]) => `
    <div class="eb-bs-field">
      <span class="eb-bs-label">${label}:</span>
      <span class="eb-bs-input${value ? '' : ' is-blank'}">${escapeHtml(value)}</span>
    </div>`).join('')

  const jsonLines = EXPORT_LINES.map((line, index) => {
    const body = typeof line === 'string'
      ? `<span class="p">${escapeHtml(line)}</span>`
      : `<span class="k">${escapeHtml(line.key)}</span><span class="p"> </span><span class="s">${escapeHtml(line.value)}</span>`
    return `<div class="eb-bs-line" data-line="${index}">${body}</div>`
  }).join('')

  return `
    <div class="eb-bs-deco">
      <span class="eb-bs-dots"></span>
      <span class="eb-bs-blob eb-bs-blob-a"></span>
      <span class="eb-bs-blob eb-bs-blob-b"></span>
      <span class="eb-bs-sparkle eb-bs-sparkle-a"></span>
      <span class="eb-bs-sparkle eb-bs-sparkle-b"></span>
      <span class="eb-bs-sparkle eb-bs-sparkle-c"></span>
    </div>
    ${head}
    <div class="eb-bs-frame">
      <div class="eb-bs-modal">
        <div class="eb-bs-rail">
          <span class="eb-bs-rail-logo">et</span>
          <span class="eb-bs-rail-item is-active">${icon(BOOK_PATH)}</span>
          <span class="eb-bs-rail-item">${icon(CODE_PATH)}</span>
          <span class="eb-bs-rail-item">${icon(FOLDER_PATH)}</span>
          <span class="eb-bs-rail-item">${icon(MENU_PATH)}</span>
        </div>
        <div class="eb-bs-body">
          <div class="eb-bs-tabs">
            ${tabs}
            <span class="eb-bs-tabs-close">${icon(CLOSE_PATH)}</span>
          </div>
          <div class="eb-bs-content">
            <div class="eb-bs-col">
              <div class="eb-bs-layer eb-bs-layer-a">
                <div class="eb-bs-tools">
                  ${tools}
                  <span class="eb-bs-tool eb-bs-tool-menu">${icon(MENU_PATH)}</span>
                </div>
                <div class="eb-bs-search">Search${icon(SEARCH_PATH)}</div>
                <div class="eb-bs-list">${rowsMarkup(false)}</div>
              </div>
              <div class="eb-bs-layer eb-bs-layer-b">
                <div class="eb-bs-search">Search${icon(SEARCH_PATH)}</div>
                <div class="eb-bs-btns">
                  <span class="eb-bs-btn is-primary is-off" data-btn="del">Delete selected (0)</span>
                  <span class="eb-bs-btn" data-btn="exp">Export (0)</span>
                  <span class="eb-bs-btn" data-btn="cancel">Cancel</span>
                </div>
                <div class="eb-bs-pick">${rowsMarkup(true)}</div>
              </div>
            </div>
            <div class="eb-bs-form">
              <div class="eb-bs-pills">${pills}</div>
              <div class="eb-bs-sections">${sections}</div>
              ${fields}
            </div>
          </div>
        </div>
        <div class="eb-bs-file">
          <div class="eb-bs-file-head">${icon(DOWNLOAD_PATH)}<span>bookmarks-2026-10-29-16-25-30.json</span></div>
          <div class="eb-bs-code">${jsonLines}</div>
          <div class="eb-bs-file-foot">2 bookmarks · a bare array, not the backup object</div>
        </div>
        <div class="eb-bs-note">
          <div class="eb-bs-note-head">
            ${icon(CHECKCIRCLE_PATH)}
            <span class="eb-bs-note-dl">${icon(DOWNLOAD_PATH)}</span>
          </div>
          <div class="eb-bs-note-path">/home/deploy/backups/bookmarks-2026-10-29-16-25-30.json</div>
          <div class="eb-bs-note-warn">Exported file is plain text and may contain sensitive data like passwords and private keys, keep it safe</div>
        </div>
        <span class="eb-bs-pointer"><svg viewBox="-3 -3 29 39"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
        <span class="eb-bs-ripple"></span>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-bs'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm bookmarks tab in edit mode: the tree is a checklist, two bookmarks in different categories are ticked so both buttons read 2, and exporting writes a JSON array of the two bookmarks')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const qa = (sel) => [...root.querySelectorAll(sel)]
  const el = {
    frame: q('.eb-bs-frame'),
    modal: q('.eb-bs-modal'),
    layerA: q('.eb-bs-layer-a'),
    layerB: q('.eb-bs-layer-b'),
    tools: qa('.eb-bs-tool'),
    toolEdit: qa('.eb-bs-tool')[2],
    rowsA: qa('.eb-bs-layer-a .eb-bs-row'),
    rowsB: qa('.eb-bs-layer-b .eb-bs-row'),
    checks: qa('.eb-bs-layer-b .eb-bs-check'),
    btnDel: q('[data-btn="del"]'),
    btnExp: q('[data-btn="exp"]'),
    btnCancel: q('[data-btn="cancel"]'),
    file: q('.eb-bs-file'),
    lines: qa('.eb-bs-line'),
    note: q('.eb-bs-note'),
    pointer: q('.eb-bs-pointer'),
    ripple: q('.eb-bs-ripple')
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

  // Pointer targets are measured off the real nodes once the banner is laid
  // out: both layers stay in the DOM (opacity only), so the checklist rows and
  // the export button have real boxes even in the first beat.
  const targets = {
    pencil: { x: 10, y: 14 },
    c1: { x: 12, y: 26 },
    c2: { x: 12, y: 48 },
    exp: { x: 20, y: 20 }
  }
  const measure = () => {
    const frameBox = el.frame.getBoundingClientRect()
    const scale = root.clientWidth / 100 || 1
    const at = (node, ax = 0.5, ay = 0.5) => {
      if (!node) return null
      const box = node.getBoundingClientRect()
      if (!box.width) return null
      return {
        x: (box.left + box.width * ax - frameBox.left) / scale,
        y: (box.top + box.height * ay - frameBox.top) / scale
      }
    }
    const set = (key, node, ax, ay) => {
      const point = at(node, ax, ay)
      if (point) targets[key] = point
    }
    set('pencil', el.toolEdit, 0.5, 0.5)
    // checks[] follows the rows: default, prod, prod-web, prod-api, db,
    // db-primary — the two bookmarks the story ticks are the third and sixth
    set('c1', el.checks[2], 0.5, 0.5)
    set('c2', el.checks[5], 0.5, 0.5)
    set('exp', el.btnExp, 0.55, 0.5)
  }
  measure()
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure)
  }

  const baseY = variant === 'card' ? -50 : 0

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))

    // the dialog rises
    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    root.style.opacity = (1 - gone).toFixed(3)
    el.frame.style.transform =
      `translate(-50%, ${baseY}%) translateY(${((1 - winP) * 3).toFixed(2)}em)`

    // browse state: toolbar icons, then the tree
    el.tools.forEach((node, index) => {
      const p = easeOut(seg(t, T.toolFrom + index * T.toolGap,
        T.toolFrom + index * T.toolGap + T.toolDur))
      node.style.opacity = (p * (1 - gone)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.4).toFixed(3) + 'em)'
    })
    el.rowsA.forEach((node, index) => {
      const p = easeOut(seg(t, T.rowFrom + index * T.rowGap,
        T.rowFrom + index * T.rowGap + T.rowDur))
      node.style.opacity = (p * (1 - gone)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.35).toFixed(3) + 'em)'
    })

    // the swap into edit mode
    const swap = easeInOut(seg(t, T.swapFrom, T.swapTo))
    el.layerA.style.opacity = (1 - swap).toFixed(3)
    el.layerA.style.pointerEvents = 'none'
    el.layerB.style.opacity = swap.toFixed(3)

    // checklist rows land one by one, after the header
    el.rowsB.forEach((node, index) => {
      const p = easeOut(seg(t, T.pickRowFrom + index * T.pickRowGap,
        T.pickRowFrom + index * T.pickRowGap + T.pickRowDur))
      node.style.opacity = (p * (1 - gone)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.3).toFixed(3) + 'em)'
    })

    // the two ticks, and the counts they drive
    const k1 = t >= T.check1 ? 1 : 0
    const k2 = t >= T.check2 ? 1 : 0
    const n = k1 + k2
    el.checks.forEach((node, index) => {
      const on = (index === 2 && k1) || (index === 5 && k2)
      node.classList.toggle('is-on', !!on)
      const at = index === 2 ? T.check1 : T.check2
      const pop = on ? 1 + 0.34 * (1 - easeOut(seg(t, at, at + 220))) : 1
      node.style.transform = 'scale(' + pop.toFixed(3) + ')'
    })
    el.rowsB.forEach((node, index) => {
      node.classList.toggle('is-lit', (index === 2 && k1) || (index === 5 && k2))
    })
    el.btnDel.textContent = `Delete selected (${n})`
    el.btnExp.textContent = `Export (${n})`
    el.btnDel.classList.toggle('is-off', n === 0)
    el.btnExp.classList.toggle('is-off', n === 0)
    el.btnExp.classList.toggle('is-pressed', t >= T.expClick && t < T.expClick + 260)

    // the pointer: pencil -> first box -> second box -> export
    const toC1 = easeInOut(seg(t, T.ptr2From, T.ptr2To))
    const toC2 = easeInOut(seg(t, T.ptr3From, T.ptr3To))
    const toExp = easeInOut(seg(t, T.ptr4From, T.ptr4To))
    let px = targets.pencil.x
    let py = targets.pencil.y
    if (t >= T.ptr2From) {
      px = targets.pencil.x + (targets.c1.x - targets.pencil.x) * toC1
      py = targets.pencil.y + (targets.c1.y - targets.pencil.y) * toC1
    }
    if (t >= T.ptr3From) {
      px = targets.c1.x + (targets.c2.x - targets.c1.x) * toC2
      py = targets.c1.y + (targets.c2.y - targets.c1.y) * toC2
    }
    if (t >= T.ptr4From) {
      px = targets.c2.x + (targets.exp.x - targets.c2.x) * toExp
      py = targets.c2.y + (targets.exp.y - targets.c2.y) * toExp
    }
    const ptrIn = seg(t, T.ptr1From, T.ptr1From + 280)
    const ptrOut = easeInOut(seg(t, T.ptrFadeFrom, T.ptrFadeTo))
    const press = Math.max(
      t >= T.editClick && t < T.editClick + 240 ? 1 - seg(t, T.editClick, T.editClick + 240) : 0,
      t >= T.expClick && t < T.expClick + 240 ? 1 - seg(t, T.expClick, T.expClick + 240) : 0
    )
    el.pointer.style.left = px.toFixed(2) + 'em'
    el.pointer.style.top = py.toFixed(2) + 'em'
    el.pointer.style.opacity = (ptrIn * (1 - ptrOut) * (1 - gone)).toFixed(3)
    el.pointer.style.transform = 'scale(' + (1 - 0.14 * press).toFixed(3) + ')'

    // the pencil lights up while the pointer is on it
    el.toolEdit.classList.toggle('is-hover', t >= T.ptr1To && t < T.editClick + 200)

    // click ripples: the pencil, then the export button
    let ripFrom = T.editClick
    let ripTo = targets.pencil
    if (t >= T.expClick) {
      ripFrom = T.expClick
      ripTo = targets.exp
    }
    const ripP = seg(t, ripFrom, ripFrom + 460)
    el.ripple.style.opacity = (ripP > 0 && ripP < 1 ? (1 - ripP) * (1 - gone) : 0).toFixed(3)
    el.ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.4 + ripP * 2.6).toFixed(3) + ')'
    el.ripple.style.left = ripTo.x.toFixed(2) + 'em'
    el.ripple.style.top = ripTo.y.toFixed(2) + 'em'

    // the exported file card and its save notification
    const fileP = easeOutBack(seg(t, T.fileFrom, T.fileTo))
    el.file.style.opacity = (chip(t, T.fileFrom + 120, T.fileTo, T.cardOutFrom, T.cardOutTo) * (1 - gone)).toFixed(3)
    el.file.style.transform = 'translateY(' + ((1 - fileP) * 1.4).toFixed(2) + 'em) scale(' + (0.94 + 0.06 * fileP).toFixed(3) + ')'
    el.lines.forEach((node, index) => {
      const p = easeOut(seg(t, T.jsonFrom + index * T.jsonGap,
        T.jsonFrom + index * T.jsonGap + 220))
      node.style.opacity = (p * (1 - gone)).toFixed(3)
    })
    const noteP = easeOut(seg(t, T.noteFrom, T.noteTo))
    el.note.style.opacity = (chip(t, T.noteFrom, T.noteTo, T.cardOutFrom, T.cardOutTo) * (1 - gone)).toFixed(3)
    el.note.style.transform = 'translateY(' + ((1 - noteP) * 0.8).toFixed(2) + 'em)'
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
    // one representative beat: both boxes ticked, the file card open
    frame(8200)
    root.style.opacity = '1'
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
