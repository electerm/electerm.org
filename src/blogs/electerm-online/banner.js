/**
 * Animated banner for the "electerm online" (cloud.electerm.org) blog post.
 *
 * Everything is generated here — no image, no GIF, no canvas: the browser
 * window, its tab strip and address bar, the sign-in card, the electerm app
 * inside the page, the phone and the cartoon pointer are all plain DOM + CSS
 * driven by one requestAnimationFrame timeline.
 *
 * The story, in three beats:
 *   1. a browser tab, the address bar typing cloud.electerm.org, and the
 *      "Sign in with GitHub" card that greets you;
 *   2. the click, and the same electerm UI you get on the desktop, inside the
 *      page — tab bar, per-session control bar, terminal, footer;
 *   3. a phone rising beside it: the same app, the same session, in a mobile
 *      browser.
 *
 * Colours and metrics come from the products themselves, not from taste:
 *   cloud.electerm.org landing page ..... /css/home.css
 *     -- brand accent #08c, logo ink #1a1a2e, body ink #555, hairline #e5e5e5
 *     -- the wordmark is "electerm" with a raised "online" in #08c
 *   electerm UI theme ................... src/client/css/includes/theme.styl,
 *     with the shipped dark theme (src/client/common/theme-defaults.js,
 *     defaultThemeDark) injected over it at runtime — which is where
 *     --main #121214 comes from. --main-lighter is only in theme.styl, so
 *     #5b5a5b is what ships.
 *   terminal palette .................... theme-defaults.js
 *     (defaultThemeDarkTerminal: bg #20111b, fg #bbbbbb, cursor #b5bd68)
 *   tab bar / tabs ...................... src/client/components/tabs/tabs.styl
 *   session control bar ................. src/client/components/session/session-control.jsx
 *     (SSH | SFTP pane tabs, then paperclip / split-view / heartbeat /
 *     broadcast, then fullscreen + search floating right)
 *   footer .............................. src/client/components/footer/footer-entry.jsx
 *     (history, quick commands, triggers, the 100px batch input box, the
 *     encoding select and the info icon, all in a 36px --main bar)
 *   icons ............................... @ant-design/icons, plus electerm's
 *     own split-view.jsx and heartbeat.jsx
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + devices (blog post page)
 *   data-eb-banner="card"  -> devices only        (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales to any container.
 */

const STYLE_ID = 'eb-cl-style'

// One full pass of the story, in ms.
const PERIOD = 9700

const T = {
  appIn: 620, // the browser window rises into place
  urlFrom: 320, // the address bar types the host
  urlTo: 1480,
  lockAt: 1520,
  pageFrom: 620, // the page paints white
  pageTo: 1180,
  gateFrom: 1080, // the sign-in card rises
  gateTo: 1660,
  ptrFrom: 2300, // the pointer travels in from the bottom right
  ptrTo: 2860,
  clickAt: 2960,
  gateOutFrom: 3120, // the card hands over to the app
  gateOutTo: 3580,
  sessFrom: 3560,
  sessTo: 4060,
  tabFrom: 3620, // the three tabs drop in, one after another
  tabGap: 190,
  tabDur: 420,
  typeFrom: 4360, // the command is typed
  typeTo: 5460,
  outFrom: 5720, // ... and its output lands
  outTo: 6180,
  phoneFrom: 6480, // the phone rises beside the window
  phoneTo: 7420,
  plineFrom: 6860, // its screen fills in
  plineGap: 240,
  plineDur: 380,
  fadeFrom: 8800,
  fadeTo: 9250
}

const HOST = 'cloud.electerm.org'
const CMD = 'uptime -p'
const OUT = 'up 6 weeks, 4 days, 3 hours'
const DF = 'df -h /'
const DF_OUT = '/dev/vda1  40G  17G  21G  45% /'
const TAB_TITLES = ['zxd@web-01:22', 'zxd@db-01:22', 'zxd@web-02:22']

// A cartoon arrow cursor, the same shape the other banners use.
const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

// @ant-design/icons paths, viewBox "64 64 896 896" — the glyphs the app itself
// renders. Pulled out of node_modules/@ant-design/icons.
const ICON = {
  lock: 'M832 464h-68V240c0-70.7-57.3-128-128-128H388c-70.7 0-128 57.3-128 128v224h-68c-17.7 0-32 14.3-32 32v384c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V496c0-17.7-14.3-32-32-32zM332 240c0-30.9 25.1-56 56-56h248c30.9 0 56 25.1 56 56v224H332V240zm460 600H232V536h560v304zM484 701v53c0 4.4 3.6 8 8 8h40c4.4 0 8-3.6 8-8v-53a48.01 48.01 0 10-56 0z',
  github: 'M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0138.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z',
  ellipsis: 'M176 511a56 56 0 10112 0 56 56 0 10-112 0zm280 0a56 56 0 10112 0 56 56 0 10-112 0zm280 0a56 56 0 10112 0 56 56 0 10-112 0z',
  close: 'M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z',
  plus: 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z',
  caret: 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z',
  clip: 'M779.3 196.6c-94.2-94.2-247.6-94.2-341.7 0l-261 260.8c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l261-260.8c32.4-32.4 75.5-50.2 121.3-50.2s88.9 17.8 121.2 50.2c32.4 32.4 50.2 75.5 50.2 121.2 0 45.8-17.8 88.8-50.2 121.2l-266 265.9-43.1 43.1c-40.3 40.3-105.8 40.3-146.1 0-19.5-19.5-30.2-45.4-30.2-73s10.7-53.5 30.2-73l263.9-263.8c6.7-6.6 15.5-10.3 24.9-10.3h.1c9.4 0 18.1 3.7 24.7 10.3 6.7 6.7 10.3 15.5 10.3 24.9 0 9.3-3.7 18.1-10.3 24.7L372.4 653c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l215.6-215.6c19.9-19.9 30.8-46.3 30.8-74.4s-11-54.6-30.8-74.4c-41.1-41.1-107.9-41-149 0L463 364 224.8 602.1A172.22 172.22 0 00174 724.8c0 46.3 18.1 89.8 50.8 122.5 33.9 33.8 78.3 50.7 122.7 50.7 44.4 0 88.8-16.9 122.6-50.7l309.2-309C824.8 492.7 850 432 850 367.5c.1-64.6-25.1-125.3-70.7-170.9z',
  broadcast: 'M908 640H804V488c0-4.4-3.6-8-8-8H548v-96h108c8.8 0 16-7.2 16-16V80c0-8.8-7.2-16-16-16H368c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h108v96H228c-4.4 0-8 3.6-8 8v152H116c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h288c8.8 0 16-7.2 16-16V656c0-8.8-7.2-16-16-16H292v-88h440v88H620c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h288c8.8 0 16-7.2 16-16V656c0-8.8-7.2-16-16-16zm-564 76v168H176V716h168zm84-408V140h168v168H428zm420 576H680V716h168v168z',
  fullscreen: 'M290 236.4l43.9-43.9a8.01 8.01 0 00-4.7-13.6L169 160c-5.1-.6-9.5 3.7-8.9 8.9L179 329.1c.8 6.6 8.9 9.4 13.6 4.7l43.7-43.7L370 423.7c3.1 3.1 8.2 3.1 11.3 0l42.4-42.3c3.1-3.1 3.1-8.2 0-11.3L290 236.4zm352.7 187.3c3.1 3.1 8.2 3.1 11.3 0l133.7-133.6 43.7 43.7a8.01 8.01 0 0013.6-4.7L863.9 169c.6-5.1-3.7-9.5-8.9-8.9L694.8 179c-6.6.8-9.4 8.9-4.7 13.6l43.9 43.9L600.3 370a8.03 8.03 0 000 11.3l42.4 42.4zM845 694.9c-.8-6.6-8.9-9.4-13.6-4.7l-43.7 43.7L654 600.3a8.03 8.03 0 00-11.3 0l-42.4 42.3a8.03 8.03 0 000 11.3L734 787.6l-43.9 43.9a8.01 8.01 0 004.7 13.6L855 864c5.1.6 9.5-3.7 8.9-8.9L845 694.9zm-463.7-94.6a8.03 8.03 0 00-11.3 0L236.3 733.9l-43.7-43.7a8.01 8.01 0 00-13.6 4.7L160.1 855c-.6 5.1 3.7 9.5 8.9 8.9L329.2 845c6.6-.8 9.4-8.9 4.7-13.6L290 787.6 423.7 654c3.1-3.1 3.1-8.2 0-11.3l-42.4-42.4z',
  search: 'M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z',
  history: 'M536.1 273H488c-4.4 0-8 3.6-8 8v275.3c0 2.6 1.2 5 3.3 6.5l165.3 120.7c3.6 2.6 8.6 1.9 11.2-1.7l28.6-39c2.7-3.7 1.9-8.7-1.7-11.2L544.1 528.5V281c0-4.4-3.6-8-8-8zm219.8 75.2l156.8 38.3c5 1.2 9.9-2.6 9.9-7.7l.8-161.5c0-6.7-7.7-10.5-12.9-6.3L752.9 334.1a8 8 0 003 14.1zm167.7 301.1l-56.7-19.5a8 8 0 00-10.1 4.8c-1.9 5.1-3.9 10.1-6 15.1-17.8 42.1-43.3 80-75.9 112.5a353 353 0 01-112.5 75.9 352.18 352.18 0 01-137.7 27.8c-47.8 0-94.1-9.3-137.7-27.8a353 353 0 01-112.5-75.9c-32.5-32.5-58-70.4-75.9-112.5A353.44 353.44 0 01171 512c0-47.8 9.3-94.2 27.8-137.8 17.8-42.1 43.3-80 75.9-112.5a353 353 0 01112.5-75.9C430.6 167.3 477 158 524.8 158s94.1 9.3 137.7 27.8A353 353 0 01775 261.7c10.2 10.3 19.8 21 28.6 32.3l59.8-46.8C784.7 146.6 662.2 81.9 524.6 82 285 82.1 92.6 276.7 95 516.4 97.4 751.9 288.9 942 524.8 942c185.5 0 343.5-117.6 403.7-282.3 1.5-4.2-.7-8.9-4.9-10.4z',
  func: 'M841 370c3-3.3 2.7-8.3-.6-11.3a8.24 8.24 0 00-5.3-2.1h-72.6c-2.4 0-4.6 1-6.1 2.8L633.5 504.6a7.96 7.96 0 01-13.4-1.9l-63.5-141.3a7.9 7.9 0 00-7.3-4.7H380.7l.9-4.7 8-42.3c10.5-55.4 38-81.4 85.8-81.4 18.6 0 35.5 1.7 48.8 4.7l14.1-66.8c-22.6-4.7-35.2-6.1-54.9-6.1-103.3 0-156.4 44.3-175.9 147.3l-9.4 49.4h-97.6c-3.8 0-7.1 2.7-7.8 6.4L181.9 415a8.07 8.07 0 007.8 9.7H284l-89 429.9a8.07 8.07 0 007.8 9.7H269c3.8 0 7.1-2.7 7.8-6.4l89.7-433.1h135.8l68.2 139.1c1.4 2.9 1 6.4-1.2 8.8l-180.6 203c-2.9 3.3-2.6 8.4.7 11.3 1.5 1.3 3.4 2 5.3 2h72.7c2.4 0 4.6-1 6.1-2.8l123.7-146.7c2.8-3.4 7.9-3.8 11.3-1 .9.8 1.6 1.7 2.1 2.8L676.4 784c1.3 2.8 4.1 4.7 7.3 4.7h64.6a8.02 8.02 0 007.2-11.5l-95.2-198.9c-1.4-2.9-.9-6.4 1.3-8.8L841 370z',
  chart: 'M888 792H200V168c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v688c0 4.4 3.6 8 8 8h752c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm-600-80h56c4.4 0 8-3.6 8-8V560c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v144c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V384c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v320c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V462c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v242c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V304c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v400c0 4.4 3.6 8 8 8z',
  menu: 'M904 160H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0 624H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0-312H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8z'
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

const icon = (path, cls) =>
  '<svg class="' + cls + '" viewBox="64 64 896 896" aria-hidden="true"><path d="' + path + '"/></svg>'

const CSS = `
.eb-cl {
  /* cloud.electerm.org's own palette — /css/home.css */
  --eb-cl-accent: #08c;
  --eb-cl-accent-dark: #006fa0;
  --eb-cl-ink: #1a1a2e;
  --eb-cl-body: #555;
  --eb-cl-hairline: #e5e5e5;
  /* real electerm UI theme — theme.styl with defaultThemeDark injected over it
     at runtime, which is where --main #121214 comes from. --main-lighter is
     only defined in theme.styl, so #5b5a5b is what ships. */
  --eb-cl-main-dark: #000;
  --eb-cl-main: #121214;
  --eb-cl-ui-text: #ddd;
  --eb-cl-ui-text-dark: #888;
  --eb-cl-success: #06d6a0;
  /* real electerm default terminal theme — theme-defaults.js */
  --eb-cl-term-bg: #20111b;
  --eb-cl-term-fg: #bbbbbb;
  --eb-cl-term-cursor: #b5bd68;
  --eb-cl-term-green: #19f9d8;
  --eb-cl-term-blue: #6fc1ff;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #eaf6fd 0%, #f5f9ff 46%, #eef7f3 100%);
  color: var(--eb-cl-ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}

/* ---------- background decoration ---------- */
.eb-cl-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-cl-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(0, 136, 204, 0.22) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-cl-drift 34s linear infinite;
}
@keyframes eb-cl-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-cl-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.68); }
.eb-cl-blob-a { width: 30em; height: 30em; right: -9em; top: -12em; }
.eb-cl-blob-b { width: 24em; height: 24em; left: -8em; bottom: -10em; }
.eb-cl-spark {
  position: absolute;
  width: 1.6em;
  height: 1.6em;
  background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-cl-twinkle 3.6s ease-in-out infinite;
}
.eb-cl-spark-a { right: 6.4em; top: 4.4em; }
.eb-cl-spark-b { right: 2.2em; top: 12.6em; width: 1.05em; height: 1.05em; background: #06d6a0; animation-delay: 0.7s; }
.eb-cl-spark-c { left: 2.4em; bottom: 4.2em; width: 1.2em; height: 1.2em; background: #ec4899; animation-delay: 1.4s; }
@keyframes eb-cl-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}

/* ---------- headline ---------- */
.eb-cl-head { position: absolute; left: 4.5em; right: 4.5em; top: 3em; }
/* the wordmark is the site's: "electerm" with a raised "online" in the accent */
.eb-cl-brand {
  display: inline-block;
  font-size: 1.5em;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--eb-cl-ink);
}
.eb-cl-brand sup { font-size: 0.62em; font-weight: 700; color: var(--eb-cl-accent); margin-left: 0.06em; }
.eb-cl-h1 {
  margin: 0.22em 0 0;
  font-size: 3.2em;
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.025em;
  color: var(--eb-cl-ink);
}
.eb-cl-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #08c, #00b4d8 58%, #06d6a0);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-cl-sub {
  margin: 0.5em 0 0;
  max-width: 56em;
  font-size: 1.45em;
  line-height: 1.45;
  color: var(--eb-cl-body);
}

/* ---------- the browser window ----------
   One piece: chrome + page, sized from the banner's em, so it scales whole. */
.eb-cl-app {
  position: absolute;
  left: 4.5em;
  bottom: 3.4em;
  width: 68em;
  border-radius: 0.72em;
  background: #fff;
  box-shadow: 0 1.2em 2.4em rgba(26, 26, 46, 0.2), 0 0 2em rgba(0, 136, 204, 0.16);
  overflow: hidden;
  text-align: left;
}

/* ---------- browser chrome ----------
   No font-size on the bar itself, so its height stays in banner em. */
.eb-cl-chrome {
  display: flex;
  align-items: center;
  gap: 0.7em;
  height: 2.9em;
  padding: 0 0.8em;
  background: #f1f3f4;
  border-bottom: 1px solid #d9dce1;
}
.eb-cl-ctab {
  display: flex;
  align-items: center;
  gap: 0.4em;
  align-self: flex-end;
  height: 2.3em;
  padding: 0 0.7em;
  border-radius: 0.5em 0.5em 0 0;
  background: #fff;
  font-size: 1.05em;
  line-height: 1;
  color: #3c4043;
  white-space: nowrap;
}
.eb-cl-ctab-dot { width: 0.62em; height: 0.62em; border-radius: 50%; background: var(--eb-cl-accent); flex: none; }
.eb-cl-ctab-close { display: inline-flex; width: 0.72em; height: 0.72em; color: #9aa0a6; }
.eb-cl-ctab-close svg { width: 100%; height: 100%; fill: currentColor; }
.eb-cl-url {
  display: flex;
  align-items: center;
  gap: 0.35em;
  flex: 1;
  height: 1.95em;
  padding: 0 0.85em;
  border-radius: 1em;
  background: #fff;
  border: 1px solid #dfe1e5;
  font-size: 1.02em;
  line-height: 1;
  color: #3c4043;
  white-space: nowrap;
  overflow: hidden;
}
.eb-cl-url-lock { display: inline-flex; width: 0.82em; height: 0.82em; color: #5f6368; flex: none; opacity: 0; }
.eb-cl-url-lock svg { width: 100%; height: 100%; fill: currentColor; }
.eb-cl-url-text { overflow: hidden; text-overflow: ellipsis; }
.eb-cl-url-caret {
  width: 1px;
  height: 1em;
  background: #3c4043;
  opacity: 0;
}
.eb-cl-cmenu { display: inline-flex; width: 1.05em; height: 1.05em; color: #5f6368; flex: none; }
.eb-cl-cmenu svg { width: 100%; height: 100%; fill: currentColor; }

/* ---------- the page ---------- */
.eb-cl-page { position: relative; background: #fff; }

/* the sign-in card that greets a signed-out visitor */
.eb-cl-gate {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.9em;
  background: #fff;
  opacity: 0;
  z-index: 2;
  pointer-events: none;
}
.eb-cl-gate-brand { font-size: 2.1em; font-weight: 800; color: var(--eb-cl-ink); letter-spacing: -0.01em; }
.eb-cl-gate-brand sup { font-size: 0.62em; font-weight: 700; color: var(--eb-cl-accent); margin-left: 0.06em; }
.eb-cl-gate-p { font-size: 1.1em; color: var(--eb-cl-body); }
/* .btn-primary on the real site: #08c, white, 12px 32px, 16px label */
.eb-cl-gate-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  margin-top: 0.3em;
  padding: 0.62em 1.7em;
  border-radius: 0.34em;
  background: var(--eb-cl-accent);
  color: #fff;
  font-size: 1.28em;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 0.35em 0.9em rgba(0, 136, 204, 0.28);
}
.eb-cl-gate-btn svg { width: 1.15em; height: 1.15em; fill: currentColor; flex: none; }
/* the click ripple lives inside the button, so it is centred on the button
   rather than on the card — 1em here is the button font */
.eb-cl-gate-ripple {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1.6em;
  height: 1.6em;
  margin: -0.8em 0 0 -0.8em;
  border: 0.13em solid #fff;
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
}
.eb-cl-pointer {
  position: absolute;
  left: 86%;
  top: 92%;
  width: 1.5em;
  height: 2.1em;
  opacity: 0;
  filter: drop-shadow(0 0.1em 0.18em rgba(0, 0, 0, 0.42));
}

/* ---------- the app inside the page ---------- */
.eb-cl-session { display: block; opacity: 0; }

/* tab bar — 1em here is the tab font, as in tabs.styl (36px bar, 14px font) */
.eb-cl-tabbar {
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-cl-main-dark);
  font-size: 1.2em;
  line-height: 1;
}
.eb-cl-tab {
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
  background: var(--eb-cl-main-dark);
  color: var(--eb-cl-ui-text-dark);
  white-space: nowrap;
  opacity: 0;
}
/* the app bolds the tab of the focused batch (tabs.styl .tab.active-all) */
.eb-cl-tab.is-active {
  background: var(--eb-cl-main);
  color: var(--eb-cl-ui-text);
  font-weight: 700;
}
.eb-cl-tab-name { overflow: hidden; text-overflow: ellipsis; }
.eb-cl-tab-status {
  position: absolute;
  left: 0.14em;
  top: 0.14em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-cl-ui-text-dark);
}
.eb-cl-tab-status.is-connected { background: var(--eb-cl-success); }
/* .tab-count — 20px pill against a 14px font, radii 10px / 2px */
.eb-cl-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-cl-accent);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-cl-tab-close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15em;
  height: 1.15em;
  border-radius: 50%;
  background: var(--eb-cl-main);
  color: var(--eb-cl-ui-text);
}
.eb-cl-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-cl-tab-add,
.eb-cl-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  height: 1.6em;
  color: var(--eb-cl-ui-text);
}
.eb-cl-tab-add { width: 1.5em; margin-left: 0.3em; }
.eb-cl-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-cl-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-cl-ui-text-dark); }
.eb-cl-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }

/* session control bar — one per session; --main, 32px line-height, 0 10px padding */
.eb-cl-ctrl {
  display: flex;
  align-items: center;
  height: 2.29em;
  padding: 0 0.71em;
  background: var(--eb-cl-main);
  font-size: 1.2em;
  line-height: 1;
  color: var(--eb-cl-ui-text);
}
/* .type-tab — 14px, padding-right 20px, 1px --text-dark underline when active */
.eb-cl-pane-tab {
  padding-right: 1.43em;
  color: var(--eb-cl-ui-text-dark);
}
.eb-cl-pane-tab.is-active {
  color: var(--eb-cl-ui-text);
  border-bottom: 1px solid var(--eb-cl-ui-text-dark);
}
.eb-cl-sess-icons { display: flex; align-items: center; gap: 0.7em; margin-left: 1.1em; }
.eb-cl-sess-right { display: flex; align-items: center; gap: 0.7em; margin-left: auto; }
.eb-cl-sess-icon { display: inline-flex; width: 1.05em; height: 1.05em; color: var(--eb-cl-ui-text-dark); }
.eb-cl-sess-icon svg { width: 100%; height: 100%; fill: currentColor; }

/* terminal — 1em here is the terminal font, well above life size so the
   command and its output stay legible in a 780px banner */
.eb-cl-term {
  position: relative;
  padding: 1.1em 1.3em 1.2em;
  background: var(--eb-cl-term-bg);
  font-size: 2.9em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.45;
  color: var(--eb-cl-term-fg);
  white-space: nowrap;
}
.eb-cl-line { line-height: 1.45; }
.eb-cl-line-out { opacity: 0; }
.eb-cl-ps1 { color: var(--eb-cl-term-green); }
.eb-cl-ps1-path { color: var(--eb-cl-term-blue); }
/* xterm's cursor: a solid block, cursorBlink is off by default */
.eb-cl-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.04em;
  vertical-align: -0.26em;
  background: var(--eb-cl-term-cursor);
}

/* footer — 36px --main bar: history, quick commands, triggers, the batch input
   box (100px wide in the app), the encoding select and the info icon */
.eb-cl-footer {
  display: flex;
  align-items: center;
  height: 2.6em;
  padding: 0 0.71em;
  background: var(--eb-cl-main);
  border-top: 1px solid #000;
  font-size: 1.2em;
  line-height: 1;
  color: var(--eb-cl-ui-text-dark);
}
.eb-cl-funit { display: inline-flex; align-items: center; justify-content: center; margin-right: 0.6em; }
.eb-cl-funit svg { width: 1.05em; height: 1.05em; fill: currentColor; }
.eb-cl-fq { font-weight: 600; }
.eb-cl-batch {
  display: flex;
  align-items: center;
  width: 5.7em;
  height: 1.8em;
  margin-left: 0.2em;
  padding: 0 0.5em;
  border: 1px solid #3a3a3d;
  border-radius: 0.2em;
  font-size: 0.9em;
  color: #777;
  overflow: hidden;
  white-space: nowrap;
}
.eb-cl-fspacer { flex: 1; }
.eb-cl-fenc { margin-right: 0.7em; font-size: 0.9em; }

/* ---------- the phone ---------- */
.eb-cl-phone {
  position: absolute;
  right: 4.5em;
  bottom: 3.4em;
  width: 20em;
  height: 34em;
  padding: 0.68em;
  border-radius: 1.7em;
  background: #17171a;
  box-shadow: 0 1.2em 2.4em rgba(26, 26, 46, 0.26);
  opacity: 0;
}
.eb-cl-phone-screen {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border-radius: 1.05em;
  background: var(--eb-cl-main);
  overflow: hidden;
}
.eb-cl-phone-bar {
  display: flex;
  align-items: center;
  gap: 0.4em;
  height: 2.6em;
  padding: 0 0.8em;
  background: var(--eb-cl-main-dark);
  font-size: 0.95em;
  line-height: 1;
  color: var(--eb-cl-ui-text);
}
.eb-cl-phone-bar sup { font-size: 0.62em; font-weight: 700; color: var(--eb-cl-accent); margin-left: 0.06em; }
.eb-cl-phone-menu { display: inline-flex; width: 1.05em; height: 1.05em; margin-left: auto; color: var(--eb-cl-ui-text-dark); }
.eb-cl-phone-menu svg { width: 100%; height: 100%; fill: currentColor; }
.eb-cl-phone-tabs {
  display: flex;
  align-items: stretch;
  height: 2.2em;
  padding: 0 0.4em;
  background: var(--eb-cl-main-dark);
  font-size: 0.8em;
  line-height: 1;
}
.eb-cl-phone-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.42em;
  padding: 0 0.9em 0 1.2em;
  border-radius: 0.21em 0.21em 0 0;
  background: var(--eb-cl-main);
  color: var(--eb-cl-ui-text);
  font-weight: 700;
  white-space: nowrap;
}
.eb-cl-phone-dot {
  position: absolute;
  left: 0.3em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-cl-success);
}
.eb-cl-phone-term {
  flex: 1;
  padding: 0.9em;
  background: var(--eb-cl-term-bg);
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  font-size: 1.05em;
  line-height: 1.5;
  color: var(--eb-cl-term-fg);
  white-space: nowrap;
  overflow: hidden;
}
.eb-cl-pline { opacity: 0; }
.eb-cl-pcaret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.04em;
  vertical-align: -0.26em;
  background: var(--eb-cl-term-cursor);
}

/* ---------- card (blog index) variant ---------- */
.eb-cl[data-variant='card'] .eb-cl-app { left: 2em; width: 70em; }
.eb-cl[data-variant='card'] .eb-cl-term { font-size: 3.1em; }
.eb-cl[data-variant='card'] .eb-cl-phone { right: 2em; width: 22em; height: 36em; }
.eb-cl[data-variant='card'] .eb-cl-phone-bar { font-size: 1.05em; }
.eb-cl[data-variant='card'] .eb-cl-phone-term { font-size: 1.2em; }

@media (prefers-reduced-motion: reduce) {
  .eb-cl-dots, .eb-cl-spark { animation: none !important; }
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

function prompt (user, path) {
  return '<span class="eb-cl-ps1">' + user + '</span>:<span class="eb-cl-ps1-path">' +
    path + '</span>$&nbsp;'
}

const PROMPT = prompt('zxd@web-01', '~')

function renderTab (title, index, active) {
  return '<span class="eb-cl-tab' + (active ? ' is-active' : '') + '">' +
    '<span class="eb-cl-tab-status is-connected"></span>' +
    '<span class="eb-cl-tab-count">' + index + '</span>' +
    '<span class="eb-cl-tab-name">' + title + '</span>' +
    (active ? '<span class="eb-cl-tab-close">' + icon(ICON.close, '') + '</span>' : '') +
    '</span>'
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-cl-head">
        <span class="eb-cl-brand">electerm<sup>online</sup></span>
        <h2 class="eb-cl-h1">Your SSH client, in a <em>browser tab</em></h2>
        <p class="eb-cl-sub">SSH, SFTP, RDP, VNC and more — the same electerm you already know,
        running in a browser on desktop or mobile. Sign in with GitHub, nothing to install.</p>
      </div>`
  return `
    <div class="eb-cl-deco">
      <span class="eb-cl-blob eb-cl-blob-a"></span>
      <span class="eb-cl-blob eb-cl-blob-b"></span>
      <span class="eb-cl-dots"></span>
      <span class="eb-cl-spark eb-cl-spark-a"></span>
      <span class="eb-cl-spark eb-cl-spark-b"></span>
      <span class="eb-cl-spark eb-cl-spark-c"></span>
    </div>
    ${head}
    <div class="eb-cl-app">
      <div class="eb-cl-chrome">
        <span class="eb-cl-ctab">
          <span class="eb-cl-ctab-dot"></span>
          <span class="eb-cl-ctab-name">electerm online</span>
          <span class="eb-cl-ctab-close">${icon(ICON.close, '')}</span>
        </span>
        <span class="eb-cl-url">
          <span class="eb-cl-url-lock">${icon(ICON.lock, '')}</span>
          <span class="eb-cl-url-text"></span>
          <span class="eb-cl-url-caret"></span>
        </span>
        <span class="eb-cl-cmenu">${icon(ICON.ellipsis, '')}</span>
      </div>
      <div class="eb-cl-page">
        <div class="eb-cl-session">
          <div class="eb-cl-tabbar">
            ${TAB_TITLES.map((t, i) => renderTab(t, i + 1, i === 0)).join('')}
            <span class="eb-cl-tab-add">${icon(ICON.plus, '')}</span>
            <span class="eb-cl-tabbar-caret">${icon(ICON.caret, '')}</span>
          </div>
          <div class="eb-cl-ctrl">
            <span class="eb-cl-pane-tab is-active">SSH</span>
            <span class="eb-cl-pane-tab">SFTP</span>
            <span class="eb-cl-sess-icons">
              <span class="eb-cl-sess-icon">${icon(ICON.clip, '')}</span>
              <span class="eb-cl-sess-icon">${SPLIT_VIEW}</span>
              <span class="eb-cl-sess-icon">${HEARTBEAT}</span>
              <span class="eb-cl-sess-icon">${icon(ICON.broadcast, '')}</span>
            </span>
            <span class="eb-cl-sess-right">
              <span class="eb-cl-sess-icon">${icon(ICON.fullscreen, '')}</span>
              <span class="eb-cl-sess-icon">${icon(ICON.search, '')}</span>
            </span>
          </div>
          <div class="eb-cl-term">
            <div class="eb-cl-line">${PROMPT}${DF}</div>
            <div class="eb-cl-line">${DF_OUT}</div>
            <div class="eb-cl-line">${PROMPT}<span class="eb-cl-cmd"></span><span class="eb-cl-caret"></span></div>
            <div class="eb-cl-line eb-cl-line-out">${OUT}</div>
          </div>
          <div class="eb-cl-footer">
            <span class="eb-cl-funit">${icon(ICON.history, '')}</span>
            <span class="eb-cl-funit eb-cl-fq">Q</span>
            <span class="eb-cl-funit">${icon(ICON.func, '')}</span>
            <span class="eb-cl-batch">batch input</span>
            <span class="eb-cl-fspacer"></span>
            <span class="eb-cl-fenc">UTF-8</span>
            <span class="eb-cl-funit">${icon(ICON.chart, '')}</span>
          </div>
        </div>
        <div class="eb-cl-gate">
          <span class="eb-cl-gate-brand">electerm<sup>online</sup></span>
          <span class="eb-cl-gate-p">Sign in with GitHub. No registration needed.</span>
          <span class="eb-cl-gate-btn">${icon(ICON.github, '')}<span>Sign in with GitHub</span><span class="eb-cl-gate-ripple"></span></span>
          <span class="eb-cl-pointer"><svg viewBox="-3 -3 29 39" width="100%" height="100%"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
        </div>
      </div>
    </div>
    <div class="eb-cl-phone">
      <div class="eb-cl-phone-screen">
        <div class="eb-cl-phone-bar">
          <span>electerm<sup>online</sup></span>
          <span class="eb-cl-phone-menu">${icon(ICON.menu, '')}</span>
        </div>
        <div class="eb-cl-phone-tabs">
          <span class="eb-cl-phone-tab"><span class="eb-cl-phone-dot"></span>${TAB_TITLES[0]}</span>
        </div>
        <div class="eb-cl-phone-term">
          <div class="eb-cl-pline">${PROMPT}${CMD}</div>
          <div class="eb-cl-pline">${OUT}</div>
          <div class="eb-cl-pline">${PROMPT}<span class="eb-cl-pcaret"></span></div>
        </div>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-cl'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm online: cloud.electerm.org typed into a browser address bar, signed in with GitHub, ' +
    'showing the same electerm terminal UI on a desktop browser and on a phone')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    app: root.querySelector('.eb-cl-app'),
    urlText: root.querySelector('.eb-cl-url-text'),
    urlLock: root.querySelector('.eb-cl-url-lock'),
    urlCaret: root.querySelector('.eb-cl-url-caret'),
    page: root.querySelector('.eb-cl-page'),
    gate: root.querySelector('.eb-cl-gate'),
    gateBtn: root.querySelector('.eb-cl-gate-btn'),
    ripple: root.querySelector('.eb-cl-gate-ripple'),
    pointer: root.querySelector('.eb-cl-pointer'),
    session: root.querySelector('.eb-cl-session'),
    tabs: Array.prototype.slice.call(root.querySelectorAll('.eb-cl-tab')),
    cmd: root.querySelector('.eb-cl-cmd'),
    caret: root.querySelector('.eb-cl-caret'),
    out: root.querySelector('.eb-cl-line-out'),
    phone: root.querySelector('.eb-cl-phone'),
    plines: Array.prototype.slice.call(root.querySelectorAll('.eb-cl-pline'))
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

  function frame (t) {
    const gone = 1 - easeInOut(seg(t, T.fadeFrom, T.fadeTo))

    // the browser window rising into place
    const appIn = easeOut(seg(t, 0, T.appIn))
    el.app.style.opacity = (appIn * gone).toFixed(3)
    el.app.style.transform = 'translateY(' + ((1 - appIn) * 1.6).toFixed(3) + 'em)'

    // the address bar typing the host
    const urlP = easeOut(seg(t, T.urlFrom, T.urlTo))
    const typedUrl = HOST.slice(0, Math.round(urlP * HOST.length))
    if (el.urlText.textContent !== typedUrl) el.urlText.textContent = typedUrl
    const typing = t >= T.urlFrom && t < T.urlTo + 260
    el.urlCaret.style.opacity = (typing && Math.floor(t / 420) % 2 === 0 ? 1 : 0) * gone
    el.urlLock.style.opacity = (seg(t, T.lockAt, T.lockAt + 320) * gone).toFixed(3)

    // the page painting, then the sign-in card
    el.page.style.opacity = (easeOut(seg(t, T.pageFrom, T.pageTo)) * gone).toFixed(3)
    const gateIn = easeOut(seg(t, T.gateFrom, T.gateTo))
    const gateOut = easeInOut(seg(t, T.gateOutFrom, T.gateOutTo))
    const gate = gateIn * (1 - gateOut) * gone
    el.gate.style.opacity = gate.toFixed(3)
    el.gate.style.transform = 'translateY(' + ((1 - gateIn) * 0.9).toFixed(3) +
      'em) scale(' + (0.94 + 0.06 * easeOutBack(gateIn)).toFixed(3) + ')'

    // the pointer travelling in from the bottom right
    const arrive = easeOut(seg(t, T.ptrFrom, T.ptrTo))
    el.pointer.style.opacity = (seg(t, T.ptrFrom, T.ptrFrom + 260) * gate).toFixed(3)
    el.pointer.style.left = (86 - 36 * arrive).toFixed(3) + '%'
    el.pointer.style.top = (92 - 31.5 * arrive).toFixed(3) + '%'

    // the click: the button presses, a ripple runs out
    const press = seg(t, T.clickAt, T.clickAt + 160)
    const pressBack = seg(t, T.clickAt + 160, T.clickAt + 420)
    el.gateBtn.style.transform = 'scale(' + (1 - 0.05 * press + 0.05 * pressBack).toFixed(3) + ')'
    const rip = seg(t, T.clickAt, T.clickAt + 620)
    el.ripple.style.opacity = (rip > 0 && rip < 1 ? (1 - rip) * gate : 0).toFixed(3)
    el.ripple.style.transform = 'scale(' + (0.5 + rip * 5.5).toFixed(3) + ')'

    // the app taking over the page
    el.session.style.opacity = (easeOut(seg(t, T.sessFrom, T.sessTo)) * gone).toFixed(3)
    el.tabs.forEach((tabEl, i) => {
      const from = T.tabFrom + i * T.tabGap
      const p = easeOut(seg(t, from, from + T.tabDur))
      tabEl.style.opacity = p.toFixed(3)
      tabEl.style.transform = 'translateY(' + ((1 - p) * -0.7).toFixed(3) + 'em)'
    })

    // the command being typed, and the shell answering
    const typed = Math.round(easeOut(seg(t, T.typeFrom, T.typeTo)) * CMD.length)
    const cmdText = CMD.slice(0, typed)
    if (el.cmd.textContent !== cmdText) el.cmd.textContent = cmdText
    el.caret.style.display = t < T.outFrom ? '' : 'none'
    const outP = easeOut(seg(t, T.outFrom, T.outTo))
    el.out.style.opacity = outP.toFixed(3)
    el.out.style.transform = 'translateY(' + ((1 - outP) * 0.4).toFixed(3) + 'em)'

    // the phone rising beside the window
    const phoneP = easeOut(seg(t, T.phoneFrom, T.phoneTo))
    el.phone.style.opacity = (phoneP * gone).toFixed(3)
    el.phone.style.transform = 'translateY(' + ((1 - phoneP) * 5).toFixed(3) + 'em)'
    el.plines.forEach((lineEl, i) => {
      const from = T.plineFrom + i * T.plineGap
      lineEl.style.opacity = easeOut(seg(t, from, from + T.plineDur)).toFixed(3)
    })
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // the settled frame: signed in, command run, phone in place
    frame(T.plineFrom + T.plineGap + T.plineDur + 200)
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
