/**
 * Animated banner for the "same model name, different weights" post.
 *
 * Everything is generated here — no image, no GIF, no canvas: background,
 * the response-inspector window, the two lanes, the connector path, the
 * verdict chips and the cartoon pointer are DOM + CSS driven by one rAF
 * timeline.
 *
 * The story: one request, one model id, two endpoints.
 *   1. the user types a task and switches the composer from Ask to Agent;
 *   2. the request goes out carrying all 26 tool schemas (33,342 bytes — the
 *      numbers come from src/client/components/ai/agent-tools.js in the app);
 *   3. that one label forks to two backends;
 *   4. the left lane returns prose with a JSON block in it and no tool_calls,
 *      the right lane returns a real tool call, and only the right one runs.
 *
 * Colours are electerm's own theme tokens (main #121214, main-light #2E3338,
 * main-darker #0e0d0e, text #ddd, text-dark #888, primary #08c, success
 * #06D6A0, error #EF476F). Tool names, field names and sizes are the app's;
 * the seller names in the lanes are placeholders, because the post does not
 * name anyone.
 *
 * Mount points: [data-eb-banner="hero"] (post page) and [data-eb-banner="card"]
 * (index thumbnail). The index loads every post's module, so a mount only
 * matches a host whose data-eb-banner-src is this file.
 *
 * 1em = 1% of the banner width, so one design scales to any container.
 */

const STYLE_ID = 'eb-mw-style'
const PERIOD = 12800

const T = {
  winFrom: 280,
  winTo: 820,
  idleFrom: 700,
  idleTo: 1080,
  typeFrom: 980,
  typeTo: 1580,
  ptrFrom: 1620,
  ptrTo: 2020,
  clickAt: 2080,
  reqFrom: 2200,
  reqGap: 85,
  reqDur: 280,
  forkFrom: 2580,
  forkTo: 3040,
  laneFrom: 3080,
  laneTo: 3420,
  lineFrom: 3480,
  lineGap: 150,
  lineDur: 300,
  verdictFrom: 4400,
  resultFrom: 4880,
  markFrom: 5400,
  ptrOutFrom: 5760,
  ptrOutTo: 6120,
  fadeFrom: 12100,
  fadeTo: 12600
}

const PROMPT = 'list my open tabs'
const MODEL = 'deepseek-v4'

const CSS = `
.eb-mw {
  --eb-main-dark: #000;
  --eb-main: #121214;
  --eb-main-light: #2e3338;
  --eb-main-darker: #0e0d0e;
  --eb-text: #ddd;
  --eb-text-dark: #888;
  --eb-text-disabled: #777;
  --eb-primary: #08c;
  --eb-success: #06d6a0;
  --eb-error: #ef476f;
  --eb-warn: #e55934;
  --eb-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  /* type scale for the window body; the card is a thumbnail, so it runs a
     touch larger. Only font-size uses this — geometry stays in root em. */
  --eb-fs: 1;
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
.eb-mw[data-variant='card'] { --eb-fs: 1.3; }

/* ---------- background ---------- */
.eb-mw-deco { position: absolute; inset: 0; pointer-events: none; }
.eb-mw-dots {
  position: absolute;
  inset: -6em;
  background-image: radial-gradient(rgba(8, 136, 204, 0.2) 0.18em, transparent 0.18em);
  background-size: 4.2em 4.2em;
  animation: eb-mw-drift 34s linear infinite;
}
@keyframes eb-mw-drift { to { transform: translate3d(4.2em, 4.2em, 0); } }
.eb-mw-blob { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.62); }
.eb-mw-blob-a { width: 30em; height: 30em; right: -9em; top: -13em; }
.eb-mw-blob-b { width: 26em; height: 26em; left: -10em; bottom: -12em; }
.eb-mw-spark {
  position: absolute;
  width: 1.6em;
  height: 1.6em;
  background: var(--eb-success);
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: eb-mw-twinkle 3.6s ease-in-out infinite;
}
.eb-mw-spark-a { right: 7em; top: 4.2em; }
.eb-mw-spark-b { right: 16em; top: 11.4em; width: 1em; height: 1em; background: var(--eb-error); animation-delay: 0.8s; }
.eb-mw-spark-c { right: 4.2em; top: 16.4em; width: 1.2em; height: 1.2em; background: #8884d8; animation-delay: 1.5s; }
@keyframes eb-mw-twinkle {
  0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.16) rotate(35deg); opacity: 1; }
}

/* ---------- headline ---------- */
.eb-mw-head { position: absolute; left: 5em; right: 5em; top: 3em; pointer-events: none; }
.eb-mw-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 1.4em;
  font-weight: 800;
  color: var(--eb-primary);
}
.eb-mw-brand::before {
  content: '';
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: var(--eb-primary);
  box-shadow: inset 0 0 0 0.32em #fff;
}
.eb-mw-h1 {
  margin: 0.24em 0 0;
  font-size: 3.3em;
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.025em;
  color: #0f172a;
}
.eb-mw-h1 em {
  font-style: normal;
  background: linear-gradient(96deg, #0888cc, #7c3aed 55%, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.eb-mw-sub {
  margin: 0.46em 0 0;
  max-width: 62em;
  font-size: 1.45em;
  line-height: 1.42;
  color: #475569;
}

/* ---------- the window ---------- */
.eb-mw-frame {
  position: absolute;
  left: 50%;
  bottom: 3.2em;
  width: 76em;
  height: 31.4em;
  transform: translateX(-50%);
}
.eb-mw[data-variant='card'] .eb-mw-frame {
  bottom: auto;
  top: 50%;
  width: 90em;
  height: 40em;
  transform: translate(-50%, -50%);
}
.eb-mw-win {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border-radius: 0.7em;
  background: var(--eb-main);
  box-shadow: 0 1.2em 2.4em rgba(9, 20, 40, 0.34), 0 0 2.2em rgba(8, 136, 204, 0.16);
  overflow: hidden;
  text-align: left;
  animation: eb-mw-glow 4.8s ease-in-out infinite;
}
@keyframes eb-mw-glow {
  0%, 100% { box-shadow: 0 1.2em 2.4em rgba(9, 20, 40, 0.34), 0 0 2.2em rgba(8, 136, 204, 0.16); }
  50% { box-shadow: 0 1.2em 2.4em rgba(9, 20, 40, 0.36), 0 0 3.4em rgba(124, 58, 237, 0.3); }
}
.eb-mw-titlebar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.9em;
  height: 2.9em;
  padding: 0 1.3em;
  background: var(--eb-main-dark);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  color: var(--eb-text-dark);
  font-size: 1.02em;
  white-space: nowrap;
}
.eb-mw-dot { width: 0.62em; height: 0.62em; border-radius: 50%; }
.eb-mw-dot-a { background: var(--eb-error); }
.eb-mw-dot-b { background: var(--eb-warn); }
.eb-mw-dot-c { background: var(--eb-success); }
.eb-mw-title { margin-left: 0.3em; font-weight: 700; color: var(--eb-text); }
.eb-mw-titlebar-model {
  margin-left: auto;
  padding: 0.16em 0.6em;
  border-radius: 0.4em;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1b1b1f;
  color: var(--eb-text);
  font-family: var(--eb-mono);
  font-size: 0.94em;
}

.eb-mw-idle {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45em;
  color: var(--eb-text-disabled);
  font-size: 1.05em;
  pointer-events: none;
}
.eb-mw-idle b { color: var(--eb-text-dark); font-weight: 600; }
.eb-mw-body {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.9em;
  padding: 1.15em 1.4em 0.9em;
  min-height: 0;
}

/* ---------- the request row ---------- */
.eb-mw-req {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6em;
  font-family: var(--eb-mono);
  font-size: 1.02em;
  white-space: nowrap;
}
.eb-mw-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.24em 0.62em;
  border-radius: 0.36em;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: var(--eb-main-darker);
  color: var(--eb-text);
}
.eb-mw-chip-method { color: var(--eb-success); font-weight: 700; }
.eb-mw-chip-tools { color: var(--eb-text-dark); }
.eb-mw-chip-tools b { color: var(--eb-text); font-weight: 700; }
.eb-mw-chip-model { color: var(--eb-primary); }

/* the fork: one label, two backends */
.eb-mw-fork {
  flex: none;
  position: relative;
  height: 1.9em;
}
.eb-mw-fork svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.eb-mw-fork path {
  fill: none;
  stroke: rgba(236, 72, 153, 0.55);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.eb-mw-chip-fork { margin-left: auto; color: #ec4899; border-color: rgba(236, 72, 153, 0.4); }

/* ---------- lanes ---------- */
.eb-mw-lanes {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1em;
  min-height: 0;
}
.eb-mw-lane {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding: 0.85em 0.9em;
  border-radius: 0.5em;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #17171a;
  position: relative;
  min-width: 0;
  overflow: hidden;
}
.eb-mw-lane-a { border-color: rgba(239, 71, 111, 0.34); }
.eb-mw-lane-b { border-color: rgba(6, 214, 160, 0.34); }
.eb-mw-lane-head {
  display: flex;
  align-items: center;
  gap: 0.5em;
  min-width: 0;
  font-size: calc(1em * var(--eb-fs));
  white-space: nowrap;
}
.eb-mw-seller {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
  color: var(--eb-text);
}
.eb-mw-price {
  flex: none;
  margin-left: auto;
  font-family: var(--eb-mono);
  font-size: 0.9em;
  color: var(--eb-text-dark);
}
.eb-mw-caption {
  font-size: calc(0.82em * var(--eb-fs));
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--eb-text-disabled);
}
.eb-mw-code {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  gap: 0.16em;
  min-height: 0;
  font-family: var(--eb-mono);
  font-size: calc(0.98em * var(--eb-fs));
  line-height: 1.45;
  color: var(--eb-text);
  white-space: nowrap;
}
.eb-mw-code > span { overflow: hidden; text-overflow: ellipsis; }
.eb-mw-key { color: var(--eb-text-dark); }
.eb-mw-key-b { color: var(--eb-success); }
.eb-mw-dim { color: var(--eb-text-disabled); }
.eb-mw-bad { color: var(--eb-error); }
.eb-mw-good { color: var(--eb-success); }
.eb-mw-verdict {
  display: flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.24em 0.55em;
  align-self: flex-start;
  border-radius: 0.34em;
  font-size: calc(0.92em * var(--eb-fs));
  font-weight: 700;
  white-space: nowrap;
  max-width: 100%;
}
.eb-mw-verdict-a { background: rgba(239, 71, 111, 0.14); color: var(--eb-error); }
.eb-mw-verdict-b { background: rgba(6, 214, 160, 0.14); color: var(--eb-success); }
.eb-mw-result {
  font-family: var(--eb-mono);
  font-size: calc(0.98em * var(--eb-fs));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eb-mw-mark {
  position: absolute;
  right: 0.45em;
  bottom: 0.35em;
  width: 3em;
  height: 3em;
  opacity: 0;
  pointer-events: none;
  z-index: 0;
}
.eb-mw-lane-head,
.eb-mw-code,
.eb-mw-verdict,
.eb-mw-result { position: relative; z-index: 1; }
.eb-mw-lane-a .eb-mw-mark { color: var(--eb-error); }
.eb-mw-lane-b .eb-mw-mark { color: var(--eb-success); }
.eb-mw-mark svg { width: 100%; height: 100%; fill: currentColor; }

/* ---------- composer ---------- */
.eb-mw-composer {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.7em;
  height: 2.9em;
  padding: 0 1.2em;
  background: var(--eb-main-darker);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 1em;
  white-space: nowrap;
}
.eb-mw-seg {
  display: inline-flex;
  padding: 0.16em;
  border-radius: 0.4em;
  background: var(--eb-main-light);
}
.eb-mw-seg-item {
  padding: 0.16em 0.66em;
  border-radius: 0.3em;
  color: var(--eb-text-dark);
  font-weight: 700;
}
.eb-mw-seg-item.is-on { background: var(--eb-primary); color: #fff; }
.eb-mw-prompt {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--eb-text);
  font-family: var(--eb-mono);
  font-size: 0.95em;
}
.eb-mw-caret {
  display: inline-block;
  width: 0.52em;
  height: 1.1em;
  margin-left: 0.06em;
  vertical-align: -0.18em;
  background: var(--eb-text);
  animation: eb-mw-blink 1.1s steps(1) infinite;
}
@keyframes eb-mw-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
.eb-mw-send {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7em;
  height: 1.7em;
  border-radius: 50%;
  background: var(--eb-primary);
  color: #fff;
}
.eb-mw-send svg { width: 0.85em; height: 0.85em; fill: currentColor; }

/* ---------- pointer ---------- */
.eb-mw-pointer {
  position: absolute;
  width: 1.5em;
  height: 2.1em;
  opacity: 0;
  pointer-events: none;
  filter: drop-shadow(0 0.12em 0.16em rgba(9, 20, 40, 0.3));
}
.eb-mw-pointer svg { width: 100%; height: 100%; }
.eb-mw-ripple {
  position: absolute;
  width: 1em;
  height: 1em;
  margin: -0.5em 0 0 -0.5em;
  border-radius: 50%;
  border: 0.16em solid rgba(8, 136, 204, 0.75);
  opacity: 0;
  pointer-events: none;
}
`

const CURSOR_PATH = 'M0 0 L0 30 L7.5 22 L13 33 L19 30 L13.5 19.5 L23 18 Z'
const CHECK_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3h46.9c6.5 0 10.3 7.4 6.5 12.7z'
const CLOSE_CIRCLE_PATH = 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372zm128.01-155.17c.03 0 .05.01.09.06l45.02 45.01a.2.2 0 01.05.09.12.12 0 010 .07c0 .02-.01.04-.05.08L557.25 512l127.87 127.86a.27.27 0 01.05.06v.02a.12.12 0 010 .07c0 .03-.01.05-.05.09l-45.02 45.02a.2.2 0 01-.09.05.12.12 0 01-.07 0c-.02 0-.04-.01-.08-.05L512 557.25 384.14 685.12c-.04.04-.06.05-.08.05a.12.12 0 01-.07 0c-.03 0-.05-.01-.09-.05l-45.02-45.02a.2.2 0 01-.05-.09.12.12 0 010-.07c0-.02.01-.04.06-.08L466.75 512 338.88 384.14a.27.27 0 01-.05-.06l-.01-.02a.12.12 0 010-.07c0-.03.01-.05.05-.09l45.02-45.02a.2.2 0 01.09-.05h.07c.02 0 .04.01.08.06L512 466.75l127.86-127.86z'
const SEND_PATH = 'M931.4 498.9L94.9 79.5c-3.4-1.7-7.3-2.1-11-1.2a15.99 15.99 0 00-11.7 19.3l86.2 352.2c1.3 5.3 5.2 9.6 10.4 11.3l147.7 50.7-147.9 50.8c-5.1 1.8-8.9 6-10.3 11.3L72.2 925.9c-1.9 7.9.6 16.3 6.6 21.6 3.6 3.2 8.2 5 12.9 5 2.6 0 5.2-.6 7.6-1.8l836.5-419.5c6.4-3.2 10.4-9.7 10.4-16.9s-4-13.7-10.4-16.9z'

const icon = (path, cls, viewBox = '64 64 896 896') =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`

function markup (variant) {
  const head = variant === 'card'
    ? ''
    : `
      <div class="eb-mw-head">
        <span class="eb-mw-brand">electerm</span>
        <h2 class="eb-mw-h1">Same model name,<br><em>different weights</em></h2>
        <p class="eb-mw-sub">26 tool schemas go out with every agent turn. Whether a tool call comes back is the only test that matters.</p>
      </div>`

  return `${head}
    <div class="eb-mw-deco">
      <div class="eb-mw-dots"></div>
      <div class="eb-mw-blob eb-mw-blob-a"></div>
      <div class="eb-mw-blob eb-mw-blob-b"></div>
      <div class="eb-mw-spark eb-mw-spark-a"></div>
      <div class="eb-mw-spark eb-mw-spark-b"></div>
      <div class="eb-mw-spark eb-mw-spark-c"></div>
    </div>
    <div class="eb-mw-frame">
      <div class="eb-mw-win">
        <div class="eb-mw-titlebar">
          <span class="eb-mw-dot eb-mw-dot-a"></span>
          <span class="eb-mw-dot eb-mw-dot-b"></span>
          <span class="eb-mw-dot eb-mw-dot-c"></span>
          <span class="eb-mw-title">AI assistant</span>
          <span class="eb-mw-titlebar-model">model: "${MODEL}"</span>
        </div>
        <div class="eb-mw-body">
          <div class="eb-mw-idle"><b>Ask AI about your terminal</b><span>no request sent yet</span></div>
          <div class="eb-mw-req">
            <span class="eb-mw-chip"><span class="eb-mw-chip-method">POST</span> /chat/completions</span>
            <span class="eb-mw-chip eb-mw-chip-model">model: "${MODEL}"</span>
            <span class="eb-mw-chip eb-mw-chip-tools">tools: <b>26</b> · 33,342 B</span>
            <span class="eb-mw-chip eb-mw-chip-fork">→ 2 backends</span>
          </div>
          <div class="eb-mw-fork">
            <svg viewBox="0 0 100 24" preserveAspectRatio="none">
              <path class="eb-mw-path-a" pathLength="1" d="M50 0 C50 13 25 8 25 24"></path>
              <path class="eb-mw-path-b" pathLength="1" d="M50 0 C50 13 75 8 75 24"></path>
            </svg>
          </div>
          <div class="eb-mw-lanes">
            <div class="eb-mw-lane eb-mw-lane-a">
              <div class="eb-mw-lane-head">
                <span class="eb-mw-seller">relay.example</span>
                <span class="eb-mw-price">$0.09 / M</span>
              </div>
              <div class="eb-mw-caption">HTTP 200 · content only</div>
              <div class="eb-mw-code">
                <span class="eb-mw-key">content:</span>
                <span>"Run this: list_tabs"</span>
                <span class="eb-mw-dim">{ "name": "list_tabs" }</span>
                <span class="eb-mw-bad">no tool_calls ↑</span>
              </div>
              <div class="eb-mw-verdict eb-mw-verdict-a">0 tool calls · nothing ran</div>
              <div class="eb-mw-result eb-mw-dim">terminal untouched</div>
              <span class="eb-mw-mark">${icon(CLOSE_CIRCLE_PATH, '')}</span>
            </div>
            <div class="eb-mw-lane eb-mw-lane-b">
              <div class="eb-mw-lane-head">
                <span class="eb-mw-seller">first-party API</span>
                <span class="eb-mw-price">list price</span>
              </div>
              <div class="eb-mw-caption">HTTP 200 · tool_calls</div>
              <div class="eb-mw-code">
                <span class="eb-mw-key eb-mw-key-b">tool_calls[0]:</span>
                <span>list_tabs {}</span>
                <span class="eb-mw-dim">arguments: "{}"</span>
                <span class="eb-mw-good">schema ok</span>
              </div>
              <div class="eb-mw-verdict eb-mw-verdict-b">1 tool call · loop continues</div>
              <div class="eb-mw-result eb-mw-good">→ 3 tabs · tab-1 active</div>
              <span class="eb-mw-mark">${icon(CHECK_PATH, '')}</span>
            </div>
          </div>
        </div>
        <div class="eb-mw-composer">
          <span class="eb-mw-seg">
            <span class="eb-mw-seg-item eb-mw-seg-ask">Ask</span>
            <span class="eb-mw-seg-item eb-mw-seg-agent">Agent</span>
          </span>
          <span class="eb-mw-prompt"><span class="eb-mw-typed"></span><span class="eb-mw-caret"></span></span>
          <span class="eb-mw-send">${icon(SEND_PATH, '')}</span>
        </div>
      </div>
      <span class="eb-mw-pointer"><svg viewBox="-3 -3 29 39"><path d="${CURSOR_PATH}" fill="#fff" stroke="#1b1b1f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
      <span class="eb-mw-ripple"></span>
    </div>`
}

function mount (host) {
  if (host.getAttribute('data-eb-mounted')) return
  host.setAttribute('data-eb-mounted', '1')

  const variant = host.getAttribute('data-eb-banner') === 'card' ? 'card' : 'hero'
  const root = document.createElement('div')
  root.className = 'eb-mw'
  root.setAttribute('data-variant', variant)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label',
    'electerm: one agent request carrying 26 tool schemas is sent to two endpoints under the same model id; the cheap relay answers with prose in content and zero tool calls, so nothing runs, while the first-party endpoint returns a list_tabs tool call and the loop continues')
  root.innerHTML = markup(variant)
  host.appendChild(root)

  const q = (sel) => root.querySelector(sel)
  const el = {
    frame: q('.eb-mw-frame'),
    typed: q('.eb-mw-typed'),
    caret: q('.eb-mw-caret'),
    segAsk: q('.eb-mw-seg-ask'),
    segAgent: q('.eb-mw-seg-agent'),
    chips: [...root.querySelectorAll('.eb-mw-chip')],
    idle: q('.eb-mw-idle'),
    pathA: q('.eb-mw-path-a'),
    pathB: q('.eb-mw-path-b'),
    lanes: [...root.querySelectorAll('.eb-mw-lane')],
    heads: [...root.querySelectorAll('.eb-mw-lane-head')],
    lines: [...root.querySelectorAll('.eb-mw-code > span')],
    verdicts: [...root.querySelectorAll('.eb-mw-verdict')],
    results: [...root.querySelectorAll('.eb-mw-result')],
    marks: [...root.querySelectorAll('.eb-mw-mark')],
    pointer: q('.eb-mw-pointer'),
    ripple: q('.eb-mw-ripple'),
    send: q('.eb-mw-send')
  }

  // 1em === 1% of the banner width, so the whole scene scales with it.
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

  // The pointer lands on the real "Agent" segment rather than a guess, so the
  // click still reads correctly when the composer text is longer in one
  // language or the font renders wider.
  const target = { x: 8, y: 87 }
  const measure = () => {
    const scale = root.clientWidth / 100 || 1
    const frameBox = el.frame.getBoundingClientRect()
    const segBox = el.segAgent.getBoundingClientRect()
    if (segBox.width) {
      target.x = (segBox.left + segBox.width * 0.55 - frameBox.left) / scale
      target.y = (segBox.top + segBox.height * 0.55 - frameBox.top) / scale
    }
  }
  measure()
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure)

  function frame (t) {
    const gone = easeInOut(seg(t, T.fadeFrom, T.fadeTo))
    root.style.opacity = (1 - gone).toFixed(3)

    // the window rises; the card variant is centred with its own -50% Y offset,
    // so the inline transform has to carry that offset along
    const winP = easeOut(seg(t, T.winFrom, T.winTo))
    const baseY = variant === 'card' ? -50 : 0
    el.frame.style.transform =
      `translate(-50%, ${baseY}%) translateY(${((1 - winP) * 2.6).toFixed(2)}em)`

    // the task is typed, cursor blinking only while the composer waits
    const typed = Math.round(easeOut(seg(t, T.typeFrom, T.typeTo)) * PROMPT.length)
    el.typed.textContent = PROMPT.slice(0, typed)
    el.caret.style.display = t < T.clickAt ? '' : 'none'

    // Ask -> Agent is what turns chat into a tool-calling request
    const isAgent = t >= T.clickAt
    el.segAgent.classList.toggle('is-on', isAgent)
    el.segAsk.classList.toggle('is-on', !isAgent)
    el.send.style.opacity = isAgent ? '1' : '0.45'

    // the request goes out with every tool schema attached
    el.chips.forEach((node, index) => {
      const p = easeOut(seg(t, T.reqFrom + index * T.reqGap,
        T.reqFrom + index * T.reqGap + T.reqDur))
      node.style.opacity = p.toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.5).toFixed(3) + 'em)'
    })

    // one label forks to two backends
    const forkP = easeInOut(seg(t, T.forkFrom, T.forkTo))
    // a round linecap leaves a dot on a zero-length dash, so hide the paths
    // until the fork actually starts drawing
    const forkVisible = forkP > 0 ? '1' : '0'
    el.pathA.style.opacity = forkVisible
    el.pathB.style.opacity = forkVisible
    el.pathA.style.strokeDashoffset = (1 - forkP).toFixed(3)
    el.pathB.style.strokeDashoffset = (1 - forkP).toFixed(3)
    el.idle.style.opacity =
      (easeOut(seg(t, T.idleFrom, T.idleTo)) * (1 - seg(t, T.reqFrom - 200, T.reqFrom + 100))).toFixed(3)

    // the lanes arrive, then their contents land line by line
    el.lanes.forEach((node, index) => {
      const p = easeOut(seg(t, T.laneFrom + index * 120, T.laneTo + index * 120))
      node.style.opacity = p.toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.8).toFixed(3) + 'em)'
    })
    el.heads.forEach((node, index) => {
      const p = easeOut(seg(t, T.laneFrom + index * 120, T.laneTo + index * 120))
      node.style.opacity = p.toFixed(3)
    })
    el.lines.forEach((node, index) => {
      const lane = index < 4 ? 0 : 1
      const local = index % 4
      const from = T.lineFrom + lane * 140 + local * T.lineGap
      const p = easeOut(seg(t, from, from + T.lineDur))
      node.style.opacity = p.toFixed(3)
      node.style.transform = 'translateX(' + ((1 - p) * -0.5).toFixed(3) + 'em)'
    })
    el.verdicts.forEach((node, index) => {
      const p = seg(t, T.verdictFrom + index * 180, T.verdictFrom + index * 180 + 380)
      const scale = 0.9 + 0.1 * easeOutBack(p)
      node.style.opacity = p.toFixed(3)
      node.style.transform = 'scale(' + scale.toFixed(3) + ')'
    })
    el.results.forEach((node, index) => {
      const p = easeOut(seg(t, T.resultFrom + index * 220, T.resultFrom + index * 220 + 360))
      node.style.opacity = p.toFixed(3)
      node.style.transform = 'translateY(' + ((1 - p) * 0.3).toFixed(3) + 'em)'
    })

    // the verdict is stamped: a cross on one lane, a tick on the other
    const markP = easeOutBack(seg(t, T.markFrom, T.markFrom + 520))
    el.marks.forEach((node) => {
      const visible = t >= T.markFrom ? 1 : 0
      node.style.opacity = (visible * Math.min(1, markP) * (1 - gone)).toFixed(3)
      node.style.transform = 'scale(' + (0.4 + 0.6 * Math.max(0, markP)).toFixed(3) + ') rotate(-8deg)'
    })

    // the pointer clicks "Agent" and leaves
    const arrive = easeOut(seg(t, T.ptrFrom, T.ptrTo))
    const leave = easeInOut(seg(t, T.ptrOutFrom, T.ptrOutTo))
    el.pointer.style.left = (target.x - 0.35).toFixed(2) + 'em'
    el.pointer.style.top = (target.y - 1.9).toFixed(2) + 'em'
    el.pointer.style.opacity =
      (seg(t, T.ptrFrom, T.ptrFrom + 240) * (1 - leave) * (1 - gone)).toFixed(3)
    el.pointer.style.transform = 'scale(' + (0.84 + 0.16 * arrive).toFixed(3) + ')'

    const ripP = seg(t, T.clickAt, T.clickAt + 460)
    el.ripple.style.opacity =
      (ripP > 0 && ripP < 1 ? (1 - ripP) * (1 - gone) : 0).toFixed(3)
    el.ripple.style.transform = 'scale(' + (0.4 + ripP * 2.6).toFixed(3) + ')'
    el.ripple.style.left = target.x.toFixed(2) + 'em'
    el.ripple.style.top = target.y.toFixed(2) + 'em'
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
    // one representative beat: everything landed, the popover-free verdict is
    // readable, no stranded labels
    frame(T.ptrOutTo + 400)
  } else if (window.IntersectionObserver) {
    new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) play()
      else pause()
    }, { threshold: 0 }).observe(root)
  } else {
    play()
  }
}

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
