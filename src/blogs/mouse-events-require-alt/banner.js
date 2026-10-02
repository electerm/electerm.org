/**
 * Animated banner for the "mouse event requires alt key" blog post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * background, the electerm window (tab bar + terminal + tmux status line), the
 * typed command, the drag selection, the settings popover with its toggle, the
 * cartoon pointer, and the annotation chips are all plain DOM + CSS driven by
 * one requestAnimationFrame timeline.
 *
 * The window is modelled on the real electerm UI, and the colours and metrics
 * below are taken from the app itself:
 *   tab bar / tabs ..... src/client/components/tabs/tabs.styl
 *   UI theme ........... src/client/css/includes/theme.styl (--main, --main-dark, ...)
 *   terminal theme ..... src/client/common/theme-defaults.js (defaultThemeDarkTerminal)
 *   the setting ....... src/app/common/config-default.js (mouseEventsRequireAlt: false)
 *   live option push .. src/client/components/terminal/terminal.jsx
 *                        (terminalConfigProps, type 'glob' -> term.options)
 *   cursor swap ....... node_modules/@xterm/xterm/css/xterm.css
 *                        (.xterm.enable-mouse-events { cursor: default })
 *   the report on the wire ... xterm SGR encoding, ESC[<b;x;yM / m
 *   the tmux status bar ....... tmux's own default `status-style bg=green`
 *
 * The story it tells is exactly the trade the setting removes:
 *   1. tmux mouse mode is on (status line slides in), a plain drag sweeps a
 *      selection and then loses it on mouseup — the bug from issue #4559;
 *   2. the settings popover arrives and the toggle flips on;
 *   3. the same drag now keeps its selection, and Cmd+C copies it;
 *   4. the wheel still pages tmux, with no modifier held;
 *   5. Option comes down, the pointer turns into the app's cursor, and the
 *      click leaves as a real SGR report.
 *
 * The annotation chips live outside the window on the hero (the banner has an
 * empty right gutter there) and in a row above the window on the card, because
 * the terminal has no room for them and clipping them at the window edge reads
 * as a bug rather than as a design.
 *
 * Mount points: any element carrying [data-eb-banner]:
 *   data-eb-banner="hero"  -> headline + full window (blog post page)
 *   data-eb-banner="card"  -> window only         (blog index thumbnail)
 * Every banner script on the blog index is loaded for every card, so a mount
 * also has to match data-eb-banner-src (the module the template loaded for
 * that post) — otherwise the first script to run would claim every card.
 *
 * One deliberate liberty: the pointer is drawn as an arrow throughout rather
 * than switching between a text caret and `cursor: default`, because a banner
 * cannot restyle the visitor's real cursor. The Option chip and the pointer's
 * colour change carry the meaning instead.
 *
 * The whole layout is expressed in `em`, and the root font-size is kept at
 * 1% of the banner width, so a single design scales with any container.
 */

const STYLE_ID = 'eb-bn-style'

// One full pass of the story, in ms.
const PERIOD = 11400

const T = {
  typeFrom: 300, // `tmux set -g mouse on` is typed out
  typeTo: 1500,
  barFrom: 1700, // ...and the tmux status line slides up: mouse mode is on
  barTo: 1980,
  badEnterFrom: 2250, // the pointer arrives for the first drag
  badEnterTo: 2600,
  badDragFrom: 2600, // the selection sweeps across the line
  badDragTo: 3250,
  badUpFrom: 3300, // mouseup — and the selection is gone
  badUpTo: 3700,
  badNoteFrom: 3700, // "selection lost"
  badNoteTo: 3980,
  badNoteOutFrom: 4200, // ...and it clears as the popover arrives
  badNoteOutTo: 4550,
  swFrom: 4300, // the settings popover arrives
  swTo: 4620,
  flipFrom: 4700, // the toggle flips on
  flipTo: 5100,
  goodEnterFrom: 5350, // the pointer comes back for the same drag
  goodEnterTo: 5650,
  goodDragFrom: 5650,
  goodDragTo: 6300,
  copyFrom: 6750, // Cmd+C takes the selection that survived
  copyTo: 7100,
  copyOutFrom: 7250,
  copyOutTo: 7550,
  wheelFrom: 7450, // the wheel still pages tmux, no modifier held
  wheelTo: 7900,
  wheelOutFrom: 8050,
  wheelOutTo: 8400,
  altFrom: 8150, // Option goes down: the app's cursor takes over
  altTo: 8500,
  clickFrom: 8520, // the click leaves as an SGR report
  clickTo: 8850,
  sgrFrom: 8800,
  sgrOutFrom: 9400,
  sgrOutTo: 9760,
  fadeFrom: 9900,
  fadeTo: 10500
}

const CMD = 'tmux set -g mouse on'

// The line the pointer drags across, and the slice of it that gets selected.
// Every terminal line is kept under 30 characters, because the row has to fit
// inside the 52em window at the hero scale and the 72em one at the card scale —
// measured, not guessed (see the note on .eb-bn-app below).
const ROW_TEXT = 'a41f9c2  fix: mouse mode'
const SEL_TEXT = 'mouse mode'
// Monospace, so character offsets are exact fractions of the line width.
const SEL_LEFT = (ROW_TEXT.indexOf(SEL_TEXT) / ROW_TEXT.length) * 100
const SEL_WIDTH = (SEL_TEXT.length / ROW_TEXT.length) * 100
// Where the pointer waits before a drag starts — just past the end of the row.
const PTR_X0 = 97

// The status line the app draws, in tmux's own default `status-style bg=green`
// rendered with the app's terminal green rather than xterm's ANSI #00cd00.
const STATUS_L = '0: work*'
const STATUS_C = '[0] a41f9c2 fix: mouse mode'
const STATUS_R = '22:14 01/10'

const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'
// antd CheckCircleFilled / PlusOutlined / DownOutlined / CloseOutlined,
// the same glyphs the app renders (via @ant-design/icons).
const CHECK_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 0 1-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z'
const PLUS_PATH = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z M176 474h672q8 0 8 8v60q0 8-8 8H176q-8 0-8-8v-60q0-8 8-8z'
const CARET_PATH = 'M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z'
const CLOSE_PATH = 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

const CSS = `
.eb-bn {
  /* real electerm UI theme — src/client/css/includes/theme.styl, with the
     shipped dark theme (src/client/common/theme-defaults.js, defaultThemeDark)
     injected over it at runtime, which is where --main #121214 comes from.
     --main-lighter is only defined in theme.styl, so #5b5a5b is what ships. */
  --eb-ink: #16233a;
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-main-lighter: #5b5a5b;
  --eb-text: #ddd;
  --eb-text-dark: #888;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-warn: #e55934;
  --eb-error: #ef476f;
  /* real electerm default terminal theme — src/client/common/theme-defaults.js */
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  --eb-term-sel: rgba(200, 200, 200, 0.6);
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e8f1ff 0%, #f2ecff 52%, #fdeef5 100%);
  color: var(--eb-ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}

/* ---------- background decoration ---------- */
.eb-bn-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-bn-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(37, 99, 235, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-bn-drift 34s linear infinite;
}
@keyframes eb-bn-drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-4.2em, -4.2em, 0); }
}
.eb-bn-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(3.2em);
  opacity: 0.5;
}
.eb-bn-blob-a {
  width: 22em; height: 22em;
  top: -7em; left: -5em;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.55), transparent 68%);
}
.eb-bn-blob-b {
  width: 26em; height: 26em;
  bottom: -9em; right: -6em;
  background: radial-gradient(circle, rgba(232, 121, 249, 0.5), transparent 68%);
}
.eb-bn-spark {
  position: absolute;
  width: 0.7em; height: 0.7em;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 1.2em rgba(255, 255, 255, 0.9);
  opacity: 0.75;
}
.eb-bn-spark-a { top: 16%; left: 12%; animation: eb-bn-twinkle 5.2s ease-in-out infinite; }
.eb-bn-spark-b { top: 9%; left: 78%; animation: eb-bn-twinkle 6.8s ease-in-out 1.1s infinite; }
.eb-bn-spark-c { bottom: 12%; left: 8%; animation: eb-bn-twinkle 7.4s ease-in-out 2.3s infinite; }
@keyframes eb-bn-twinkle {
  0%, 100% { transform: scale(0.5); opacity: 0.24; }
  50% { transform: scale(1.15); opacity: 0.86; }
}

/* ---------- headline ----------
   The width sits on .eb-bn-head, whose font-size is the root em, rather than on
   .eb-bn-sub: a max-width in em on the sub would resolve against its own 1.5em
   font size and come out a third wider than intended. */
.eb-bn-head { position: absolute; left: 5em; top: 3.4em; width: 40em; }
.eb-bn-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-size: 1.4em;
  font-weight: 600;
  color: var(--eb-primary);
}
.eb-bn-brand::before {
  content: '';
  width: 0.72em;
  height: 0.72em;
  border-radius: 0.16em;
  background: var(--eb-primary);
}
.eb-bn-h1 {
  margin: 0.55em 0 0;
  font-size: 3em;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.015em;
}
.eb-bn-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #2563eb, #9333ea 58%, #db2777);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.eb-bn-sub {
  margin: 0.7em 0 0;
  font-size: 1.45em;
  line-height: 1.45;
  color: #4b5563;
}

/* ---------- annotation chips ----------
   The hero has two empty gutters beside the 58em window (measured: the window
   spans 21%..79% of the banner width), so the chips stack in the right one,
   right-aligned to the banner edge so a label can never run off the right.
   The card has no headline, so the chips go in a centred row above the window.
   Inside the terminal they would be clipped by the window's overflow:hidden,
   which looks broken rather than intentional. Labels are kept short for the
   same reason: the gutter is only ~18em wide. */
.eb-bn-chips { position: absolute; pointer-events: none; }
.eb-bn-chips.is-hero {
  right: 3em;
  top: 28.6em;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.8em;
}
.eb-bn-chips.is-card {
  left: 3em;
  right: 3em;
  top: 1.9em;
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 0.7em;
}
.eb-bn-chip {
  padding: 0.55em 0.85em;
  border-radius: 0.45em;
  font-size: 1.35em;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  opacity: 0;
  box-shadow: 0 0.3em 0.9em rgba(15, 23, 42, 0.16);
}
.eb-bn-chip.is-lost { background: var(--eb-warn); color: #fff; }
/* Option key cap — the modifier the setting asks for */
.eb-bn-chip.is-alt {
  background: #fff;
  color: var(--eb-ink);
  border: 1px solid var(--color-border, #d9e2f0);
}
/* the wheel, which needs no modifier at all */
.eb-bn-chip.is-wheel { background: var(--eb-ink); color: #fff; }
/* the report actually crossing the wire */
.eb-bn-chip.is-sgr {
  background: var(--eb-primary);
  color: #fff;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  font-weight: 500;
}

/* ---------- the electerm window ----------
   Chrome and terminal are one piece, sized from the banner's em, so the whole
   window scales as a unit. The window is 52em and pushed right of centre, which
   leaves a ~20em left gutter for the settings card and a ~22em right gutter for
   the annotation chips; at 2.05em the terminal then has room for ~34 characters,
   which is why every line above is kept shorter than that: scrollWidth -
   clientWidth has to stay 0 or the row is clipped at the window edge. */
.eb-bn-app {
  position: absolute;
  left: 53.5%;
  bottom: 6%;
  transform: translateX(-50%);
  width: 52em;
  background: var(--eb-term-bg);
  border-radius: 0.8em;
  box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.2);
  overflow: hidden;
  text-align: left;
  animation: eb-bn-glow 4.4s ease-in-out infinite;
}
@keyframes eb-bn-glow {
  0%, 100% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.32), 0 0 2.2em rgba(37, 99, 235, 0.18); }
  50% { box-shadow: 0 1.3em 2.6em rgba(15, 23, 42, 0.34), 0 0 3.4em rgba(124, 58, 237, 0.4); }
}

/* ---------- tab bar ----------
   1em here is the tab font size, exactly as in the app's tabs.styl where the
   bar is 36px tall against a 14px font. */
.eb-bn-tabbar {
  display: flex;
  align-items: stretch;
  height: 2.6em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.25em;
  line-height: 1;
}
.eb-bn-tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.42em;
  height: 100%;
  min-width: 6.6em;
  max-width: 12em;
  padding: 0 0.8em;
  border-radius: 0.21em 0.21em 0 0;
  background: var(--eb-main-dark);
  color: var(--eb-text-dark);
  white-space: nowrap;
}
/* the app bolds the tab of the focused batch (tabs.styl .tab.active-all) */
.eb-bn-tab.is-active {
  background: var(--eb-main);
  color: var(--eb-text);
  font-weight: 700;
}
.eb-bn-tab-name { overflow: hidden; text-overflow: ellipsis; }
.eb-bn-tab-status {
  position: absolute;
  left: 0.14em;
  top: 0.14em;
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: var(--eb-text-dark);
}
.eb-bn-tab-status.is-connected { background: var(--eb-success); }
/* .tab-count — 20px pill against a 14px font, radii 10px/2px */
.eb-bn-tab-count {
  flex: none;
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
/* .tab-close — 16px disc; the app only reveals it on hover, we keep it on the
   focused tab so the tab reads as a tab at thumbnail size */
.eb-bn-tab-close {
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
.eb-bn-tab-close svg { width: 0.6em; height: 0.6em; fill: currentColor; }
.eb-bn-tab-add,
.eb-bn-tabbar-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  height: 1.6em;
  color: var(--eb-text);
}
.eb-bn-tab-add { width: 1.5em; margin-left: 0.2em; }
.eb-bn-tab-add svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-bn-tabbar-caret { width: 1.4em; margin-left: auto; color: var(--eb-text-dark); }
.eb-bn-tabbar-caret svg { width: 0.85em; height: 0.85em; fill: currentColor; }

/* ---------- terminal ---------- */
.eb-bn-term {
  position: relative;
  padding: 1.3em 1.5em 1.5em;
  font-size: 2.05em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.5;
  color: var(--eb-term-fg);
  white-space: nowrap;
}
.eb-bn-line { line-height: 1.5; }
.eb-bn-hash { color: var(--eb-term-blue); }
.eb-bn-ps1 { color: var(--eb-term-green); }
.eb-bn-ps1-path { color: var(--eb-term-blue); }
/* xterm's cursor: a solid block, cursorBlink is off by default */
.eb-bn-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.15em;
  vertical-align: text-bottom;
  background: var(--eb-term-fg);
}
.eb-bn-cmdline { opacity: 0; }
.eb-bn-row { position: relative; }

/* the selection rectangle; .is-lost is the bug — it drains to a red outline */
.eb-bn-sel {
  position: absolute;
  top: 0.12em;
  height: 1.26em;
  background: var(--eb-term-sel);
  border-radius: 0.1em;
  opacity: 0;
}
.eb-bn-sel.is-lost {
  background: transparent;
  box-shadow: inset 0 0 0 1px rgba(229, 89, 52, 0.9);
}

/* the pointer, plus the ripple at the moment of the click */
.eb-bn-ptr {
  position: absolute;
  top: 0.02em;
  left: 0;
  width: 1.5em;
  height: 2em;
  margin-left: -0.35em;
  opacity: 0;
}
.eb-bn-ptr svg { width: 100%; height: 100%; }
/* the app's cursor is the real cursor change: .enable-mouse-events { cursor: default } */
.eb-bn.is-appmode .eb-bn-ptr svg path { fill: var(--eb-primary); }
.eb-bn.is-appmode .eb-bn-ptr { filter: drop-shadow(0 0 0.45em rgba(8, 136, 204, 0.6)); }
.eb-bn-ripple {
  position: absolute;
  top: 0.7em;
  left: 0;
  width: 1.6em;
  height: 1.6em;
  margin: -0.8em 0 0 -0.8em;
  border-radius: 50%;
  background: rgba(8, 136, 204, 0.35);
  opacity: 0;
  pointer-events: none;
}

/* ---------- the tmux status line ----------
   tmux draws its own status bar at the bottom of the pane; we render it with
   the app's terminal green rather than xterm's ANSI #00cd00. */
.eb-bn-status {
  display: flex;
  align-items: center;
  gap: 0.9em;
  height: 1.9em;
  padding: 0 0.9em;
  background: var(--eb-term-green);
  color: #062b2b;
  font-size: 1.7em;
  overflow: hidden;
  transform: translateY(100%);
}
.eb-bn-status span { white-space: nowrap; }
.eb-bn-status-l { font-weight: 700; }
.eb-bn-status-c {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  opacity: 0.85;
}
.eb-bn-status-r { font-weight: 600; }

/* ---------- the settings popover ----------
   Modelled on the app's settings panel: a white card, the label as the user
   reads it, and an antd-style switch. It sits in the banner's left gutter,
   because the window occupies the middle and is drawn later in the DOM, so
   anything overlapping it would be covered.

   Note the geometry: left and width in em resolve against this element's OWN
   1.2em font size, not the root em, so 17.4em here is 20.9em of banner —
   measured, not guessed, to keep the card clear of the window's left edge. */
.eb-bn-settings {
  position: absolute;
  left: 2.5em;
  top: 17.2em;
  width: 17.4em;
  padding: 1em 1.1em;
  border-radius: 0.9em;
  background: #fff;
  box-shadow: 0 1em 2.4em rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(15, 23, 42, 0.06);
  font-size: 1.2em;
  opacity: 0;
  pointer-events: none;
}
.eb-bn-settings-cap {
  font-size: 0.72em;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--eb-text-dark);
  font-weight: 700;
}
.eb-bn-settings-row {
  display: flex;
  align-items: center;
  gap: 0.8em;
  margin-top: 0.6em;
}
.eb-bn-settings-label {
  flex: 1;
  min-width: 0;
  color: #1f2937;
  font-weight: 600;
  line-height: 1.25;
}
/* antd Switch: 44x22 at a 14px font */
.eb-bn-switch {
  flex: none;
  position: relative;
  width: 2.2em;
  height: 1.1em;
  border-radius: 1em;
  background: #bfbfbf;
}
.eb-bn-switch-knob {
  position: absolute;
  top: 0.1em;
  left: 0.1em;
  width: 0.9em;
  height: 0.9em;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0.1em 0.3em rgba(0, 0, 0, 0.25);
}
.eb-bn.is-on .eb-bn-switch { background: var(--eb-primary); }
.eb-bn.is-on .eb-bn-switch-knob { left: 1.2em; }
/* the hint under the row, only once the setting is on */
.eb-bn-settings-hint {
  margin-top: 0.55em;
  font-size: 0.78em;
  line-height: 1.35;
  color: var(--eb-text-dark);
  opacity: 0;
}
.eb-bn.is-on .eb-bn-settings-hint { opacity: 1; }

/* ---------- the "Copied" toast ----------
   Sits above the typed command line rather than over it, so the beat never
   hides the text the reader is supposed to be watching. */
.eb-bn-toast {
  position: absolute;
  left: 50%;
  bottom: 8.6em;
  transform: translateX(-50%);
  opacity: 0;
  pointer-events: none;
}
.eb-bn-toast-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.55em 1.1em;
  border-radius: 0.5em;
  background: var(--eb-main);
  color: var(--eb-text);
  font-size: 2.1em;
  box-shadow: 0 0.8em 1.8em rgba(0, 0, 0, 0.4);
}
.eb-bn-toast-icon { width: 1em; height: 1em; fill: var(--eb-success); }

/* ---------- card variant ----------
   The card is a thumbnail: there is no room for a settings card beside the
   window, so it is dropped entirely (the story still reads — selection lost,
   selection kept, wheel, Option) and the window takes the whole width. The
   chips move into a centred row above it. */
.eb-bn[data-variant='card'] .eb-bn-settings { display: none; }
.eb-bn[data-variant='card'] .eb-bn-app {
  left: 50%;
  width: 68em;
  bottom: 5%;
}
.eb-bn[data-variant='card'] .eb-bn-term { font-size: 2.4em; }
.eb-bn[data-variant='card'] .eb-bn-chip { font-size: 1.2em; padding: 0.45em 0.7em; }
.eb-bn[data-variant='card'] .eb-bn-toast { bottom: 6.4em; }
.eb-bn[data-variant='card'] .eb-bn-toast-inner { font-size: 2em; }

@media (prefers-reduced-motion: reduce) {
  .eb-bn-dots, .eb-bn-spark, .eb-bn-app { animation: none !important; }
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

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-bn-head">
        <span class="eb-bn-brand">electerm</span>
        <h2 class="eb-bn-h1">Keep the wheel,<br><em>get the selection back</em></h2>
        <p class="eb-bn-sub">With tmux mouse mode on, a plain drag stops selecting. One new setting forwards clicks only while Alt is held.</p>
      </div>`
  return `
    <div class="eb-bn-deco">
      <span class="eb-bn-blob eb-bn-blob-a"></span>
      <span class="eb-bn-blob eb-bn-blob-b"></span>
      <span class="eb-bn-dots"></span>
      <span class="eb-bn-spark eb-bn-spark-a"></span>
      <span class="eb-bn-spark eb-bn-spark-b"></span>
      <span class="eb-bn-spark eb-bn-spark-c"></span>
    </div>
    ${head}
    <div class="eb-bn-settings">
      <div class="eb-bn-settings-cap">Settings &rsaquo; Terminal</div>
      <div class="eb-bn-settings-row">
        <span class="eb-bn-settings-label">mouse event requires alt key</span>
        <span class="eb-bn-switch"><span class="eb-bn-switch-knob"></span></span>
      </div>
      <div class="eb-bn-settings-hint">The wheel always reaches the app. Clicks, drags and moves need Alt.</div>
    </div>
    <div class="eb-bn-chips is-${variant}">
      <span class="eb-bn-chip is-lost">selection lost</span>
      <span class="eb-bn-chip is-wheel">wheel &rarr; tmux</span>
      <span class="eb-bn-chip is-alt">&#8997; Option</span>
      <span class="eb-bn-chip is-sgr">ESC[&lt;0;18;6M</span>
    </div>
    <div class="eb-bn-app">
      <div class="eb-bn-tabbar">
        <span class="eb-bn-tab">
          <span class="eb-bn-tab-status"></span>
          <span class="eb-bn-tab-count">1</span>
          <span class="eb-bn-tab-name">local</span>
        </span>
        <span class="eb-bn-tab is-active">
          <span class="eb-bn-tab-status is-connected"></span>
          <span class="eb-bn-tab-count">2</span>
          <span class="eb-bn-tab-name">web-01:22</span>
          <span class="eb-bn-tab-close">${icon(CLOSE_PATH, '')}</span>
        </span>
        <span class="eb-bn-tab-add">${icon(PLUS_PATH, '')}</span>
        <span class="eb-bn-tabbar-caret">${icon(CARET_PATH, '')}</span>
      </div>
      <div class="eb-bn-term">
        <div class="eb-bn-lines">
          <div class="eb-bn-line"><span class="eb-bn-ps1">zxd@web-01</span>:<span class="eb-bn-ps1-path">~/api</span>$&nbsp;git log --oneline</div>
          <div class="eb-bn-row">
            <div class="eb-bn-line">${ROW_TEXT.replace(SEL_TEXT, `<span class="eb-bn-hash">${SEL_TEXT}</span>`)}</div>
            <span class="eb-bn-sel"></span>
            <span class="eb-bn-ripple"></span>
            <span class="eb-bn-ptr"><svg viewBox="-3 -3 29 39" width="100%" height="100%"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
          </div>
          <div class="eb-bn-line"><span class="eb-bn-hash">7b2e004</span>&nbsp;feat: sync settings</div>
          <div class="eb-bn-line eb-bn-cmdline"><span class="eb-bn-ps1">zxd@web-01</span>:<span class="eb-bn-ps1-path">~/api</span>$&nbsp;<span class="eb-bn-cmd"></span><span class="eb-bn-caret"></span></div>
        </div>
      </div>
      <div class="eb-bn-status">
        <span class="eb-bn-status-l">${STATUS_L}</span>
        <span class="eb-bn-status-c">${STATUS_C}</span>
        <span class="eb-bn-status-r">${STATUS_R}</span>
      </div>
      <div class="eb-bn-toast">
        <span class="eb-bn-toast-inner">${icon(CHECK_PATH, 'eb-bn-toast-icon')}<span>Copied</span></span>
      </div>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-bn'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm: with tmux mouse mode on a plain drag loses its selection, and after enabling "mouse event requires alt key" the selection survives, the wheel still scrolls, and Option+click is forwarded to the app')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const el = {
    cmd: root.querySelector('.eb-bn-cmd'),
    caret: root.querySelector('.eb-bn-caret'),
    cmdline: root.querySelector('.eb-bn-cmdline'),
    lines: root.querySelector('.eb-bn-lines'),
    sel: root.querySelector('.eb-bn-sel'),
    ptr: root.querySelector('.eb-bn-ptr'),
    ripple: root.querySelector('.eb-bn-ripple'),
    chipLost: root.querySelector('.eb-bn-chip.is-lost'),
    chipWheel: root.querySelector('.eb-bn-chip.is-wheel'),
    chipAlt: root.querySelector('.eb-bn-chip.is-alt'),
    chipSgr: root.querySelector('.eb-bn-chip.is-sgr'),
    status: root.querySelector('.eb-bn-status'),
    settings: root.querySelector('.eb-bn-settings'),
    toast: root.querySelector('.eb-bn-toast')
  }

  el.sel.style.left = SEL_LEFT + '%'

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

  // A chip's life is in-past out-past: it fades in, holds, then fades out, so
  // no beat can leave a label stranded on the banner.
  const chip = (t, from, to, outFrom, outTo) =>
    (easeOut(seg(t, from, to)) * (1 - easeInOut(seg(t, outFrom, outTo)))).toFixed(3)

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))

    // `tmux set -g mouse on` is typed, then its status line slides up
    const typed = Math.round(easeOut(seg(t, T.typeFrom, T.typeTo)) * CMD.length)
    el.cmd.textContent = CMD.slice(0, typed)
    el.caret.style.display = t < T.badEnterFrom ? '' : 'none'
    el.cmdline.style.opacity = seg(t, T.typeFrom, T.typeFrom + 200)
    const barP = easeOut(seg(t, T.barFrom, T.barTo))
    el.status.style.transform = 'translateY(' + ((1 - barP) * 100).toFixed(2) + '%)'

    // the setting itself: the popover arrives, then the toggle flips on
    const swP = easeInOut(seg(t, T.swFrom, T.swTo))
    el.settings.style.opacity = swP.toFixed(3)
    el.settings.style.transform = 'translateY(' + ((1 - swP) * -0.8).toFixed(3) + 'em)'
    root.classList.toggle('is-on', t >= T.flipTo)

    // ---- beat 1: the bug. A plain drag selects nothing, and loses even that.
    const badArrive = easeOut(seg(t, T.badEnterFrom, T.badEnterTo))
    const badDrag = easeInOut(seg(t, T.badDragFrom, T.badDragTo))
    const badLost = easeOut(seg(t, T.badUpFrom, T.badUpTo))
    // The pointer travels in to the start of the row, then sweeps right.
    const badX = PTR_X0 + (SEL_LEFT - PTR_X0) * badArrive + SEL_WIDTH * badDrag
    // The selection only exists between the drag starting and mouseup.
    const badSelW = SEL_WIDTH * (badDrag > 0 ? 1 : 0) * (1 - badLost)
    el.chipLost.style.opacity = chip(t, T.badNoteFrom, T.badNoteTo, T.badNoteOutFrom, T.badNoteOutTo)

    // ---- beat 2: the fix. The same drag keeps what it selected.
    const goodArrive = easeOut(seg(t, T.goodEnterFrom, T.goodEnterTo))
    const goodDrag = easeInOut(seg(t, T.goodDragFrom, T.goodDragTo))
    const goodX = PTR_X0 + (SEL_LEFT - PTR_X0) * goodArrive + SEL_WIDTH * goodDrag
    const goodOn = seg(t, T.goodDragFrom, T.goodDragFrom + 200)
    el.sel.style.width = Math.max(badSelW, SEL_WIDTH * goodDrag).toFixed(3) + '%'
    el.sel.style.opacity = (goodOn * (1 - gone)).toFixed(3)
    el.sel.classList.toggle('is-lost', badLost > 0.02 && goodOn === 0)

    // The pointer is on stage for both halves of the story.
    el.ptr.style.opacity = (seg(t, T.badEnterFrom, T.badEnterFrom + 260) * (1 - gone)).toFixed(3)
    el.ptr.style.left = (t < T.goodEnterFrom ? badX : goodX).toFixed(3) + '%'

    // ---- beat 3: Cmd+C takes the selection that survived
    el.toast.style.opacity = chip(t, T.copyFrom, T.copyTo, T.copyOutFrom, T.copyOutTo)
    const copyP = easeOut(seg(t, T.copyFrom, T.copyTo))
    el.toast.style.transform =
      'translateX(-50%) translateY(' + ((1 - copyP) * -0.7).toFixed(3) + 'em)'

    // ---- beat 4: the wheel still pages tmux, with no modifier held
    const wheelP = easeInOut(seg(t, T.wheelFrom, T.wheelTo))
    // The pane content moves; the shift stays under the padding so nothing clips.
    el.lines.style.transform = 'translateY(' + (-0.4 * wheelP).toFixed(3) + 'em)'
    el.chipWheel.style.opacity = chip(t, T.wheelFrom, T.wheelTo, T.wheelOutFrom, T.wheelOutTo)

    // ---- beat 5: Option down, the app's cursor, the click leaves as SGR
    const altP = easeOut(seg(t, T.altFrom, T.altTo))
    el.chipAlt.style.opacity = altP.toFixed(3)
    root.classList.toggle('is-appmode', altP > 0.02)

    const ripP = seg(t, T.clickFrom, T.clickFrom + 460)
    el.ripple.style.opacity = (ripP > 0 && ripP < 1 ? (1 - ripP) * (1 - gone) : 0).toFixed(3)
    el.ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.4 + ripP * 2.4).toFixed(3) + ')'
    el.ripple.style.left = goodX.toFixed(3) + '%'

    el.chipSgr.style.opacity = chip(t, T.sgrFrom, T.sgrFrom + 260, T.sgrOutFrom, T.sgrOutTo)
  }

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // The most representative single frame: the setting on, the selection held,
    // and Option down with the report on its way out.
    frame(T.sgrFrom + 400)
    el.chipAlt.style.opacity = '1'
    el.chipSgr.style.opacity = '1'
    root.classList.add('is-appmode')
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
