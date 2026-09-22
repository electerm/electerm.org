/**
 * Animated banner for the "monitor bar and info panel" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the electerm window, the typed command, the 28px monitor bar
 * with its live values, the hover popover (CPU rows + sparkline + process
 * table), the cartoon pointer and the right-side info panel are all plain
 * DOM + CSS driven by one requestAnimationFrame timeline.
 *
 * The window is modelled on the real electerm UI. Colours and metrics are
 * taken from the app itself:
 *   ui theme ................. src/client/css/includes/theme.styl +
 *                             src/client/common/theme-defaults.js
 *                             (defaultThemeDark: main #121214, main-light
 *                             #2E3338, main-darker #0e0d0e, text #ddd,
 *                             text-dark #888, text-disabled #777, primary #08c,
 *                             success #06D6A0, warn #E55934, error #EF476F)
 *   terminal theme ........... theme-defaults.js (defaultThemeDarkTerminal)
 *   tab bar .................. components/tabs/tabs.styl
 *   monitor bar .............. components/remote-monitor/remote-monitor-bar.styl
 *                             + common/constants.js (remoteMonitorBarHeight 28,
 *                             footerHeight 36) — the bar is pinned `bottom: 36px`
 *   item values .............. remote-monitor-bar.jsx `summaryFor()`
 *                             (CPU n% / Mem x / y / ↑ ↓ rates / Up 12d 06h /
 *                             user +N / mount:nn%) and monitor-model.js
 *                             (`formatBytes` prefixes, `sortDisks` priority)
 *   item colours ............. monitor-details.styl: normal → var(--text),
 *                             warning → var(--warn), critical → var(--error);
 *                             the sparkline is var(--primary)
 *   detail popover ........... monitor-details.jsx (488px wide, heading, grid
 *                             rows, 360x88 sparkline, activity table with a
 *                             kill button per row, "info" button at the end)
 *   info panel ............... components/side-panel-r/side-panel-r.jsx +
 *                             right-side-panel.styl (500px, overlay from below
 *                             the top bar to above the footer, pin + close)
 *   info panel sections ...... components/terminal-info/base.jsx
 *                             (ID / save-terminal-log / timestamp / log path /
 *                             filter) and monitor-details.jsx renderers
 *   info icon lit state ...... terminal-info/terminal-info.styl (.active →
 *                             var(--success))
 *   icons .................... @ant-design/icons path data, verbatim
 *
 * The story, in four beats:
 *   1. an SSH session runs a deploy — the monitor bar arrives with the
 *      connection and its values count up to their live readings;
 *   2. the pointer hovers the CPU item: the detail popover opens with the
 *      5-minute sparkline and the process table;
 *   3. the pointer clicks "info" in that popover: the popover closes, the
 *      monitoring bar steps aside — it is hidden whenever the panel is open,
 *      and the terminal reclaims its 28px — and the info panel slides in;
 *   4. the panel's sections land one after another, and the info icon in the
 *      footer stays lit while the panel is up.
 *
 * Two deliberate liberties: the bar and footer fonts are rendered well above
 * life size (the real bar is 12px against a 1400px window; at banner scale
 * that would be illegible), and the activity table drops the user/memory
 * columns that the desktop popover has, for the same reason. The numbers,
 * labels and colours are the app's own.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + full window (blog post page)
 *   data-eb-banner="card"  -> window only           (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales to any container.
 */

const STYLE_ID = 'eb-mp-style'

// One full pass of the story, in ms.
const PERIOD = 12800

const T = {
  winFrom: 380, // the window rises into place
  winTo: 820,
  typeFrom: 520, // the deploy command is typed out
  typeTo: 1560,
  outFrom: 1700, // ... and reports back, a line at a time
  outGap: 230,
  outDur: 280,
  barFrom: 2560, // the bar arrives with the connection
  barTo: 2920,
  itemFrom: 2960, // its items land one by one
  itemGap: 78,
  itemDur: 360,
  sparkFrom: 3320, // the cpu history draws itself
  sparkTo: 4340,
  ptr1From: 4520, // the pointer travels to the CPU item
  ptr1To: 4980,
  popFrom: 4990, // hover -> the detail popover opens
  popTo: 5430,
  popRowFrom: 5140,
  popRowGap: 66,
  chartFrom: 5330, // the big sparkline draws
  chartTo: 6290,
  actFrom: 6260, // the process rows land
  actGap: 92,
  ptr2From: 7420, // the pointer travels down to "info"
  ptr2To: 7900,
  clickAt: 7990, // ... and clicks it
  panelFrom: 8120, // the panel slides in, the bar steps aside
  panelTo: 8760,
  secFrom: 8880, // panel sections land one by one
  secGap: 120,
  ptrFadeFrom: 11620,
  ptrFadeTo: 12000,
  fadeFrom: 12020,
  fadeTo: 12520
}

// ---- the app's own values (remote-monitor-bar.jsx summaryFor) ----
const HOSTNAME = 'web-01'
const CPU_VALUE = 37
const MEM_USED = 3.2
const MEM_TOTAL = '15.6 GiB'
const UP_RATE = 1.2
const DOWN_RATE = 4.6
const UPTIME = 'Up 12d 06h'
const USERS = 'zxd +2'
// sortDisks() puts / first, then /home, /var, /data — labels are mount:percent%
const DISKS = [
  { mount: '/', percent: 43, level: 'normal' },
  { mount: '/home', percent: 18, level: 'normal' },
  { mount: '/var', percent: 91, level: 'critical' }
]

const CMD = 'deploy'
// Kept short on purpose: the detail popover opens over the top-left of the
// terminal, and a line that pokes out past its right edge reads like a bug.
const OUT = [
  '▸ build 1842 modules',
  '▸ upload dist/ 48.2M',
  '▸ sync web-02 web-03',
  '▸ restarting web-01',
  '▸ reload nginx',
  '▸ health check 200 OK',
  '▸ done in 42.6s'
]

// cpu history: 5s samples with one stale stretch in the middle, which the real
// Sparkline draws as a broken line (>12000ms gap starts a new segment).
const CPU_HISTORY = [
  12.4, 14.1, 11.8, 22.6, 31.4, 28.9, 34.2, 41.6, 38.4, 44.9,
  52.1, 48.6, 55.3, 61.2, 58.7, 64.1, 69.8, 66.4, 58.9, 47.2,
  39.6, 33.1, 41.8, 36.2, 31.9, 37.4, 34.8, 30.6, 37.0, 37.2
]
const CPU_GAP_AFTER = 18 // sample index after which the monitor was stale

const ACTIVITY = [
  { pid: 28417, cpu: '62.4%', mem: '1.1 GiB', cmd: 'node dist/server.js' },
  { pid: 1206, cpu: '11.8%', mem: '214.6 MiB', cmd: 'mysqld --defaults-file=/etc/mysql/my.cnf' },
  { pid: 8834, cpu: '7.1%', mem: '88.3 MiB', cmd: 'rsync -a --delete ./dist/ web-02:/srv/app' }
]

// antd icon path data (viewBox 64 64 896 896 unless noted), the same glyphs
// the app renders through @ant-design/icons.
const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const CHART_PATH = 'M888 792H200V168c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v688c0 4.4 3.6 8 8 8h752c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm-600-80h56c4.4 0 8-3.6 8-8V560c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v144c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V384c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v320c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V462c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v242c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V304c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v400c0 4.4 3.6 8 8 8z'
const PIN_PATH = 'M878.3 392.1L631.9 145.7c-6.5-6.5-15-9.7-23.5-9.7s-17 3.2-23.5 9.7L423.8 306.9c-12.2-1.4-24.5-2-36.8-2-73.2 0-146.4 24.1-206.5 72.3a33.23 33.23 0 00-2.7 49.4l181.7 181.7-215.4 215.2a15.8 15.8 0 00-4.6 9.8l-3.4 37.2c-.9 9.4 6.6 17.4 15.9 17.4.5 0 1 0 1.5-.1l37.2-3.4c3.7-.3 7.2-2 9.8-4.6l215.4-215.4 181.7 181.7c6.5 6.5 15 9.7 23.5 9.7 9.7 0 19.3-4.2 25.9-12.4 56.3-70.3 79.7-158.3 70.2-243.4l161.1-161.1c12.9-12.8 12.9-33.8 0-46.8zM666.2 549.3l-24.5 24.5 3.8 34.4a259.92 259.92 0 01-30.4 153.9L262 408.8c12.9-7.1 26.3-13.1 40.3-17.9 27.2-9.4 55.7-14.1 84.7-14.1 9.6 0 19.3.5 28.9 1.6l34.4 3.8 24.5-24.5L608.5 224 800 415.5 666.2 549.3z'
const KILL_PATH = 'M512 64c247.4 0 448 200.6 448 448S759.4 960 512 960 64 759.4 64 512 264.6 64 512 64zm0 76c-205.4 0-372 166.6-372 372s166.6 372 372 372 372-166.6 372-372-166.6-372-372-372zm128.01 198.83c.03 0 .05.01.09.06l45.02 45.01a.2.2 0 01.05.09.12.12 0 010 .07c0 .02-.01.04-.05.08L557.25 512l127.87 127.86a.27.27 0 01.05.06v.02a.12.12 0 010 .07c0 .03-.01.05-.05.09l-45.02 45.02a.2.2 0 01-.09.05.12.12 0 01-.07 0c-.02 0-.04-.01-.08-.05L512 557.25 384.14 685.12c-.04.04-.06.05-.08.05a.12.12 0 01-.07 0c-.03 0-.05-.01-.09-.05l-45.02-45.02a.2.2 0 01-.05-.09.12.12 0 010-.07c0-.02.01-.04.06-.08L466.75 512 338.88 384.14a.27.27 0 01-.05-.06l-.01-.02a.12.12 0 010-.07c0-.03.01-.05.05-.09l45.02-45.02a.2.2 0 01.09-.05.12.12 0 01.07 0c.02 0 .04.01.08.06L512 466.75l127.86-127.86c.04-.05.06-.06.08-.06a.12.12 0 01.07 0z'
const FILTER_PATH = 'M880.1 154H143.9c-24.5 0-39.8 26.7-27.5 48L349 597.4V838c0 17.7 14.2 32 31.8 32h262.4c17.6 0 31.8-14.3 31.8-32V597.4L907.7 202c12.2-21.3-3.1-48-27.6-48zM603.4 798H420.6V642h182.9v156zm9.6-236.6l-9.5 16.6h-183l-9.5-16.6L212.7 226h598.6L613 561.4z'
// FolderOpenOutlined — what ShowItem renders next to the log path
const FOLDER_PATH = 'M928 444H820V330.4c0-17.7-14.3-32-32-32H473L355.7 186.2a8.15 8.15 0 00-5.5-2.2H96c-17.7 0-32 14.3-32 32v592c0 17.7 14.3 32 32 32h698c13 0 24.8-7.9 29.7-20l134-332c1.5-3.8 2.3-7.9 2.3-12 0-17.7-14.3-32-32-32zM136 256h188.5l119.6 114.4H748V444H238c-13 0-24.8 7.9-29.7 20L136 643.2V256zm635.3 512H159l103.3-256h612.4L771.3 768z'
const HISTORY_PATH = 'M536.1 273H488c-4.4 0-8 3.6-8 8v275.3c0 2.6 1.2 5 3.3 6.5l165.3 120.7c3.6 2.6 8.6 1.9 11.2-1.7l28.6-39c2.7-3.7 1.9-8.7-1.7-11.2L544.1 528.5V281c0-4.4-3.6-8-8-8zm219.8 75.2l156.8 38.3c5 1.2 9.9-2.6 9.9-7.7l.8-161.5c0-6.7-7.7-10.5-12.9-6.3L752.9 334.1a8 8 0 003 14.1zm167.7 301.1l-56.7-19.5a8 8 0 00-10.1 4.8c-1.9 5.1-3.9 10.1-6 15.1-17.8 42.1-43.3 80-75.9 112.5a353 353 0 01-112.5 75.9 352.18 352.18 0 01-137.7 27.8c-47.8 0-94.1-9.3-137.7-27.8a353 353 0 01-112.5-75.9c-32.5-32.5-58-70.4-75.9-112.5A353.44 353.44 0 01171 512c0-47.8 9.3-94.2 27.8-137.8 17.8-42.1 43.3-80 75.9-112.5a353 353 0 01112.5-75.9C430.6 167.3 477 158 524.8 158s94.1 9.3 137.7 27.8A353 353 0 01775 261.7c10.2 10.3 19.8 21 28.6 32.3l59.8-46.8C784.7 146.6 662.2 81.9 524.6 82 285 82.1 92.6 276.7 95 516.4 97.4 751.9 288.9 942 524.8 942c185.5 0 343.5-117.6 403.7-282.3 1.5-4.2-.7-8.9-4.9-10.4z'
const FUNC_PATH = 'M841 370c3-3.3 2.7-8.3-.6-11.3a8.24 8.24 0 00-5.3-2.1h-72.6c-2.4 0-4.6 1-6.1 2.8L633.5 504.6a7.96 7.96 0 01-13.4-1.9l-63.5-141.3a7.9 7.9 0 00-7.3-4.7H380.7l.9-4.7 8-42.3c10.5-55.4 38-81.4 85.8-81.4 18.6 0 35.5 1.7 48.8 4.7l14.1-66.8c-22.6-4.7-35.2-6.1-54.9-6.1-103.3 0-156.4 44.3-175.9 147.3l-9.4 49.4h-97.6c-3.8 0-7.1 2.7-7.8 6.4L181.9 415a8.07 8.07 0 007.8 9.7H284l-89 429.9a8.07 8.07 0 007.8 9.7H269c3.8 0 7.1-2.7 7.8-6.4l89.7-433.1h135.8l68.2 139.1c1.4 2.9 1 6.4-1.2 8.8l-180.6 203c-2.9 3.3-2.6 8.4.7 11.3 1.5 1.3 3.4 2 5.3 2h72.7c2.4 0 4.6-1 6.1-2.8l123.7-146.7c2.8-3.4 7.9-3.8 11.3-1 .9.8 1.6 1.7 2.1 2.8L676.4 784c1.3 2.8 4.1 4.7 7.3 4.7h64.6a8.02 8.02 0 007.2-11.5l-95.2-198.9c-1.4-2.9-.9-6.4 1.3-8.8L841 370z'
const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

/**
 * Polyline segments for a history, exactly like monitor-details.jsx Sparkline:
 * x is normalised against the time span, y against 0-100%, and a gap longer
 * than 12s starts a new segment so a stale stretch is never drawn as a line.
 */
function sparkSegments (values, width, height, gapAfter) {
  const step = 5000
  const points = []
  let t = 0
  values.forEach((value, index) => {
    points.push({ t, value })
    t += index === gapAfter ? 25000 : step
  })
  const span = Math.max(1, points[points.length - 1].t)
  const segments = []
  let current = []
  points.forEach((point) => {
    if (current.length && point.t - current[current.length - 1].t > 12000) {
      segments.push(current)
      current = []
    }
    current.push({
      x: point.t * width / span,
      y: height - Math.max(0, Math.min(100, point.value)) * height / 100
    })
  })
  if (current.length) segments.push(current)
  return segments.map(segment => segment
    .map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' '))
}

const CPU_SPARK = sparkSegments(CPU_HISTORY, 360, 88, CPU_GAP_AFTER)
// the bar's own sparkline is the real 72x20 viewBox, fed the latest samples
const BAR_SPARK = sparkSegments(CPU_HISTORY.slice(-16), 72, 20)
const BAR_SPARK_POINTS = BAR_SPARK.join(' ')

const CSS = `
.eb-mp {
  /* real electerm ui theme — src/client/css/includes/theme.styl with the
     shipped dark theme (common/theme-defaults.js, defaultThemeDark) over it */
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
  /* real electerm default terminal theme */
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-cursor: #b5bd68;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  --eb-term-red: #ba3934;
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
.eb-mp-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-mp-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(8, 136, 204, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-mp-drift 34s linear infinite;
}
@keyframes eb-mp-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-mp-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.6); }
.eb-mp-blob-a { width: 30em; height: 30em; right: -9em; top: -13em; }
.eb-mp-blob-b { width: 26em; height: 26em; left: -10em; bottom: -12em; }
.eb-mp-spark-dot {
  position: absolute;
  width: 1.7em;
  height: 1.7em;
  background: #06d6a0;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-mp-twinkle 3.6s ease-in-out infinite;
}
.eb-mp-spark-a { right: 7.2em; top: 4.4em; }
.eb-mp-spark-b { right: 15.4em; top: 12.6em; width: 1.05em; height: 1.05em; background: #ec4899; animation-delay: 0.7s; }
.eb-mp-spark-c { right: 4.4em; top: 16.4em; width: 1.25em; height: 1.25em; background: #8884d8; animation-delay: 1.4s; }
@keyframes eb-mp-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}

/* ---------- headline ---------- */
.eb-mp-head { position: absolute; left: 5em; right: 5em; top: 3.2em; pointer-events: none; }
.eb-mp-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
  font-weight: 800;
  color: var(--eb-primary);
}
.eb-mp-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: var(--eb-primary);
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-mp-h1 {
  margin: 0.26em 0 0;
  font-size: 3.4em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-mp-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #0888cc, #7c3aed 55%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-mp-sub {
  margin: 0.5em 0 0;
  max-width: 58em;
  font-size: 1.5em;
  line-height: 1.4;
  color: #475569;
}

/* ---------- the electerm window ----------
   The frame is sized in root em; the app inside carries the font scale, so
   every metric inside it (bar height, popover, panel) is in app em. */
.eb-mp-frame {
  position: absolute;
  left: 50%;
  bottom: 3.4em;
  width: 80em;
  height: 36em;
  transform: translateX(-50%);
}
.eb-mp-app {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  font-size: 1em;
  background: var(--eb-term-bg);
  border-radius: 0.7em;
  box-shadow: 0 1.2em 2.4em rgba(9, 20, 40, 0.34), 0 0 2.4em rgba(8, 136, 204, 0.18);
  overflow: hidden;
  text-align: left;
  animation: eb-mp-glow 4.6s ease-in-out infinite;
}
@keyframes eb-mp-glow {
  0%, 100% { box-shadow: 0 1.2em 2.4em rgba(9, 20, 40, 0.34), 0 0 2.2em rgba(8, 136, 204, 0.16); }
  50% { box-shadow: 0 1.2em 2.4em rgba(9, 20, 40, 0.36), 0 0 3.4em rgba(124, 58, 237, 0.34); }
}

/* ---------- tab bar ---------- */
.eb-mp-tabbar {
  flex: none;
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.3em;
  line-height: 1;
}
.eb-mp-tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.42em;
  height: 100%;
  min-width: 8.4em;
  max-width: 17em;
  padding: 0 1em;
  border-radius: 0.21em 0.21em 0 0;
  background: var(--eb-main-dark);
  color: var(--eb-text-dark);
  white-space: nowrap;
}
.eb-mp-tab.is-active { background: var(--eb-main); color: var(--eb-text); font-weight: 700; }
.eb-mp-tab-name { overflow: hidden; text-overflow: ellipsis; }
.eb-mp-tab-status {
  position: absolute;
  left: 0.14em;
  top: 0.14em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-text-dark);
}
.eb-mp-tab-status.is-connected { background: var(--eb-success); }
.eb-mp-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-mp-tab-close {
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
.eb-mp-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-mp-tab-add,
.eb-mp-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  height: 1.6em;
  color: var(--eb-text);
}
.eb-mp-tab-add { width: 1.5em; margin-left: 0.3em; color: var(--eb-success); }
.eb-mp-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-mp-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); }
.eb-mp-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }

/* ---------- terminal ---------- */
.eb-mp-main {
  position: relative;
  flex: 1;
  min-height: 0;
  /* the popover is a floating layer: it may reach up over the tab bar the way
     an antd popover does, and the window itself does the clipping */
}
.eb-mp-term {
  position: absolute;
  inset: 0;
  padding: 1.1em 1.4em 1.2em;
  font-size: 2.1em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.45;
  color: var(--eb-term-fg);
  white-space: nowrap;
}
.eb-mp-line { line-height: 1.45; }
.eb-mp-out { opacity: 0; }
.eb-mp-ps1 { color: var(--eb-term-green); }
.eb-mp-ps1-path { color: var(--eb-term-blue); }
.eb-mp-pipe { color: var(--eb-term-blue); }
.eb-mp-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  margin-left: 0.04em;
  vertical-align: -0.26em;
  background: var(--eb-term-cursor);
}

/* ---------- monitor bar ----------
   Height is the app's own 28px against a 36px footer (common/constants.js);
   the font is rendered above life size so the values stay readable here. */
.eb-mp-bar {
  flex: none;
  display: flex;
  align-items: stretch;
  height: 2em;
  overflow: hidden;
  background: var(--eb-main);
  color: var(--eb-text);
  /* nine items have to fit a 78em window; this is the largest size the whole
     strip still fits at, which is still well above the app's life size */
  font-size: 1.07em;
  font-variant-numeric: tabular-nums;
  user-select: none;
}
.eb-mp-bar-scroll {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: stretch;
  overflow: hidden;
  padding-left: 0.3em;
}
.eb-mp-item {
  display: inline-flex;
  align-items: center;
  gap: 0.36em;
  flex: none;
  padding: 0 0.4em;
  white-space: nowrap;
  opacity: 0;
}
.eb-mp-item-hostname { max-width: 18em; overflow: hidden; text-overflow: ellipsis; }
.eb-mp-item.is-lit { background: var(--eb-main-light); }
.eb-mp-spark-s { width: 3.6em; height: 1em; display: block; color: var(--eb-primary); overflow: visible; }
.eb-mp-spark-s polyline { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.eb-mp-level-warning { color: var(--eb-warn); }
.eb-mp-level-critical { color: var(--eb-error); }
.eb-mp-level-unknown { color: var(--eb-text-disabled); }
.eb-mp-disk-summary { display: inline-flex; align-items: center; gap: 0.6em; }
.eb-mp-bar-controls {
  flex: none;
  display: flex;
  align-items: center;
  padding-right: 0.2em;
  opacity: 0;
  transition: opacity 160ms ease;
}
.eb-mp-bar-controls svg { width: 0.95em; height: 0.95em; fill: var(--eb-text-dark); }
.eb-mp-bar-controls > * { display: inline-flex; align-items: center; padding: 0 0.4em; height: 100%; }
.eb-mp-bar.is-hovered .eb-mp-bar-controls { opacity: 1; }
.eb-mp-bar.is-hovered .eb-mp-bar-controls svg { fill: var(--eb-text); }

/* ---------- detail popover ----------
   488px against the app's default 1400px window is ~35% of the width; at the
    banner's scale that is 28em, and the same grid is used for the rows. */
.eb-mp-pop {
  position: absolute;
  left: 1.2em;
  bottom: 1.25em;
  width: 28.5em;
  padding: 0.75em 0.9em 0.5em;
  border-radius: 0.35em;
  background: var(--eb-main);
  color: var(--eb-text);
  /* sized so the whole thing clears the bar it opens above */
  font-size: 1.05em;
  box-shadow: 0 0.6em 1.6em rgba(0, 0, 0, 0.42), 0 0 0 1px var(--eb-main-darker);
  transform-origin: 20% 100%;
  opacity: 0;
  pointer-events: none;
  z-index: 3;
}
.eb-mp-pop-head { margin-bottom: 0.45em; font-size: 1.05em; font-weight: 600; }
.eb-mp-row {
  display: grid;
  grid-template-columns: minmax(0, 0.45fr) minmax(0, 1fr);
  gap: 0.6em;
  padding: 0.14em 0;
  opacity: 0;
}
.eb-mp-row dt { color: var(--eb-text-dark); }
.eb-mp-row dd { margin: 0; font-variant-numeric: tabular-nums; }
.eb-mp-chart { margin: 0.35em 0 0.4em; }
.eb-mp-spark-l { display: block; width: 100%; height: 4em; color: var(--eb-primary); overflow: visible; }
.eb-mp-spark-l polyline { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.eb-mp-act { margin-top: 0.15em; }
.eb-mp-act-head { margin-bottom: 0.35em; font-size: 1.05em; font-weight: 600; }
.eb-mp-tbl-head,
.eb-mp-tbl-row {
  display: grid;
  grid-template-columns: 1.4em 3.4em 3.5em 5.2em minmax(0, 1fr);
  align-items: center;
  gap: 0.35em;
  padding: 0.16em 0;
  font-variant-numeric: tabular-nums;
}
.eb-mp-tbl-head > span,
.eb-mp-tbl-row > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eb-mp-tbl-head { color: var(--eb-text-dark); border-bottom: 1px solid var(--eb-main-light); }
.eb-mp-tbl-row { opacity: 0; }
.eb-mp-tbl-row.is-hovered { background: var(--eb-main-light); }
.eb-mp-tbl-cmd { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eb-mp-kill { display: inline-flex; align-items: center; }
.eb-mp-kill svg { width: 0.95em; height: 0.95em; fill: var(--eb-text-dark); }
.eb-mp-tbl-row.is-hovered .eb-mp-kill svg { fill: var(--eb-error); }
.eb-mp-info-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  margin-top: 0.3em;
  padding: 0.15em 0.3em;
  border-radius: 0.2em;
  color: var(--eb-primary);
  opacity: 0;
}
.eb-mp-info-btn svg { width: 0.9em; height: 0.9em; fill: currentColor; }
.eb-mp-info-btn.is-hovered { background: var(--eb-main-light); }

/* ---------- info panel ----------
   overlay: below the top bar, above the footer (right-side-panel.styl) */
.eb-mp-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 28em;
  z-index: 4;
  display: flex;
  flex-direction: column;
  background: var(--eb-main);
  color: var(--eb-text);
  border-left: 1px solid var(--eb-main-darker);
  box-shadow: -0.6em 0 1.6em rgba(0, 0, 0, 0.34);
  font-size: 1.12em;
  transform: translateX(104%);
}
.eb-mp-panel-title {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 2.6em;
  padding: 0 0.7em;
  border-bottom: 1px solid var(--eb-main-darker);
}
.eb-mp-panel-title-main { display: inline-flex; align-items: center; gap: 0.4em; font-weight: 600; }
.eb-mp-panel-title-main svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-mp-panel-icons { display: inline-flex; align-items: center; gap: 0.6em; color: var(--eb-text-dark); }
.eb-mp-panel-icons svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-mp-panel-icons .eb-mp-pin svg { fill: var(--eb-text-dark); }
.eb-mp-panel-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0.5em 0.7em 0;
}
.eb-mp-panel-content .eb-mp-row { opacity: 1; }
.eb-mp-sec { opacity: 0; }
.eb-mp-sec-id { font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eb-mp-sec-id b { color: var(--eb-text-light); }
.eb-mp-switch-row { display: flex; align-items: center; gap: 0.5em; padding: 0.24em 0; }
.eb-mp-switch-row.is-sub { padding-left: 1.4em; }
.eb-mp-switch {
  flex: none;
  width: 1.7em;
  height: 0.95em;
  border-radius: 0.5em;
  background: var(--eb-text-disabled);
  position: relative;
  transition: background 200ms ease;
}
.eb-mp-switch::after {
  content: '';
  position: absolute;
  top: 0.13em;
  left: 0.13em;
  width: 0.7em;
  height: 0.7em;
  border-radius: 50%;
  background: #fff;
  transition: transform 200ms ease;
}
.eb-mp-switch.is-on { background: var(--eb-primary); }
.eb-mp-switch.is-on::after { transform: translateX(0.74em); }
.eb-mp-log-path { color: var(--eb-text-dark); font-size: 0.9em; padding: 0.1em 0 0.3em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eb-mp-log-path em { font-style: normal; color: var(--eb-text); }
.eb-mp-reveal { display: inline-flex; align-items: center; color: var(--eb-text-dark); }
.eb-mp-reveal svg { width: 0.9em; height: 0.9em; fill: currentColor; }
.eb-mp-filter-row { display: flex; justify-content: flex-end; padding: 0.3em 0 0.2em; }
.eb-mp-filter-row svg { width: 0.95em; height: 0.95em; fill: var(--eb-text-dark); }
.eb-mp-sec-head {
  margin: 0.6em 0 0.25em;
  font-weight: 600;
  color: var(--eb-text-light);
}

/* ---------- footer ---------- */
.eb-mp-footer {
  flex: none;
  display: flex;
  align-items: center;
  height: 2.4em;
  padding: 0 0.5em;
  background: var(--eb-main);
  color: var(--eb-text);
  font-size: 1.2em;
}
.eb-mp-footer svg { width: 1em; height: 1em; fill: currentColor; }
.eb-mp-footer-unit { display: inline-flex; align-items: center; padding: 0 0.4em; color: var(--eb-text-dark); }
.eb-mp-footer-batch {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  margin: 0 0.5em;
  padding: 0 0.55em;
  height: 1.75em;
  border-radius: 0.25em;
  background: var(--eb-main-light);
  color: var(--eb-text-disabled);
  font-size: 0.95em;
  overflow: hidden;
  white-space: nowrap;
}
.eb-mp-footer-encode {
  display: inline-flex;
  align-items: center;
  gap: 0.28em;
  color: var(--eb-text);
}
.eb-mp-footer-encode svg { width: 0.7em; height: 0.7em; fill: var(--eb-text-dark); }
.eb-mp-footer-unit.is-active { color: var(--eb-success); }

/* ---------- cartoon pointer + click ripple ---------- */
.eb-mp-pointer {
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
.eb-mp-pointer svg { display: block; width: 100%; height: 100%; }
.eb-mp-ripple {
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

/* ---------- card (blog index) variant ---------- */
.eb-mp[data-variant='card'] .eb-mp-frame {
  bottom: auto;
  top: 50%;
  width: 100em;
  height: 52em;
  transform: translate(-50%, -50%);
}
/* The thumbnail has no headline to share the height with, so the window fills
   the card and the app inside is scaled up until its chrome stays readable.
   The ceiling is the monitor bar, not the popover: nine items have to fit the
   100em card, which lands the scale at 1.28. */
.eb-mp[data-variant='card'] .eb-mp-app { font-size: 1.28em; }

@media (prefers-reduced-motion: reduce) {
  .eb-mp-dots, .eb-mp-spark-dot, .eb-mp-app { animation: none !important; }
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

let uidSeq = 0

function markup (variant) {
  const uid = 'eb-mp-' + (++uidSeq)
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-mp-head">
        <span class="eb-mp-brand">electerm</span>
        <h2 class="eb-mp-h1">Watch a server <em>without typing a command</em></h2>
        <p class="eb-mp-sub">The monitor bar samples CPU, memory, disk and network over the SSH session you already have open — and the info panel shows the whole machine.</p>
      </div>`

  const items = [
    `<span class="eb-mp-item eb-mp-item-hostname">${HOSTNAME}</span>`,
    '<span class="eb-mp-item eb-mp-item-cpu"></span>',
    `<span class="eb-mp-item eb-mp-item-cpuHistory">
      <svg class="eb-mp-spark-s" viewBox="0 0 72 20" aria-hidden="true"><polyline points="${BAR_SPARK_POINTS}"/></svg>
    </span>`,
    '<span class="eb-mp-item eb-mp-item-memory"></span>',
    '<span class="eb-mp-item eb-mp-item-upload"></span>',
    '<span class="eb-mp-item eb-mp-item-download"></span>',
    `<span class="eb-mp-item eb-mp-item-uptime">${UPTIME}</span>`,
    `<span class="eb-mp-item eb-mp-item-users">${USERS}</span>`,
    `<span class="eb-mp-item eb-mp-item-disks"><span class="eb-mp-disk-summary">${
      DISKS.map(d => `<span class="eb-mp-level-${d.level}">${d.mount}:${d.percent}%</span>`).join('')
    }</span></span>`
  ].join('')

  const rows = [
    ['Current', '37.2%'],
    ['Average', '31.4%'],
    ['Minimum', '12.4%'],
    ['Maximum', '88.6%']
  ].map(([k, v]) => `<div class="eb-mp-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')

  const act = ACTIVITY.map(row => `
    <div class="eb-mp-tbl-row" data-row="${row.pid}">
      <span class="eb-mp-kill">${icon(KILL_PATH, '')}</span>
      <span>${row.pid}</span>
      <span>${row.cpu}</span>
      <span>${row.mem}</span>
      <span class="eb-mp-tbl-cmd">${row.cmd}</span>
    </div>`).join('')

  const panelRows = (rows) => rows
    .map(([k, v]) => `<div class="eb-mp-row"><dt>${k}</dt><dd>${v}</dd></div>`)
    .join('')

  return `
    <div class="eb-mp-deco">
      <span class="eb-mp-dots"></span>
      <span class="eb-mp-blob eb-mp-blob-a"></span>
      <span class="eb-mp-blob eb-mp-blob-b"></span>
      <span class="eb-mp-spark-dot eb-mp-spark-a"></span>
      <span class="eb-mp-spark-dot eb-mp-spark-b"></span>
      <span class="eb-mp-spark-dot eb-mp-spark-c"></span>
    </div>
    ${head}
    <div class="eb-mp-frame">
      <div class="eb-mp-app">
        <div class="eb-mp-tabbar">
          <span class="eb-mp-tab">
            <span class="eb-mp-tab-status"></span>
            <span class="eb-mp-tab-count">1</span>
            <span class="eb-mp-tab-name">local</span>
          </span>
          <span class="eb-mp-tab is-active">
            <span class="eb-mp-tab-status is-connected"></span>
            <span class="eb-mp-tab-count">2</span>
            <span class="eb-mp-tab-name">zxd@web-01:22</span>
            <span class="eb-mp-tab-close">${icon(CLOSE_PATH, '')}</span>
          </span>
          <span class="eb-mp-tab-add">${icon(PLUS_PATH, '')}</span>
          <span class="eb-mp-tabbar-caret">${icon(CARET_PATH, '')}</span>
        </div>
        <div class="eb-mp-main">
          <div class="eb-mp-term">
            <div class="eb-mp-line"><span class="eb-mp-ps1">zxd@web-01</span>:<span class="eb-mp-ps1-path">~</span>$&nbsp;<span class="eb-mp-cmd"></span><span class="eb-mp-caret"></span></div>
            ${Array.from({ length: variant === 'card' ? 6 : OUT.length }, () => '<div class="eb-mp-line eb-mp-out"></div>').join('')}
          </div>
          <div class="eb-mp-pop">
            <div class="eb-mp-pop-head">cpu</div>
            ${rows}
            <div class="eb-mp-chart">
              <svg class="eb-mp-spark-l" viewBox="0 0 360 88" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <clipPath id="${uid}-clip"><rect x="0" y="0" width="0" height="88"/></clipPath>
                </defs>
                <g clip-path="url(#${uid}-clip)">
                  ${CPU_SPARK.map(points => `<polyline points="${points}"/>`).join('')}
                </g>
              </svg>
            </div>
            <div class="eb-mp-act">
              <div class="eb-mp-act-head">activity</div>
              <div class="eb-mp-tbl-head">
                <span></span><span>PID</span><span>CPU</span><span>mem</span><span>process</span>
              </div>
              ${act}
            </div>
            <span class="eb-mp-info-btn">${icon(CHART_PATH, '')}<span>info</span></span>
          </div>
          <div class="eb-mp-panel">
            <div class="eb-mp-panel-title">
              <span class="eb-mp-panel-title-main">${icon(CHART_PATH, '')}<span>info</span></span>
              <span class="eb-mp-panel-icons">
                <span class="eb-mp-pin">${icon(PIN_PATH, '')}</span>
                <span class="eb-mp-close">${icon(KILL_PATH, '')}</span>
              </span>
            </div>
            <div class="eb-mp-panel-content">
              <div class="eb-mp-sec-id"><b>ID:</b> 4f1c2a7e-9b31-4e0d-8f6a</div>
              <div class="eb-mp-switch-row"><span class="eb-mp-switch is-on"></span><span>save terminal log to file</span></div>
              <div class="eb-mp-switch-row is-sub"><span class="eb-mp-switch is-on"></span><span>addTimeStampToTermLog</span></div>
              <div class="eb-mp-log-path">terminal log path: <em>~/electerm-logs/web-01.log</em> <span class="eb-mp-reveal">${icon(FOLDER_PATH, '')}</span></div>
              <div class="eb-mp-filter-row">${icon(FILTER_PATH, '')}</div>
              <div class="eb-mp-sec" data-sec="hostname">
                <div class="eb-mp-sec-head">hostname</div>
                ${panelRows([
                  ['Hostname', HOSTNAME],
                  ['Address', '10.0.4.21'],
                  ['OS', 'Debian GNU/Linux 12 (bookworm)'],
                  ['Kernel', '6.1.0-13-amd64'],
                  ['Arch', 'x86_64'],
                  ['Shell', 'zsh 5.9']
                ])}
              </div>
              <div class="eb-mp-sec" data-sec="uptime">
                <div class="eb-mp-sec-head">uptime</div>
                ${panelRows([
                  ['Uptime', '12d 06h 41m 22s'],
                  ['Boot time', '9/10/2026, 2:11:04 AM']
                ])}
              </div>
              <div class="eb-mp-sec" data-sec="memory">
                <div class="eb-mp-sec-head">mem</div>
                ${panelRows([
                  ['Used', '3.2 GiB (20.5%)'],
                  ['Available', '11.8 GiB'],
                  ['Total', MEM_TOTAL],
                  ['Swap', '0 B / 2.0 GiB']
                ])}
              </div>
            </div>
          </div>
        </div>
        <div class="eb-mp-bar">
          <div class="eb-mp-bar-scroll">${items}</div>
          <div class="eb-mp-bar-controls">
            <span>${icon(FILTER_PATH, '')}</span>
            <span>${icon(CLOSE_PATH, '')}</span>
          </div>
        </div>
        <div class="eb-mp-footer">
          <span class="eb-mp-footer-unit">${icon(HISTORY_PATH, '')}</span>
          <span class="eb-mp-footer-unit">${icon(FUNC_PATH, '')}</span>
          <span class="eb-mp-footer-batch">send to all sessions…</span>
          <span class="eb-mp-footer-unit eb-mp-footer-encode">UTF-8 ${icon(CARET_PATH, '')}</span>
          <span class="eb-mp-footer-unit eb-mp-info">${icon(CHART_PATH, '')}</span>
        </div>
      </div>
      <span class="eb-mp-pointer"><svg viewBox="-3 -3 29 39"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
      <span class="eb-mp-ripple"></span>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-mp'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    `electerm: the monitor bar reports ${HOSTNAME} CPU 37%, memory 3.2 GiB of 15.6 GiB, uptime 12 days, and a disk at 91%; hovering CPU opens the detail popover, and the info button opens the right-side info panel`)
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const el = {
    app: q('.eb-mp-app'),
    term: q('.eb-mp-term'),
    cmd: q('.eb-mp-cmd'),
    caret: q('.eb-mp-caret'),
    outs: [...root.querySelectorAll('.eb-mp-out')],
    bar: q('.eb-mp-bar'),
    barScroll: q('.eb-mp-bar-scroll'),
    items: [...root.querySelectorAll('.eb-mp-item')],
    itemCpu: q('.eb-mp-item-cpu'),
    itemMem: q('.eb-mp-item-memory'),
    itemUp: q('.eb-mp-item-upload'),
    itemDown: q('.eb-mp-item-download'),
    iHostname: q('.eb-mp-item-hostname'),
    iCpuHistory: q('.eb-mp-item-cpuHistory'),
    iUptime: q('.eb-mp-item-uptime'),
    iUsers: q('.eb-mp-item-users'),
    iDisks: q('.eb-mp-item-disks'),
    controls: q('.eb-mp-bar-controls'),
    pop: q('.eb-mp-pop'),
    popRows: [...root.querySelectorAll('.eb-mp-pop .eb-mp-row')],
    clipRect: root.querySelector('clipPath rect'),
    tblRows: [...root.querySelectorAll('.eb-mp-tbl-row')],
    infoBtn: q('.eb-mp-info-btn'),
    panel: q('.eb-mp-panel'),
    secs: [...root.querySelectorAll('.eb-mp-panel .eb-mp-sec')],
    infoIcon: q('.eb-mp-info'),
    pointer: q('.eb-mp-pointer'),
    ripple: q('.eb-mp-ripple'),
    frame: q('.eb-mp-frame')
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

  // The pointer travels in the frame's own coordinates, which are also the
  // app's (the app fills the frame). Both targets are measured off the DOM once
  // the banner is laid out, so the pointer lands on the real CPU item and the
  // real "info" button rather than on hand-written coordinates.
  const targets = { p1: { x: 8.6, y: 33.6 }, p2: { x: 3.4, y: 29.2 } }
  const measure = () => {
    const frameBox = el.frame.getBoundingClientRect()
    const scale = root.clientWidth / 100 || 1
    const toFrame = (box, ax, ay) => ({
      x: (box.left + box.width * ax - frameBox.left) / scale,
      y: (box.top + box.height * ay - frameBox.top) / scale
    })
    const cpuBox = el.itemCpu.getBoundingClientRect()
    const infoBox = el.infoBtn.getBoundingClientRect()
    if (cpuBox.width) targets.p1 = toFrame(cpuBox, 0.5, 0.55)
    if (infoBox.width) targets.p2 = toFrame(infoBox, 0.5, 0.5)
  }
  measure()
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure)
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))

    // the window rises — the card variant is centred with a -50% Y offset of
    // its own, so the inline transform has to carry it
    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    const baseY = variant === 'card' ? -50 : 0
    root.style.opacity = (1 - gone).toFixed(3)
    el.frame.style.transform =
      `translate(-50%, ${baseY}%) translateY(${((1 - winP) * 3.2).toFixed(2)}em)`

    // the command being typed, block cursor only while the shell waits
    const typed = Math.round(easeOut(seg(t, T.typeFrom, T.typeTo)) * CMD.length)
    el.cmd.textContent = CMD.slice(0, typed)
    el.caret.style.display = t < T.outFrom ? '' : 'none'

    // output lines land
    el.outs.forEach((node, index) => {
      const p = easeOut(seg(t, T.outFrom + index * T.outGap,
        T.outFrom + index * T.outGap + T.outDur))
      node.textContent = OUT[index] || ''
      node.style.opacity = p.toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.4).toFixed(3) + 'em)'
    })

    // the bar arrives with the connection
    const barP = easeOut(seg(t, T.barFrom, T.barTo))
    // ... and steps aside for the panel: hidden whenever the panel is open, so
    // the terminal reclaims its 28px (layout.jsx monitorHeight)
    const barOut = easeInOut(seg(t, T.panelFrom, T.panelTo))
    el.bar.style.height = (2 * barP * (1 - barOut)).toFixed(3) + 'em'
    el.bar.style.opacity = (barP * (1 - barOut)).toFixed(3)
    el.barScroll.style.opacity = (1 - barOut).toFixed(3)

    // items land one by one; the live values count up to their readings
    el.items.forEach((node, index) => {
      const p = easeOut(seg(t, T.itemFrom + index * T.itemGap,
        T.itemFrom + index * T.itemGap + T.itemDur))
      node.style.opacity = (p * (1 - barOut)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.5).toFixed(3) + 'em)'
    })
    el.itemCpu.textContent = `CPU ${Math.round(CPU_VALUE * easeOut(seg(t, 3000, 3700)))}%`
    el.itemMem.textContent = `Mem ${(MEM_USED * easeOut(seg(t, 3080, 3820))).toFixed(1)} GiB / ${MEM_TOTAL}`
    el.itemUp.textContent = `↑ ${(UP_RATE * easeOut(seg(t, 3160, 3900))).toFixed(1)} MiB/s`
    el.itemDown.textContent = `↓ ${(DOWN_RATE * easeOut(seg(t, 3240, 3980))).toFixed(1)} MiB/s`

    // the mini sparkline is drawn in by a moving clip
    const sparkP = easeOut(seg(t, T.sparkFrom, T.sparkTo))

    // the pointer travels to the CPU item, then hovers it
    const arrive = easeOut(seg(t, T.ptr1From, T.ptr1To))
    const cpuHovered = t >= T.popFrom && t < T.clickAt
    el.bar.classList.toggle('is-hovered', cpuHovered)
    el.itemCpu.classList.toggle('is-lit', cpuHovered)

    // ... and the popover opens above it, exactly as antd placement="top" does
    const popP = seg(t, T.popFrom, T.popTo)
    const popScale = 0.86 + 0.14 * easeOutBack(popP)
    el.pop.style.opacity = (popP * (t >= T.clickAt ? 0 : 1) * (1 - gone)).toFixed(3)
    el.pop.style.transform = 'scale(' + popScale.toFixed(3) + ')'
    el.popRows.forEach((node, index) => {
      const p = easeOut(seg(t, T.popRowFrom + index * T.popRowGap,
        T.popRowFrom + index * T.popRowGap + 320))
      node.style.opacity = (p * (1 - gone)).toFixed(3)
    })

    // the big sparkline draws, and the process rows land
    const chartP = easeOut(seg(t, T.chartFrom, T.chartTo))
    if (el.clipRect) el.clipRect.setAttribute('width', (360 * chartP).toFixed(1))
    el.tblRows.forEach((node, index) => {
      const p = easeOut(seg(t, T.actFrom + index * T.actGap,
        T.actFrom + index * T.actGap + 340))
      node.style.opacity = (p * (1 - gone)).toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.3).toFixed(3) + 'em)'
    })

    // the pointer travels down to the popover's "info" button and clicks it
    const move = easeInOut(seg(t, T.ptr2From, T.ptr2To))
    el.infoBtn.classList.toggle('is-hovered', t >= T.ptr2To && t < T.clickAt)
    const infoHover = easeOut(seg(t, T.ptr2From, T.ptr2To))
    const px = targets.p1.x + (targets.p2.x - targets.p1.x) * move
    const py = targets.p1.y + (targets.p2.y - targets.p1.y) * move
    // the pointer is invisible until it arrives, and fades out at the end
    const ptrIn = seg(t, T.ptr1From, T.ptr1From + 260)
    const ptrOut = easeInOut(seg(t, T.ptrFadeFrom, T.ptrFadeTo))
    el.pointer.style.left = px.toFixed(2) + 'em'
    el.pointer.style.top = py.toFixed(2) + 'em'
    el.pointer.style.opacity = (ptrIn * (1 - ptrOut) * (1 - gone)).toFixed(3)
    el.pointer.style.transform =
      'scale(' + (0.86 + 0.14 * Math.max(arrive, infoHover)).toFixed(3) + ')'

    // click ripple at the info button
    const ripP = seg(t, T.clickAt, T.clickAt + 460)
    el.ripple.style.opacity = (ripP > 0 && ripP < 1 ? (1 - ripP) * (1 - gone) : 0).toFixed(3)
    el.ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.4 + ripP * 2.6).toFixed(3) + ')'
    el.ripple.style.left = targets.p2.x.toFixed(2) + 'em'
    el.ripple.style.top = targets.p2.y.toFixed(2) + 'em'
    // ... and the icon in the footer stays lit while the panel is up
    el.infoIcon.classList.toggle('is-active', t >= T.panelFrom && t < T.ptrFadeFrom)

    // the panel slides in
    const panelP = easeInOut(seg(t, T.panelFrom, T.panelTo))
    el.panel.style.transform = 'translateX(' + ((1 - panelP) * 104).toFixed(2) + '%)'
    el.secs.forEach((node, index) => {
      const p = easeOut(seg(t, T.secFrom + index * T.secGap,
        T.secFrom + index * T.secGap + 380))
      node.style.opacity = (p * (1 - gone)).toFixed(3)
    })

    // one process row greets the pointer: filled by the timeline, not the DOM
    el.tblRows.forEach((node) => node.classList.remove('is-hovered'))
    if (t > T.actFrom + 600 && t < T.ptr2From) {
      el.tblRows[0]?.classList.add('is-hovered')
    }

    // the mini sparkline is revealed left to right, the way a history fills up
    el.iCpuHistory.style.clipPath = sparkP < 1
      ? `inset(0 ${((1 - sparkP) * 100).toFixed(1)}% 0 0)`
      : ''
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // a static frame: the bar with its values, the popover open on CPU
    frame(T.clickAt - 300)
    el.pointer.style.opacity = '0'
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
