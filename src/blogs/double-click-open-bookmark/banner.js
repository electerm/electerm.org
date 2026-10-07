/**
 * Animated banner for the "open bookmark on double click" blog post.
 *
 * Everything here is generated in this file — no image, no GIF, no canvas: the
 * background, the electerm window (icon rail + bookmarks panel + tab bar +
 * terminal), the bookmark rows, the pointer and its click ripples, the settings
 * card with its toggle, and the annotation chips are all plain DOM + CSS driven
 * by one requestAnimationFrame timeline.
 *
 * The window is modelled on the real electerm UI. Colours and metrics are taken
 * from the app itself:
 *   UI theme .......... src/client/css/includes/theme.styl, with the shipped
 *                       dark theme injected over it (src/client/common/
 *                       theme-defaults.js, defaultThemeDark) — hence --main
 *                       #121214 and --main-dark #000
 *   terminal theme .... src/client/common/theme-defaults.js
 *                       (defaultThemeDarkTerminal: bg #20111b, fg #bbbbbb)
 *   tab bar / tabs .... src/client/components/tabs/tabs.styl (36px bar, 14px
 *                       font, min-width 100px, radii 3px 3px 0 0)
 *   tab status dot .... src/client/components/tabs/tab.jsx (grey off, success on)
 *   tab title ......... src/client/common/create-title.jsx (title - user@host:port)
 *   sidebar rail ...... src/client/components/sidebar/sidebar.styl (43px wide,
 *                       --main-dark background, full height)
 *   bookmarks panel ... src/client/components/sidebar/sidebar.styl (--main
 *                       background, starts 36px down, i.e. below the tab bar)
 *   bookmark rows ..... src/client/components/tree-list/tree-list.styl
 *                       (.tree-item: line-height 26px, radius 3px, hover and
 *                       .selected both #000 / #eee; category rows bold at 14px)
 *   category tag ...... .category-color-tag (12x12, radius 2px)
 *   row expander ...... src/client/components/tree-list/tree-expander.jsx
 *                       (CaretRight/CaretDown, 12px wide)
 *   panel search row ... src/client/components/tree-list/tree-search.jsx
 *                       (antd Search + a square sort Button)
 *   the setting ....... src/client/common/default-setting.js
 *                       (doubleClickToOpenBookmark: false)
 *   where it applies ... src/client/components/sidebar/bookmark-select.jsx and
 *                       history.jsx — the sidebar list and the history list
 *   where it does not ... src/client/components/tree-list/tree-list.jsx
 *                       (settings bookmarks tab passes no onDoubleClickItem;
 *                       groups return early; Enter still opens)
 *
 * The story, in order:
 *   1. the settings card slides in and "open bookmark on double click" flips on;
 *   2. the pointer single-clicks a bookmark — the row marks itself and NOTHING
 *      opens (the tab bar does not move);
 *   3. the same row double-clicked — the row flashes, a new tab slides into the
 *      tab bar, and the terminal switches to that session;
 *   4. a second bookmark double-clicked, so it reads as a habit rather than a
 *      one-off;
 *   5. a group row single-clicked — groups are exempt, and it still expands on
 *      one click.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + settings card + chips + window
 *   data-eb-banner="card"  -> window only, chips in a row above it
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for that
 * post) — otherwise the first script to run would claim every card.
 *
 * Two deliberate liberties. The panel is drawn beside the terminal rather than
 * overlaying it: electerm's unpinned sidebar is an overlay, but an overlay at
 * thumbnail size just looks like a clipping bug. And the pointer is drawn as an
 * arrow throughout, since a banner cannot restyle the visitor's real cursor.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at 1% of
 * the banner width, so a single design scales from the hero to the card.
 */

const STYLE_ID = 'eb-dc-style'

// One full pass of the story, in ms.
const PERIOD = 12000

const T = {
  swFrom: 300, // the settings card slides in from the right
  swTo: 780,
  flipFrom: 1000, // ...and the toggle flips on
  flipTo: 1420,
  ptrIn1From: 1900, // the pointer arrives at the first bookmark
  ptrIn1To: 2420,
  click1From: 2520, // single click: ripple, row marks itself, nothing opens
  click1To: 2720,
  chipSelFrom: 2820,
  chipSelTo: 3180,
  chipSelOutFrom: 3620,
  chipSelOutTo: 3960,
  click2aFrom: 4260, // double click, first press
  click2bFrom: 4420, // double click, second press
  openFrom: 4460, // the row flashes, a tab arrives, the terminal switches
  openTo: 4980,
  chipOpenFrom: 5060,
  chipOpenTo: 5420,
  chipOpenOutFrom: 6160,
  chipOpenOutTo: 6500,
  ptrIn2From: 6360, // on to the second bookmark
  ptrIn2To: 6820,
  click3aFrom: 6920,
  click3bFrom: 7070,
  open2From: 7110,
  open2To: 7600,
  ptrIn3From: 8200, // on to the group row
  ptrIn3To: 8640,
  groupFrom: 8740, // single click on a group: it still expands
  groupTo: 9360,
  chipGroupFrom: 9040,
  chipGroupTo: 9380,
  chipGroupOutFrom: 10100,
  chipGroupOutTo: 10440,
  fadeFrom: 10700,
  fadeTo: 11450
}

// antd glyphs, the same ones the app renders (via @ant-design/icons).
const SEARCH_PATH = 'M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z'
const SORT_PATH = 'M839.6 433.8L749 150.5a9.24 9.24 0 00-8.9-6.5h-77.4c-4.1 0-7.6 2.6-8.9 6.5l-91.3 283.3c-.3.9-.5 1.9-.5 2.9 0 5.1 4.2 9.3 9.3 9.3h56.4c4.2 0 7.8-2.8 9-6.8l17.5-61.6h89l17.3 61.5c1.1 4 4.8 6.8 9 6.8h61.2c1 0 1.9-.1 2.8-.4 2.4-.8 4.3-2.4 5.5-4.6 1.1-2.2 1.3-4.7.6-7.1zM663.3 325.5l32.8-116.9h6.3l32.1 116.9h-71.2zm143.5 492.9H677.2v-.4l132.6-188.9c1.1-1.6 1.7-3.4 1.7-5.4v-36.4c0-5.1-4.2-9.3-9.3-9.3h-204c-5.1 0-9.3 4.2-9.3 9.3v43c0 5.1 4.2 9.3 9.3 9.3h122.6v.4L587.7 828.9a9.35 9.35 0 00-1.7 5.4v36.4c0 5.1 4.2 9.3 9.3 9.3h211.4c5.1 0 9.3-4.2 9.3-9.3v-43a9.2 9.2 0 00-9.2-9.3zM416 702h-76V172c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v530h-76c-6.7 0-10.5 7.8-6.3 13l112 141.9a8 8 0 0012.6 0l112-141.9c4.1-5.2.4-13-6.3-13z'
const CARET_RIGHT_PATH = 'M715.8 493.5L335 165.1c-14.2-12.2-35-1.2-35 18.5v656.8c0 19.7 20.8 30.7 35 18.5l380.8-328.4c10.9-9.4 10.9-27.6 0-37z'
const PLUS_CIRCLE_PATH = 'M696 480H544V328c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v152H328c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h152v152c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V544h152c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z'
const THUNDER_PATH = 'M848 359.3H627.7L825.8 109c4.1-5.3.4-13-6.3-13H436c-2.8 0-5.5 1.5-6.9 4L170 547.5c-3.1 5.3.7 12 6.9 12h174.4l-89.4 357.6c-1.9 7.8 7.5 13.3 13.3 7.7L853.5 373c5.2-4.9 1.7-13.7-5.5-13.7zM378.2 732.5l60.3-241H281.1l189.6-327.4h224.6L487 427.4h211L378.2 732.5z'
const BOOK_PATH = 'M832 64H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zm-260 72h96v209.9L621.5 312 572 347.4V136zm220 752H232V136h280v296.9c0 3.3 1 6.6 3 9.3a15.9 15.9 0 0022.3 3.7l83.8-59.9 81.4 59.4c2.7 2 6 3.1 9.4 3.1 8.8 0 16-7.2 16-16V136h64v752z'
const PICTURE_PATH = 'M928 160H96c-17.7 0-32 14.3-32 32v640c0 17.7 14.3 32 32 32h832c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32zm-40 632H136v-39.9l138.5-164.3 150.1 178L658.1 489 888 761.6V792zm0-129.8L664.2 396.8c-3.2-3.8-9-3.8-12.2 0L424.6 666.4l-144-170.7c-3.2-3.8-9-3.8-12.2 0L136 652.7V232h752v430.2zM304 456a88 88 0 100-176 88 88 0 000 176zm0-116c15.5 0 28 12.5 28 28s-12.5 28-28 28-28-12.5-28-28 12.5-28 28-28z'
const SETTING_PATH = 'M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 009.3-35.2l-.9-2.6a443.74 443.74 0 00-79.7-137.9l-1.8-2.1a32.12 32.12 0 00-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85a32.05 32.05 0 00-25.8-25.7l-2.7-.5c-52.1-9.4-106.9-9.4-159 0l-2.7.5a32.05 32.05 0 00-25.8 25.7l-15.8 85.4a351.86 351.86 0 00-99 57.4l-81.9-29.1a32 32 0 00-35.1 9.5l-1.8 2.1a446.02 446.02 0 00-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5a32.03 32.03 0 00-9.3 35.2l.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1a32.12 32.12 0 0035.1 9.5l81.9-29.1c29.8 24.5 63.1 43.9 99 57.4l15.8 85.4a32.05 32.05 0 0025.8 25.7l2.7.5a449.4 449.4 0 00159 0l2.7-.5a32.05 32.05 0 0025.8-25.7l15.7-85a350 350 0 0099.7-57.6l81.3 28.9a32 32 0 0035.1-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l.9-2.6c4.5-12.3.8-26.3-9.3-35zM788.3 465.9c2.5 15.1 3.8 30.6 3.8 46.1s-1.3 31-3.8 46.1l-6.6 40.1 74.7 63.9a370.03 370.03 0 01-42.6 73.6L721 702.8l-31.4 25.8c-23.9 19.6-50.5 35-79.3 45.8l-38.1 14.3-17.9 97a377.5 377.5 0 01-85 0l-17.9-97.2-37.8-14.5c-28.5-10.8-55-26.2-78.7-45.7l-31.4-25.9-93.4 33.2c-17-22.9-31.2-47.6-42.6-73.6l75.5-64.5-6.5-40c-2.4-14.9-3.7-30.3-3.7-45.5 0-15.3 1.2-30.6 3.7-45.5l6.5-40-75.5-64.5c11.3-26.1 25.6-50.7 42.6-73.6l93.4 33.2 31.4-25.9c23.7-19.5 50.2-34.9 78.7-45.7l37.9-14.3 17.9-97.2c28.1-3.2 56.8-3.2 85 0l17.9 97 38.1 14.3c28.7 10.8 55.4 26.2 79.3 45.8l31.4 25.8 92.8-32.9c17 22.9 31.2 47.6 42.6 73.6L781.8 426l6.5 39.9zM512 326c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm79.2 255.2A111.6 111.6 0 01512 614c-29.9 0-58-11.7-79.2-32.8A111.6 111.6 0 01400 502c0-29.9 11.7-58 32.8-79.2C454 401.6 482.1 390 512 390c29.9 0 58 11.6 79.2 32.8A111.6 111.6 0 01624 502c0 29.9-11.7 58-32.8 79.2z'
const CLOUD_SYNC_PATH = 'M811.4 368.9C765.6 248 648.9 162 512.2 162S258.8 247.9 213 368.8C126.9 391.5 63.5 470.2 64 563.6 64.6 668 145.6 752.9 247.6 762c4.7.4 8.7-3.3 8.7-8v-60.4c0-4-3-7.4-7-7.9-27-3.4-52.5-15.2-72.1-34.5-24-23.5-37.2-55.1-37.2-88.6 0-28 9.1-54.4 26.2-76.4 16.7-21.4 40.2-36.9 66.1-43.7l37.9-10 13.9-36.7c8.6-22.8 20.6-44.2 35.7-63.5 14.9-19.2 32.6-36 52.4-50 41.1-28.9 89.5-44.2 140-44.2s98.9 15.3 140 44.3c19.9 14 37.5 30.8 52.4 50 15.1 19.3 27.1 40.7 35.7 63.5l13.8 36.6 37.8 10c54.2 14.4 92.1 63.7 92.1 120 0 33.6-13.2 65.1-37.2 88.6-19.5 19.2-44.9 31.1-71.9 34.5-4 .5-6.9 3.9-6.9 7.9V754c0 4.7 4.1 8.4 8.8 8 101.7-9.2 182.5-94 183.2-198.2.6-93.4-62.7-172.1-148.6-194.9z'
const APPSTORE_PATH = 'M464 144H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H212V212h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16zm-52 268H612V212h200v200zM464 544H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H212V612h200v200zm452-268H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16zm-52 268H612V612h200v200z'
const CLOSE_PATH = 'M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z'
const CARET_DOWN_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M192 474h672q8 0 8 8v60q0 8-8 8H160q-8 0-8-8v-60q0-8 8-8z'
const CHECK_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z'

// The pointer, drawn as an arrow: a banner cannot restyle the real cursor.
const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

// The rail icons, in the shipped order (config.leftSideBarIcons): new bookmark,
// quick connect, bookmarks (active), themes, settings, sync, widgets.
const RAIL_ICONS = [
  PLUS_CIRCLE_PATH,
  THUNDER_PATH,
  BOOK_PATH,
  PICTURE_PATH,
  SETTING_PATH,
  CLOUD_SYNC_PATH,
  APPSTORE_PATH
]

const RAIL_ACTIVE = 2

// The bookmarks the panel lists. Titles follow create-title.jsx: the bookmark
// title, then " - ", then user@host:port. Kept short enough to fit the panel
// without ellipsis at the hero scale — measured, not guessed.
const ROWS = [
  { id: 'prod-web', tag: '#e55934', name: 'prod-web - zxd@web-01:22' },
  { id: 'prod-db', tag: '#e55934', name: 'prod-db - zxd@db-01:22' },
  { id: 'staging', tag: '#08c', name: 'staging - zxd@stg-01:22' },
  { id: 'backup', tag: '#06d6a0', name: 'backup - zxd@nas-01:22' }
]

const GROUP_ID = 'legacy'
const GROUP_CHILDREN = [
  { id: 'old-sw', tag: '#06d6a0', name: 'old-sw - zxd@sw-01:22' },
  { id: 'kvm', tag: '#bbbbbb', name: 'kvm - zxd@kvm-01:22' }
]

// The three terminal screens, one per open session. Every line stays under 30
// characters so it fits the 36.7em session area at the hero scale.
const SCREENS = [
  {
    id: 'local',
    lines: [
      '<span class="eb-dc-ps1">zxd@local</span>:<span class="eb-dc-path">~</span>$ <span class="eb-dc-caret"></span>',
      '',
      ''
    ]
  },
  {
    id: 'prod',
    lines: [
      '<span class="eb-dc-dim">Last login: Wed Oct 7 13:58</span>',
      '<span class="eb-dc-ps1">zxd@prod-web</span>:<span class="eb-dc-path">~</span>$ uptime',
      ' 14:02  up 41 days, 0.08'
    ]
  },
  {
    id: 'stg',
    lines: [
      '<span class="eb-dc-dim">Last login: Wed Oct 7 14:03</span>',
      '<span class="eb-dc-ps1">zxd@staging</span>:<span class="eb-dc-path">~</span>$ uptime',
      ' 14:03  up 3 days, 1.21'
    ]
  }
]

// The three tabs, in the order they appear: the local session is already open.
const TABS = [
  { id: 't-local', count: '1', name: 'local', connected: false },
  { id: 't-prod', count: '2', name: 'prod-web:22', connected: true },
  { id: 't-stg', count: '3', name: 'staging:22', connected: true }
]

const CSS = `
.eb-dc {
  /* real electerm UI theme — src/client/css/includes/theme.styl, with the
     shipped dark theme (src/client/common/theme-defaults.js, defaultThemeDark)
     injected over it at runtime, which is where --main #121214 comes from. */
  --eb-ink: #16233a;
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-main-lighter: #5b5a5b;
  --eb-text: #ddd;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-warn: #e55934;
  /* real electerm default terminal theme — src/client/common/theme-defaults.js */
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
  background: linear-gradient(135deg, #e9f2ff 0%, #eef0ff 50%, #e9fbf6 100%);
  color: var(--eb-ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}

/* ---------- background decoration ---------- */
.eb-dc-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-dc-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-dc-drift 34s linear infinite;
}
@keyframes eb-dc-drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-4.2em, -4.2em, 0); }
}
.eb-dc-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(3.2em);
  opacity: 0.5;
}
.eb-dc-blob-a {
  width: 22em; height: 22em;
  top: -7em; left: -5em;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.55), transparent 68%);
}
.eb-dc-blob-b {
  width: 26em; height: 26em;
  bottom: -9em; right: -6em;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.45), transparent 68%);
}
.eb-dc-spark {
  position: absolute;
  width: 0.7em; height: 0.7em;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 1.2em rgba(255, 255, 255, 0.9);
  opacity: 0.75;
}
.eb-dc-spark-a { top: 14%; left: 10%; animation: eb-dc-twinkle 5.2s ease-in-out infinite; }
.eb-dc-spark-b { top: 8%; left: 74%; animation: eb-dc-twinkle 6.8s ease-in-out 1.1s infinite; }
.eb-dc-spark-c { bottom: 10%; left: 6%; animation: eb-dc-twinkle 7.4s ease-in-out 2.3s infinite; }
@keyframes eb-dc-twinkle {
  0%, 100% { transform: scale(0.5); opacity: 0.24; }
  50% { transform: scale(1.15); opacity: 0.86; }
}

/* ---------- headline ----------
   The width sits on .eb-dc-head, whose font-size is the root em, rather than on
   .eb-dc-sub: a max-width in em on the sub would resolve against its own 1.45em
   font size and come out wider than intended. */
.eb-dc-head { position: absolute; left: 5em; top: 3.1em; width: 44em; }
.eb-dc-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-size: 1.4em;
  font-weight: 600;
  color: var(--eb-primary);
}
.eb-dc-brand::before {
  content: '';
  width: 0.72em;
  height: 0.72em;
  border-radius: 0.16em;
  background: var(--eb-primary);
}
.eb-dc-h1 {
  margin: 0.5em 0 0;
  font-size: 2.95em;
  line-height: 1.14;
  font-weight: 700;
  letter-spacing: -0.015em;
}
.eb-dc-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #0d9488 62%, #0891b2);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.eb-dc-sub {
  margin: 0.6em 0 0;
  font-size: 1.42em;
  line-height: 1.42;
  color: #4b5563;
}

/* ---------- the settings card ----------
   Modelled on the app's settings panel: a white card, the label as the user
   reads it, and an antd-style switch. It sits in the banner's right gutter,
   clear of the window, which is drawn later in the DOM and would otherwise
   cover it.

   Geometry note: left/right/top/width in em resolve against this element's OWN
   1.15em font size, not the root em, so width 18em is 20.7em of banner. */
.eb-dc-settings {
  position: absolute;
  right: 3em;
  top: 4.2em;
  width: 18em;
  padding: 1em 1.1em;
  border-radius: 0.9em;
  background: #fff;
  box-shadow: 0 1em 2.4em rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(15, 23, 42, 0.06);
  font-size: 1.15em;
  opacity: 0;
}
.eb-dc-settings-cap {
  font-size: 0.72em;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--eb-text-dark);
  font-weight: 700;
}
.eb-dc-settings-row {
  display: flex;
  align-items: center;
  gap: 0.7em;
  margin-top: 0.6em;
}
.eb-dc-settings-label {
  flex: 1;
  min-width: 0;
  color: #1f2937;
  font-weight: 600;
  line-height: 1.25;
}
/* antd Switch: 44x22 at a 14px font */
.eb-dc-switch {
  flex: none;
  position: relative;
  width: 2.2em;
  height: 1.1em;
  border-radius: 1em;
  background: #bfbfbf;
}
.eb-dc-switch-knob {
  position: absolute;
  top: 0.1em;
  left: 0.1em;
  width: 0.9em;
  height: 0.9em;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0.1em 0.3em rgba(0, 0, 0, 0.25);
}
.eb-dc.is-on .eb-dc-switch { background: var(--eb-primary); }
.eb-dc.is-on .eb-dc-switch-knob { left: 1.2em; }
.eb-dc-settings-hint {
  margin-top: 0.55em;
  font-size: 0.78em;
  line-height: 1.35;
  color: var(--eb-text-dark);
  opacity: 0;
}
.eb-dc.is-on .eb-dc-settings-hint { opacity: 1; }

/* ---------- annotation chips ----------
   Only one chip is on stage at a time, so all three are absolutely stacked in
   the same slot rather than laid out in flow — otherwise the two invisible ones
   would still hold their boxes and the visible label would jump down a slot on
   every beat (opacity 0 is not "not laid out"). On the hero they sit in the
   right gutter below the settings card, aligned to the banner edge so a label
   can never run off the right; on the card they are centred above the window. */
.eb-dc-chips { position: absolute; pointer-events: none; }
.eb-dc-chips.is-hero {
  right: 3em;
  top: 25em;
  width: 26em;
  height: 3.2em;
}
.eb-dc-chips.is-card {
  left: 3em;
  right: 3em;
  top: 1.8em;
  height: 3em;
}
.eb-dc-chip {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5em 0.85em;
  border-radius: 0.45em;
  font-size: 1.3em;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  opacity: 0;
  box-shadow: 0 0.3em 0.9em rgba(15, 23, 42, 0.16);
}
.eb-dc-chips.is-card .eb-dc-chip {
  right: auto;
  left: 50%;
  transform: translateX(-50%);
}
/* the single click that only marks the row */
.eb-dc-chip.is-sel { background: var(--eb-ink); color: #fff; }
/* the double click that connects */
.eb-dc-chip.is-open { background: var(--eb-success); color: #04231c; }
/* groups are exempt: one click still toggles them */
.eb-dc-chip.is-group {
  background: #fff;
  color: var(--eb-ink);
  border: 1px solid var(--color-border, #d9e2f0);
}

/* ---------- the electerm window ----------
   Icon rail, bookmarks panel and session area are one piece, sized from the
   banner's em, so the whole window scales as a unit. The rail runs the full
   height; the tab bar sits above the panel and the session area, which is why
   the panel starts one tab-bar down (the app's .sidebar-panel is top 36px). */
.eb-dc-app {
  position: absolute;
  left: 4em;
  bottom: 3em;
  width: 68em;
  background: var(--eb-main);
  border-radius: 0.8em;
  box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.2);
  overflow: hidden;
  text-align: left;
  animation: eb-dc-glow 4.4s ease-in-out infinite;
}
@keyframes eb-dc-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.34), 0 0 3.4em rgba(13, 148, 136, 0.4); }
}
.eb-dc-body { display: flex; align-items: stretch; height: 30em; }

/* the far-left icon bar: 43px against the app's 12-14px UI font */
.eb-dc-rail {
  flex: 0 0 3.5em;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9em;
  padding: 0.7em 0;
  background: var(--eb-main-dark);
}
.eb-dc-rail-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35em;
  height: 1.35em;
  color: var(--eb-text-dark);
}
.eb-dc-rail-btn svg { width: 100%; height: 100%; fill: currentColor; }
.eb-dc-rail-btn.is-active { color: var(--eb-text); }

.eb-dc-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ---------- tab bar ----------
   1em here is the tab font size, exactly as in the app's tabs.styl where the
   bar is 36px tall against a 14px font. */
.eb-dc-tabbar {
  flex: none;
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.4em;
  background: var(--eb-main-dark);
  font-size: 1.25em;
  line-height: 1;
  overflow: hidden;
}
.eb-dc-tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
  height: 100%;
  min-width: 6.6em;
  max-width: 13em;
  padding: 0 0.7em;
  border-radius: 0.21em 0.21em 0 0;
  background: var(--eb-main-dark);
  color: var(--eb-text-dark);
  white-space: nowrap;
  overflow: hidden;
}
/* the app bolds the tab of the focused batch (tabs.styl .tab.active-all) */
.eb-dc-tab.is-active {
  background: var(--eb-main);
  color: var(--eb-text);
  font-weight: 700;
}
/* A tab that has not arrived yet must not hold its place: min-width 0 lets
   max-width actually shrink it, and the padding has to collapse with it or the
   border-box floors the width (same trap as an animated code block). */
.eb-dc-tab.is-new { min-width: 0; padding: 0; }
.eb-dc-tab-name { overflow: hidden; text-overflow: ellipsis; }
.eb-dc-tab-status {
  position: absolute;
  left: 0.14em;
  top: 0.14em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-text-dark);
}
.eb-dc-tab-status.is-connected { background: var(--eb-success); }
/* .tab-count — 20px pill against a 14px font, radii 10px/2px */
.eb-dc-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-dc-tab-close {
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
.eb-dc-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
/* the app only reveals the close disc on hover; keeping it on the focused tab
   is enough for the tab to read as a tab, and an inactive one stays clean */
.eb-dc-tab:not(.is-active) .eb-dc-tab-close { display: none; }
.eb-dc-tab-add,
.eb-dc-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  color: var(--eb-text);
}
.eb-dc-tab-add { width: 1.5em; margin-left: 0.2em; }
.eb-dc-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-dc-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); }
.eb-dc-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }

.eb-dc-lower { flex: 1; min-height: 0; display: flex; align-items: stretch; }

/* ---------- the bookmarks panel ----------
   width is in banner-em because this element keeps font-size 1em; the rows are
   scaled by .eb-dc-panel-inner instead, so the panel's own width never has to
   be divided by a font-size. */
.eb-dc-panel {
  position: relative;
  flex: 0 0 29em;
  background: var(--eb-main);
  border-right: 1px solid #000;
  overflow: hidden;
}
.eb-dc-panel-inner {
  padding: 0.45em 0.4em;
  font-size: 1.75em;
  color: var(--eb-text);
}
/* the panel header: antd Search + a square sort Button, in a Space.Compact —
   adjacent, with the shared border and the outer radii only */
.eb-dc-search {
  display: flex;
  align-items: stretch;
  margin-bottom: 0.5em;
}
.eb-dc-search-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.35em;
  height: 1.75em;
  padding: 0 0.45em;
  border: 1px solid #d9d9d9;
  border-right: 0;
  border-radius: 0.35em 0 0 0.35em;
  background: #fff;
}
.eb-dc-search-box svg { flex: none; width: 0.8em; height: 0.8em; fill: rgba(0, 0, 0, 0.25); }
.eb-dc-sort-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75em;
  border: 1px solid #d9d9d9;
  border-radius: 0 0.35em 0.35em 0;
  background: #fff;
}
.eb-dc-sort-btn svg { width: 0.8em; height: 0.8em; fill: rgba(0, 0, 0, 0.55); }

/* .tree-item: line-height 26px, radius 3px, hover and .selected both #000 */
.eb-dc-row {
  display: flex;
  align-items: center;
  gap: 0.25em;
  line-height: 1.6em;
  padding: 0 0.4em 0 0.55em;
  border-radius: 0.17em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background-color 0.12s linear;
}
.eb-dc-row.is-hover,
.eb-dc-row.is-active { background: #000; color: #eee; }
/* the moment it opens: a primary tint, then back to the selected row */
.eb-dc-row.is-flash { background: rgba(8, 136, 204, 0.42); color: #fff; }
.eb-dc-tag { flex: none; font-size: 0.85em; }
.eb-dc-name { overflow: hidden; text-overflow: ellipsis; }
/* a category row: bold, and the app renders it a size up from the rows */
.eb-dc-group { font-weight: 700; }
.eb-dc-cat-tag {
  flex: none;
  width: 0.75em;
  height: 0.75em;
  border-radius: 0.12em;
  border: 1px solid #1a1a1a;
}
.eb-dc-expander {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.8em;
  color: var(--eb-text-dark);
  transform: rotate(0deg);
}
.eb-dc-expander svg { width: 0.7em; height: 0.7em; fill: currentColor; }
/* children are indented, as the app indents by treeLevelIndent per depth */
.eb-dc-children { overflow: hidden; max-height: 0; }
.eb-dc-children .eb-dc-row { padding-left: 1.35em; }

/* ---------- the pointer and its ripples ----------
   Both live in .eb-dc-panel, whose font-size is the root em, so the geometry
   measured off the rows can be used here without rescaling. */
.eb-dc-ptr {
  position: absolute;
  top: 0;
  left: 0;
  width: 1.5em;
  height: 2em;
  opacity: 0;
  z-index: 5;
}
.eb-dc-ptr svg { width: 100%; height: 100%; }
.eb-dc-ripple {
  position: absolute;
  top: 0;
  left: 0;
  width: 1.7em;
  height: 1.7em;
  margin: -0.85em 0 0 -0.85em;
  border-radius: 50%;
  background: rgba(8, 136, 204, 0.34);
  opacity: 0;
  z-index: 4;
}
.eb-dc-ripple.is-open { background: rgba(6, 214, 160, 0.45); }

/* ---------- the session area ---------- */
.eb-dc-main {
  position: relative;
  flex: 1;
  min-width: 0;
  background: var(--eb-term-bg);
  overflow: hidden;
}
.eb-dc-screen {
  position: absolute;
  inset: 0;
  padding: 1.1em 1.2em;
  font-size: 1.9em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.5;
  color: var(--eb-term-fg);
  /* pre, not nowrap: a leading space in an output line (uptime's indent) has to
     survive, and a line must never wrap */
  white-space: pre;
}
.eb-dc-line { line-height: 1.5; }
.eb-dc-ps1 { color: var(--eb-term-green); }
.eb-dc-path { color: var(--eb-term-blue); }
.eb-dc-dim { color: #8a7f84; }
/* xterm's cursor: a solid block, cursorBlink is off by default */
.eb-dc-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.15em;
  vertical-align: text-bottom;
  background: var(--eb-term-fg);
}

/* ---------- the "Connected" toast ----------
   Pinned to the bottom of the session area rather than the top: the prompt and
   the command output live at the top, and a translucent toast over them makes
   both unreadable. The bottom of a fresh session is empty. */
.eb-dc-toast {
  position: absolute;
  left: 50%;
  bottom: 1.2em;
  transform: translateX(-50%);
  opacity: 0;
  z-index: 6;
}
.eb-dc-toast-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  padding: 0.45em 0.9em;
  border-radius: 0.5em;
  /* the app's toast is --main-lighter, which the dark default theme does not
     set, so #5b5a5b (theme.styl) is what ships */
  background: var(--eb-main-lighter);
  color: #fff;
  font-size: 1.6em;
  box-shadow: 0 0.8em 1.8em rgba(0, 0, 0, 0.4);
}
.eb-dc-toast-icon { width: 1em; height: 1em; fill: var(--eb-success); }

/* ---------- card variant ----------
   The card is a thumbnail: no headline and no settings card (the story still
   reads — mark the row, then open it, then a group on one click), the window
   takes the width, and the chips sit in a row above it. */
.eb-dc[data-variant='card'] .eb-dc-settings { display: none; }
.eb-dc[data-variant='card'] .eb-dc-app { left: 3em; width: 94em; bottom: 2.6em; }
.eb-dc[data-variant='card'] .eb-dc-body { height: 36em; }
.eb-dc[data-variant='card'] .eb-dc-panel { flex: 0 0 36em; }
.eb-dc[data-variant='card'] .eb-dc-panel-inner { font-size: 2.05em; }
.eb-dc[data-variant='card'] .eb-dc-screen { font-size: 2.2em; }
.eb-dc[data-variant='card'] .eb-dc-chip { font-size: 1.15em; padding: 0.42em 0.7em; }

@media (prefers-reduced-motion: reduce) {
  .eb-dc-dots, .eb-dc-spark, .eb-dc-app { animation: none !important; }
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

function rowMarkup (row, cls) {
  return `<div class="eb-dc-row ${cls}" data-row="${row.id}">` +
    `<span class="eb-dc-tag" style="color:${row.tag}">&#9679;</span>` +
    `<span class="eb-dc-name">${row.name}</span>` +
    '</div>'
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-dc-head">
        <span class="eb-dc-brand">electerm</span>
        <h2 class="eb-dc-h1">Open a bookmark on<br><em>double click</em></h2>
        <p class="eb-dc-sub">electerm connects on the first click. One setting makes the sidebar wait for the second.</p>
      </div>`
  const tabs = TABS.map(t => {
    const isNew = t.id === 't-local' ? '' : ' is-new'
    return `<span class="eb-dc-tab${isNew}" data-tab="${t.id}">` +
      `<span class="eb-dc-tab-status${t.connected ? ' is-connected' : ''}"></span>` +
      `<span class="eb-dc-tab-count">${t.count}</span>` +
      `<span class="eb-dc-tab-name">${t.name}</span>` +
      '<span class="eb-dc-tab-close">' + icon(CLOSE_PATH, '') + '</span>' +
      '</span>'
  }).join('')
  const rail = RAIL_ICONS.map((p, i) =>
    `<span class="eb-dc-rail-btn${i === RAIL_ACTIVE ? ' is-active' : ''}">${icon(p, '')}</span>`
  ).join('')
  const screens = SCREENS.map(s =>
    `<div class="eb-dc-screen" data-screen="${s.id}">` +
    s.lines.map(l => `<div class="eb-dc-line">${l || '&nbsp;'}</div>`).join('') +
    (s.id === 'local' ? '' : '<div class="eb-dc-line"><span class="eb-dc-caret"></span></div>') +
    '</div>'
  ).join('')
  return `
    <div class="eb-dc-deco">
      <span class="eb-dc-blob eb-dc-blob-a"></span>
      <span class="eb-dc-blob eb-dc-blob-b"></span>
      <span class="eb-dc-dots"></span>
      <span class="eb-dc-spark eb-dc-spark-a"></span>
      <span class="eb-dc-spark eb-dc-spark-b"></span>
      <span class="eb-dc-spark eb-dc-spark-c"></span>
    </div>
    ${head}
    <div class="eb-dc-settings">
      <div class="eb-dc-settings-cap">Settings &rsaquo; setting</div>
      <div class="eb-dc-settings-row">
        <span class="eb-dc-settings-label">open bookmark on double click</span>
        <span class="eb-dc-switch"><span class="eb-dc-switch-knob"></span></span>
      </div>
      <div class="eb-dc-settings-hint">Single click only marks the row. Double click connects.</div>
    </div>
    <div class="eb-dc-chips is-${variant}">
      <span class="eb-dc-chip is-sel">1 click &rarr; marks the row</span>
      <span class="eb-dc-chip is-open">2 clicks &rarr; connects</span>
      <span class="eb-dc-chip is-group">groups: 1 click</span>
    </div>
    <div class="eb-dc-app">
      <div class="eb-dc-body">
        <div class="eb-dc-rail">${rail}</div>
        <div class="eb-dc-right">
          <div class="eb-dc-tabbar">
            ${tabs}
            <span class="eb-dc-tab-add">${icon(PLUS_PATH, '')}</span>
            <span class="eb-dc-tabbar-caret">${icon(CARET_DOWN_PATH, '')}</span>
          </div>
          <div class="eb-dc-lower">
            <div class="eb-dc-panel">
              <div class="eb-dc-panel-inner">
                <div class="eb-dc-search">
                  <span class="eb-dc-search-box">${icon(SEARCH_PATH, '')}</span>
                  <span class="eb-dc-sort-btn">${icon(SORT_PATH, '')}</span>
                </div>
                ${ROWS.map(r => rowMarkup(r, 'eb-dc-bookmark')).join('')}
                <div class="eb-dc-row eb-dc-group" data-row="${GROUP_ID}">
                  <span class="eb-dc-expander">${icon(CARET_RIGHT_PATH, '', '0 0 1024 1024')}</span>
                  <span class="eb-dc-cat-tag" style="background:#6fc1ff"></span>
                  <span class="eb-dc-name">Legacy</span>
                </div>
                <div class="eb-dc-children">
                  ${GROUP_CHILDREN.map(r => rowMarkup(r, 'eb-dc-bookmark')).join('')}
                </div>
              </div>
              <span class="eb-dc-ptr"><svg viewBox="-3 -3 29 39" width="100%" height="100%"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
              <span class="eb-dc-ripple" data-rip="1"></span>
              <span class="eb-dc-ripple" data-rip="2a"></span>
              <span class="eb-dc-ripple" data-rip="2b"></span>
              <span class="eb-dc-ripple is-open" data-rip="3a"></span>
              <span class="eb-dc-ripple is-open" data-rip="3b"></span>
              <span class="eb-dc-ripple" data-rip="4"></span>
            </div>
            <div class="eb-dc-main">
              ${screens}
              <div class="eb-dc-toast">
                <span class="eb-dc-toast-inner">${icon(CHECK_PATH, 'eb-dc-toast-icon')}<span>Connected</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-dc'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm: with "open bookmark on double click" on, a single click on a bookmark only marks the row, a double click opens the session in a new tab, and a group still expands on one click')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    panel: root.querySelector('.eb-dc-panel'),
    children: root.querySelector('.eb-dc-children'),
    expander: root.querySelector('.eb-dc-expander'),
    ptr: root.querySelector('.eb-dc-ptr'),
    settings: root.querySelector('.eb-dc-settings'),
    toast: root.querySelector('.eb-dc-toast'),
    chipSel: root.querySelector('.eb-dc-chip.is-sel'),
    chipOpen: root.querySelector('.eb-dc-chip.is-open'),
    chipGroup: root.querySelector('.eb-dc-chip.is-group'),
    tabLocal: root.querySelector('[data-tab="t-local"]'),
    tabProd: root.querySelector('[data-tab="t-prod"]'),
    tabStg: root.querySelector('[data-tab="t-stg"]'),
    screens: {
      local: root.querySelector('[data-screen="local"]'),
      prod: root.querySelector('[data-screen="prod"]'),
      stg: root.querySelector('[data-screen="stg"]')
    },
    rows: {},
    rips: {}
  }
  for (const r of ROWS.concat(GROUP_CHILDREN)) {
    el.rows[r.id] = root.querySelector('[data-row="' + r.id + '"]')
  }
  el.rows[GROUP_ID] = root.querySelector('[data-row="' + GROUP_ID + '"]')
  for (const rip of root.querySelectorAll('[data-rip]')) {
    el.rips[rip.getAttribute('data-rip')] = rip
  }

  // 1em === 1% of the banner width, so the whole design scales with it.
  const fit = () => {
    const w = root.clientWidth
    if (w) root.style.fontSize = (w / 100) + 'px'
  }
  fit()

  // Click points are read off the real rows rather than hard-coded, so the
  // pointer and the ripples stay on their targets at any scale. Measured in
  // banner-em (the panel's own font-size is 1em) and re-measured on resize.
  let pts = {}
  const measure = () => {
    const unit = root.clientWidth / 100
    if (!unit) return
    const base = el.panel.getBoundingClientRect()
    const at = (id, fx) => {
      const r = el.rows[id].getBoundingClientRect()
      return {
        x: (r.left - base.left + r.width * fx) / unit,
        y: (r.top - base.top + r.height * 0.55) / unit
      }
    }
    pts = {
      prod: at('prod-web', 0.46),
      stg: at('staging', 0.46),
      group: at(GROUP_ID, 0.2)
    }
  }
  measure()
  if (window.ResizeObserver) {
    new window.ResizeObserver(() => {
      fit()
      measure()
    }).observe(root)
  } else {
    window.addEventListener('resize', () => {
      fit()
      measure()
    })
  }

  // A chip's life is in-past out-past: it fades in, holds, then fades out, so
  // no beat can leave a label stranded on the banner.
  const chip = (t, from, to, outFrom, outTo) =>
    (easeOut(seg(t, from, to)) * (1 - easeInOut(seg(t, outFrom, outTo)))).toFixed(3)

  // The pointer arrives, waits, then moves on: one helper for all three stops.
  const travel = (t, from, to, prev, next) => {
    const p = easeInOut(seg(t, from, to))
    return {
      x: prev.x + (next.x - prev.x) * p,
      y: prev.y + (next.y - prev.y) * p
    }
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))

    // the setting itself: the card arrives, then the toggle flips on
    const swP = easeInOut(seg(t, T.swFrom, T.swTo))
    el.settings.style.opacity = swP.toFixed(3)
    el.settings.style.transform = 'translateX(' + ((1 - swP) * 3).toFixed(3) + 'em)'
    root.classList.toggle('is-on', t >= T.flipTo)

    // ---- the pointer, walking from the first bookmark to the group row
    const out = { x: pts.prod.x + 9, y: pts.prod.y + 5 }
    let pos = travel(t, T.ptrIn1From, T.ptrIn1To, out, pts.prod)
    if (t >= T.ptrIn2From) pos = travel(t, T.ptrIn2From, T.ptrIn2To, pts.prod, pts.stg)
    if (t >= T.ptrIn3From) pos = travel(t, T.ptrIn3From, T.ptrIn3To, pts.stg, pts.group)
    el.ptr.style.opacity = (seg(t, T.ptrIn1From, T.ptrIn1From + 220) * (1 - gone)).toFixed(3)
    el.ptr.style.left = (pos.x - 0.18).toFixed(3) + 'em'
    el.ptr.style.top = (pos.y - 0.2).toFixed(3) + 'em'

    // ---- the ripples: one per press, so a double click reads as two
    const rip = (el2, at, pt) => {
      const p = seg(t, at, at + 430)
      if (p <= 0 || p >= 1) {
        el2.style.opacity = '0'
        // collapse it rather than leaving it at its final scale, or the panel
        // reports a permanent overflow for the rest of the loop
        el2.style.transform = 'translate(-50%, -50%) scale(0)'
        return
      }
      el2.style.opacity = ((1 - p) * 0.9 * (1 - gone)).toFixed(3)
      el2.style.transform = 'translate(-50%, -50%) scale(' + (0.35 + p * 2.6).toFixed(3) + ')'
      el2.style.left = pt.x.toFixed(3) + 'em'
      el2.style.top = pt.y.toFixed(3) + 'em'
    }
    rip(el.rips['1'], T.click1From, pts.prod)
    rip(el.rips['2a'], T.click2aFrom, pts.prod)
    rip(el.rips['2b'], T.click2bFrom, pts.prod)
    rip(el.rips['3a'], T.click3aFrom, pts.stg)
    rip(el.rips['3b'], T.click3bFrom, pts.stg)
    rip(el.rips['4'], T.groupFrom, pts.group)

    // ---- the rows. Hover and .selected look the same in the app (both #000),
    // which is exactly the point: a single click looks like a click.
    const selP = seg(t, T.click1From, T.click1From + 160) * (1 - seg(t, T.openFrom, T.openFrom + 160))
    const flashP = seg(t, T.click2bFrom, T.click2bFrom + 120) *
      (1 - easeOut(seg(t, T.click2bFrom + 380, T.click2bFrom + 880)))
    const hover1 = seg(t, T.ptrIn1From, T.ptrIn1To) * (1 - seg(t, T.ptrIn2From, T.ptrIn2From + 200))
    const row1 = el.rows['prod-web']
    row1.classList.toggle('is-hover', hover1 > 0.5 && selP < 0.5)
    row1.classList.toggle('is-active', selP > 0.5)
    row1.classList.toggle('is-flash', flashP > 0.15)

    const flash2 = seg(t, T.click3bFrom, T.click3bFrom + 120) *
      (1 - easeOut(seg(t, T.click3bFrom + 380, T.click3bFrom + 880)))
    const hover2 = seg(t, T.ptrIn2From, T.ptrIn2To) * (1 - seg(t, T.ptrIn3From, T.ptrIn3From + 200))
    const row2 = el.rows.staging
    row2.classList.toggle('is-hover', hover2 > 0.5)
    row2.classList.toggle('is-flash', flash2 > 0.15)

    const hover3 = seg(t, T.ptrIn3From, T.ptrIn3To)
    const row3 = el.rows[GROUP_ID]
    row3.classList.toggle('is-hover', hover3 > 0.5)
    row3.classList.toggle('is-active', seg(t, T.groupFrom, T.groupFrom + 160) > 0.5)

    // ---- a group still expands on one click (a double click is ignored)
    const gp = easeOut(seg(t, T.groupFrom, T.groupTo))
    el.children.style.maxHeight = (3.2 * gp).toFixed(3) + 'em'
    el.expander.style.transform = 'rotate(' + (90 * gp).toFixed(1) + 'deg)'

    // ---- the tabs. A new tab grows into the bar and takes the focus.
    const p2 = easeOut(seg(t, T.openFrom, T.openTo))
    const p3 = easeOut(seg(t, T.open2From, T.open2To))
    const grow = (tabEl, p) => {
      tabEl.style.maxWidth = (13 * p).toFixed(3) + 'em'
      tabEl.style.paddingLeft = (0.7 * p).toFixed(3) + 'em'
      tabEl.style.paddingRight = (0.7 * p).toFixed(3) + 'em'
      tabEl.style.opacity = p.toFixed(3)
    }
    grow(el.tabProd, p2)
    grow(el.tabStg, p3)
    el.tabLocal.classList.toggle('is-active', p2 < 0.5)
    el.tabProd.classList.toggle('is-active', p2 >= 0.5 && p3 < 0.5)
    el.tabStg.classList.toggle('is-active', p3 >= 0.5)

    // ---- the session area switches to the session that just opened
    const locP = 1 - easeOut(seg(t, T.openFrom, T.openFrom + 320))
    const prodP = easeOut(seg(t, T.openFrom + 260, T.openFrom + 560)) *
      (1 - easeOut(seg(t, T.open2From, T.open2From + 320)))
    const stgP = easeOut(seg(t, T.open2From + 260, T.open2From + 560))
    el.screens.local.style.opacity = locP.toFixed(3)
    el.screens.prod.style.opacity = prodP.toFixed(3)
    el.screens.stg.style.opacity = stgP.toFixed(3)

    // ---- the "Connected" toast, on each open
    const toastP = Math.max(
      seg(t, T.openFrom + 120, T.openFrom + 420) * (1 - easeOut(seg(t, T.openFrom + 900, T.openFrom + 1300))),
      seg(t, T.open2From + 120, T.open2From + 420) * (1 - easeOut(seg(t, T.open2From + 900, T.open2From + 1300)))
    )
    el.toast.style.opacity = (toastP * (1 - gone)).toFixed(3)
    el.toast.style.transform = 'translateX(-50%) translateY(' + ((1 - toastP) * 0.6).toFixed(3) + 'em)'

    // ---- the chips
    el.chipSel.style.opacity = chip(t, T.chipSelFrom, T.chipSelTo, T.chipSelOutFrom, T.chipSelOutTo)
    el.chipOpen.style.opacity = chip(t, T.chipOpenFrom, T.chipOpenTo, T.chipOpenOutFrom, T.chipOpenOutTo)
    el.chipGroup.style.opacity = chip(t, T.chipGroupFrom, T.chipGroupTo, T.chipGroupOutFrom, T.chipGroupOutTo)
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // The most representative single frame: the setting on, the second session
    // opened, and the chip that says what a double click does.
    frame(T.chipOpenFrom + 200)
    el.chipOpen.style.opacity = '1'
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
