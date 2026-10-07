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

When an application asks the terminal for mouse reports, xterm.js stops treating the pointer as a text pointer — and it does not merely deprioritise local selection, it **turns it off**. So the drag never creates a selection, and the mousedown that would have started one is instead encoded as a mouse report and pushed at the pty. There is nothing to preserve on mouseup, which is why the highlight you saw blinks out.

The same thing happens with `less`, `vim` in mouse mode, `htop`, any TUI that grabs the pointer. tmux is just the case where you *want* the wheel and *also* want to copy, at the same time, forever.

## What the setting actually changes

One option, **mouse event requires alt key**, in **Settings → Terminal**. It ships **off** (since v5.5.66), so nothing changes until you ask for it.

Turn it on and selection stays enabled, while forwarding becomes conditional on the Alt key:

| Gesture | Setting off (default) | Setting on |
| --- | --- | --- |
| plain drag | sent to the app, **no** local selection | **selects locally**, survives mouseup, `⌘C` copies |
| wheel | sent to the app | **still sent to the app**, no modifier needed |
| plain right click | a right-click report goes to the app (the context menu still opens) | handled locally — no report reaches the app |
| Option+click | sent to the app | sent to the app |
| Option+drag | sent to the app | sent to the app, no local selection |
| no app asking for mouse events | local selection, nothing sent | identical — the option is inert |

Two details in that table are worth reading twice, because they are the whole feature:

**The wheel is not affected.** Alt is required for clicks, drags and moves. The wheel report is forwarded either way, so `tmux` keeps paging history with the same two fingers you already use. You do not have to hold a modifier to scroll.

**The option is inert when no application wants mouse events.** Electerm only consults it while an application actually has mouse mode on. In a plain shell the setting does nothing at all, so there is no state where you have "turned on alt-click" and cannot select text.

## Holding Option hands the pointer back to the app

While the setting is on and the app has mouse mode, the terminal cursor changes with the Alt key: hold Option and the caret becomes an arrow — that is the app's cursor now, and clicking will be forwarded. Release it and you are selecting text again.

The change resets when the window loses focus, so the arrow never gets stuck if you alt-tab away with the key held.

The `Alt` key itself is **not** included in the click and drag reports the app receives. tmux sees a plain left click exactly as it would without the modifier held — which is the point: you are not remapping anything, you are choosing when the pointer belongs to whom.

## How this compares to other terminals

Most terminals solve this same conflict with the **opposite polarity**: the app keeps the mouse, and a modifier takes the pointer back for selection.

| Terminal | Who owns the mouse by default | Modifier gesture |
| --- | --- | --- |
| iTerm2 | the app | **Option** temporarily disables mouse reporting |
| kitty | the app | **Shift** selects even when the mouse is grabbed |
| WezTerm | the app | **Shift** bypasses mouse reporting (`bypass_mouse_reporting_modifiers`) |
| xterm / GNOME Terminal / Konsole / Windows Terminal | the app | **Shift**+drag selects |
| electerm, this option on | **you** | **Alt** hands the pointer over |

Option/Alt is therefore already the established "give me my selection back" key elsewhere; this setting deliberately uses it in the opposite direction. It is opt-in for exactly that reason — for most people the established behaviour is the better trade, and the setting stays off unless you turn it on.

## What you give up

Two things, both only while an app actually holds the mouse:

**Block (rectangular) selection.** Alt+drag normally starts a rectangular selection in xterm.js. While a program holds the mouse it is off the table either way — and with this option on, Alt is additionally reserved for forwarding. Use double/triple click plus Shift+arrow, or the program's own copy mode.

**Alt+click as "move the shell prompt cursor".** xterm's `altClickMovesCursor` needs the mouse-down to have reached the selection handler, and it only fires on a click that selected nothing — while an app holds the mouse the mouse-down never gets there, so the gesture was already unreachable; with this option on, Alt+click goes to the app instead.

Everything else — double-click for a word, triple-click for a line, `⌘C` — keeps working, including inside `vim` and `less`.

## Other ways to get selection back

Try these before you turn the setting on; they cost nothing:

- Turn mouse reporting off in the app: `:set mouse=` in vim, `set -g mouse off` in tmux, `-m` in less.
- Hold **Shift** while dragging. With the setting **off** and mouse mode on, Shift+drag forces a local selection on Linux and Windows. On macOS xterm's `macOptionClickForcesSelection` is off by default, so no gesture does this — which is the gap this setting fills.
- Use the app's own copy mechanism: tmux copy mode (`prefix + [`), or `less` with `-m`.

## What tmux is actually asking for

tmux does not ask for the simplest mouse mode. `set -g mouse on` opts into button-event tracking — motion *while a button is held* — on top of the plain press/release reports, and asks for the extended coordinate format that survives past column 223.

That is why a drag reaches tmux as a stream of press → motion → release rather than one press and one release, and why tmux can move a pane border under your cursor. It does **not** ask for button-less motion by default, so moving the pointer with nothing held costs no traffic.

With the setting on, none of those reports is emitted for a plain drag — the terminal returns before encoding the event, so nothing at all reaches the pty. Your selection is local and no byte is spent.

One asymmetry worth knowing: **the wheel keeps the real Alt bit.** Click and drag reports are sent with `alt` forced to false, because the modifier is only a local gate. The wheel is not gated at all, so its Alt bit is passed through unchanged. A program that treats Alt+wheel as a distinct gesture will see the difference.

## It applies without reconnecting

**mouse event requires alt key** is one of a handful of terminal options pushed straight into the live terminal instance instead of being fixed at boot. Toggle it in a live SSH session with tmux running and it takes effect immediately — no reconnect, no new tab, no lost scrollback. It is also in the data-sync key list, so the choice follows your other settings to your other machines.

## Numbers worth trusting

- **Default is off.** This is an opt-in change of behaviour, never a silent one. Shipped in v5.5.66.
- **No reconnect.** The option is re-read whenever the terminal re-renders, then pushed into the live xterm options object.
- **The alt bit is stripped from clicks and drags, but not from the wheel.** The modifier is a local gate, not a protocol change.
- **Wheel is never gated.** It is not part of what Alt unlocks.
- **Selection enable/disable follows mouse mode, not the setting alone.** With the setting off and mouse mode on, selection is genuinely switched off — the app owns the pointer.
- **Setting precedence.** When **mouse event requires alt key** is active it takes precedence over xterm's own Option-click-forces-selection behaviour, so the two cannot fight over the same gesture.

## Things worth knowing

- **On macOS, Alt is the Option key.** The setting is stored under one name for every platform; the physical key is Option on a Mac and Alt everywhere else.
- **You are changing who gets the pointer, not what the app receives.** tmux cannot tell the difference between an Option click and a plain one. If a binding of yours relies on modifier bits from the mouse, it will see them stripped — that is xterm's documented behaviour, not an electerm choice.
- **If your day is mostly clicking buttons inside full-screen TUIs, leave it off.** You would be holding Alt for those, which is slower than the Shift/Option reclaim gesture the other terminals use. This option is built for reading and copying out of a program that grabbed the pointer, not for driving one.
- **It applies per terminal session**, including local shells — but you will only notice it where something actually requests mouse events.

## Two minutes to try

Open a session, start tmux, and turn the mouse on:

```bash
$ tmux new -s work
$ tmux set -g mouse on
```

Then **Settings → Terminal → mouse event requires alt key**. Drag across some output and let go: the selection stays, `⌘C` takes it. Scroll the wheel: history pages, no modifier held. Hold Option and click: tmux gets the click, and the cursor turns into an arrow to say so.

That is the whole feature. It ships off by default, and it answers a question that has been asked in every terminal that takes mouse mode seriously: how do I get both.

More detail — the full behaviour table, and the config key it is stored under — is in the wiki: [Mouse Event Requires Alt Key](https://github.com/electerm/electerm/wiki/Mouse-events-require-alt).
