/**
 * Animated banner for the "ai.electerm.org" blog post.
 *
 * Everything here is generated — no image, no GIF, no canvas. The electerm
 * window, its tab bar and session control bar, the docked AI side panel, the
 * AI Config dialog, the presets dropdown, the cartoon pointer: all plain DOM
 * plus CSS driven by one requestAnimationFrame timeline.
 *
 * The story, in three beats:
 *   1. the gear at the bottom of the AI panel opens AI Config, the Presets
 *      dropdown picks ai.electerm.org, the form fills itself in, Test
 *      connection goes green and Save drops a toast;
 *   2. a prompt is typed, the answer streams a code block, and the block's
 *      run-in-terminal icon sends the command into the session on the left;
 *   3. the free token hits its rate limit and the answer carries on from a
 *      key somebody else shared.
 *
 * Colours and metrics come from the products themselves, not from taste:
 *   ai.electerm.org ..................... /css/style.<hash>.css
 *     -- the brand ramp #eff8ff #dbeefe #bfe2fe #93d0fd #60b5fa #3b9af6
 *        #1389fd #1c6fd6 #1e5bae #1d4d8a, the grey ramp #f9fafb..#111827,
 *        --gradient-brand linear-gradient(135deg,#1389fd,#3b9af6),
 *        --shadow-card, --shadow-glow, Inter
 *   the injected preset ................. build/bin/pug.js (defaultAIPreset)
 *     baseURLAI https://ai.electerm.org/api/ai, apiPathAI /chat/completions,
 *     modelAI free, authHeaderNameAI 'Authorization: Bearer',
 *     nameAI ai.electerm.org — and getAIPresets() (ai-presets.js) splices it
 *     in at index 1, right under the sponsor preset, which is why the
 *     dropdown reads FluxionAI, ai.electerm.org, AtlasCloud, SiliconFlow.
 *   electerm's dark UI theme ............ src/client/css/includes/theme.styl
 *     with defaultThemeDark() from src/client/common/theme-defaults.js
 *     injected over it at runtime — that is where --main #121214 comes from.
 *     --main-lighter is only in theme.styl, so #5b5a5b is what ships (the
 *     toast background).
 *   terminal palette .................... theme-defaults.js
 *     (defaultThemeDarkTerminal: bg #20111b, fg #bbbbbb, cursor #b5bd68)
 *   tab bar / tabs ...................... components/tabs/tabs.styl
 *   session control bar ................. components/session/session-control.jsx
 *   right side panel .................... components/side-panel-r/right-side-panel.styl
 *     (--main, 1px --main-darker left border, pin + close in the title row)
 *   AI panel chrome ..................... components/ai/ai-chat.jsx
 *     (title row, message list, the Ask/Agent Segmented control, paperclip,
 *     the SettingOutlined gear that opens AI Config, SendOutlined)
 *   code block actions .................. components/ai/ai-output.jsx
 *     (CopyOutlined + PlayCircleOutlined; run-in-terminal strips blank lines
 *     and # comments before sending)
 *   AI Config dialog .................... components/ai/ai-config.jsx
 *     (Presets button with DownOutlined, Name / API URL / API Key / Model,
 *     a primary Save and a Test connection button)
 *   antd defaults ....................... the app renders antd with no
 *     ConfigProvider, so primary is #1677ff, borders #d9d9d9, ink
 *     rgba(0,0,0,.88)
 *   icons ............................... @ant-design/icons, paths pulled
 *     out of node_modules exactly as the app renders them
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + window (blog post page)
 *   data-eb-banner="card"  -> window only       (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src — otherwise the first script to run
 * would claim every card.
 *
 * The whole layout is expressed in `em` and the root font-size is kept at 1%
 * of the banner width, so one design scales from the 780px hero to the 418px
 * card. Containers keep font-size 1 so their own em is the banner em; only
 * leaf text elements carry a font-size, which is why the padding on those is
 * deliberately kept off the element that sets it.
 */

const STYLE_ID = 'eb-ai-style'

// One full pass of the story, in ms.
const PERIOD = 12000

const T = {
  winFrom: 0, // the window rises into place
  winTo: 600,
  panelFrom: 560, // the AI panel docks in from the right
  panelTo: 980,
  gearFrom: 1000, // the gear that opens AI Config
  maskFrom: 1180, // the dialog and its mask
  maskTo: 1580,
  menuFrom: 1660, // the presets dropdown drops
  menuTo: 2000,
  pickFrom: 2140, // ai.electerm.org is highlighted, then picked
  pickTo: 2400,
  fillFrom: 2400, // the form fills itself in
  fillTo: 2880,
  testFrom: 2940, // Test connection
  spinFrom: 3040,
  okFrom: 3480,
  okTo: 3780,
  saveFrom: 3840, // Save
  toastFrom: 4080,
  modalOutFrom: 4480,
  modalOutTo: 4840,
  promptFrom: 4920, // the prompt is typed
  promptTo: 5820,
  sendFrom: 5900, // ... and sent
  sentFrom: 6120,
  sentTo: 6380,
  thinkFrom: 6380, // the answer starts
  thinkTo: 6820,
  ansFrom: 6820,
  ansTo: 7180,
  limitFrom: 7280, // the free token runs out
  limitTo: 7640,
  swapFrom: 7740, // ... and a shared key takes over
  swapTo: 8100,
  codeFrom: 8200, // the code block streams in
  codeTo: 8920,
  curFrom: 8920, // the pointer travels to the run icon
  curTo: 9280,
  runFrom: 9280,
  termFrom: 9480, // the command lands in the terminal
  outFrom: 10140, // ... and so does its output
  outTo: 10740,
  fadeFrom: 11400,
  fadeTo: 11900
}

// The api.electerm.org preset, exactly as the app injects it.
const PRESET = {
  name: 'ai.electerm.org',
  url: 'https://ai.electerm.org/api/ai',
  model: 'free'
}

// The preset dropdown, in the order getAIPresets() produces: the sponsor
// preset first, the injected one spliced in at index 1, then the shipped list.
const PRESET_MENU = ['FluxionAI', 'ai.electerm.org', 'AtlasCloud', 'SiliconFlow']

const PROMPT = 'clean up dangling docker images on web-01 and list what is left'
const CMD1 = 'docker image prune -f'
const CMD2 = 'docker images | head -3'
const OUT1 = 'Total reclaimed space: 2.31GB'
const OUT2 = [
  'REPOSITORY   TAG      SIZE',
  'nginx        latest   187MB',
  'postgres     16       421MB'
]
const DF = 'df -h /'
const DF_OUT = '/dev/vda1  40G  17G  21G  45% /'

const KEY_LEN = 20

// A cartoon arrow cursor, the same shape the other banners use.
const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

// @ant-design/icons paths, viewBox "64 64 896 896" — the glyphs the app itself
// renders. Pulled out of node_modules/@ant-design/icons.
const ICON = {
  close: 'M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z',
  plus: 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z',
  caret: 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z',
  clip: 'M779.3 196.6c-94.2-94.2-247.6-94.2-341.7 0l-261 260.8c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l261-260.8c32.4-32.4 75.5-50.2 121.3-50.2s88.9 17.8 121.2 50.2c32.4 32.4 50.2 75.5 50.2 121.2 0 45.8-17.8 88.8-50.2 121.2l-266 265.9-43.1 43.1c-40.3 40.3-105.8 40.3-146.1 0-19.5-19.5-30.2-45.4-30.2-73s10.7-53.5 30.2-73l263.9-263.8c6.7-6.6 15.5-10.3 24.9-10.3h.1c9.4 0 18.1 3.7 24.7 10.3 6.7 6.7 10.3 15.5 10.3 24.9 0 9.3-3.7 18.1-10.3 24.7L372.4 653c-1.7 1.7-2.6 4-2.6 6.4s.9 4.7 2.6 6.4l36.9 36.9a9 9 0 0012.7 0l215.6-215.6c19.9-19.9 30.8-46.3 30.8-74.4s-11-54.6-30.8-74.4c-41.1-41.1-107.9-41-149 0L463 364 224.8 602.1A172.22 172.22 0 00174 724.8c0 46.3 18.1 89.8 50.8 122.5 33.9 33.8 78.3 50.7 122.7 50.7 44.4 0 88.8-16.9 122.6-50.7l309.2-309C824.8 492.7 850 432 850 367.5c.1-64.6-25.1-125.3-70.7-170.9z',
  broadcast: 'M908 640H804V488c0-4.4-3.6-8-8-8H548v-96h108c8.8 0 16-7.2 16-16V80c0-8.8-7.2-16-16-16H368c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h108v96H228c-4.4 0-8 3.6-8 8v152H116c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h288c8.8 0 16-7.2 16-16V656c0-8.8-7.2-16-16-16H292v-88h440v88H620c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h288c8.8 0 16-7.2 16-16V656c0-8.8-7.2-16-16-16zm-564 76v168H176V716h168zm84-408V140h168v168H428zm420 576H680V716h168v168z',
  fullscreen: 'M290 236.4l43.9-43.9a8.01 8.01 0 00-4.7-13.6L169 160c-5.1-.6-9.5 3.7-8.9 8.9L179 329.1c.8 6.6 8.9 9.4 13.6 4.7l43.7-43.7L370 423.7c3.1 3.1 8.2 3.1 11.3 0l42.4-42.3c3.1-3.1 3.1-8.2 0-11.3L290 236.4zm352.7 187.3c3.1 3.1 8.2 3.1 11.3 0l133.7-133.6 43.7 43.7a8.01 8.01 0 0013.6-4.7L863.9 169c.6-5.1-3.7-9.5-8.9-8.9L694.8 179c-6.6.8-9.4 8.9-4.7 13.6l43.9 43.9L600.3 370a8.03 8.03 0 000 11.3l42.4 42.4zM845 694.9c-.8-6.6-8.9-9.4-13.6-4.7l-43.7 43.7L654 600.3a8.03 8.03 0 00-11.3 0l-42.4 42.3a8.03 8.03 0 000 11.3L734 787.6l-43.9 43.9a8.01 8.01 0 004.7 13.6L855 864c5.1.6 9.5-3.7 8.9-8.9L845 694.9zm-463.7-94.6a8.03 8.03 0 00-11.3 0L236.3 733.9l-43.7-43.7a8.01 8.01 0 00-13.6 4.7L160.1 855c-.6 5.1 3.7 9.5 8.9 8.9L329.2 845c6.6-.8 9.4-8.9 4.7-13.6L290 787.6 423.7 654c3.1-3.1 3.1-8.2 0-11.3l-42.4-42.4z',
  search: 'M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z',
  gear: 'M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 009.3-35.2l-.9-2.6a443.74 443.74 0 00-79.7-137.9l-1.8-2.1a32.12 32.12 0 00-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85a32.05 32.05 0 00-25.8-25.7l-2.7-.5c-52.1-9.4-106.9-9.4-159 0l-2.7.5a32.05 32.05 0 00-25.8 25.7l-15.8 85.4a351.86 351.86 0 00-99 57.4l-81.9-29.1a32 32 0 00-35.1 9.5l-1.8 2.1a446.02 446.02 0 00-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5a32.03 32.03 0 00-9.3 35.2l.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1a32.12 32.12 0 0035.1 9.5l81.9-29.1c29.8 24.5 63.1 43.9 99 57.4l15.8 85.4a32.05 32.05 0 0025.8 25.7l2.7.5a449.4 449.4 0 00159 0l2.7-.5a32.05 32.05 0 0025.8-25.7l15.7-85a350 350 0 0099.7-57.6l81.3 28.9a32 32 0 0035.1-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l.9-2.6c4.5-12.3.8-26.3-9.3-35zM788.3 465.9c2.5 15.1 3.8 30.6 3.8 46.1s-1.3 31-3.8 46.1l-6.6 40.1 74.7 63.9a370.03 370.03 0 01-42.6 73.6L721 702.8l-31.4 25.8c-23.9 19.6-50.5 35-79.3 45.8l-38.1 14.3-17.9 97a377.5 377.5 0 01-85 0l-17.9-97.2-37.8-14.5c-28.5-10.8-55-26.2-78.7-45.7l-31.4-25.9-93.4 33.2c-17-22.9-31.2-47.6-42.6-73.6l75.5-64.5-6.5-40c-2.4-14.9-3.7-30.3-3.7-45.5 0-15.3 1.2-30.6 3.7-45.5l6.5-40-75.5-64.5c11.3-26.1 25.6-50.7 42.6-73.6l93.4 33.2 31.4-25.9c23.7-19.5 50.2-34.9 78.7-45.7l37.9-14.3 17.9-97.2c28.1-3.2 56.8-3.2 85 0l17.9 97 38.1 14.3c28.7 10.8 55.4 26.2 79.3 45.8l31.4 25.8 92.8-32.9c17 22.9 31.2 47.6 42.6 73.6L781.8 426l6.5 39.9zM512 326c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm79.2 255.2A111.6 111.6 0 01512 614c-29.9 0-58-11.7-79.2-32.8A111.6 111.6 0 01400 502c0-29.9 11.7-58 32.8-79.2C454 401.6 482.1 390 512 390c29.9 0 58 11.6 79.2 32.8A111.6 111.6 0 01624 502c0 29.9-11.7 58-32.8 79.2z',
  send: 'M931.4 498.9L94.9 79.5c-3.4-1.7-7.3-2.1-11-1.2a15.99 15.99 0 00-11.7 19.3l86.2 352.2c1.3 5.3 5.2 9.6 10.4 11.3l147.7 50.7-147.6 50.7c-5.2 1.8-9.1 6-10.3 11.3L72.2 926.5c-.9 3.7-.5 7.6 1.2 10.9 3.9 7.9 13.5 11.1 21.5 7.2l836.5-417c3.1-1.5 5.6-4.1 7.2-7.1 3.9-8 .7-17.6-7.2-21.6zM170.8 826.3l50.3-205.6 295.2-101.3c2.3-.8 4.2-2.6 5-5 1.4-4.2-.8-8.7-5-10.2L221.1 403 171 198.2l628 314.9-628.2 313.2z',
  down: 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z',
  check: 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z',
  copy: 'M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c2.2 2.2 4.7 4 7.4 5.5v1.9h4.2c3.5 1.3 7.2 2 11 2H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM350 856.2L263.9 770H350v86.2zM664 888H414V746c0-22.1-17.9-40-40-40H232V264h432v624z',
  play: 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z M719.4 499.1l-296.1-215A15.9 15.9 0 00398 297v430c0 13.1 14.8 20.5 25.3 12.9l296.1-215a15.9 15.9 0 000-25.8zm-257.6 134V390.9L628.5 512 461.8 633.1z',
  reload: 'M909.1 209.3l-56.4 44.1C775.8 155.1 656.2 92 521.9 92 290 92 102.3 279.5 102 511.5 101.7 743.7 289.8 932 521.9 932c181.3 0 335.8-115 394.6-276.1 1.5-4.2-.7-8.9-4.9-10.3l-56.7-19.5a8 8 0 00-10.1 4.8c-1.8 5-3.8 10-5.9 14.9-17.3 41-42.1 77.8-73.7 109.4A344.77 344.77 0 01655.9 829c-42.3 17.9-87.4 27-133.8 27-46.5 0-91.5-9.1-133.8-27A341.5 341.5 0 01279 755.2a342.16 342.16 0 01-73.7-109.4c-17.9-42.4-27-87.4-27-133.9s9.1-91.5 27-133.9c17.3-41 42.1-77.8 73.7-109.4 31.6-31.6 68.4-56.4 109.3-73.8 42.3-17.9 87.4-27 133.8-27 46.5 0 91.5 9.1 133.8 27a341.5 341.5 0 01109.3 73.8c9.9 9.9 19.2 20.4 27.8 31.4l-60.2 47a8 8 0 003 14.1l175.6 43c5 1.2 9.9-2.6 9.9-7.7l.8-180.9c-.1-6.6-7.8-10.3-13-6.2z',
  pin: 'M878.3 392.1L631.9 145.7c-6.5-6.5-15-9.7-23.5-9.7s-17 3.2-23.5 9.7L423.8 306.9c-12.2-1.4-24.5-2-36.8-2-73.2 0-146.4 24.1-206.5 72.3a33.23 33.23 0 00-2.7 49.4l181.7 181.7-215.4 215.2a15.8 15.8 0 00-4.6 9.8l-3.4 37.2c-.9 9.4 6.6 17.4 15.9 17.4.5 0 1 0 1.5-.1l37.2-3.4c3.7-.3 7.2-2 9.8-4.6l215.4-215.4 181.7 181.7c6.5 6.5 15 9.7 23.5 9.7 9.7 0 19.3-4.2 25.9-12.4 56.3-70.3 79.7-158.3 70.2-243.4l161.1-161.1c12.9-12.8 12.9-33.8 0-46.8zM666.2 549.3l-24.5 24.5 3.8 34.4a259.92 259.92 0 01-30.4 153.9L262 408.8c12.9-7.1 26.3-13.1 40.3-17.9 27.2-9.4 55.7-14.1 84.7-14.1 9.6 0 19.3.5 28.9 1.6l34.4 3.8 24.5-24.5L608.5 224 800 415.5 666.2 549.3z'
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
.eb-ai {
  /* ai.electerm.org's own design tokens — /css/style.<hash>.css :root */
  --eb-ai-brand-50: #eff8ff;
  --eb-ai-brand-100: #dbeefe;
  --eb-ai-brand-200: #bfe2fe;
  --eb-ai-brand-300: #93d0fd;
  --eb-ai-brand-500: #3b9af6;
  --eb-ai-brand-600: #1389fd;
  --eb-ai-brand-700: #1c6fd6;
  --eb-ai-brand-800: #1e5bae;
  --eb-ai-gray-50: #f9fafb;
  --eb-ai-gray-100: #f3f4f6;
  --eb-ai-gray-200: #e5e7eb;
  --eb-ai-gray-400: #9ca3af;
  --eb-ai-gray-500: #6b7280;
  --eb-ai-gray-700: #374151;
  --eb-ai-gray-800: #1f2937;
  --eb-ai-gray-900: #111827;
  --eb-ai-ok: #16a34a;
  --eb-ai-ok-bg: #f0fdf4;
  --eb-ai-ok-line: #bbf7d0;
  --eb-ai-warn: #d97706;
  --eb-ai-warn-ink: #92400e;
  --eb-ai-warn-bg: #fffbeb;
  --eb-ai-warn-line: #fde68a;
  /* the real electerm UI theme: theme.styl with defaultThemeDark() injected
     over it at runtime, which is where --main #121214 comes from. */
  --eb-ai-main-dark: #000;
  --eb-ai-main: #121214;
  --eb-ai-main-lighter: #5b5a5b;
  --eb-ai-ui-text: #ddd;
  --eb-ai-ui-text-dark: #888;
  --eb-ai-success: #06d6a0;
  --eb-ai-border: #2c2c31;
  /* the shipped default terminal theme — theme-defaults.js */
  --eb-ai-term-bg: #20111b;
  --eb-ai-term-fg: #bbbbbb;
  --eb-ai-term-cursor: #b5bd68;
  --eb-ai-term-green: #19f9d8;
  --eb-ai-term-blue: #6fc1ff;
  /* antd, rendered with no ConfigProvider */
  --eb-ai-antd: #1677ff;
  --eb-ai-antd-border: #d9d9d9;
  --eb-ai-antd-ink: rgba(0, 0, 0, 0.88);
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--eb-ai-gray-200);
  background: linear-gradient(135deg, #eff8ff 0%, #f9fafb 48%, #f0fdf4 100%);
  color: var(--eb-ai-gray-800);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}

/* ---------- background decoration ---------- */
.eb-ai-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-ai-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(19, 137, 253, 0.18) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-ai-drift 34s linear infinite;
}
@keyframes eb-ai-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-ai-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.7); }
.eb-ai-blob-a { width: 30em; height: 30em; right: -10em; top: -13em; }
.eb-ai-blob-b { width: 22em; height: 22em; left: -9em; bottom: -11em; }

/* ---------- headline ---------- */
.eb-ai-head { position: absolute; left: 4.4em; right: 4.4em; top: 2.4em; }
.eb-ai-badge {
  display: inline-block;
  font-size: 1.45em;
  font-weight: 600;
  color: var(--eb-ai-brand-700);
  background: var(--eb-ai-brand-100);
  border-radius: 999px;
  padding: 0.42em 1.25em;
  letter-spacing: 0.01em;
}
.eb-ai-h1 {
  margin: 0.3em 0 0;
  font-size: 4em;
  font-weight: 800;
  letter-spacing: -0.022em;
  line-height: 1.1;
  color: var(--eb-ai-gray-800);
}
.eb-ai-h1 em {
  font-style: normal;
  background: linear-gradient(135deg, #1389fd 0%, #3b9af6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.eb-ai-sub {
  margin: 0.45em 0 0;
  max-width: 62em;
  font-size: 1.65em;
  line-height: 1.42;
  color: var(--eb-ai-gray-500);
}

/* ---------- the app window ---------- */
.eb-ai-win {
  position: absolute;
  left: 4.4em;
  top: 16.4em;
  width: 91.2em;
  height: 35.65em;
  border-radius: 1.3em;
  background: var(--eb-ai-main);
  border: 1px solid #26262a;
  box-shadow: 0 1.6em 3.6em -1.2em rgba(16, 24, 40, 0.3);
  overflow: hidden;
}

/* ---------- tab bar ---------- */
.eb-ai-tabbar {
  position: absolute;
  left: 0; right: 0; top: 0;
  height: 3.3em;
  display: flex;
  align-items: flex-end;
  gap: 0.4em;
  padding: 0 0.6em;
  background: var(--eb-ai-main-dark);
}
.eb-ai-tab {
  display: flex;
  align-items: center;
  gap: 0.7em;
  height: 2.7em;
  padding: 0 1.1em;
  border-radius: 0.7em 0.7em 0 0;
  background: #191919;
  color: var(--eb-ai-ui-text-dark);
}
.eb-ai-tab.is-active { background: var(--eb-ai-main); color: var(--eb-ai-ui-text); }
.eb-ai-tab-dot {
  width: 0.42em; height: 0.42em;
  border-radius: 50%;
  background: var(--eb-ai-success);
}
.eb-ai-tab-count {
  font-size: 1.15em;
  line-height: 1.5;
  padding: 0 0.42em;
  border-radius: 0.6em 0.15em 0.15em 0.6em;
  background: #2b2b30;
  color: var(--eb-ai-ui-text);
}
.eb-ai-tab-name { font-size: 1.3em; }
.eb-ai-tab-x { width: 1.1em; height: 1.1em; opacity: 0.6; }
.eb-ai-tab-new { width: 1.3em; height: 1.3em; margin: 0 0.5em 0.8em; }
.eb-ai-tab-caret { width: 1.1em; height: 1.1em; margin-bottom: 0.8em; }
.eb-ai-tab-x svg, .eb-ai-tab-new svg, .eb-ai-tab-caret svg {
  width: 100%; height: 100%; display: block; fill: currentColor;
}

/* ---------- session control bar ---------- */
.eb-ai-ctrl {
  position: absolute;
  left: 0; right: 0; top: 3.3em;
  height: 2.6em;
  display: flex;
  align-items: center;
  padding: 0 1.2em;
  background: var(--eb-ai-main);
  border-bottom: 1px solid var(--eb-ai-main-dark);
  color: var(--eb-ai-ui-text-dark);
}
.eb-ai-pane-tab { font-size: 1.35em; padding-right: 1.5em; }
.eb-ai-pane-tab.is-active {
  color: var(--eb-ai-ui-text);
  box-shadow: inset 0 -1px 0 0 var(--eb-ai-ui-text-dark);
}
.eb-ai-sess-icons { display: flex; align-items: center; gap: 1.1em; }
.eb-ai-sess-icon { width: 1.5em; height: 1.5em; display: block; }
.eb-ai-sess-icon svg { width: 100%; height: 100%; display: block; fill: currentColor; }
.eb-ai-sess-right { margin-left: auto; display: flex; align-items: center; gap: 1.1em; }

/* ---------- the window body ---------- */
.eb-ai-body { position: absolute; left: 0; right: 0; top: 5.9em; bottom: 0; }

/* ---------- the terminal ---------- */
.eb-ai-term {
  position: absolute;
  left: 0; right: 36em; top: 0; bottom: 0;
  padding: 1.2em 1.4em;
  background: var(--eb-ai-term-bg);
  color: var(--eb-ai-term-fg);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow: hidden;
}
.eb-ai-tline { font-size: 1.95em; line-height: 1.45; white-space: pre-wrap; word-break: break-all; }
.eb-ai-ps1 { color: var(--eb-ai-term-green); }
.eb-ai-ps1-path { color: var(--eb-ai-term-blue); }
.eb-ai-tcaret {
  display: inline-block;
  width: 0.55em; height: 1.05em;
  margin-bottom: -0.18em;
  background: var(--eb-ai-term-cursor);
}
.eb-ai-tout { opacity: 0; }

/* ---------- the docked AI panel ---------- */
.eb-ai-panel {
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 36em;
  background: var(--eb-ai-main);
  border-left: 1px solid var(--eb-ai-main-dark);
  color: var(--eb-ai-ui-text);
}
.eb-ai-ptitle {
  position: absolute;
  left: 0; right: 0; top: 0;
  height: 3.3em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.2em;
  border-bottom: 1px solid var(--eb-ai-main-dark);
}
.eb-ai-ptitle-l { display: flex; align-items: center; gap: 0.7em; }
.eb-ai-ptag {
  font-size: 1.1em;
  line-height: 1.55;
  padding: 0 0.5em;
  border: 1px solid var(--eb-ai-border);
  border-radius: 0.3em;
  color: var(--eb-ai-ui-text);
}
.eb-ai-ptitle-t { font-size: 1.35em; font-weight: 500; }
.eb-ai-ptitle-r { display: flex; align-items: center; gap: 0.9em; }

/* messages: anchored to the bottom and clipped at the top, which is what the
   real panel does — it scrolls to the newest response */
.eb-ai-msgs {
  position: absolute;
  left: 1.2em; right: 1.2em; top: 4em; bottom: 13.4em;
  overflow: hidden;
}
.eb-ai-msgs-in {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9em;
}
.eb-ai-bubble {
  align-self: flex-end;
  max-width: 92%;
  padding: 0.6em 0.9em;
  background: #1f1f23;
  border: 1px solid var(--eb-ai-border);
  border-radius: 0.6em;
}
.eb-ai-bubble span { font-size: 1.3em; line-height: 1.4; }
.eb-ai-ans { display: flex; flex-direction: column; gap: 0.5em; }
.eb-ai-brand { opacity: 0; }
.eb-ai-brandtag {
  display: inline-block;
  font-size: 1.1em;
  line-height: 1.5;
  padding: 0 0.45em;
  border: 1px solid var(--eb-ai-border);
  border-radius: 0.3em;
  color: var(--eb-ai-ui-text-dark);
}
.eb-ai-prose { opacity: 0; }
.eb-ai-prose span { font-size: 1.3em; line-height: 1.4; }
.eb-ai-code {
  opacity: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35em;
  padding: 0.55em;
  border: 1px dashed var(--eb-ai-border);
  border-radius: 0.4em;
  /* the reveal animates this box's height, so the padding has to be inside it
     or a zero height still leaves a 1.2em gap in the answer, and min-height
     has to be released or the flex item refuses to go below its content */
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
}
.eb-ai-cacts { display: flex; justify-content: flex-end; align-items: center; gap: 0.7em; }
.eb-ai-cacts .eb-ai-iconbtn { width: 1.95em; height: 1.95em; }
.eb-ai-pre { display: flex; flex-direction: column; }
.eb-ai-cline {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.1em;
  line-height: 1.4;
  color: #c9c9cd;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 1.4em;
}
.eb-ai-think { display: flex; align-items: center; gap: 0.4em; height: 1.8em; }
.eb-ai-dot {
  width: 0.6em; height: 0.6em;
  border-radius: 50%;
  background: var(--eb-ai-ui-text-dark);
}

/* the 429 strip: the free token runs out, a shared key takes over */
.eb-ai-notice {
  position: absolute;
  left: 1.2em; right: 1.2em; bottom: 10em;
  height: 3em;
  display: flex;
  align-items: center;
  gap: 0.7em;
  padding: 0 0.9em;
  border: 1px solid var(--eb-ai-warn-line);
  border-radius: 0.5em;
  background: var(--eb-ai-warn-bg);
  color: var(--eb-ai-warn-ink);
  opacity: 0;
}
.eb-ai-notice.is-ok {
  background: var(--eb-ai-ok-bg);
  border-color: var(--eb-ai-ok-line);
  color: #166534;
}
.eb-ai-nchip {
  font-size: 1.1em;
  font-weight: 600;
  line-height: 1.5;
  padding: 0 0.45em;
  border-radius: 0.3em;
  background: rgba(217, 119, 6, 0.16);
  color: var(--eb-ai-warn-ink);
}
.eb-ai-notice.is-ok .eb-ai-nchip { background: rgba(22, 163, 74, 0.16); color: #166534; }
.eb-ai-ntext { font-size: 1.2em; }

/* the prompt box: the app's TextArea, then the row that carries the Ask/Agent
   segmented control, the paperclip, the gear and the send icon */
.eb-ai-input { position: absolute; left: 1.2em; right: 1.2em; bottom: 1em; height: 8.6em; }
.eb-ai-ta {
  position: absolute;
  left: 0; right: 0; top: 0;
  height: 5em;
  padding: 0.7em 0.9em;
  background: #1c1c1f;
  border: 1px solid var(--eb-ai-border);
  border-radius: 0.5em;
  overflow: hidden;
}
.eb-ai-tatext, .eb-ai-taph { font-size: 1.35em; line-height: 1.4; }
.eb-ai-taph { color: #5c5c63; }
.eb-ai-tacaret {
  display: inline-block;
  width: 0.5em; height: 1em;
  margin-bottom: -0.16em;
  background: var(--eb-ai-ui-text);
}
.eb-ai-irow {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 2.6em;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.eb-ai-irow-l { display: flex; align-items: center; gap: 1.1em; }
.eb-ai-seg {
  display: flex;
  padding: 0.15em;
  border-radius: 0.4em;
  background: #1c1c1f;
  border: 1px solid var(--eb-ai-border);
}
.eb-ai-seg-i { font-size: 1.15em; line-height: 1.6; padding: 0 0.7em; border-radius: 0.3em; color: var(--eb-ai-ui-text-dark); }
.eb-ai-seg-i.is-on { background: #2f2f36; color: var(--eb-ai-ui-text); }

/* a shared button ring, used for every press in the story */
.eb-ai-iconbtn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7em; height: 1.7em;
  color: var(--eb-ai-ui-text-dark);
}
.eb-ai-iconbtn svg { width: 100%; height: 100%; fill: currentColor; display: block; }
.eb-ai-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 0.1em solid currentColor;
  opacity: 0;
  pointer-events: none;
}

/* ---------- the modal mask ---------- */
.eb-ai-mask { position: absolute; inset: 0; background: #000; opacity: 0; }

/* ---------- the AI Config dialog ---------- */
.eb-ai-mbox {
  position: absolute;
  left: 50%;
  margin-left: -29em;
  top: 50%;
  width: 58em;
  opacity: 0;
}
.eb-ai-modal {
  background: #fff;
  border-radius: 0.8em;
  box-shadow: 0 1.2em 3em -0.6em rgba(0, 0, 0, 0.5);
  overflow: hidden;
  color: var(--eb-ai-antd-ink);
}
.eb-ai-mhead {
  font-size: 1.5em;
  font-weight: 600;
  line-height: 1.4;
  padding: 0.9em 1.5em;
  border-bottom: 1px solid #f0f0f0;
}
.eb-ai-mbody { position: relative; padding: 1.4em 1.5em 1.5em; }
.eb-ai-mrow { display: flex; justify-content: flex-end; margin-bottom: 1.1em; }
.eb-ai-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  height: 2.6em;
  padding: 0 1.1em;
  border: 1px solid var(--eb-ai-antd-border);
  border-radius: 0.4em;
  background: #fff;
  color: var(--eb-ai-antd-ink);
  font-size: 1.2em;
  white-space: nowrap;
}
.eb-ai-btn svg { width: 1em; height: 1em; fill: currentColor; }
.eb-ai-btn-primary {
  background: var(--eb-ai-antd);
  border-color: var(--eb-ai-antd);
  color: #fff;
}
.eb-ai-form { display: flex; flex-direction: column; gap: 0.8em; }
.eb-ai-frow { display: flex; gap: 1em; }
.eb-ai-field { flex: 1; display: flex; flex-direction: column; gap: 0.35em; min-width: 0; }
.eb-ai-label { font-size: 1.15em; line-height: 1.4; color: rgba(0, 0, 0, 0.65); }
.eb-ai-finput {
  height: 2.6em;
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0 0.8em;
  border: 1px solid var(--eb-ai-antd-border);
  border-radius: 0.4em;
  background: #fff;
}
.eb-ai-finput > span {
  font-size: 1.2em;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eb-ai-val { opacity: 0; }
.eb-ai-keydots { letter-spacing: 0.08em; }
.eb-ai-reload { width: 1em; height: 1em; fill: rgba(0, 0, 0, 0.45); margin-left: auto; flex: none; }
.eb-ai-mfoot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.8em;
  margin-top: 1.3em;
}
.eb-ai-ok {
  display: flex;
  align-items: center;
  gap: 0.4em;
  font-size: 1.15em;
  color: var(--eb-ai-ok);
  opacity: 0;
}
.eb-ai-ok svg { width: 1.1em; height: 1.1em; fill: currentColor; }
.eb-ai-spin { width: 1em; height: 1em; fill: currentColor; opacity: 0; transform-origin: 50% 50%; }

/* the presets dropdown, anchored under its button */
.eb-ai-menu {
  position: absolute;
  right: 1.5em;
  top: 4.6em;
  width: 22em;
  padding: 0.4em;
  background: #fff;
  border-radius: 0.5em;
  box-shadow: 0 0.6em 1.8em rgba(0, 0, 0, 0.18);
  opacity: 0;
}
.eb-ai-mi {
  display: block;
  font-size: 1.2em;
  line-height: 1.4;
  padding: 0.5em 0.8em;
  border-radius: 0.4em;
  color: var(--eb-ai-antd-ink);
  opacity: 0;
}
.eb-ai-mi.is-pick { font-weight: 600; }

/* ---------- the saved toast ---------- */
.eb-ai-toast {
  position: absolute;
  left: 50%;
  top: 1.4em;
  display: flex;
  align-items: center;
  gap: 0.6em;
  padding: 0.55em 1.1em;
  border-radius: 0.5em;
  background: var(--eb-ai-main-lighter);
  color: #fff;
  box-shadow: 0 0.5em 1.4em rgba(0, 0, 0, 0.28);
  opacity: 0;
}
.eb-ai-toast svg { width: 1.3em; height: 1.3em; fill: var(--eb-ai-success); flex: none; }
.eb-ai-toast span { font-size: 1.35em; }

/* ---------- the pointer ---------- */
.eb-ai-cursor {
  position: absolute;
  width: 2.2em;
  height: 2.9em;
  opacity: 0;
  filter: drop-shadow(0 0.2em 0.3em rgba(0, 0, 0, 0.35));
}
.eb-ai-cursor svg { width: 100%; height: 100%; fill: #fff; stroke: var(--eb-ai-gray-800); stroke-width: 1.4; }

/* ---------- card (blog index) variant ---------- */
.eb-ai[data-variant='card'] .eb-ai-head { display: none; }
.eb-ai[data-variant='card'] .eb-ai-win {
  left: 2.4em;
  top: 4.4em;
  width: 95.2em;
  height: 47.45em;
}

@media (prefers-reduced-motion: reduce) {
  .eb-ai-dots { animation: none !important; }
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

function ps1 () {
  return '<span class="eb-ai-ps1">zxd@web-01</span>:' +
    '<span class="eb-ai-ps1-path">~</span>$&nbsp;'
}

const PROMPT_PS1 = ps1()

function renderTab (title, index, active) {
  return '<span class="eb-ai-tab' + (active ? ' is-active' : '') + '">' +
    '<span class="eb-ai-tab-dot"></span>' +
    '<span class="eb-ai-tab-count">' + index + '</span>' +
    '<span class="eb-ai-tab-name">' + title + '</span>' +
    (active ? '<span class="eb-ai-tab-x">' + icon(ICON.close, '') + '</span>' : '') +
    '</span>'
}

function renderIconBtn (path, cls) {
  return '<span class="eb-ai-iconbtn ' + cls + '">' + icon(path, '') +
    '<span class="eb-ai-ring"></span></span>'
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-ai-head">
        <span class="eb-ai-badge">Free AI for electerm</span>
        <h2 class="eb-ai-h1">Free AI in electerm, <em>no key to buy</em></h2>
        <p class="eb-ai-sub">Sign in with GitHub and the preset is already in the app — or skip the
        key entirely in electerm online. One free endpoint, kept alive by keys the community shares.</p>
      </div>`
  const menuItems = PRESET_MENU.map((name) =>
    '<span class="eb-ai-mi' + (name === PRESET.name ? ' is-pick' : '') + '">' + name + '</span>'
  ).join('')
  return `
    <div class="eb-ai-deco">
      <span class="eb-ai-blob eb-ai-blob-a"></span>
      <span class="eb-ai-blob eb-ai-blob-b"></span>
      <span class="eb-ai-dots"></span>
    </div>
    ${head}
    <div class="eb-ai-win">
      <div class="eb-ai-tabbar">
        ${renderTab('zxd@web-01:22', 1, true)}
        ${renderTab('zxd@db-01:22', 2, false)}
        <span class="eb-ai-tab-new">${icon(ICON.plus, '')}</span>
        <span class="eb-ai-tab-caret">${icon(ICON.caret, '')}</span>
      </div>
      <div class="eb-ai-ctrl">
        <span class="eb-ai-pane-tab is-active">SSH</span>
        <span class="eb-ai-pane-tab">SFTP</span>
        <span class="eb-ai-sess-icons">
          <span class="eb-ai-sess-icon">${icon(ICON.clip, '')}</span>
          <span class="eb-ai-sess-icon">${SPLIT_VIEW}</span>
          <span class="eb-ai-sess-icon">${HEARTBEAT}</span>
          <span class="eb-ai-sess-icon">${icon(ICON.broadcast, '')}</span>
        </span>
        <span class="eb-ai-sess-right">
          <span class="eb-ai-sess-icon">${icon(ICON.fullscreen, '')}</span>
          <span class="eb-ai-sess-icon">${icon(ICON.search, '')}</span>
        </span>
      </div>
      <div class="eb-ai-body">
        <div class="eb-ai-term">
          <div class="eb-ai-tline">${PROMPT_PS1}${DF}</div>
          <div class="eb-ai-tline">${DF_OUT}</div>
          <div class="eb-ai-tline">${PROMPT_PS1}<span class="eb-ai-tcmd1"></span><span class="eb-ai-tcaret eb-ai-tcaret1"></span></div>
          <div class="eb-ai-tline eb-ai-tout eb-ai-tout1">${OUT1}</div>
          <div class="eb-ai-tline eb-ai-line2">${PROMPT_PS1}<span class="eb-ai-tcmd2"></span><span class="eb-ai-tcaret eb-ai-tcaret2"></span></div>
          ${OUT2.map((line) => '<div class="eb-ai-tline eb-ai-tout eb-ai-tout2">' + line + '</div>').join('')}
        </div>
        <div class="eb-ai-panel">
          <div class="eb-ai-ptitle">
            <span class="eb-ai-ptitle-l">
              <span class="eb-ai-ptag">AI</span>
              <span class="eb-ai-ptitle-t">AI Chat</span>
            </span>
            <span class="eb-ai-ptitle-r">
              ${renderIconBtn(ICON.pin, 'eb-ai-pin')}
              ${renderIconBtn(ICON.close, 'eb-ai-close')}
            </span>
          </div>
          <div class="eb-ai-msgs">
            <div class="eb-ai-msgs-in">
              <div class="eb-ai-bubble"><span>${PROMPT}</span></div>
              <div class="eb-ai-ans">
                <div class="eb-ai-brand">
                  <span class="eb-ai-brandtag">Electerm:${PRESET.name}</span>
                </div>
                <div class="eb-ai-prose">
                  <span>Prune the dangling layers first, then list what is left:</span>
                </div>
                <div class="eb-ai-code">
                  <div class="eb-ai-cacts">
                    ${renderIconBtn(ICON.copy, 'eb-ai-copy')}
                    ${renderIconBtn(ICON.play, 'eb-ai-play')}
                  </div>
                  <div class="eb-ai-pre">
                    <div class="eb-ai-cline"><span class="eb-ai-code1"></span></div>
                    <div class="eb-ai-cline"><span class="eb-ai-code2"></span></div>
                  </div>
                </div>
                <div class="eb-ai-think">
                  <span class="eb-ai-dot"></span>
                  <span class="eb-ai-dot"></span>
                  <span class="eb-ai-dot"></span>
                </div>
              </div>
            </div>
          </div>
          <div class="eb-ai-notice">
            <span class="eb-ai-nchip">429</span>
            <span class="eb-ai-ntext">free token rate-limited</span>
          </div>
          <div class="eb-ai-input">
            <div class="eb-ai-ta">
              <span class="eb-ai-taph">Enter your prompt here</span><span class="eb-ai-tatext"></span><span class="eb-ai-tacaret"></span>
            </div>
            <div class="eb-ai-irow">
              <span class="eb-ai-irow-l">
                <span class="eb-ai-seg">
                  <span class="eb-ai-seg-i is-on">Ask</span>
                  <span class="eb-ai-seg-i">Agent</span>
                </span>
                ${renderIconBtn(ICON.clip, 'eb-ai-attach')}
                ${renderIconBtn(ICON.gear, 'eb-ai-gear')}
              </span>
              ${renderIconBtn(ICON.send, 'eb-ai-send')}
            </div>
          </div>
        </div>
      </div>
      <div class="eb-ai-mask"></div>
      <div class="eb-ai-mbox">
        <div class="eb-ai-modal">
          <div class="eb-ai-mhead">AI Config</div>
          <div class="eb-ai-mbody">
            <div class="eb-ai-mrow">
              <span class="eb-ai-btn eb-ai-presets">Presets ${icon(ICON.down, '')}</span>
            </div>
            <div class="eb-ai-form">
              <div class="eb-ai-frow">
                <div class="eb-ai-field">
                  <span class="eb-ai-label">Name</span>
                  <span class="eb-ai-finput"><span class="eb-ai-val">${PRESET.name}</span></span>
                </div>
                <div class="eb-ai-field">
                  <span class="eb-ai-label">API URL</span>
                  <span class="eb-ai-finput"><span class="eb-ai-val">${PRESET.url}</span></span>
                </div>
              </div>
              <div class="eb-ai-field">
                <span class="eb-ai-label">API Key</span>
                <span class="eb-ai-finput"><span class="eb-ai-keydots"></span></span>
              </div>
              <div class="eb-ai-field">
                <span class="eb-ai-label">Model</span>
                <span class="eb-ai-finput">
                  <span class="eb-ai-val">${PRESET.model}</span>
                  ${icon(ICON.reload, 'eb-ai-reload')}
                </span>
              </div>
            </div>
            <div class="eb-ai-mfoot">
              <span class="eb-ai-btn eb-ai-btn-primary eb-ai-save">Save</span>
              <span class="eb-ai-btn eb-ai-test">
                <span class="eb-ai-test-label">Test connection</span>
                ${icon(ICON.reload, 'eb-ai-spin')}
              </span>
              <span class="eb-ai-ok">${icon(ICON.check, '')}Connected</span>
            </div>
            <div class="eb-ai-menu">${menuItems}</div>
          </div>
        </div>
      </div>
      <div class="eb-ai-toast">${icon(ICON.check, '')}<span>Saved</span></div>
      <span class="eb-ai-cursor">
        <svg viewBox="0 0 23 33" aria-hidden="true"><path d="${CURSOR_PATH}"/></svg>
      </span>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-ai'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'ai.electerm.org: the AI Config dialog in electerm picks the built-in ai.electerm.org preset, ' +
    'tests the key, then the AI panel answers a question with a command that runs in the terminal — ' +
    'and when the free token is rate-limited, a shared community key takes over')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    win: root.querySelector('.eb-ai-win'),
    panel: root.querySelector('.eb-ai-panel'),
    mask: root.querySelector('.eb-ai-mask'),
    mbox: root.querySelector('.eb-ai-mbox'),
    menu: root.querySelector('.eb-ai-menu'),
    menuItems: Array.prototype.slice.call(root.querySelectorAll('.eb-ai-mi')),
    menuPick: root.querySelector('.eb-ai-mi.is-pick'),
    presets: root.querySelector('.eb-ai-presets'),
    vals: Array.prototype.slice.call(root.querySelectorAll('.eb-ai-val')),
    keydots: root.querySelector('.eb-ai-keydots'),
    test: root.querySelector('.eb-ai-test'),
    testLabel: root.querySelector('.eb-ai-test-label'),
    spin: root.querySelector('.eb-ai-spin'),
    ok: root.querySelector('.eb-ai-ok'),
    save: root.querySelector('.eb-ai-save'),
    toast: root.querySelector('.eb-ai-toast'),
    taPh: root.querySelector('.eb-ai-taph'),
    taText: root.querySelector('.eb-ai-tatext'),
    taCaret: root.querySelector('.eb-ai-tacaret'),
    gear: root.querySelector('.eb-ai-gear'),
    gearRing: root.querySelector('.eb-ai-gear .eb-ai-ring'),
    send: root.querySelector('.eb-ai-send'),
    sendRing: root.querySelector('.eb-ai-send .eb-ai-ring'),
    bubble: root.querySelector('.eb-ai-bubble'),
    brand: root.querySelector('.eb-ai-brand'),
    prose: root.querySelector('.eb-ai-prose'),
    code: root.querySelector('.eb-ai-code'),
    code1: root.querySelector('.eb-ai-code1'),
    code2: root.querySelector('.eb-ai-code2'),
    play: root.querySelector('.eb-ai-play'),
    playRing: root.querySelector('.eb-ai-play .eb-ai-ring'),
    think: root.querySelector('.eb-ai-think'),
    thinkDots: Array.prototype.slice.call(root.querySelectorAll('.eb-ai-dot')),
    notice: root.querySelector('.eb-ai-notice'),
    nchip: root.querySelector('.eb-ai-nchip'),
    ntext: root.querySelector('.eb-ai-ntext'),
    cmd1: root.querySelector('.eb-ai-tcmd1'),
    cmd2: root.querySelector('.eb-ai-tcmd2'),
    line2: root.querySelector('.eb-ai-line2'),
    tcaret1: root.querySelector('.eb-ai-tcaret1'),
    tcaret2: root.querySelector('.eb-ai-tcaret2'),
    out1: root.querySelector('.eb-ai-tout1'),
    out2: Array.prototype.slice.call(root.querySelectorAll('.eb-ai-tout2')),
    cursor: root.querySelector('.eb-ai-cursor')
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

  // The code block is measured once, empty, while it still has its natural
  // height: the reveal then animates its height from 0 to that, so the prose
  // above it slides up instead of jumping when the block appears. Its two
  // lines hold their height even empty (.eb-ai-cline has a min-height), so
  // this measurement stays valid as the command types into it. This has to
  // happen before the first frame, because the frame loop hides the block
  // with `display: none` and a hidden box measures zero.
  const codeHem = el.code.getBoundingClientRect().height / (root.clientWidth / 100)

  const press = (btn, down, up) => {
    btn.style.transform = 'scale(' + (1 - 0.05 * down + 0.05 * up).toFixed(3) + ')'
  }
  const ring = (ringEl, t, from, to) => {
    const p = seg(t, from, to)
    ringEl.style.opacity = (p > 0 && p < 1 ? (1 - p) * 0.9 : 0).toFixed(3)
    ringEl.style.transform = 'scale(' + (0.7 + p * 1.5).toFixed(3) + ')'
  }
  const setText = (node, text) => {
    if (node.textContent !== text) node.textContent = text
  }

  // One line of state that must survive between frames.
  const state = { green: false }

  function frame (t) {
    const gone = 1 - easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    const blink = Math.floor(t / 460) % 2 === 0

    // 1. the window, and the AI panel docking into it
    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    el.win.style.opacity = (winP * gone).toFixed(3)
    el.win.style.transform = 'translateY(' + ((1 - winP) * 1.8).toFixed(3) + 'em)'

    const panP = easeOut(seg(t, T.panelFrom, T.panelTo))
    el.panel.style.opacity = panP.toFixed(3)
    el.panel.style.transform = 'translateX(' + ((1 - panP) * 3).toFixed(3) + 'em)'

    // 2. the gear, and the AI Config dialog it opens
    press(el.gear, seg(t, T.gearFrom, T.gearFrom + 130), seg(t, T.gearFrom + 130, T.gearFrom + 340))
    ring(el.gearRing, t, T.gearFrom, T.gearFrom + 520)

    const dlgIn = easeOut(seg(t, T.maskFrom + 70, T.maskTo + 120))
    const dlgOut = easeInOut(seg(t, T.modalOutFrom, T.modalOutTo))
    const dlg = dlgIn * (1 - dlgOut)
    el.mask.style.opacity = (easeOut(seg(t, T.maskFrom, T.maskTo)) * (1 - dlgOut) * 0.62).toFixed(3)
    el.mbox.style.opacity = dlg.toFixed(3)
    el.mbox.style.transform = 'translateY(calc(-50% + ' +
      ((1 - dlgIn) * 1.6 + dlgOut * 1.4).toFixed(3) + 'em)) scale(' +
      (0.95 + 0.05 * easeOutBack(dlgIn)).toFixed(3) + ')'

    // 3. the presets dropdown: open, highlight ai.electerm.org, pick it
    const menuIn = easeOut(seg(t, T.menuFrom, T.menuTo))
    const menuOut = easeInOut(seg(t, T.pickFrom + 120, T.pickFrom + 300))
    el.menu.style.opacity = (menuIn * (1 - menuOut)).toFixed(3)
    el.menu.style.transform = 'translateY(' + ((1 - menuIn) * -0.5).toFixed(3) + 'em) scaleY(' +
      (0.92 + 0.08 * menuIn).toFixed(3) + ')'
    el.menuItems.forEach((item, i) => {
      const from = T.menuFrom + 80 + i * 70
      item.style.opacity = easeOut(seg(t, from, from + 260)).toFixed(3)
    })
    const hi = seg(t, T.pickFrom, T.pickFrom + 200) * (1 - menuOut)
    el.menuPick.style.background = 'rgba(19, 137, 253, ' + (0.12 * hi).toFixed(3) + ')'
    el.menuPick.style.color = hi > 0.5 ? '#1c6fd6' : ''

    // 4. the form filling itself in, and the key being pasted
    const fill = easeOut(seg(t, T.fillFrom, T.fillTo))
    el.vals.forEach((val, i) => {
      const from = T.fillFrom + i * 120
      val.style.opacity = easeOut(seg(t, from, from + 300)).toFixed(3)
    })
    setText(el.keydots, '•'.repeat(Math.round(fill * KEY_LEN)))

    // 5. Test connection, then Save
    press(el.test, seg(t, T.testFrom, T.testFrom + 120), seg(t, T.testFrom + 120, T.testFrom + 320))
    const spin = seg(t, T.spinFrom, T.spinFrom + 140) * (1 - seg(t, T.okFrom, T.okFrom + 160))
    el.spin.style.opacity = spin.toFixed(3)
    el.spin.style.transform = 'rotate(' + ((t / 2.2) % 360).toFixed(1) + 'deg)'
    el.testLabel.style.opacity = spin > 0.5 ? '0' : '1'
    el.ok.style.opacity = easeOut(seg(t, T.okFrom, T.okTo)).toFixed(3)
    press(el.save, seg(t, T.saveFrom, T.saveFrom + 120), seg(t, T.saveFrom + 120, T.saveFrom + 320))

    const toastIn = easeOut(seg(t, T.toastFrom, T.toastFrom + 320))
    const toastOut = easeInOut(seg(t, T.toastFrom + 900, T.toastFrom + 1200))
    el.toast.style.opacity = (toastIn * (1 - toastOut)).toFixed(3)
    el.toast.style.transform = 'translate(-50%, ' +
      ((1 - toastIn) * -1 + toastOut * -1).toFixed(3) + 'em)'

    // 6. the prompt, typed and sent
    if (t < T.sentFrom) {
      const typed = Math.round(easeOut(seg(t, T.promptFrom, T.promptTo)) * PROMPT.length)
      setText(el.taText, PROMPT.slice(0, typed))
      el.taPh.style.opacity = typed ? '0' : '1'
    } else {
      setText(el.taText, '')
      el.taPh.style.opacity = '0'
    }
    el.taCaret.style.opacity = (t >= T.promptFrom && t < T.sentFrom && blink ? 1 : 0)
    press(el.send, seg(t, T.sendFrom, T.sendFrom + 120), seg(t, T.sendFrom + 120, T.sendFrom + 320))
    ring(el.sendRing, t, T.sendFrom, T.sendFrom + 520)

    const sentP = easeOut(seg(t, T.sentFrom, T.sentTo))
    el.bubble.style.opacity = sentP.toFixed(3)
    el.bubble.style.transform = 'translateY(' + ((1 - sentP) * 0.6).toFixed(3) + 'em)'

    // 7. the answer: brand tag, thinking dots, prose, code block
    el.brand.style.opacity = easeOut(seg(t, T.thinkFrom, T.thinkFrom + 260)).toFixed(3)

    const thinkP = seg(t, T.thinkFrom, T.thinkFrom + 200) * (1 - seg(t, T.ansFrom, T.ansFrom + 200))
    el.think.style.display = thinkP > 0.01 ? '' : 'none'
    el.thinkDots.forEach((dot, i) => {
      const phase = (((t - T.thinkFrom) / 900) + i * 0.18) % 1
      const amp = Math.abs(Math.sin(phase * Math.PI))
      dot.style.transform = 'translateY(' + (-amp * 0.45).toFixed(3) + 'em)'
      dot.style.opacity = (0.35 + 0.65 * amp).toFixed(3)
    })

    // A block that has not arrived yet must not hold a place: `opacity: 0`
    // still costs a line, and even a zero-height flex item still costs its two
    // gaps, which floats the thinking dots away from the brand tag.
    const proseP = easeOut(seg(t, T.ansFrom, T.ansTo))
    el.prose.style.display = proseP > 0.01 ? '' : 'none'
    el.prose.style.opacity = proseP.toFixed(3)

    // The block opens by growing. A border-box can never be shorter than its
    // own padding plus border, so those have to collapse with it — otherwise
    // the "empty" block is stuck at ~10.5px and the reveal hitches.
    const codeP = easeOut(seg(t, T.codeFrom, T.codeTo))
    el.code.style.display = codeP > 0.001 ? '' : 'none'
    el.code.style.opacity = easeOut(seg(t, T.codeFrom, T.codeFrom + 280)).toFixed(3)
    if (codeP >= 1) {
      el.code.style.height = ''
      el.code.style.overflow = ''
      el.code.style.padding = ''
      el.code.style.borderWidth = ''
    } else {
      el.code.style.height = (codeHem * codeP).toFixed(3) + 'em'
      el.code.style.overflow = 'hidden'
      el.code.style.padding = (0.55 * codeP).toFixed(3) + 'em 0.55em'
      el.code.style.borderWidth = codeP.toFixed(2) + 'px'
    }
    const total = CMD1.length + CMD2.length
    const n = Math.round(codeP * total)
    setText(el.code1, CMD1.slice(0, Math.min(n, CMD1.length)))
    setText(el.code2, n > CMD1.length ? CMD2.slice(0, n - CMD1.length) : '')

    // 8. the free token running out, and a shared key taking over
    const limP = easeOut(seg(t, T.limitFrom, T.limitTo))
    el.notice.style.opacity = limP.toFixed(3)
    el.notice.style.transform = 'translateY(' + ((1 - limP) * 0.6).toFixed(3) + 'em)'
    const green = seg(t, T.swapFrom, T.swapTo) > 0.5
    if (green !== state.green) {
      state.green = green
      el.notice.classList.toggle('is-ok', green)
      setText(el.nchip, green ? '✓' : '429')
      setText(el.ntext, green ? 'shared key · answer resumed' : 'free token rate-limited')
    }

    // 9. the pointer, and the code block's run-in-terminal icon
    const curP = easeOut(seg(t, T.curFrom, T.curTo))
    const curGone = 1 - easeInOut(seg(t, T.termFrom + 200, T.termFrom + 520))
    el.cursor.style.opacity =
      (seg(t, T.curFrom, T.curFrom + 220) * curGone * gone).toFixed(3)
    el.cursor.style.left = (95 - 7.5 * curP).toFixed(2) + 'em'
    el.cursor.style.top = (28 - 13.1 * curP).toFixed(2) + 'em'
    press(el.play, seg(t, T.runFrom, T.runFrom + 130), seg(t, T.runFrom + 130, T.runFrom + 340))
    ring(el.playRing, t, T.runFrom, T.runFrom + 560)

    // 10. the command landing in the terminal, and its output. Hidden lines
    // are display:none rather than transparent: the terminal is top-anchored,
    // so output arriving should push what follows it down, not sit in a hole.
    const tp1 = easeOut(seg(t, T.termFrom, T.termFrom + 400))
    setText(el.cmd1, CMD1.slice(0, Math.round(tp1 * CMD1.length)))
    const tp2 = easeOut(seg(t, T.termFrom + 640, T.termFrom + 1040))
    setText(el.cmd2, CMD2.slice(0, Math.round(tp2 * CMD2.length)))
    el.tcaret1.style.opacity = (t >= T.termFrom && t < T.termFrom + 460 && blink ? 1 : 0)
    el.tcaret2.style.opacity = (t >= T.termFrom + 640 && t < T.outFrom && blink ? 1 : 0)

    const o1 = easeOut(seg(t, T.termFrom + 460, T.termFrom + 680))
    el.out1.style.opacity = o1.toFixed(3)
    el.out1.style.display = o1 > 0.01 ? '' : 'none'
    el.line2.style.display = o1 > 0.01 ? '' : 'none'
    el.out2.forEach((line, i) => {
      const p = easeOut(seg(t, T.outFrom + i * 130, T.outTo + i * 130))
      line.style.opacity = p.toFixed(3)
      line.style.display = p > 0.01 ? '' : 'none'
    })
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // the settled frame: key saved, command run, output on screen
    frame(T.outTo + 200)
    return
  }

  // Pause the loop while the banner is scrolled out of view.
  const loop = { raf: null }
  const start = performance.now()
  const tick = (now) => {
    frame((now - start) % PERIOD)
    loop.raf = window.requestAnimationFrame(tick)
  }
  const play = () => {
    if (loop.raf === null) loop.raf = window.requestAnimationFrame(tick)
  }
  const pause = () => {
    if (loop.raf !== null) {
      window.cancelAnimationFrame(loop.raf)
      loop.raf = null
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
