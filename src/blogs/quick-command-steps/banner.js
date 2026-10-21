/**
 * Animated banner for the "quick commands: one button, four steps" post.
 *
 * Everything you see is generated here — no image, no GIF, no canvas: the
 * electerm window (tab bar + terminal + footer), the quick command panel, the
 * steps card, the ask-for-input dialog, the run chip, the cartoon pointer and
 * the click ripples are all plain DOM + CSS driven by one
 * requestAnimationFrame timeline.
 *
 * The story, in the order the article introduces the feature:
 *
 *   1. the quick command panel opens above the footer;
 *   2. the pointer hovers "deploy web" and the steps card lists the four steps
 *      the command is made of;
 *   3. it clicks. Step 1 sends the command line, the run chip appears in the
 *      footer with progress 1/4;
 *   4. the shell prints its password prompt, step 2 (wait for text) matches,
 *      and the run moves on by itself;
 *   5. step 3 opens the ask-for-input dialog; the pointer clicks OK and the
 *      answer goes into the terminal;
 *   6. step 4 waits for "deployed", the success line arrives, the chip hits
 *      4/4 and the prompt is yours again.
 *
 * The window is modelled on the real electerm UI, and the numbers below come
 * from the app itself:
 *   ui theme ............... src/client/css/includes/theme.styl +
 *                           src/client/common/theme-defaults.js
 *                           (main #121214, main-light #2E3338, text #ddd,
 *                           primary #08c, success #06D6A0)
 *   terminal theme ......... theme-defaults.js (defaultThemeDarkTerminal:
 *                           bg #20111b, fg #bbbbbb, green #19f9d8, blue #6fc1ff)
 *   quick command panel .... components/quick-commands/quick-commands-box.jsx
 *                           (search, label filter, sort, name buttons, actions)
 *   steps tooltip .......... components/quick-commands/quick-command-item.jsx
 *                           (renderTooltip: per step name, type label, value,
 *                           delay; the same four step types the form edits)
 *   step editor ............ components/quick-commands/quick-commands-list-form.jsx
 *                           (type / name / value / option / delay / ops, and
 *                           the help icon next to "steps")
 *   run chip ............... components/quick-commands/qm-run-status.jsx
 *                           (spinner + name + index/total + waiting text +
 *                           stop; shown only after showRunAfter = 500 ms)
 *   prompt dialog .......... components/quick-commands/qm-prompt.jsx
 *                           (tab title, question, password field, cancel / ok)
 *   footer ................. components/footer/footer-entry.jsx
 *                           (Q trigger, record dot, edit, UTF-8)
 *
 * Two deliberate liberties: fonts are above life size (at banner scale the
 * real 12px panel text would be illegible), and the steps card stays open for
 * the whole run so the steps can light up in order — in the app the tooltip
 * follows the mouse. The panel's secondary controls and group headings are
 * left out for the same reason: at 600px they would be unreadable.
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

const STYLE_ID = 'eb-qc-style'

// One full pass of the story, in ms.
const PERIOD = 11200

const T = {
  winFrom: 150, // the window rises into place
  winTo: 650,
  panelFrom: 800, // the quick command panel opens above the footer
  panelTo: 1250,
  ptrFrom: 1250, // pointer travels to "deploy web"
  ptrTo: 1750,
  cardFrom: 1600, // the steps card opens on hover
  cardTo: 1900,
  clickAt: 1850, // ... and clicks it
  runFrom: 1950, // footer chip: 1/4
  l1From: 2000, // step 1 sends the command line
  l1To: 2200,
  s1From: 2050, // step 1 is the active one
  s1To: 2500,
  l2From: 2450, // the shell prints its password prompt
  l2To: 2650,
  s2From: 2500, // step 2 (wait for text) matched
  s2To: 3000,
  s3From: 3000, // step 3 (ask for input)
  modalFrom: 3050, // the dialog opens
  modalTo: 3350,
  dotsFrom: 3250, // the password is typed
  dotGap: 130,
  ptr2From: 4250, // pointer travels to the dialog's OK button
  ptr2To: 4650,
  click2At: 4700, // ... and clicks it
  modalOutFrom: 4780, // the dialog closes
  modalOutTo: 5020,
  s4From: 5000, // step 4 (wait for text) is last
  l3From: 5100, // the script continues
  l3To: 5300,
  l4From: 5400,
  l4To: 5600,
  l5From: 6100, // "deployed" arrives: step 4 matches
  l5To: 6300,
  doneAt: 6350, // chip: 4/4, done
  l6From: 6600, // prompt is back
  l6To: 6800,
  chipOutFrom: 7250, // the run is over, the chip goes
  chipOutTo: 7500,
  cardOutFrom: 7300, // the steps card closes
  cardOutTo: 7600,
  ptrOutFrom: 5050, // the pointer leaves with the dialog
  ptrOutTo: 5400,
  fadeFrom: 10200, // the whole scene fades, then the loop restarts
  fadeTo: 10800
}

const CMD = 'cd /srv/app && sudo ./deploy.sh'

// The four steps of the command, as the app's steps tooltip lists them.
const STEPS = [
  { type: 'command', value: CMD },
  { type: 'wait for text', value: 'password' },
  { type: 'ask for input', value: 'sudo password', hidden: true },
  { type: 'wait for text', value: 'deployed' }
]

// The buttons in the panel, in the order the app wraps them.
const COMMANDS = ['deploy web', 'rollback', 'tail logs', 'psql prod']

// antd glyphs, copied from @ant-design/icons-svg (viewBox 64 64 896 896).
const PATH_EDIT = 'M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9zM880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z'
const PATH_QUESTION = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372zM623.6 316.7C593.6 290.4 554 276 512 276s-81.6 14.5-111.6 40.7C369.2 344 352 380.7 352 420v7.6c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V420c0-44.1 43.1-80 96-80s96 35.9 96 80c0 31.1-22 59.6-56.1 72.7-21.2 8.1-39.2 22.3-52.1 40.9-13.1 19-19.9 41.8-19.9 64.9V620c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8v-22.7a48.3 48.3 0 0130.9-44.8c59-22.7 97.1-74.7 97.1-132.5.1-39.3-17.1-76-48.3-103.3zM472 732a40 40 0 1080 0 40 40 0 10-80 0z'
const PATH_SPINNER = 'M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z'
const PATH_STOP = 'M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c-17.7-14.3-32-32-32-32zm-40 728H184V184h656v656z'
const PATH_PLUS = 'M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8zM192 474h672q8 0 8 8v60q0 8-8 8H160q-8 0-8-8v-60q0-8 8-8z'
const PATH_CLOSE = 'M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z'
const PATH_CARET = 'M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z'
const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

const CSS = `
.eb-qc {
  --eb-main: #121214;
  --eb-main-dark: #000;
  --eb-main-light: #2e3338;
  --eb-text: #ddd;
  --eb-text-dark: #888;
  --eb-text-disabled: #777;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-term-bg: #20111b;
  --eb-term-fg: #bbbbbb;
  --eb-term-green: #19f9d8;
  --eb-term-blue: #6fc1ff;
  --eb-term-yellow: #ffd479;
  --eb-term-cursor: rgba(187, 187, 187, 0.55);
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9e2f0);
  background: linear-gradient(135deg, #e6f3ff 0%, #f1ecff 52%, #fdeff6 100%);
  color: #16233a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.3;
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}
.eb-qc-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-qc-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(8, 136, 204, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-qc-drift 34s linear infinite;
}
@keyframes eb-qc-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-qc-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-qc-blob-a { width: 32em; height: 32em; right: -10em; top: -12em; }
.eb-qc-blob-b { width: 26em; height: 26em; left: -9em; bottom: -11em; }
.eb-qc-spark {
  position: absolute;
  width: 1.6em;
  height: 1.6em;
  background: #f59e0b;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-qc-twinkle 3.6s ease-in-out infinite;
}
.eb-qc-spark-a { right: 8em; top: 4.2em; }
.eb-qc-spark-b { right: 15em; top: 11.4em; width: 1em; height: 1em; background: #ec4899; animation-delay: 0.7s; }
@keyframes eb-qc-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}
.eb-qc-head { position: absolute; left: 5em; right: 5em; top: 3em; }
.eb-qc-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
  font-weight: 800;
  color: var(--eb-primary);
}
.eb-qc-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: var(--eb-primary);
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-qc-h1 {
  margin: 0.22em 0 0;
  font-size: 3.3em;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-qc-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #0888cc, #7c3aed 55%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-qc-sub {
  margin: 0.46em 0 0;
  max-width: 58em;
  font-size: 1.5em;
  line-height: 1.4;
  color: #475569;
}
.eb-qc-sub b { color: #0f172a; font-weight: 700; }

/* ---------- the electerm window ---------- */
.eb-qc-frame {
  position: absolute;
  left: 50%;
  bottom: 3.2em;
  width: 92em;
  height: 38em;
  transform: translateX(-50%);
}
.eb-qc-app {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--eb-term-bg);
  border-radius: 0.7em;
  box-shadow: 0 1.2em 2.4em rgba(9, 20, 40, 0.34), 0 0 2.4em rgba(8, 136, 204, 0.18);
  overflow: hidden;
  text-align: left;
}
.eb-qc-tabbar {
  flex: none;
  display: flex;
  align-items: stretch;
  height: 2.4em;
  padding: 0 0.5em;
  background: var(--eb-main-dark);
  font-size: 1.45em;
  line-height: 1;
}
.eb-qc-tab {
  display: flex;
  align-items: center;
  gap: 0.45em;
  height: 100%;
  padding: 0 1em;
  border-radius: 0.21em 0.21em 0 0;
  background: var(--eb-main-dark);
  color: var(--eb-text-dark);
  white-space: nowrap;
}
.eb-qc-tab.is-active { background: var(--eb-main); color: var(--eb-text); font-weight: 700; }
.eb-qc-tab-count {
  height: 1.43em;
  padding: 0 0.3em;
  border-radius: 0.72em 0.14em 0.14em 0.72em;
  background: var(--eb-primary);
  color: #fff;
  line-height: 1.43em;
  text-align: center;
}
.eb-qc-tab-close { display: inline-flex; width: 0.8em; height: 0.8em; color: var(--eb-text); }
.eb-qc-tab-close svg, .eb-qc-tab-add svg, .eb-qc-tab-caret svg { width: 100%; height: 100%; fill: currentColor; }
.eb-qc-tab-add { display: inline-flex; align-self: center; width: 1em; height: 1em; margin-left: 0.4em; color: var(--eb-text); }
.eb-qc-tab-caret { display: inline-flex; align-self: center; width: 0.95em; height: 0.95em; margin-left: auto; color: var(--eb-text-dark); }
.eb-qc-main { position: relative; flex: 1; min-height: 0; }
.eb-qc-term {
  position: absolute;
  inset: 0;
  padding: 0.9em 1.3em;
  font-size: 2.1em;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', 'Courier New', monospace;
  line-height: 1.5;
  color: var(--eb-term-fg);
  white-space: nowrap;
}
.eb-qc-ps1 { color: var(--eb-term-green); }
.eb-qc-path { color: var(--eb-term-blue); }
.eb-qc-line { line-height: 1.5; }
.eb-qc-line-out, .eb-qc-line-ok, .eb-qc-line-prompt { opacity: 0; }
.eb-qc-inc { color: var(--eb-term-yellow); }
.eb-qc-ok { color: var(--eb-term-green); }
.eb-qc-caret {
  display: inline-block;
  width: 0.58em;
  height: 1.16em;
  margin-left: 0.06em;
  vertical-align: -0.26em;
  background: var(--eb-term-cursor);
  animation: eb-qc-blink 1.1s steps(1) infinite;
}
/* the caret after the typed command is driven by inline opacity, so it must
   not keep a blink animation (an animation wins over inline styles) */
.eb-qc-caret1 { animation: none; }
@keyframes eb-qc-blink { 50% { opacity: 0; } }

/* ---------- quick command panel: one row above the footer ---------- */
.eb-qc-panel {
  position: absolute;
  left: 1.2em;
  right: 1.2em;
  bottom: 1.2em;
  display: flex;
  align-items: center;
  gap: 0.7em;
  padding: 0.7em 0.8em;
  border-radius: 0.35em;
  background: var(--eb-main);
  color: var(--eb-text);
  box-shadow: 0 0.6em 1.6em rgba(0, 0, 0, 0.42), 0 0 0 1px var(--eb-main-dark);
  transform-origin: 30% 100%;
  opacity: 0;
  z-index: 3;
}
.eb-qc-search {
  flex: none;
  width: 17em;
  height: 2.1em;
  padding: 0 0.6em;
  border-radius: 0.25em;
  background: var(--eb-main-light);
  color: var(--eb-text-disabled);
  font-size: 1.05em;
  line-height: 2.1em;
  white-space: nowrap;
  overflow: hidden;
}
.eb-qc-cmd {
  flex: none;
  padding: 0.3em 0.75em;
  border: 1px solid var(--eb-main-light);
  border-radius: 0.25em;
  background: var(--eb-main-light);
  color: var(--eb-text);
  font-size: 1.42em;
  line-height: 1.4;
  white-space: nowrap;
}
.eb-qc-cmd.is-hit {
  border-color: var(--eb-primary);
  box-shadow: 0 0 0 1px var(--eb-primary), 0 0 1em rgba(8, 136, 204, 0.4);
  background: rgba(8, 136, 204, 0.2);
  color: #fff;
}
.eb-qc-cmd.is-done { border-color: rgba(6, 214, 160, 0.55); color: var(--eb-success); }

/* ---------- steps card: what the button actually runs ---------- */
.eb-qc-tip {
  position: absolute;
  right: 1.2em;
  bottom: 9.2em;
  width: 47em;
  padding: 0.65em 0.8em 0.55em;
  border-radius: 0.35em;
  background: rgba(18, 18, 20, 0.97);
  color: var(--eb-text);
  box-shadow: 0 0.6em 1.6em rgba(0, 0, 0, 0.42), 0 0 0 1px #2b2b2f;
  opacity: 0;
  z-index: 4;
}
.eb-qc-tip-head {
  display: flex;
  align-items: center;
  gap: 0.4em;
  margin-bottom: 0.4em;
  color: var(--eb-text-dark);
  font-size: 1.05em;
}
.eb-qc-tip-head svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-qc-tip-name { margin-left: auto; color: var(--eb-text); font-weight: 700; }
.eb-qc-step {
  display: grid;
  grid-template-columns: 1.2em 10.2em minmax(0, 1fr);
  align-items: center;
  gap: 0.4em;
  padding: 0.24em 0.4em;
  border-left: 0.22em solid transparent;
  border-radius: 0.2em;
  font-size: 1.35em;
  line-height: 1.45;
}
.eb-qc-step.is-on { border-left-color: var(--eb-primary); background: rgba(8, 136, 204, 0.16); }
.eb-qc-step.is-done { border-left-color: rgba(6, 214, 160, 0.75); }
.eb-qc-step.is-done .eb-qc-step-idx { color: var(--eb-success); }
.eb-qc-step-idx { color: var(--eb-text-disabled); }
.eb-qc-step-type { color: var(--eb-text-dark); white-space: nowrap; }
.eb-qc-step.is-on .eb-qc-step-type { color: #6fc1ff; }
.eb-qc-step-value {
  display: flex;
  align-items: center;
  gap: 0.35em;
  min-width: 0;
  font-family: Menlo, Monaco, 'DejaVu Sans Mono', monospace;
  color: var(--eb-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eb-qc-step-value span { overflow: hidden; text-overflow: ellipsis; }
.eb-qc-step-value svg { flex: none; width: 0.95em; height: 0.95em; fill: var(--eb-text-dark); }

/* ---------- ask for input dialog ---------- */
.eb-qc-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.38);
  opacity: 0;
  z-index: 5;
}
.eb-qc-modal {
  position: absolute;
  left: 6em;
  top: 50%;
  width: 36em;
  transform: translateY(-50%);
  border-radius: 0.45em;
  background: var(--eb-main);
  color: var(--eb-text);
  box-shadow: 0 1.2em 3em rgba(0, 0, 0, 0.55);
  opacity: 0;
  z-index: 6;
}
.eb-qc-modal-title {
  padding: 0.55em 0.9em;
  border-bottom: 1px solid var(--eb-main-dark);
  font-size: 1.15em;
  font-weight: 700;
  color: #fff;
}
.eb-qc-modal-body { padding: 0.75em 0.9em 0.7em; }
.eb-qc-modal-tab { margin-bottom: 0.4em; color: var(--eb-text-dark); font-size: 0.88em; }
.eb-qc-modal-label { margin-bottom: 0.55em; font-size: 1.05em; }
.eb-qc-input {
  display: flex;
  align-items: center;
  gap: 0.14em;
  height: 2.5em;
  padding: 0 0.7em;
  border: 1px solid #3a3a3f;
  border-radius: 0.25em;
  background: var(--eb-main-light);
}
.eb-qc-pw { display: flex; align-items: center; gap: 0.14em; }
.eb-qc-dot {
  flex: none;
  width: 0.48em;
  height: 0.48em;
  border-radius: 50%;
  background: var(--eb-text);
  opacity: 0;
}
.eb-qc-icaret { width: 0.1em; height: 1.25em; background: var(--eb-text); opacity: 0.7; }
.eb-qc-modal-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5em;
  margin-top: 0.9em;
}
.eb-qc-btn {
  padding: 0.28em 0.9em;
  border: 1px solid #3a3a3f;
  border-radius: 0.25em;
  color: var(--eb-text);
  font-size: 0.95em;
}
.eb-qc-btn.is-primary {
  border-color: var(--eb-primary);
  background: var(--eb-primary);
  color: #fff;
  font-weight: 700;
}
.eb-qc-btn.is-primary.is-hovered { background: #1a9fe0; }

/* ---------- footer: Q, record, edit, run chip ---------- */
.eb-qc-footer {
  flex: none;
  display: flex;
  align-items: center;
  height: 2.2em;
  padding: 0 0.55em;
  background: var(--eb-main);
  color: var(--eb-text);
  font-size: 1.35em;
}
.eb-qc-fbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7em;
  height: 1.7em;
  margin-right: 0.2em;
  border-radius: 0.2em;
  color: var(--eb-text-dark);
  font-size: 0.95em;
  font-weight: 700;
}
.eb-qc-fbtn.is-active { background: rgba(8, 136, 204, 0.18); color: #6fc1ff; }
.eb-qc-fbtn svg { width: 0.95em; height: 0.95em; fill: currentColor; }
.eb-qc-recdot { width: 0.62em; height: 0.62em; border-radius: 50%; background: #ef476f; }
.eb-qc-chip {
  flex: 0 1 auto;
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 46em;
  margin-left: 0.45em;
  border-radius: 0.95em;
  background: var(--eb-primary);
  color: #fff;
  font-size: 0.92em;
  line-height: 1.95em;
  white-space: nowrap;
  overflow: hidden;
  opacity: 0;
}
.eb-qc-chip-info {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 0.6em 0 0.7em;
}
.eb-qc-spin { flex: none; width: 0.85em; height: 0.85em; margin-right: 0.4em; color: currentColor; animation: eb-qc-rotate 1s linear infinite; }
.eb-qc-spin svg { width: 100%; height: 100%; fill: currentColor; }
.eb-qc-spin.is-done { animation: none; opacity: 0.85; }
@keyframes eb-qc-rotate { to { transform: rotate(360deg); } }
.eb-qc-chip-name { font-weight: 700; }
.eb-qc-chip-prog { margin-left: 0.55em; opacity: 0.9; }
.eb-qc-chip-wait { margin-left: 0.55em; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.eb-qc-chip-stop {
  display: inline-flex;
  align-items: center;
  align-self: stretch;
  padding: 0 0.65em 0 0.55em;
  background: #e5484d;
  color: #fff;
  font-weight: 600;
}
.eb-qc-chip-stop svg { width: 0.8em; height: 0.8em; margin-right: 0.3em; fill: currentColor; }

/* ---------- cartoon pointer + click ripple ---------- */
.eb-qc-pointer {
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
.eb-qc-pointer svg { display: block; width: 100%; height: 100%; }
.eb-qc-ripple {
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
.eb-qc[data-variant='card'] .eb-qc-frame {
  bottom: auto;
  top: 50%;
  width: 100em;
  height: 54em;
  transform: translate(-50%, -50%);
}
.eb-qc[data-variant='card'] .eb-qc-app { font-size: 1.3em; }
.eb-qc[data-variant='card'] .eb-qc-tip { display: none; }
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

function prompt () {
  return '<span class="eb-qc-ps1">web-01</span>:<span class="eb-qc-path">~</span>$&nbsp;'
}

function stepRows () {
  return STEPS.map((step, i) => {
    return `<div class="eb-qc-step" data-step="${i}">
      <span class="eb-qc-step-idx">${i + 1}</span>
      <span class="eb-qc-step-type">${step.type}</span>
      <span class="eb-qc-step-value"><span>${step.value}</span></span>
    </div>`
  }).join('')
}

function cmdButtons () {
  return COMMANDS.map((name) =>
    `<span class="eb-qc-cmd${name === 'deploy web' ? ' is-deploy' : ''}">${name}</span>`
  ).join('')
}

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-qc-head">
        <span class="eb-qc-brand">electerm</span>
        <h2 class="eb-qc-h1">One button, <em>four steps</em></h2>
        <p class="eb-qc-sub">A quick command can type, press keys, <b>wait for the shell</b> and ask you for a password — in the order you wrote.</p>
      </div>`

  const dots = new Array(8)
    .fill(0)
    .map((_, i) => `<span class="eb-qc-dot" data-dot="${i}"></span>`)
    .join('')

  return `
    <div class="eb-qc-deco">
      <span class="eb-qc-dots"></span>
      <span class="eb-qc-blob eb-qc-blob-a"></span>
      <span class="eb-qc-blob eb-qc-blob-b"></span>
      <span class="eb-qc-spark eb-qc-spark-a"></span>
      <span class="eb-qc-spark eb-qc-spark-b"></span>
    </div>
    ${head}
    <div class="eb-qc-frame">
      <div class="eb-qc-app">
        <div class="eb-qc-tabbar">
          <span class="eb-qc-tab">
            <span class="eb-qc-tab-count">1</span>
            <span>local</span>
          </span>
          <span class="eb-qc-tab is-active">
            <span class="eb-qc-tab-count">2</span>
            <span>zxd@web-01:22</span>
            <span class="eb-qc-tab-close">${icon(PATH_CLOSE, '')}</span>
          </span>
          <span class="eb-qc-tab-add">${icon(PATH_PLUS, '')}</span>
          <span class="eb-qc-tab-caret">${icon(PATH_CARET, '')}</span>
        </div>
        <div class="eb-qc-main">
          <div class="eb-qc-term">
            <div class="eb-qc-line">${prompt()}<span class="eb-qc-cmdline"></span><span class="eb-qc-caret eb-qc-caret1"></span></div>
            <div class="eb-qc-line eb-qc-line-out" data-line="1">[sudo] password for zxd:</div>
            <div class="eb-qc-line eb-qc-line-out" data-line="2"><span class="eb-qc-inc">Pulling latest image...</span></div>
            <div class="eb-qc-line eb-qc-line-out" data-line="3">building web + api...</div>
            <div class="eb-qc-line eb-qc-line-ok" data-line="4">deployed 2 services in 41s</div>
            <div class="eb-qc-line eb-qc-line-prompt" data-line="5">${prompt()}<span class="eb-qc-caret"></span></div>
          </div>

          <div class="eb-qc-tip">
            <div class="eb-qc-tip-head">
              <span>steps</span>${icon(PATH_QUESTION, '')}
              <span class="eb-qc-tip-name">deploy web</span>
            </div>
            ${stepRows()}
          </div>

          <div class="eb-qc-panel">
            <div class="eb-qc-search">search</div>
            ${cmdButtons()}
          </div>

          <div class="eb-qc-mask"></div>
          <div class="eb-qc-modal">
            <div class="eb-qc-modal-title">deploy web</div>
            <div class="eb-qc-modal-body">
              <div class="eb-qc-modal-tab">2. zxd@web-01:22</div>
              <div class="eb-qc-modal-label">sudo password</div>
              <div class="eb-qc-input">
                <span class="eb-qc-pw">${dots}</span>
                <span class="eb-qc-icaret"></span>
              </div>
              <div class="eb-qc-modal-foot">
                <span class="eb-qc-btn">cancel</span>
                <span class="eb-qc-btn is-primary eb-qc-ok">ok</span>
              </div>
            </div>
          </div>
        </div>
        <div class="eb-qc-footer">
          <span class="eb-qc-fbtn is-active">Q</span>
          <span class="eb-qc-fbtn"><span class="eb-qc-recdot"></span></span>
          <span class="eb-qc-fbtn">${icon(PATH_EDIT, '')}</span>
          <span class="eb-qc-chip">
            <span class="eb-qc-chip-info">
              <span class="eb-qc-spin">${icon(PATH_SPINNER, '')}</span>
              <span class="eb-qc-chip-name">deploy web</span>
              <span class="eb-qc-chip-prog">1/4</span>
              <span class="eb-qc-chip-wait"></span>
            </span>
            <span class="eb-qc-chip-stop">${icon(PATH_STOP, '')}stop</span>
          </span>
        </div>
      </div>
      <span class="eb-qc-pointer"><svg viewBox="-3 -3 29 39"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
      <span class="eb-qc-ripple eb-qc-ripple1"></span>
      <span class="eb-qc-ripple eb-qc-ripple2"></span>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-qc'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm: a quick command made of four steps runs on click — it types the command, waits for the sudo password prompt, asks for the password, and waits for the deploy to report success')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const qa = (sel) => Array.prototype.slice.call(root.querySelectorAll(sel))
  const el = {
    frame: q('.eb-qc-frame'),
    cmdline: q('.eb-qc-cmdline'),
    caret1: q('.eb-qc-caret1'),
    lines: qa('[data-line]'),
    panel: q('.eb-qc-panel'),
    deployBtn: q('.eb-qc-cmd.is-deploy'),
    tip: q('.eb-qc-tip'),
    steps: qa('[data-step]'),
    mask: q('.eb-qc-mask'),
    modal: q('.eb-qc-modal'),
    dots: qa('[data-dot]'),
    okBtn: q('.eb-qc-ok'),
    chip: q('.eb-qc-chip'),
    spin: q('.eb-qc-spin'),
    prog: q('.eb-qc-chip-prog'),
    wait: q('.eb-qc-chip-wait'),
    pointer: q('.eb-qc-pointer'),
    ripple1: q('.eb-qc-ripple1'),
    ripple2: q('.eb-qc-ripple2')
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

  // The pointer travels in the frame's own coordinates. Both targets are
  // measured off the DOM once the banner is laid out, so the pointer lands on
  // the real button and the real OK, not on hand-written coordinates.
  const targets = { p1: { x: 30, y: 26 }, p2: { x: 20, y: 18 } }
  const measure = () => {
    const frameBox = el.frame.getBoundingClientRect()
    const scale = root.clientWidth / 100 || 1
    const toFrame = (box, ax, ay) => ({
      x: (box.left + box.width * ax - frameBox.left) / scale,
      y: (box.top + box.height * ay - frameBox.top) / scale
    })
    const b1 = el.deployBtn.getBoundingClientRect()
    const b2 = el.okBtn.getBoundingClientRect()
    if (b1.width) targets.p1 = toFrame(b1, 0.5, 0.5)
    if (b2.width) targets.p2 = toFrame(b2, 0.5, 0.5)
  }
  measure()
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure)
  }

  function placeRipple (node, target, t, clickAt) {
    const p = seg(t, clickAt, clickAt + 460)
    node.style.opacity = (p > 0 && p < 1 ? (1 - p).toFixed(3) : 0)
    node.style.transform = 'translate(-50%, -50%) scale(' + (0.4 + p * 2.6).toFixed(3) + ')'
    node.style.left = target.x.toFixed(2) + 'em'
    node.style.top = target.y.toFixed(2) + 'em'
  }

  // step index (1..4) the run is on at time t, for the chip
  function stepIndexAt (t) {
    if (t < T.s1To) return 1
    if (t < T.s2To) return 2
    if (t < T.s4From) return 3
    return 4
  }

  const WAIT_TEXT = {
    1: '',
    2: 'wait for text "password"',
    3: 'ask for input',
    4: 'wait for text "deployed"'
  }

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    root.style.opacity = (1 - gone).toFixed(3)

    // the window rises: the card variant is centred with a -50% Y offset of
    // its own, so the inline transform has to carry it. The card only has a
    // few pixels of margin inside a 16/9 thumbnail, so it barely travels —
    // a 2.4em drop would push its footer under the card's rounded corner
    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    const baseY = variant === 'card' ? -50 : 0
    const rise = variant === 'card' ? 0.8 : 2.4
    el.frame.style.transform =
      `translate(-50%, ${baseY}%) translateY(${((1 - winP) * rise).toFixed(2)}em)`

    // beat 1: the panel opens above the footer
    const panelP = seg(t, T.panelFrom, T.panelTo)
    const panelScale = 0.88 + 0.12 * easeOutBack(panelP)
    el.panel.style.opacity = (panelP * (1 - gone)).toFixed(3)
    el.panel.style.transform = 'scale(' + panelScale.toFixed(3) + ')'

    // beat 2: hover shows the steps, the click runs them
    const cardP = seg(t, T.cardFrom, T.cardTo)
    const cardOut = easeInOut(seg(t, T.cardOutFrom, T.cardOutTo))
    el.tip.style.opacity = (cardP * (1 - cardOut) * (1 - gone)).toFixed(3)
    el.tip.style.transform = 'translateY(' + ((1 - cardP) * 0.5).toFixed(2) + 'em)'

    el.deployBtn.classList.toggle('is-hit',
      t >= T.ptrTo - 150 && t < T.doneAt + 250)
    el.deployBtn.classList.toggle('is-done', t >= T.doneAt)

    // the command line: step 1 sends it in one go, then the shell answers
    const l1 = easeOut(seg(t, T.l1From, T.l1To))
    el.cmdline.textContent = l1 > 0 ? CMD : ''
    el.caret1.style.opacity = ((1 - l1) * (1 - gone)).toFixed(3)

    const l2 = easeOut(seg(t, T.l2From, T.l2To))
    const l3 = easeOut(seg(t, T.l3From, T.l3To))
    const l4 = easeOut(seg(t, T.l4From, T.l4To))
    const l5 = easeOut(seg(t, T.l5From, T.l5To))
    const l6 = easeOut(seg(t, T.l6From, T.l6To))
    const byIndex = { 1: l2, 2: l3, 3: l4, 4: l5, 5: l6 }
    el.lines.forEach((node) => {
      const v = byIndex[Number(node.getAttribute('data-line'))] || 0
      node.style.opacity = (v * (1 - gone)).toFixed(3)
    })

    // steps light up one at a time, then stay green once done
    const on = {
      0: t >= T.s1From && t < T.s1To,
      1: t >= T.s2From && t < T.s2To,
      2: t >= T.s3From && t < T.s4From,
      3: t >= T.s4From && t < T.doneAt
    }
    el.steps.forEach((node, i) => {
      node.classList.toggle('is-on', !!on[i])
      node.classList.toggle('is-done', t >= T.doneAt ||
        (i === 0 && t >= T.s1To) ||
        (i === 1 && t >= T.s2To) ||
        (i === 2 && t >= T.s4From))
    })

    // beat 3: ask for input — the dialog, then the bullets appear
    const modalP = easeOut(seg(t, T.modalFrom, T.modalTo))
    const modalOut = easeInOut(seg(t, T.modalOutFrom, T.modalOutTo))
    const modalVis = modalP * (1 - modalOut)
    el.modal.style.opacity = (modalVis * (1 - gone)).toFixed(3)
    el.modal.style.transform =
      'translateY(-50%) scale(' + (0.94 + 0.06 * easeOutBack(modalP)).toFixed(3) + ')'
    el.mask.style.opacity = (modalVis * 0.85 * (1 - gone)).toFixed(3)
    el.dots.forEach((node, i) => {
      const p = seg(t, T.dotsFrom + i * T.dotGap, T.dotsFrom + i * T.dotGap + 90)
      node.style.opacity = (p > 0 ? 0.85 * (1 - modalOut) : 0).toFixed(3)
    })

    // beat 4: run chip in the footer
    const chipP = easeOut(seg(t, T.runFrom, T.runFrom + 260))
    const chipOut = easeInOut(seg(t, T.chipOutFrom, T.chipOutTo))
    el.chip.style.opacity = (chipP * (1 - chipOut) * (1 - gone)).toFixed(3)
    const index = t >= T.doneAt ? 4 : stepIndexAt(t)
    el.prog.textContent = index + '/4'
    el.wait.textContent = t >= T.doneAt ? 'done' : (WAIT_TEXT[index] || '')
    el.spin.classList.toggle('is-done', t >= T.doneAt)

    // pointer: off-screen -> deploy web -> dialog OK -> park
    const from = { x: targets.p1.x - 13, y: targets.p1.y - 8 }
    const leg1 = easeInOut(seg(t, T.ptrFrom, T.ptrTo))
    const leg2 = easeInOut(seg(t, T.ptr2From, T.ptr2To))
    const ptrIn = seg(t, T.ptrFrom, T.ptrFrom + 220)
    const ptrOut = easeInOut(seg(t, T.ptrOutFrom, T.ptrOutTo))
    const x1 = from.x + (targets.p1.x - from.x) * leg1
    const y1 = from.y + (targets.p1.y - from.y) * leg1
    const park = { x: targets.p2.x + 0.7, y: targets.p2.y + 0.8 }
    const px = x1 + (targets.p2.x - x1) * leg2 + (park.x - targets.p2.x) * leg2
    const py = y1 + (targets.p2.y - y1) * leg2 + (park.y - targets.p2.y) * leg2
    el.pointer.style.left = px.toFixed(2) + 'em'
    el.pointer.style.top = py.toFixed(2) + 'em'
    el.pointer.style.opacity = (ptrIn * (1 - ptrOut) * (1 - gone)).toFixed(3)
    el.pointer.style.transform = 'scale(' + (0.86 + 0.14 * Math.max(leg1, leg2)).toFixed(3) + ')'
    placeRipple(el.ripple1, targets.p1, t, T.clickAt)
    placeRipple(el.ripple2, targets.p2, t, T.click2At)

    el.okBtn.classList.toggle('is-hovered', t >= T.ptr2To && t < T.modalOutTo)
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

  // reduced motion: one representative still — the dialog is open, step 3 is
  // active and the chip is on 3/4
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    frame(3900)
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
