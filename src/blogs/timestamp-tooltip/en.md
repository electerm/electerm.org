---
title: 'Read Any Unix Timestamp at a Glance in Electerm'
description: Select a number in the electerm terminal and a tooltip tells you what moment it is — 9 and 10 digit Unix seconds and 13 digit milliseconds are recognised, and clicking the tooltip copies the formatted date and time.
date: 2026-09-19
tags: [timestamp, unix-time, terminal, logs, productivity, tips]
videos: [electerm-auto-copy-on-select, electerm-terminal-keyword-highlighting, electerm-usage-demo]
bannerScript: banner.js
---

# Read Any Unix Timestamp at a Glance in Electerm

`1789821105611`. Quick — what day is that? Is it this morning, last Tuesday, or some time in 2027? Unless you have spent a lot of your life staring at epoch numbers, the answer is not in your head. So you copy the number, paste it into a browser tab, run `date -d @...` in another pane, and lose your train of thought in the process.

Electerm takes that whole detour away. **Select the number in the terminal and a small tooltip appears next to your cursor with the formatted date and time** — in this case `2026/9/19 20:31:45`. Click it and the formatted string is on your clipboard.

## The problem with raw epoch values

Unix time is a wonderful storage format and a terrible reading format. It is compact, unambiguous, timezone-free and sorts correctly as a string. It is also completely opaque to a human being.

Which means the numbers show up everywhere you look:

- Application logs that log `Date.now()` or `time.time() * 1000` instead of a formatted string
- JSON API responses with `{"created_at":1789821105611}`
- `docker inspect` output, Kubernetes events, systemd journal entries
- Database rows where someone stored an integer column and moved on
- Build artifacts, cache headers, JWT `exp` claims, S3 object metadata

In every one of those cases you can see the number. You just cannot *read* it.

## Select it, read it

The whole feature is one gesture. Drag across the digits — or double-click the number — and the tooltip shows up:

```
$ tail -n1 app.log
{"ts":1789821105611,"msg":"ok"}
       ┌──────────────────────┐
       │ 2026/9/19 20:31:45 ⧉ │
       └──────────┬───────────┘
                  ▼
```

It is not a panel, not a modal, not a separate window. It is a tooltip that follows your mouse pointer and sits just above it, so your eyes never leave the line you were reading.

Three things make it work in practice:

- **It only reacts to the selection.** The tooltip appears when the terminal selection is a bare number, and disappears the moment you clear the selection. There is nothing to enable, no toggle, no shortcut to remember.
- **It stays out of the way.** The tooltip is rendered above the cursor position, so it never covers the digits you are looking at.
- **It disappears on mouse-out.** Move away and it is gone. You cannot get stuck in a state.

## What exactly gets recognised

Electerm does not guess at every string that looks numeric. It checks the length and the plausible range, which is what keeps the tooltip from firing on port numbers, PIDs, byte counts and line numbers.

| Digits | Interpreted as | Accepted range |
| --- | --- | --- |
| 9 or 10 | Unix **seconds** | `946684800` – `32503680000` (2000-01-01 → 3000-01-01) |
| 13 | Unix **milliseconds** | `946684800000` – `32503680000000` (same window, in ms) |

Anything else is ignored. That means:

- `1789821105611` → 13 digits → milliseconds → `2026/9/19 20:31:45`
- `1789821105` → 10 digits → seconds → same moment, rounded to the second
- `178982110561` → 12 digits → **nothing** (this is a microsecond value, and electerm will not pretend to know)
- `22` → nothing. It is a port number.

The range check is the quiet part of the design. `1234567890` is a perfectly valid 10-digit number, but it decodes to 2009, so it *does* trigger. A 13-digit `9999999999999` would be the year 2286 — also inside the window. But `1700000000000000000`, a nanosecond value, is 19 digits and will never produce a misleading answer.

## Copying the formatted time

Once the tooltip is up, clicking it copies the formatted string and hides the tooltip. There is a small copy icon on the right of the text as the visual affordance, but the entire tooltip is the hit area — you do not have to aim at the icon.

One implementation detail worth knowing, because it is the reason the click works at all: the copy happens on **mouse down**, not on click. Pressing a button over the terminal collapses the DOM selection, and the terminal drops its selection with it — which would unmount the tooltip before a `click` event could ever land. Handling `mousedown` and calling `preventDefault()` keeps the selection and the focus exactly where they were.

So the flow is: select → read → click → paste. And the formatted string you get is the one you would have produced by hand.

## Where this pays off

**Reading a log tail without breaking stride.** The most common case. You are watching a service, a line scrolls past with an epoch timestamp, and you want to know whether that was 30 seconds ago or 30 minutes ago.

```bash
$ tail -n1 app.log | jq -r '.ts'
1789821105611
```

**Confirming an expiry.** JWT claims, cache headers, session cookies, signed URLs — they all carry epoch values, and they all make you do arithmetic you do not want to do.

**Debugging "when did this actually happen".** Comparing a client-side timestamp against a server-side one is much easier when both are rendered as human time.

**Writing the reverse direction.** Need to generate a timestamp for a query? Select the formatted time you already have, and use a shell one-liner to convert back:

```bash
$ date -d '2026-09-19 20:31:45' +%s%3N
1789821105000
```

**Teaching a teammate.** Instead of explaining what `1789821105611` means in a chat message, select it, click, paste the readable version.

## Things worth knowing

- **The output format follows your system locale.** Electerm formats the date with your locale's rules. On a machine configured for `zh-CN` you get `2026/9/19 20:31:45`; on `en-US` you will see `9/19/2026, 8:31:45 PM`. The instant is identical, the presentation is not — which is exactly what you want when you are eyeballing it.
- **The value must be the whole selection.** The check is `^\d+$` against the trimmed selection. Selecting `{"ts":1789821105611` or `1789821105611,` will not match. Select just the digits.
- **Seconds and milliseconds are both handled, but nothing finer.** Microsecond and nanosecond values (16 and 19 digits) are deliberately out of scope, because guessing which unit an arbitrary long number uses would produce confident wrong answers.
- **It works in any terminal session.** Local shell, SSH, Telnet, serial port, a container — the tooltip is driven by the terminal selection, not by the shell, so it does not care what is on the other end of the connection.
- **Nothing is sent anywhere.** The conversion is a `new Date(...)` call in the renderer. No network, no service, no clipboard history.

## A small feature that removes a small friction

This is not the kind of feature you put on a landing page. It is the kind of feature you notice once, use forty times a week, and then miss badly in every other terminal you touch. Reading timestamps is one of those tiny, constant, unavoidable tasks of working on a server, and it is now one gesture instead of five.

If you have not tried it: open a session, run `node -e 'console.log(Date.now())'`, and select the output.
