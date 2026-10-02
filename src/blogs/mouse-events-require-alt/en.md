---
title: 'Keep tmux Scrolling and Get Your Selection Back: mouse event requires alt key'
description: With tmux mouse mode on, a plain drag stops selecting text and the selection dies on mouseup. A new electerm setting forwards clicks only while Alt is held — so the wheel still pages tmux, drag selects locally, and Option+click still reaches the app.
date: 2026-10-02
tags: [terminal, tmux, mouse, selection, alt, option, xterm, productivity, tips]
videos: [electerm-auto-copy-on-select, electerm-usage-demo, electerm-terminal-and-sftp-split-view]
bannerScript: banner.js
---

# Keep tmux Scrolling and Get Your Selection Back

You turned on tmux mouse mode because the wheel is how you read history now. `set -g mouse on`, and the pane scrolls properly for the first time in your life. Then you try to copy a command out of the scrollback: drag across it, the highlight appears for about a tenth of a second, and it is gone the moment you let go. `⌘C` copies whatever you last had in the clipboard, which is nothing. Turn mouse mode off and selection works again — and the wheel goes back to scrolling one screen at a time.

That trade has no good answer, because both behaviours want the same gesture. Electerm now has a setting that splits them: **mouse event requires alt key**. Plain drags select locally again, the wheel still reaches tmux, and holding Option turns any click back into a mouse event.

## Why the selection dies at all

Nothing is broken, and nothing is a bug in tmux either. It is the mouse-mode contract.

When an application asks for mouse reports, it is sent a sequence like `ESC[?1000h` (VT200 mouse reporting), and from that moment on xterm.js stops treating the pointer as a text pointer. In `MouseService._syncMouseModeState` the whole decision is one line:

```ts
if (this._mouseStateService.areMouseEventsActive) {
  element.classList.add(MouseEventCssClasses.ENABLE_MOUSE_EVENTS);
  this._selectionService.disable();
}
```

`_selectionService.disable()` is the important half. Local selection is not merely out-ranked, it is **turned off**. So the drag never creates a selection, and the mousedown that would have started one is instead encoded as an SGR report and pushed at the pty. There is nothing to preserve on mouseup, which is why the highlight you saw blinks out.

The same thing happens with `less`, `vim` in mouse mode, `htop`, any TUI that grabs the pointer. tmux is just the case where you *want* the wheel and *also* want to copy, at the same time, forever.

## What the setting actually changes

One option, `mouseEventsRequireAlt`, exposed in **Settings → Terminal → mouse event requires alt key**. It ships **off**, so nothing changes until you ask for it:

```js
// src/app/common/config-default.js
mouseEventsRequireAlt: false,
```

Turn it on and the branch above takes the other path — selection stays enabled, and forwarding becomes conditional on the Alt key:

| Gesture | Setting off (default) | Setting on |
| --- | --- | --- |
| plain drag | sent to the app, **no** local selection | **selects locally**, survives mouseup, `⌘C` copies |
| wheel | sent to the app | **still sent to the app** |
| Option+click | sent to the app | sent to the app |
| Option+drag | sent to the app | sent to the app, no local selection |
| no app asking for mouse events | local selection, nothing sent | identical — the option is inert |

Two details in that table are worth reading twice, because they are the whole feature:

**The wheel is not affected.** Alt is required for clicks, drags and moves. The wheel report is forwarded either way, so `tmux` keeps paging history with the same two fingers you already use. You do not have to hold a modifier to scroll.

**The option is inert when no application wants mouse events.** `_syncMouseModeState` only consults it inside the `areMouseEventsActive` branch. In a plain shell the setting does nothing at all, so there is no state where you have "turned on alt-click" and cannot select text.

## Holding Option hands the pointer back to the app

While the setting is on and the app has mouse mode, xterm.js adds and removes a class as Alt goes down and comes up, and the CSS behind it is one declaration:

```css
.xterm.enable-mouse-events {
  /* When mouse events are enabled (eg. tmux), revert to the standard pointer cursor */
  cursor: default;
}
```

So there is a visual answer to a question the terminal cannot ask out loud. Hold Option and the caret becomes an arrow — that is the app's cursor now, and clicking will be forwarded. Release it and you are selecting text again. `AltMouseCursorController` listens on `keydown`, `keyup` and `mousemove`, and resets on window `blur`, so the arrow never gets stuck if you alt-tab away with the key held.

The `Alt` key itself is **not** included in the report the app receives. tmux sees a plain left click exactly as it would without the modifier held — which is the point: you are not remapping anything, you are choosing when the pointer belongs to whom.

## Every click costs an escape sequence

The forwarded report is standard SGR mouse encoding, `ESC[<b;x;yM` for press and `ESC[<b;x;ym` for release, with `b` carrying the button and modifier bits. This is what actually crosses the wire when you click with Option held:

```
ESC[<0;18;6M        press, left button, column 18 row 6
ESC[<0;18;6m        release at the same cell
```

A wheel notch looks like this, and note the button code carries the wheel bit (`64`):

```
ESC[<64;10;4M        wheel up at column 10 row 4
ESC[<65;10;4M        wheel down
```

Which protocols electerm can speak is decided by what the app asks for in its `DECSET` sequence:

| `DECSET` | Encoding | What arrives |
| --- | --- | --- |
| `ESC[?1000h` | X10 / VT200 | press, release, wheel — no plain movement |
| `ESC[?1002h` | button-event drag | the above **plus** drag while a button is held |
| `ESC[?1003h` | any-event tracking | the above **plus** hover movement |
| `ESC[?1006h` | SGR | the coordinate encoding used above, unbounded cells |

tmux sends `1000` plus `1006` by default. That is why a plain drag in tmux is reported as press-then-release at two cells, with no drag events in between: the app never learns about the intermediate movement, it only sees where you pressed and where you let go.

## It applies without reconnecting

`mouseEventsRequireAlt` is one of four terminal options pushed straight into the live xterm instance instead of being fixed at boot:

```js
// src/client/components/terminal/terminal.jsx
terminalConfigProps = [
  { name: 'rightClickSelectsWord', type: 'glob' },
  { name: 'mouseEventsRequireAlt', type: 'glob' },
  { name: 'fontSize', type: 'glob_local' },
  { name: 'fontFamily', type: 'glob_local' }
]
```

`checkConfigChange` writes the value into `term.options` on the next render. Toggle it in a live SSH session with tmux running and it takes effect immediately — no reconnect, no new tab, no lost scrollback. It is also in the data-sync key list, so the choice follows your other settings to your other machines.

## Numbers worth trusting

- **Default is `false`**, both in electerm's `config-default.js` and in xterm's own `OptionsService`. This is an opt-in change of behaviour, never a silent one.
- **No reconnect.** The option list above is checked on every `componentDidUpdate`.
- **The alt bit is not sent.** Your app sees an unmodified report; the modifier is a local gate, not a protocol change.
- **Wheel is never gated.** It is not part of what Alt unlocks.
- **Selection enable/disable follows mouse mode, not the setting alone.** With the setting off and mouse mode on, selection is genuinely `disable()`d — the app owns the pointer.
- **Setting precedence.** When `mouseEventsRequireAlt` is active it takes precedence over xterm's `macOptionClickForcesSelection`, so the two cannot fight over the same gesture.

## Things worth knowing

- **On macOS, Alt is the Option key.** The setting is stored under one name for every platform; the physical key is Option on a Mac and Alt everywhere else.
- **You are changing who gets the pointer, not what the app receives.** tmux cannot tell the difference between an Option click and a plain one. If a binding of yours relies on modifier bits from the mouse, it will see them stripped — that is xterm's documented behaviour, not an electerm choice.
- **Plain drags inside a full-screen TUI stay unusable by design.** `vim`, `less` and `htop` are apps you interact with, not scrollbacks you read from. Option+drag is how you pan a selection inside them.
- **It applies per terminal session**, including local shells — but you will only notice it where something actually requests mouse events.

## Two minutes to try

Open a session, start tmux, and turn the mouse on:

```bash
$ tmux new -s work
$ tmux set -g mouse on
```

Then **Settings → Terminal → mouse event requires alt key**. Drag across some output and let go: the selection stays, `⌘C` takes it. Scroll the wheel: history pages, no modifier held. Hold Option and click: tmux gets the click, and the cursor turns into an arrow to say so.

That is the whole feature. It ships in the next release, off by default, and it is the answer to a question that has been asked in every terminal that takes mouse mode seriously: how do I get both.