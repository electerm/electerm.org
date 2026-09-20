/**
 * Animated banner for the "electerm theme editor" (theme.electerm.org) blog post.
 *
 * Everything is generated here — no image, no GIF, no canvas: the editor panel
 * with its swatch grid and current-colour readout, the electerm window that
 * repaints live, the community board and the cartoon pointer are all plain
 * DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * The story, in three beats:
 *   1. the editor assembles — swatches land in, the preview shows electerm's
 *      shipped default dark theme;
 *   2. a colour is picked: the readout appears, the palette sweeps through the
 *      swatch grid, the theme gets its name, and the real electerm window on
 *      the right repaints with it;
 *   3. "Share to Board" is clicked and the theme drops into the community
 *      board with a heart.
 *
 * Colours and metrics come from the products themselves, not from taste:
 *   theme.electerm.org editor chrome ...... src/styles/parts/base.styl
 *     --editor-bg #0e0e10, --editor-bg-card #16161a, --editor-bg-input #1e1e24,
 *     --editor-border #2a2a30, --editor-text #ddd, --editor-text-light #fff,
 *     --editor-text-dim #888, --editor-primary #08c, --editor-success #06D6A0,
 *     --editor-error #EF476F, --editor-warn #FFD166
 *   theme.electerm.org brand .............. base.styl
 *     --brand-600 #1389fd (also the site theme-color), --brand-500 #3b9af6
 *   the 33 editable keys ................. src/js/lib/theme.js
 *     getUIColorKeys() 12 + getTerminalColorKeys() 21
 *   the two palettes ...................... electerm src/client/common/
 *     theme-defaults.js (defaultThemeDark / defaultThemeDarkTerminal) is what
 *     the editor ships as its starting point; the second one is the theme the
 *     banner "designs", invented here but coherent with the ANSI convention.
 *   electerm window chrome ................ electerm src/client/components/
 *     tabs/tabs.styl, session/session-control.jsx, footer/footer-entry.jsx —
 *     the same geometry the electerm-online banner uses.
 *   icons ................................. @ant-design/icons, plus electerm's
 *     own split-view.jsx and heartbeat.jsx
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + editor + preview (blog post page)
 *   data-eb-banner="card"  -> editor + preview only      (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales to any container.
 */

const STYLE_ID = 'eb-th-style'

// One full pass of the story, in ms.
const PERIOD = 10300

const T = {
  editorIn: 620, // the editor panel rises into place
  swFrom: 320, // the swatches land in, one after another
  swGap: 40,
  swDur: 360,
  prevIn: 1500, // the preview window rises, showing the default theme
  ptr1From: 1900, // the pointer travels to the colour it is about to change
  ptr1To: 2450,
  ringAt: 2500,
  readIn: 2800, // the current-colour readout appears
  morphFrom: 2850, // the palette sweeps the grid
  morphGap: 40,
  morphDur: 620,
  nameFrom: 3100, // the theme gets its name
  nameTo: 4000,
  ptr2From: 4700, // the pointer travels to "Share to Board"
  ptr2To: 5250,
  clickAt: 5400,
  boardIn: 6150, // the community board rises
  cardIn: 6550, // the new theme drops into it
  likeAt: 6650,
  fadeFrom: 9500,
  fadeTo: 10050
}

const NAME = 'Midnight Coast'

// electerm's shipped default dark theme — the editor's own starting point.
// src/client/common/theme-defaults.js (defaultThemeDark, defaultThemeDarkTerminal)
const PAL_A = {
  ui: {
    main: '#121214',
    'main-dark': '#000000',
    'main-light': '#2E3338',
    text: '#dddddd',
    'text-light': '#ffffff',
    'text-dark': '#888888',
    'text-disabled': '#777777',
    primary: '#08c',
    info: '#FFD166',
    success: '#06D6A0',
    error: '#EF476F',
    warn: '#E55934'
  },
  term: {
    background: '#20111b',
    foreground: '#bbbbbb',
    cursor: '#b5bd68',
    black: '#575757',
    red: '#FF2C6D',
    green: '#19f9d8',
    yellow: '#FFB86C',
    blue: '#45A9F9',
    magenta: '#FF75B5',
    cyan: '#B084EB',
    white: '#CDCDCD',
    brightBlack: '#757575',
    brightRed: '#FF2C6D',
    brightGreen: '#19f9d8',
    brightYellow: '#FFCC95',
    brightBlue: '#6FC1FF',
    brightMagenta: '#FF9AC1',
    brightCyan: '#BCAAFE',
    brightWhite: '#E6E6E6'
  }
}

// The theme the banner designs: a cool teal/navy scheme, visibly different from
// the default so the repaint reads as a repaint.
const PAL_B = {
  ui: {
    main: '#0b1a24',
    'main-dark': '#061119',
    'main-light': '#16303d',
    text: '#cfe3ea',
    'text-light': '#ffffff',
    'text-dark': '#7d97a3',
    'text-disabled': '#5c7480',
    primary: '#2bb3c0',
    info: '#FFD166',
    success: '#4FD6A8',
    error: '#EF476F',
    warn: '#F4A259'
  },
  term: {
    background: '#07171f',
    foreground: '#cfe3ea',
    cursor: '#7fe3d4',
    black: '#14313c',
    red: '#FF6B81',
    green: '#4FD6A8',
    yellow: '#FFCF7A',
    blue: '#5CC8FF',
    magenta: '#C39BFF',
    cyan: '#59D6D0',
    white: '#D7E6EC',
    brightBlack: '#3c5c68',
    brightRed: '#FF8F9E',
    brightGreen: '#7FE6BF',
    brightYellow: '#FFDF9E',
    brightBlue: '#8ED8FF',
    brightMagenta: '#D9BCFF',
    brightCyan: '#8FE6E0',
    brightWhite: '#EEF7F9'
  }
}

// The swatch grid: 6 UI keys, then the 16 ANSI slots in two rows. The first
// entry is the one the pointer picks, so the sweep starts where the story does.
const SWATCHES = [
  { sec: 'ui', key: 'main', label: 'main' },
  { sec: 'ui', key: 'primary', label: 'primary' },
  { sec: 'ui', key: 'success', label: 'success' },
  { sec: 'ui', key: 'error', label: 'error' },
  { sec: 'ui', key: 'warn', label: 'warn' },
  { sec: 'ui', key: 'info', label: 'info' },
  { sec: 'term', key: 'black', label: 'black' },
  { sec: 'term', key: 'red', label: 'red' },
  { sec: 'term', key: 'green', label: 'green' },
  { sec: 'term', key: 'yellow', label: 'yellow' },
  { sec: 'term', key: 'blue', label: 'blue' },
  { sec: 'term', key: 'magenta', label: 'magenta' },
  { sec: 'term', key: 'cyan', label: 'cyan' },
  { sec: 'term', key: 'white', label: 'white' },
  { sec: 'term', key: 'brightBlack', label: 'bBlk' },
  { sec: 'term', key: 'brightRed', label: 'bRed' },
  { sec: 'term', key: 'brightGreen', label: 'bGrn' },
  { sec: 'term', key: 'brightYellow', label: 'bYel' },
  { sec: 'term', key: 'brightBlue', label: 'bBlu' },
  { sec: 'term', key: 'brightMagenta', label: 'bMag' },
  { sec: 'term', key: 'brightCyan', label: 'bCyn' },
  { sec: 'term', key: 'brightWhite', label: 'bWht' }
]

const TARGET = 0

// The community board, as it looks once the new theme has landed.
const CARDS = [
  { name: NAME, like: 1, chips: ['#0b1a24', '#2bb3c0', '#4FD6A8', '#EF476F', '#F4A259', '#cfe3ea'], isNew: true },
  { name: 'Solar Paper', like: 7, chips: ['#fdf6e3', '#eee8d5', '#586e75', '#268bd2', '#859900', '#d33682'] },
  { name: 'Nord Deep', like: 3, chips: ['#2e3440', '#3b4252', '#d8dee9', '#88c0d0', '#a3be8c', '#bf616a'] }
]

// A cartoon arrow cursor, the same shape the other banners use.
const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

// @ant-design/icons paths, viewBox "64 64 896 896" — the glyphs the app renders.
const ICON = {
  skin: 'M870 126H663.8c-17.4 0-32.9 11.9-37 29.3C614.3 208.1 567 246 512 246s-102.3-37.9-114.8-90.7a37.93 37.93 0 00-37-29.3H154a44 44 0 00-44 44v252a44 44 0 0044 44h75v388a44 44 0 0044 44h478a44 44 0 0044-44V466h75a44 44 0 0044-44V170a44 44 0 00-44-44zm-28 268H723v432H285V394H170V200h121.4c27.6 72.5 96.4 118 220.6 118 124.2 0 193-45.5 220.6-118H842v194z',
  robot: 'M300 328a60 60 0 10120 0 60 60 0 10-120 0zM852 64H172c-17.7 0-32 14.3-32 32v170c0 17.7 14.3 32 32 32h680c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zm-40 160H212V104h600v120zm40 320H172c-17.7 0-32 14.3-32 32v170c0 17.7 14.3 32 32 32h680c17.7 0 32-14.3 32-32V576c0-17.7-14.3-32-32-32zm-40 160H212V616h600v120zM652 328a60 60 0 10120 0 60 60 0 10-120 0zM482 448h60c4.4 0 8 3.6 8 8v160c0 4.4-3.6 8-8 8h-60c-4.4 0-8-3.6-8-8V456c0-4.4 3.6-8 8-8zM312 464h60c4.4 0 8 3.6 8 8v160c0 4.4-3.6 8-8 8h-60c-4.4 0-8-3.6-8-8V472c0-4.4 3.6-8 8-8z',
  plus: 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z',
  caret: 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z',
  close: 'M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z',
  clip: 'M779.3 196.6c-94.2-94.2-247.6-94.2-341.7 0l-261 260.8c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l261-260.8c32.4-32.4 75.5-50.2 121.3-50.2s88.9 17.8 121.2 50.2c32.4 32.4 50.2 75.5 50.2 121.2 0 45.8-17.8 88.8-50.2 121.2l-266 265.9-43.1 43.1c-40.3 40.3-105.8 40.3-146.1 0-19.5-19.5-30.2-45.4-30.2-73s10.7-53.5 30.2-73l263.9-263.8c6.7-6.6 15.5-10.3 24.9-10.3h.1c9.4 0 18.1 3.7 24.7 10.3 6.7 6.7 10.3 15.5 10.3 24.9 0 9.3-3.7 18.1-10.3 24.7L372.4 653c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l215.6-215.6c19.9-19.9 30.8-46.3 30.8-74.4s-11-54.6-30.8-74.4c-41.1-41.1-107.9-41-149 0L463 364 224.8 602.1A172.22 172.22 0 00174 724.8c0 46.3 18.1 89.8 50.8 122.5 33.9 33.8 78.3 50.7 122.7 50.7 44.4 0 88.8-16.9 122.6-50.7l309.2-309C824.8 492.7 850 432 850 367.5c.1-64.6-25.1-125.3-70.7-170.9z',
  broadcast: 'M908 640H804V488c0-4.4-3.6-8-8-8H548v-96h108c8.8 0 16-7.2 16-16V80c0-8.8-7.2-16-16-16H368c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h108v96H228c-4.4 0-8 3.6-8 8v152H116c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h288c8.8 0 16-7.2 16-16V656c0-8.8-7.2-16-16-16H292v-88h440v88H620c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h288c8.8 0 16-7.2 16-16V656c0-8.8-7.2-16-16-16zm-564 76v168H176V716h168zm84-408V140h168v168H428zm420 576H680V716h168v168z',
  fullscreen: 'M290 236.4l43.9-43.9a8.01 8.01 0 00-4.7-13.6L169 160c-5.1-.6-9.5 3.7-8.9 8.9L179 329.1c.8 6.6 8.9 9.4 13.6 4.7l43.7-43.7L370 423.7c3.1 3.1 8.2 3.1 11.3 0l42.4-42.3c3.1-3.1 3.1-8.2 0-11.3L290 236.4zm352.7 187.3c3.1 3.1 8.2 3.1 11.3 0l133.7-133.6 43.7 43.7a8.01 8.01 0 0013.6-4.7L863.9 169c.6-5.1-3.7-9.5-8.9-8.9L694.8 179c-6.6.8-9.4 8.9-4.7 13.6l43.9 43.9L600.3 370a8.03 8.03 0 000 11.3l42.4 42.4zM845 694.9c-.8-6.6-8.9-9.4-13.6-4.7l-43.7 43.7L654 600.3a8.03 8.03 0 00-11.3 0l-42.4 42.3a8.03 8.03 0 000 11.3L734 787.6l-43.9 43.9a8.01 8.01 0 004.7 13.6L855 864c5.1.6 9.5-3.7 8.9-8.9L845 694.9zm-463.7-94.6a8.03 8.03 0 00-11.3 0L236.3 733.9l-43.7-43.7a8.01 8.01 0 00-13.6 4.7L160.1 855c-.6 5.1 3.7 9.5 8.9 8.9L329.2 845c6.6-.8 9.4-8.9 4.7-13.6L290 787.6 423.7 654c3.1-3.1 3.1-8.2 0-11.3l-42.4-42.4z',
  search: 'M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z',
  history: 'M536.1 273H488c-4.4 0-8 3.6-8 8v275.3c0 2.6 1.2 5 3.3 6.5l165.3 120.7c3.6 2.6 8.6 1.9 11.2-1.7l28.6-39c2.7-3.7 1.9-8.7-1.7-11.2L544.1 528.5V281c0-4.4-3.6-8-8-8zm219.8 75.2l156.8 38.3c5 1.2 9.9-2.6 9.9-7.7l.8-161.5c0-6.7-7.7-10.5-12.9-6.3L752.9 334.1a8 8 0 003 14.1zm167.7 301.1l-56.7-19.5a8 8 0 00-10.1 4.8c-1.9 5.1-3.9 10.1-6 15.1-17.8 42.1-43.3 80-75.9 112.5a353 353 0 01-112.5 75.9 352.18 352.18 0 01-137.7 27.8c-47.8 0-94.1-9.3-137.7-27.8a353 353 0 01-112.5-75.9c-32.5-32.5-58-70.4-75.9-112.5A353.44 353.44 0 01171 512c0-47.8 9.3-94.2 27.8-137.8 17.8-42.1 43.3-80 75.9-112.5a353 353 0 01112.5-75.9C430.6 167.3 477 158 524.8 158s94.1 9.3 137.7 27.8A353 353 0 01775 261.7c10.2 10.3 19.8 21 28.6 32.3l59.8-46.8C784.7 146.6 662.2 81.9 524.6 82 285 82.1 92.6 276.7 95 516.4 97.4 751.9 288.9 942 524.8 942c185.5 0 343.5-117.6 403.7-282.3 1.5-4.2-.7-8.9-4.9-10.4z',
  func: 'M841 370c3-3.3 2.7-8.3-.6-11.3a8.24 8.24 0 00-5.3-2.1h-72.6c-2.4 0-4.6 1-6.1 2.8L633.5 504.6a7.96 7.96 0 01-13.4-1.9l-63.5-141.3a7.9 7.9 0 00-7.3-4.7H380.7l.9-4.7 8-42.3c10.5-55.4 38-81.4 85.8-81.4 18.6 0 35.5 1.7 48.8 4.7l14.1-66.8c-22.6-4.7-35.2-6.1-54.9-6.1-103.3 0-156.4 44.3-175.9 147.3l-9.4 49.4h-97.6c-3.8 0-7.1 2.7-7.8 6.4L181.9 415a8.07 8.07 0 007.8 9.7H284l-89 429.9a8.07 8.07 0 007.8 9.7H269c3.8 0 7.1-2.7 7.8-6.4l89.7-433.1h135.8l68.2 139.1c1.4 2.9 1 6.4-1.2 8.8l-180.6 203c-2.9 3.3-2.6 8.4.7 11.3 1.5 1.3 3.4 2 5.3 2h72.7c2.4 0 4.6-1 6.1-2.8l123.7-146.7c2.8-3.4 7.9-3.8 11.3-1 .9.8 1.6 1.7 2.1 2.8L676.4 784c1.3 2.8 4.1 4.7 7.3 4.7h64.6a8.02 8.02 0 007.2-11.5l-95.2-198.9c-1.4-2.9-.9-6.4 1.3-8.8L841 370z',
  chart: 'M888 792H200V168c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v688c0 4.4 3.6 8 8 8h752c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm-600-80h56c4.4 0 8-3.6 8-8V560c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v144c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V384c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v320c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V462c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v242c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V304c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v400c0 4.4 3.6 8 8 8z',
  heart: 'M923 283.6a260.04 260.04 0 00-56.9-82.8 264.4 264.4 0 00-84-55.5A265.34 265.34 0 00679.7 128c-38.1 0-75.4 7.5-109.8 22.3a274.6 274.6 0 00-87.7 60.8l-12.1 12.5-12.1-12.5a260.5 260.5 0 00-87.7-60.8C335.9 135.5 298.6 128 260.5 128c-38.2 0-75.5 7.5-109.9 22.3-33.4 14.3-63.3 34.9-88.9 61-25.6 26.1-45.7 56.4-59.9 90.5A278.3 278.3 0 000 416.5c0 39.6 7.7 77.2 22.9 111.6 12.8 29.6 31.5 57 55.5 81.5l356.2 358.5c12.2 12.3 29.7 19.4 47.8 19.4 18.1 0 35.6-7.1 47.7-19.4L886 609.6c24-24.5 42.7-51.9 55.5-81.5C956.3 493.7 964 456.1 964 416.5c0-37.9-7.4-74.7-22-109zM480 920.7L193.5 563.1C173 543.9 157.4 522 147 497.9c-12.1-27.9-18.2-57.8-18.2-88.6 0-30 5.8-59 17.3-86.3 11.1-26.5 27.2-50.3 47.8-70.8 20.6-20.4 44.6-36.5 71.4-47.8 27.7-11.7 57.2-17.7 87.8-17.7 32.3 0 63.7 6.5 93.2 19.3 29 12.5 55 30.9 77.2 54.4l73.9 76.5 73.9-76.5c22.2-23.5 48.2-41.9 77.2-54.4 29.5-12.8 60.9-19.3 93.2-19.3 30.6 0 60.1 6 87.8 17.7 26.8 11.3 50.8 27.4 71.4 47.8 20.6 20.5 36.7 44.3 47.8 70.8 11.5 27.3 17.3 56.3 17.3 86.3 0 30.8-6.1 60.7-18.2 88.6-10.4 24.1-26 46-46.5 65.2L480 920.7z'
}

const icon = (path, cls) =>
  '<svg class="' + cls + '" viewBox="64 64 896 896" aria-hidden="true"><path d="' + path + '"/></svg>'

const CSS = `
.eb-th {
  /* theme.electerm.org's editor chrome — src/styles/parts/base.styl */
  --eb-th-ed-bg: #0e0e10;
  --eb-th-ed-card: #16161a;
  --eb-th-ed-input: #1e1e24;
  --eb-th-ed-border: #2a2a30;
  --eb-th-ed-text: #ddd;
  --eb-th-ed-text-light: #fff;
  --eb-th-ed-dim: #888;
  --eb-th-ed-primary: #08c;
  --eb-th-ed-success: #06d6a0;
  /* the site's brand ramp — --brand-500 / --brand-600 */
  --eb-th-brand: #1389fd;
  --eb-th-brand-light: #3b9af6;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #eef6ff 0%, #f7faff 48%, #f0f8f6 100%);
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}

/* ---------- background decoration ---------- */
.eb-th-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-th-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(19, 137, 253, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-th-drift 34s linear infinite;
}
@keyframes eb-th-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-th-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.7); }
.eb-th-blob-a { width: 30em; height: 30em; right: -10em; top: -13em; }
.eb-th-blob-b { width: 22em; height: 22em; left: -7em; bottom: -9em; }

/* ---------- headline ---------- */
.eb-th-head { position: absolute; left: 4.5em; right: 4.5em; top: 3em; }
.eb-th-brand {
  display: inline-block;
  font-size: 1.5em;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #0f172a;
}
.eb-th-brand i { font-style: normal; color: var(--eb-th-brand); }
.eb-th-h1 {
  margin: 0.22em 0 0;
  font-size: 2.9em;
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-th-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #1389fd, #3b9af6 58%, #06d6a0);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-th-sub {
  margin: 0.5em 0 0;
  max-width: 84em;
  font-size: 1.4em;
  line-height: 1.45;
  color: #4b5563;
}

/* ---------- the editor panel ---------- */
.eb-th-ed {
  position: absolute;
  left: 4.5em;
  top: 13.8em;
  bottom: 3.2em;
  width: 38em;
  display: flex;
  flex-direction: column;
  padding: 1.5em;
  border-radius: 0.7em;
  background: var(--eb-th-ed-bg);
  border: 1px solid #000;
  box-shadow: 0 1.1em 2.2em rgba(15, 23, 42, 0.22);
  color: var(--eb-th-ed-text);
  text-align: left;
  opacity: 0;
}
.eb-th-ed-head { display: flex; align-items: center; gap: 0.6em; }
.eb-th-ed-logo { display: inline-flex; width: 1.5em; height: 1.5em; color: var(--eb-th-brand); }
.eb-th-ed-logo svg { width: 100%; height: 100%; fill: currentColor; }
.eb-th-ed-name { font-size: 1.25em; font-weight: 700; color: var(--eb-th-ed-text-light); }
.eb-th-ed-ai {
  display: inline-flex;
  align-items: center;
  gap: 0.32em;
  margin-left: auto;
  padding: 0.28em 0.62em;
  border-radius: 0.9em;
  background: rgba(8, 136, 204, 0.16);
  border: 1px solid rgba(8, 136, 204, 0.5);
  font-size: 0.9em;
  font-weight: 700;
  line-height: 1;
  color: #4ec3ff;
}
.eb-th-ed-ai svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-th-ed-field {
  display: flex;
  align-items: center;
  gap: 0.4em;
  margin-top: 0.85em;
  height: 2.6em;
  padding: 0 0.8em;
  border-radius: 0.32em;
  background: var(--eb-th-ed-input);
  border: 1px solid var(--eb-th-ed-border);
  font-size: 1.05em;
  line-height: 1;
}
.eb-th-ed-field-label { color: var(--eb-th-ed-dim); font-size: 0.88em; }
.eb-th-ed-field-val { color: var(--eb-th-ed-text-light); font-weight: 600; }
.eb-th-ed-field-caret {
  width: 1px;
  height: 1.1em;
  background: var(--eb-th-ed-text-light);
  opacity: 0;
}
/* the three editor tabs: color picker / text / AI */
.eb-th-ed-tabs {
  display: flex;
  align-items: stretch;
  gap: 0.3em;
  margin-top: 1.1em;
  padding-bottom: 0.6em;
  border-bottom: 1px solid var(--eb-th-ed-border);
  font-size: 1.05em;
  line-height: 1;
}
.eb-th-ed-tab {
  padding: 0.45em 0.75em;
  border-radius: 0.28em;
  color: var(--eb-th-ed-dim);
}
.eb-th-ed-tab.is-active {
  background: var(--eb-th-ed-input);
  color: var(--eb-th-ed-text-light);
  font-weight: 600;
}
.eb-th-ed-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-top: 1.1em;
  min-height: 0;
}
.eb-th-ed-group { display: block; }
.eb-th-ed-label {
  margin-bottom: 0.55em;
  font-size: 0.95em;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--eb-th-ed-dim);
}
/* The grid is fluid rather than fixed-width: the card variant is a narrower
   panel (36em against 38em), and 8 fixed chips would run off its right edge.
   Eight columns, so the 6 UI chips line up with the first six of the ANSI rows. */
.eb-th-row { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 0.6em; }
.eb-th-row + .eb-th-row { margin-top: 0.7em; }
.eb-th-sw {
  position: relative;
  min-width: 0;
  opacity: 0;
}
.eb-th-sw-chip {
  display: block;
  width: 100%;
  height: 3.7em;
  border-radius: 0.28em;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
}
.eb-th-sw-key {
  display: block;
  margin-top: 0.28em;
  font-size: 0.76em;
  line-height: 1.2;
  color: var(--eb-th-ed-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* the swatch the pointer picks gets a ring while it is being edited */
.eb-th-sw-ring {
  position: absolute;
  left: -0.28em;
  right: -0.28em;
  top: -0.28em;
  height: 4.26em;
  border: 0.18em solid var(--eb-th-brand);
  border-radius: 0.42em;
  opacity: 0;
}
.eb-th-ed-foot { display: block; }
/* the current-colour readout — what a picker shows for the selected swatch */
.eb-th-ed-read {
  display: flex;
  align-items: center;
  gap: 0.5em;
  height: 2.5em;
  padding: 0 0.7em;
  border-radius: 0.32em;
  background: var(--eb-th-ed-card);
  border: 1px solid var(--eb-th-ed-border);
  font-size: 1em;
  line-height: 1;
  opacity: 0;
}
.eb-th-ed-read-chip {
  flex: none;
  width: 1.3em;
  height: 1.3em;
  border-radius: 0.2em;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: #121214;
}
.eb-th-ed-read-key { color: var(--eb-th-ed-dim); font-size: 0.88em; }
.eb-th-ed-read-val {
  margin-left: auto;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  font-size: 0.95em;
  color: var(--eb-th-ed-text-light);
}
.eb-th-ed-btns { display: flex; align-items: center; gap: 0.5em; margin-top: 1em; }
.eb-th-btn {
  position: relative;
  padding: 0.62em 0.95em;
  border-radius: 0.32em;
  background: var(--eb-th-ed-input);
  border: 1px solid var(--eb-th-ed-border);
  font-size: 0.95em;
  font-weight: 600;
  line-height: 1;
  color: var(--eb-th-ed-text);
  white-space: nowrap;
}
.eb-th-btn.is-primary {
  background: var(--eb-th-ed-primary);
  border-color: var(--eb-th-ed-primary);
  color: #fff;
}
/* the click ripple lives inside the button, so it is centred on the button
   rather than on the row — 1em here is the button font */
.eb-th-btn-ripple {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1.4em;
  height: 1.4em;
  margin: -0.7em 0 0 -0.7em;
  border: 0.12em solid #fff;
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
}

/* ---------- the live preview ---------- */
.eb-th-right { position: absolute; left: 44.5em; right: 4.5em; top: 13.8em; bottom: 3.2em; }
.eb-th-cap {
  display: flex;
  align-items: center;
  gap: 0.45em;
  height: 1.7em;
  margin-bottom: 0.7em;
  font-size: 1.15em;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1;
  color: #64748b;
}
.eb-th-cap-dot {
  width: 0.55em;
  height: 0.55em;
  border-radius: 50%;
  background: var(--eb-th-ed-success);
  box-shadow: 0 0 0 0.22em rgba(6, 214, 160, 0.2);
}
.eb-th-cap-tag {
  margin-left: auto;
  padding: 0.2em 0.55em;
  border-radius: 0.8em;
  background: rgba(19, 137, 253, 0.1);
  color: var(--eb-th-brand);
  font-size: 0.82em;
  letter-spacing: 0;
  text-transform: none;
}
.eb-th-app {
  border-radius: 0.6em;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.14);
  box-shadow: 0 1em 2em rgba(15, 23, 42, 0.16);
  opacity: 0;
}
/* tab bar — 1em here is the tab font, as in tabs.styl (36px bar, 14px font) */
.eb-th-tabbar {
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-th-ui-main-dark);
  font-size: 1.2em;
  line-height: 1;
}
.eb-th-tab {
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
  background: var(--eb-th-ui-main-dark);
  color: var(--eb-th-ui-text-dark);
  white-space: nowrap;
}
.eb-th-tab.is-active {
  background: var(--eb-th-ui-main);
  color: var(--eb-th-ui-text);
  font-weight: 700;
}
.eb-th-tab-status {
  position: absolute;
  left: 0.14em;
  top: 0.14em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-th-ui-success);
}
.eb-th-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-th-ui-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-th-tab-close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15em;
  height: 1.15em;
  border-radius: 50%;
  background: var(--eb-th-ui-main);
  color: var(--eb-th-ui-text);
}
.eb-th-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-th-tab-add,
.eb-th-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  height: 1.6em;
  color: var(--eb-th-ui-text);
}
.eb-th-tab-add { width: 1.5em; margin-left: 0.3em; }
.eb-th-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-th-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-th-ui-text-dark); }
.eb-th-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }

/* session control bar — one per session; --main, 32px line-height, 0 10px padding */
.eb-th-ctrl {
  display: flex;
  align-items: center;
  height: 2.29em;
  padding: 0 0.71em;
  background: var(--eb-th-ui-main);
  font-size: 1.2em;
  line-height: 1;
  color: var(--eb-th-ui-text);
}
.eb-th-pane-tab { padding-right: 1.43em; color: var(--eb-th-ui-text-dark); }
.eb-th-pane-tab.is-active {
  color: var(--eb-th-ui-text);
  border-bottom: 1px solid var(--eb-th-ui-text-dark);
}
.eb-th-sess-icons { display: flex; align-items: center; gap: 0.7em; margin-left: 1.1em; }
.eb-th-sess-right { display: flex; align-items: center; gap: 0.7em; margin-left: auto; }
.eb-th-sess-icon { display: inline-flex; width: 1.05em; height: 1.05em; color: var(--eb-th-ui-text-dark); }
.eb-th-sess-icon svg { width: 100%; height: 100%; fill: currentColor; }

/* terminal — 1em here is the terminal font */
.eb-th-term {
  position: relative;
  padding: 1.1em 1.3em 1.2em;
  background: var(--eb-th-term-bg);
  font-size: 2.2em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.45;
  color: var(--eb-th-term-fg);
  white-space: nowrap;
  overflow: hidden;
}
.eb-th-line { line-height: 1.45; }
.eb-th-ps1 { color: var(--eb-th-term-green); }
.eb-th-ps1-path { color: var(--eb-th-term-blue); }
.eb-th-ps1-sep { color: var(--eb-th-term-fg); }
.eb-th-ansi-red { color: var(--eb-th-term-red); }
.eb-th-ansi-yellow { color: var(--eb-th-term-yellow); }
.eb-th-ansi-magenta { color: var(--eb-th-term-magenta); }
.eb-th-ansi-cyan { color: var(--eb-th-term-cyan); }
.eb-th-ansi-blue { color: var(--eb-th-term-brightBlue); }
.eb-th-ansi-white { color: var(--eb-th-term-white); }
/* xterm's cursor: a solid block, cursorBlink is off by default */
.eb-th-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.04em;
  vertical-align: -0.26em;
  background: var(--eb-th-term-cursor);
}

/* footer — 36px --main bar */
.eb-th-footer {
  display: flex;
  align-items: center;
  height: 2.6em;
  padding: 0 0.71em;
  background: var(--eb-th-ui-main);
  border-top: 1px solid var(--eb-th-ui-main-dark);
  font-size: 1.2em;
  line-height: 1;
  color: var(--eb-th-ui-text-dark);
}
.eb-th-funit { display: inline-flex; align-items: center; justify-content: center; margin-right: 0.6em; }
.eb-th-funit svg { width: 1.05em; height: 1.05em; fill: currentColor; }
.eb-th-fq { font-weight: 600; }
.eb-th-batch {
  display: flex;
  align-items: center;
  width: 5.7em;
  height: 1.8em;
  margin-left: 0.2em;
  padding: 0 0.5em;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.2em;
  font-size: 0.9em;
  overflow: hidden;
  white-space: nowrap;
}
.eb-th-fspacer { flex: 1; }
.eb-th-fenc { margin-right: 0.7em; font-size: 0.9em; }

/* ---------- the community board ---------- */
.eb-th-board { margin-top: 1.2em; opacity: 0; }
.eb-th-board-cap {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin-bottom: 0.45em;
  font-size: 1.15em;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1;
  color: #64748b;
}
.eb-th-cards { display: flex; gap: 1em; }
.eb-th-card {
  flex: 1;
  padding: 0.7em;
  border-radius: 0.5em;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 0.5em 1.2em rgba(15, 23, 42, 0.07);
  text-align: left;
  opacity: 0;
}
.eb-th-card.is-new { border-color: var(--eb-th-brand); box-shadow: 0 0.5em 1.4em rgba(19, 137, 253, 0.24); }
.eb-th-card-chips { display: flex; height: 2.9em; border-radius: 0.28em; overflow: hidden; }
.eb-th-card-chip { flex: 1; }
.eb-th-card-name {
  margin-top: 0.55em;
  font-size: 1.05em;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eb-th-card-meta {
  display: flex;
  align-items: center;
  gap: 0.3em;
  margin-top: 0.35em;
  font-size: 0.95em;
  line-height: 1;
  color: #64748b;
}
.eb-th-card-heart { display: inline-flex; width: 1em; height: 1em; color: #94a3b8; }
.eb-th-card-heart svg { width: 100%; height: 100%; fill: currentColor; }
.eb-th-card.is-new .eb-th-card-heart { color: #ef476f; }

/* ---------- the pointer ---------- */
.eb-th-pointer {
  position: absolute;
  width: 1.5em;
  height: 2.1em;
  opacity: 0;
  z-index: 5;
  filter: drop-shadow(0 0.1em 0.18em rgba(0, 0, 0, 0.42));
}

/* ---------- card (blog index) variant ---------- */
.eb-th[data-variant='card'] .eb-th-ed { left: 2em; width: 36em; }
.eb-th[data-variant='card'] .eb-th-right { left: 41em; right: 2em; }
.eb-th[data-variant='card'] .eb-th-term { font-size: 2.35em; }

@media (prefers-reduced-motion: reduce) {
  .eb-th-dots { animation: none !important; }
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

// ---- colour maths: interpolate two palettes, so the repaint is a repaint ----

function parseHex (hex) {
  const h = String(hex).trim().replace('#', '')
  const full = h.length === 3
    ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    : h
  const n = parseInt(full.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex (rgb) {
  return '#' + rgb.map((c) => {
    const v = Math.max(0, Math.min(255, Math.round(c)))
    return (v < 16 ? '0' : '') + v.toString(16)
  }).join('')
}

function mix (a, b, p) {
  const ra = parseHex(a)
  const rb = parseHex(b)
  return toHex([
    ra[0] + (rb[0] - ra[0]) * p,
    ra[1] + (rb[1] - ra[1]) * p,
    ra[2] + (rb[2] - ra[2]) * p
  ])
}

// Resolve one palette key at progress p.
function pal (sec, key, p) {
  const a = PAL_A[sec][key]
  const b = PAL_B[sec][key]
  if (p <= 0) return a
  if (p >= 1) return b
  return mix(a, b, p)
}

function prompt (user, path) {
  return '<span class="eb-th-ps1">' + user + '</span>' +
    '<span class="eb-th-ps1-sep">:</span>' +
    '<span class="eb-th-ps1-path">' + path + '</span>' +
    '<span class="eb-th-ps1-sep">$&nbsp;</span>'
}

const PROMPT = prompt('zxd@web-01', '~')

function renderTab (title, index, active) {
  return '<span class="eb-th-tab' + (active ? ' is-active' : '') + '">' +
    '<span class="eb-th-tab-status"></span>' +
    '<span class="eb-th-tab-count">' + index + '</span>' +
    '<span class="eb-th-tab-name">' + title + '</span>' +
    (active ? '<span class="eb-th-tab-close">' + icon(ICON.close, '') + '</span>' : '') +
    '</span>'
}

function renderSwatch (sw, i) {
  return '<div class="eb-th-sw" data-sw="' + i + '">' +
    '<span class="eb-th-sw-chip"></span>' +
    '<span class="eb-th-sw-key">' + sw.label + '</span>' +
    (i === TARGET ? '<span class="eb-th-sw-ring"></span>' : '') +
    '</div>'
}

function renderRow (from, to) {
  const out = []
  for (let i = from; i < to; i++) out.push(renderSwatch(SWATCHES[i], i))
  return '<div class="eb-th-row">' + out.join('') + '</div>'
}

function renderCard (card) {
  return '<div class="eb-th-card' + (card.isNew ? ' is-new' : '') + '">' +
    '<div class="eb-th-card-chips">' +
    card.chips.map((c) => '<span class="eb-th-card-chip" style="background:' + c + '"></span>').join('') +
    '</div>' +
    '<div class="eb-th-card-name">' + card.name + '</div>' +
    '<div class="eb-th-card-meta">' +
    '<span class="eb-th-card-heart">' + icon(ICON.heart, '') + '</span>' +
    '<span class="eb-th-card-like">' + (card.isNew ? 0 : card.like) + '</span>' +
    '</div>' +
    '</div>'
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-th-head">
        <span class="eb-th-brand">electerm <i>theme editor</i></span>
        <h2 class="eb-th-h1">Design a theme, watch it <em>repaint</em></h2>
        <p class="eb-th-sub">33 colours, a live preview of the real electerm,
        and a board to share it on.</p>
      </div>`
  return `
    <div class="eb-th-deco">
      <span class="eb-th-blob eb-th-blob-a"></span>
      <span class="eb-th-blob eb-th-blob-b"></span>
      <span class="eb-th-dots"></span>
    </div>
    ${head}
    <div class="eb-th-ed">
      <div class="eb-th-ed-head">
        <span class="eb-th-ed-logo">${icon(ICON.skin, '')}</span>
        <span class="eb-th-ed-name">Theme Editor</span>
        <span class="eb-th-ed-ai">${icon(ICON.robot, '')}<span>AI</span></span>
      </div>
      <div class="eb-th-ed-field">
        <span class="eb-th-ed-field-label">name</span>
        <span class="eb-th-ed-field-val"></span>
        <span class="eb-th-ed-field-caret"></span>
      </div>
      <div class="eb-th-ed-tabs">
        <span class="eb-th-ed-tab is-active">Color Picker</span>
        <span class="eb-th-ed-tab">Text</span>
        <span class="eb-th-ed-tab">AI</span>
      </div>
      <div class="eb-th-ed-body">
        <div class="eb-th-ed-group">
          <div class="eb-th-ed-label">UI Colors</div>
          ${renderRow(0, 6)}
        </div>
        <div class="eb-th-ed-group">
          <div class="eb-th-ed-label">Terminal Colors</div>
          ${renderRow(6, 14)}
          ${renderRow(14, 22)}
        </div>
      </div>
      <div class="eb-th-ed-foot">
        <div class="eb-th-ed-read">
          <span class="eb-th-ed-read-chip"></span>
          <span class="eb-th-ed-read-key">main</span>
          <span class="eb-th-ed-read-val"></span>
        </div>
        <div class="eb-th-ed-btns">
          <span class="eb-th-btn">Save</span>
          <span class="eb-th-btn is-primary">Share to Board<span class="eb-th-btn-ripple"></span></span>
          <span class="eb-th-btn">Copy Config</span>
        </div>
      </div>
    </div>
    <div class="eb-th-right">
      <div class="eb-th-cap">
        <span class="eb-th-cap-dot"></span>
        <span>Live Preview</span>
        <span class="eb-th-cap-tag">demo.electerm.org</span>
      </div>
      <div class="eb-th-app">
        <div class="eb-th-tabbar">
          ${renderTab('zxd@web-01:22', 1, true)}
          ${renderTab('zxd@db-01:22', 2, false)}
          <span class="eb-th-tab-add">${icon(ICON.plus, '')}</span>
          <span class="eb-th-tabbar-caret">${icon(ICON.caret, '')}</span>
        </div>
        <div class="eb-th-ctrl">
          <span class="eb-th-pane-tab is-active">SSH</span>
          <span class="eb-th-pane-tab">SFTP</span>
          <span class="eb-th-sess-icons">
            <span class="eb-th-sess-icon">${icon(ICON.clip, '')}</span>
            <span class="eb-th-sess-icon">${SPLIT_VIEW}</span>
            <span class="eb-th-sess-icon">${HEARTBEAT}</span>
            <span class="eb-th-sess-icon">${icon(ICON.broadcast, '')}</span>
          </span>
          <span class="eb-th-sess-right">
            <span class="eb-th-sess-icon">${icon(ICON.fullscreen, '')}</span>
            <span class="eb-th-sess-icon">${icon(ICON.search, '')}</span>
          </span>
        </div>
        <div class="eb-th-term">
          <div class="eb-th-line">${PROMPT}ls --color themes/</div>
          <div class="eb-th-line"><span class="eb-th-ansi-white">nord.txt</span> <span class="eb-th-ansi-blue">midnight.txt</span> <span class="eb-th-ansi-cyan">gruvbox.txt</span></div>
          <div class="eb-th-line">${PROMPT}<span class="eb-th-caret"></span></div>
        </div>
        <div class="eb-th-footer">
          <span class="eb-th-funit">${icon(ICON.history, '')}</span>
          <span class="eb-th-funit eb-th-fq">Q</span>
          <span class="eb-th-funit">${icon(ICON.func, '')}</span>
          <span class="eb-th-batch">batch input</span>
          <span class="eb-th-fspacer"></span>
          <span class="eb-th-fenc">UTF-8</span>
          <span class="eb-th-funit">${icon(ICON.chart, '')}</span>
        </div>
      </div>
      <div class="eb-th-board">
        <div class="eb-th-board-cap">Community Board</div>
        <div class="eb-th-cards">${CARDS.map(renderCard).join('')}</div>
      </div>
    </div>
    <span class="eb-th-pointer"><svg viewBox="-3 -3 29 39" width="100%" height="100%"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>`
}

// electerm's own custom icons — not single paths, so they are written out.
// src/client/components/icons/split-view.jsx (viewBox 0 0 16 16, stroked)
const SPLIT_VIEW = '<svg viewBox="0 0 16 16" aria-hidden="true">' +
  '<rect x="1" y="1" width="14" height="14" stroke="currentColor" stroke-width="1" fill="none"/>' +
  '<line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" stroke-width="1"/>' +
  '<polyline points="3,5 5,7 3,9" stroke="currentColor" stroke-width="1" fill="none"/>' +
  '<path d="M9 4H14V12H9V4Z" stroke="currentColor" stroke-width="1" fill="none"/>' +
  '<path d="M9 6H14" stroke="currentColor" stroke-width="1"/></svg>'
// src/client/components/icons/heartbeat.jsx (viewBox 0 0 1024 1024)
const HEARTBEAT = '<svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">' +
  '<path d="M923 283.6a260.1 260.1 0 00-56.9-82.8 264.4 264.4 0 00-84-55.5A265.3 265.3 0 00679.7 128c-38.1 0-75.4 7.5-109.8 22.3a274.5 274.5 0 00-87.7 60.8l-12.1 12.5-12.1-12.5a260.5 260.5 0 00-87.7-60.8c-34.4-14.8-71.7-22.3-109.8-22.3-38.2 0-75.5 7.5-109.9 22.3-33.4 14.3-63.3 34.9-88.9 61-25.6 26.1-45.7 56.4-59.9 90.5A278.3 278.3 0 000 416.5c0 39.6 7.7 77.2 22.9 111.6 12.8 29.6 31.5 57 55.5 81.5l356.2 358.5c12.2 12.3 29.7 19.4 47.8 19.4 18.1 0 35.6-7.1 47.7-19.4L886 609.6c24-24.5 42.7-51.9 55.5-81.5C956.3 493.7 964 456.1 964 416.5c0-37.9-7.4-74.7-22-109zM880 497.9c-10.4 24.1-26 46-46.5 65.2L480 920.7 193.5 563.1C173 543.9 157.4 522 147 497.9c-12.1-27.9-18.2-57.8-18.2-88.6 0-30 5.8-59 17.3-86.3 11.1-26.5 27.2-50.3 47.8-70.8 20.6-20.4 44.6-36.5 71.4-47.8 27.7-11.7 57.2-17.7 87.8-17.7 32.3 0 63.7 6.5 93.2 19.3 29 12.5 55 30.9 77.2 54.4l73.9 76.5 73.9-76.5c22.2-23.5 48.2-41.9 77.2-54.4 29.5-12.8 60.9-19.3 93.2-19.3 30.6 0 60.1 6 87.8 17.7 26.8 11.3 50.8 27.4 71.4 47.8 20.6 20.5 36.7 44.3 47.8 70.8 11.5 27.3 17.3 56.3 17.3 86.3 0 30.8-6.1 60.7-18.2 88.6z"/>' +
  '<polyline points="160,512 310,512 370,310 450,714 530,512 594,512 654,360 714,664 774,512 864,512" fill="none" stroke="currentColor" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/></svg>'

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-th'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'theme.electerm.org: a colour editor for electerm themes, with a live preview of the ' +
    'real electerm repainting as the palette changes, and the theme landing on the community board')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    ed: root.querySelector('.eb-th-ed'),
    nameVal: root.querySelector('.eb-th-ed-field-val'),
    nameCaret: root.querySelector('.eb-th-ed-field-caret'),
    swatches: Array.prototype.slice.call(root.querySelectorAll('.eb-th-sw')),
    chips: Array.prototype.slice.call(root.querySelectorAll('.eb-th-sw-chip')),
    ring: root.querySelector('.eb-th-sw-ring'),
    read: root.querySelector('.eb-th-ed-read'),
    readChip: root.querySelector('.eb-th-ed-read-chip'),
    readVal: root.querySelector('.eb-th-ed-read-val'),
    share: root.querySelectorAll('.eb-th-btn')[1],
    ripple: root.querySelector('.eb-th-btn-ripple'),
    app: root.querySelector('.eb-th-app'),
    board: root.querySelector('.eb-th-board'),
    cards: Array.prototype.slice.call(root.querySelectorAll('.eb-th-card')),
    hearts: Array.prototype.slice.call(root.querySelectorAll('.eb-th-card-heart')),
    likes: Array.prototype.slice.call(root.querySelectorAll('.eb-th-card-like')),
    pointer: root.querySelector('.eb-th-pointer')
  }

  // The pointer travels between two elements that only exist once the layout is
  // settled, so its keyframes are measured rather than guessed. Everything is
  // expressed as a percentage of the root, which is what the CSS uses.
  const at = { pick: { x: 50, y: 50 }, share: { x: 50, y: 50 } }

  function measure () {
    const box = root.getBoundingClientRect()
    if (!box.width || !box.height) return
    const centre = (node) => {
      if (!node) return null
      const r = node.getBoundingClientRect()
      return {
        x: ((r.left + r.width / 2 - box.left) / box.width) * 100,
        y: ((r.top + r.height / 2 - box.top) / box.height) * 100
      }
    }
    const pick = centre(el.chips[TARGET])
    const share = centre(el.share)
    if (pick) at.pick = pick
    if (share) at.share = share
  }

  // 1em === 1% of the banner width, so the whole design scales with it.
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

  // Cache the last colour written per chip so a 60fps loop does not touch the
  // DOM for values that have not moved.
  const lastFill = []
  let lastAppP = -1
  let lastLike = -1

  function paint (node, colour, cache, i) {
    if (cache[i] === colour) return
    cache[i] = colour
    node.style.background = colour
  }

  function frame (t) {
    const gone = 1 - easeInOut(seg(t, T.fadeFrom, T.fadeTo))

    // the editor panel
    const edIn = easeOut(seg(t, 0, T.editorIn))
    el.ed.style.opacity = (edIn * gone).toFixed(3)
    el.ed.style.transform = 'translateY(' + ((1 - edIn) * 1.4).toFixed(3) + 'em)'

    // the swatches landing in
    el.swatches.forEach((node, i) => {
      const p = easeOut(seg(t, T.swFrom + i * T.swGap, T.swFrom + i * T.swGap + T.swDur))
      node.style.opacity = p.toFixed(3)
      node.style.transform = 'scale(' + (0.7 + 0.3 * easeOutBack(p)).toFixed(3) + ')'
    })

    // the preview window
    const prevIn = easeOut(seg(t, 0, T.prevIn))
    el.app.style.opacity = (prevIn * gone).toFixed(3)
    el.app.style.transform = 'translateY(' + ((1 - prevIn) * 1.6).toFixed(3) + 'em)'

    // ---- the palette sweep -------------------------------------------------
    // Each swatch crosses over on its own clock, ordered outward from the one
    // the pointer picked, so the grid reads as a wave rather than a cut.
    let mainP = 0
    el.chips.forEach((chip, i) => {
      const order = Math.abs(i - TARGET)
      const from = T.morphFrom + order * T.morphGap
      const p = easeInOut(seg(t, from, from + T.morphDur))
      if (i === TARGET) mainP = p
      const sw = SWATCHES[i]
      paint(chip, pal(sw.sec, sw.key, p), lastFill, i)
    })

    // The app repaints as one piece, a beat behind the swatch it came from —
    // cause, then effect. The whole palette is written through CSS custom
    // properties, so this is one style recalculation, not thirty DOM writes.
    const appP = easeInOut(seg(t, T.morphFrom + 260, T.morphFrom + 260 + 900))
    if (appP !== lastAppP) {
      lastAppP = appP
      const set = (name, sec, key) => root.style.setProperty(name, pal(sec, key, appP))
      set('--eb-th-ui-main', 'ui', 'main')
      set('--eb-th-ui-main-dark', 'ui', 'main-dark')
      set('--eb-th-ui-text', 'ui', 'text')
      set('--eb-th-ui-text-dark', 'ui', 'text-dark')
      set('--eb-th-ui-primary', 'ui', 'primary')
      set('--eb-th-ui-success', 'ui', 'success')
      set('--eb-th-term-bg', 'term', 'background')
      set('--eb-th-term-fg', 'term', 'foreground')
      set('--eb-th-term-cursor', 'term', 'cursor')
      set('--eb-th-term-green', 'term', 'green')
      set('--eb-th-term-blue', 'term', 'blue')
      set('--eb-th-term-red', 'term', 'red')
      set('--eb-th-term-yellow', 'term', 'yellow')
      set('--eb-th-term-magenta', 'term', 'magenta')
      set('--eb-th-term-cyan', 'term', 'cyan')
      set('--eb-th-term-white', 'term', 'white')
      set('--eb-th-term-brightBlue', 'term', 'brightBlue')
    }

    // the ring on the picked swatch, and the readout for it. The ring stays up
    // through the whole sweep and only leaves with the pointer.
    const ring = seg(t, T.ringAt, T.ringAt + 260) * (1 - seg(t, 4400, 4900))
    if (el.ring) {
      el.ring.style.opacity = (ring * gone).toFixed(3)
      el.ring.style.transform = 'scale(' + (0.94 + 0.06 * ring).toFixed(3) + ')'
    }
    const readIn = easeOut(seg(t, T.readIn, T.readIn + 320))
    el.read.style.opacity = (readIn * gone).toFixed(3)
    // the readout shows the colour that is actually on screen right now
    const mainNow = pal('ui', 'main', mainP)
    el.readChip.style.background = mainNow
    if (el.readVal.textContent !== mainNow) el.readVal.textContent = mainNow

    // the theme getting its name
    const nameP = easeOut(seg(t, T.nameFrom, T.nameTo))
    const typed = NAME.slice(0, Math.round(nameP * NAME.length))
    if (el.nameVal.textContent !== typed) el.nameVal.textContent = typed
    const naming = t >= T.nameFrom && t < T.nameTo + 260
    el.nameCaret.style.opacity = (naming && Math.floor(t / 420) % 2 === 0 ? 1 : 0) * gone

    // ---- the pointer -------------------------------------------------------
    const toPick = easeOut(seg(t, T.ptr1From, T.ptr1To))
    const toShare = easeOut(seg(t, T.ptr2From, T.ptr2To))
    const px = at.pick.x + (at.share.x - at.pick.x) * toShare
    const py = at.pick.y + (at.share.y - at.pick.y) * toShare
    const fromX = at.pick.x + 26
    const fromY = at.pick.y + 30
    // the pointer leaves once the click has landed — it has said what it came
    // to say, and it is not part of the finished picture
    const ptrOut = 1 - easeInOut(seg(t, 5900, 6400))
    el.pointer.style.opacity = (seg(t, T.ptr1From, T.ptr1From + 260) * ptrOut * gone).toFixed(3)
    el.pointer.style.left = (fromX + (px - fromX) * toPick).toFixed(2) + '%'
    el.pointer.style.top = (fromY + (py - fromY) * toPick).toFixed(2) + '%'

    // the click on "Share to Board": the button presses, a ripple runs out
    const press = seg(t, T.clickAt, T.clickAt + 150)
    const pressBack = seg(t, T.clickAt + 150, T.clickAt + 400)
    el.share.style.transform = 'scale(' + (1 - 0.05 * press + 0.05 * pressBack).toFixed(3) + ')'
    const rip = seg(t, T.clickAt, T.clickAt + 600)
    if (rip < 1) {
      el.ripple.style.opacity = ((1 - rip) * gone).toFixed(3)
      el.ripple.style.transform = 'scale(' + (0.5 + rip * 7).toFixed(3) + ')'
    } else {
      // Collapse it once it has run out. Left at its final scale the ring would
      // sit there invisibly, 7.5x its size, and quietly inflate the panel's
      // scrollable overflow for the rest of the loop.
      el.ripple.style.opacity = '0'
      el.ripple.style.transform = 'scale(0)'
    }

    // ---- the board ---------------------------------------------------------
    const boardIn = easeOut(seg(t, T.boardIn, T.boardIn + 520))
    el.board.style.opacity = (boardIn * gone).toFixed(3)
    el.board.style.transform = 'translateY(' + ((1 - boardIn) * 1.6).toFixed(3) + 'em)'
    el.cards.forEach((card, i) => {
      const from = T.cardIn + i * 130
      const p = easeOut(seg(t, from, from + 460))
      card.style.opacity = (p * gone).toFixed(3)
      card.style.transform = 'translateY(' + ((1 - p) * -1.8).toFixed(3) + 'em)'
    })
    // the new theme's heart beats and its count ticks up
    const beat = seg(t, T.likeAt, T.likeAt + 600)
    el.hearts[0].style.transform = 'scale(' + (1 + 0.55 * Math.sin(beat * Math.PI)).toFixed(3) + ')'
    const like = Math.round(easeOut(seg(t, T.likeAt + 120, T.likeAt + 720)))
    if (like !== lastLike) {
      lastLike = like
      el.likes[0].textContent = String(like)
    }
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // the settled frame: the palette changed, the theme named, the board showing
    frame(T.likeAt + 900)
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
