---
title: 'Window Opacity in Electerm: See Through Your Terminal'
description: One number in electerm settings (macOS and Windows desktop app only) makes the whole app window translucent, so you can read a doc, watch a dashboard, or copy a command from the app behind it — without switching windows. Where the slider lives, what it really does, and when to turn it back up.
date: 2026-09-24
tags: [opacity, transparency, appearance, customization, productivity, tips]
bannerScript: banner.js
---

# Window Opacity in Electerm: See Through Your Terminal

You are typing a long command and the flags are in a browser tab behind the terminal. Or you are following a runbook in a PDF while working in SSH. So you do the dance: terminal, browser, terminal, browser — Alt-Tab four times for one line.

Electerm has a one-number answer for that: **window opacity**. Turn it down and the whole electerm window goes translucent, background apps showing straight through it. Watch the banner above — that is the entire feature.

This is one of electerm's small features on purpose. It does one thing, it is one setting, and on the days you need it you will wonder why every terminal does not have it.

## Where the slider lives

Settings → **Settings** → `opacity`.

- **Range:** `0` to `1`, in steps of `0.05`.
- **Default:** `1` — fully opaque, exactly what you have now.
- **Effect:** live. Drag it down and the window fades in place; drag it back to `1` and it is solid again. No restart, no reconnect, your sessions never notice.
- **macOS and Windows desktop app only.** The field is hidden in the web version (`electerm-web` / `demo.electerm.org`) — a browser tab cannot make its own window translucent, so there is nothing to set. It does not work on Linux either.

Practical starting points: `0.85` is "barely see-through, still comfortable for hours". `0.7` is the sweet spot for copying from behind. Below `0.5` the terminal itself gets hard to read — useful for a minute of monitoring, not for a day of work.

## What it really does

It dims **everything**, not just the background:

- The setting is stored as `config.opacity` (default `1`, see `src/client/common/default-setting.js` and `src/app/common/default-setting.js`).
- The renderer applies it as one CSS rule on the whole app root (`src/client/components/common/opacity.jsx`):

```css
#outside-context {
  opacity: 0.7 !important;
}
```

- At the same time it flips the page and the Electron window background to transparent (`html`/`body` → `transparent`, `setBackgroundColor('#33333300')` over IPC in `src/app/lib/ipc.js`), so whatever is behind the window is what you actually see. At `1` it restores the solid `#333333` background and removes the rule entirely.
- The window itself is created translucent-capable (`transparent: true` in `src/app/lib/create-window.js`). Transparent-window compositing is only supported on macOS and Windows — that is why the feature only works there.

The honest consequence: **text fades too**. This is whole-window opacity, not background-only transparency. A terminal background image keeps your text at full brightness; opacity does not — at `0.6`, your shell output is at 60% as well. That is the trade, and it is why the recommended values stay high.

## When it pays off

**Copying flags from a doc behind you.** Drop to ~`0.7`, read the browser through the terminal, type the command once. Back to `1` when you are done.

**Following a runbook.** Steps in a wiki, commands in SSH. No more memorising step 4 while you Alt-Tab to the terminal.

**Watching something while you work.** A dashboard, a build progress bar, a video call's shared screen — leave it behind electerm at `0.75` and both stay visible.

**Small screens.** On a 13" laptop there is no room for side-by-side. Translucency is side-by-side without the window management.

## Limits and honest warnings

- **It is the whole window or nothing.** Title bar, tab bar, dialogs, menus — all fade together. There is no "terminal only" mode. If you want a dimmed background with bright text, use a **terminal background image** instead; that feature is per-terminal and leaves the text alone.
- **Low values hurt readability.** Below ~`0.5`, syntax colours wash out and thin fonts disappear first. If you stream or screenshot, your viewers will suffer before you do.
- **Click-through is not included.** See-through does not mean click-through — mouse events still land on electerm. You still have to Alt-Tab to actually interact with the app behind.
- **macOS and Windows only — no Linux.** A composited transparent window also costs more GPU than a solid one. If the window flickers or the desktop shows through oddly, back to `1` is always a safe state.
- **Do not park it low.** Opacity is a mode for a task, not a theme. Finish the copy-paste, drag it back. Future you, reading logs at midnight, will thank present you.

## Cheat-sheet

- **Setting:** Settings → Settings → `opacity`, `0`–`1`, step `0.05`, default `1`.
- **`1`** = solid. **`0.85`** = subtle. **`0.7`** = read-through. **Below `0.5`** = monitoring only.
- **Fades everything**, text included — that is what makes it different from a terminal background image.
- **macOS and Windows desktop app only** — no Linux, hidden in the web app.
- **Rule of thumb:** turn it down for one task, turn it back to `1` when the task is done.

Next: [Electerm introduction](/blogs/electerm-introduction/) for the layout you are making translucent, or the [Theme editor](/blogs/theme-editor/) if what you actually want is a better-looking solid window rather than a see-through one.
