---
title: 'Electerm Terminal Background: Images, Text, and Five Filters'
description: Put a photo, a URL, your own text, or the tab number behind a terminal — and dim, blur and desaturate it with five CSS filters so the text stays readable. Where the setting lives, what each mode actually paints, and two things that will surprise you (the WebGL renderer hides it, and half the labels are untranslated).
date: 2026-10-03
tags: [background, appearance, customization, images, filters, tips]
videos: [electerm-terminal-background-settings]
bannerScript: banner.js
---

# Electerm Terminal Background: Images, Text, and Five Filters

A terminal is a rectangle of text, and after a few thousand hours it is a boring one. Electerm lets you put something behind it: a photo, a wallpaper from a URL, your own text, or just the session number — then dial it down with five filters so the output in front stays readable.

The important part is what it does *not* do. This is not window opacity, and it is not the terminal theme's background colour. The image goes **behind** the text and leaves the text at full brightness — which is exactly why it is usable all day and window transparency is not.

## Where the setting is

Settings → **Terminal** → `Terminal background image`.

It is a single text field with a file picker (`choose file`) on the right, and it accepts four kinds of value:

| What you put in | What you get |
| --- | --- |
| a path, e.g. `/home/you/Pictures/dusk.jpg` | that image, read from disk |
| a URL, e.g. `https://example.com/dusk.jpg` | that image, loaded from the network |
| `[🚫]` | nothing — no background image at all |
| `[📝]` | your own text, drawn centred |
| empty (the default) | electerm's own watermark |
| `Index` / `🎨 RandomShape` | the session number / a generated pattern — **global settings only** |

The same field exists per bookmark, in the bookmark form, so one host can have its own wallpaper while the rest keep yours. More on that below, because it behaves differently from the global one in a way that will bite you.

## The five filters

Once the value is a real image, five number fields appear underneath. They are not sliders — they are antd number inputs with the label baked into the field, so each one reads `Opacity: 1`, `Blur: 0`, and so on.

| Field | Default | Range | Step |
| --- | --- | --- | --- |
| `Opacity` | `1` | 0 – 1 | 0.05 |
| `Blur` | `0` | 0 – 50 | 0.5 |
| `Brightness` | `1` | 0 – 10 | 0.1 |
| `Grayscale` | `0` | 0 – 1 | 0.05 |
| `Contrast` | `1` | 0 – 10 | 0.1 |

They are emitted as one CSS filter chain, in that order:

```css
filter: blur(6px) opacity(0.45) brightness(0.9) contrast(1.1) grayscale(0.6);
```

The defaults are all no-ops, which is the right call: drop a photo in and it renders at full strength, and you only reach for the filters when the photo is too loud behind your `kubectl get pods`.

Two practical recipes:

- **A bright photo.** `Opacity: 0.35`, `Grayscale: 0.5`. Nothing else. The photo becomes a texture and your green/red output keeps its meaning.
- **A busy photo.** `Blur: 12`, `Opacity: 0.5`. Blur is the one filter that makes text unambiguously easier to read, because it removes high-frequency detail that competes with glyph edges.

Note that the filters disappear from the panel when the value is `[🚫]`, `Index` or `[📝]` — there is nothing for them to apply to. That is deliberate, not a rendering glitch.

## What each built-in mode actually paints

**The default (empty value).** Electerm paints its own watermark — `images/electerm-watermark.png`, 766 × 266 — behind the active session in each layout pane. It is sized `min(100%, 766px) auto`, so it keeps its aspect ratio and scales down in a narrow split column instead of being cropped on both sides. If you have never set a background, this is what you have been looking at.

**`[🚫]` no background.** The watermark rule is not emitted at all, and the per-session rule writes an explicit `background-image: none` — explicit because a per-bookmark `[🚫]` has to beat a global image, and an empty rule would let it show through. This is the option to pick if you find the watermark distracting and do not want a replacement.

**`[📝]` text.** Opens a modal: the text itself (up to 500 characters), a font size (12–200, default 48), a colour (default `#ffffff`), and a font family (default `Maple Mono`). It is drawn centred in the pane, with newlines preserved, at `opacity: 0.3`. A single word like `PRODUCTION` at 120px is a genuinely good warning sign; a paragraph is not, because the line height and wrapping are not yours to control.

**`Index`.** Paints the session's tab number as the background — the same number as the pill in the tab bar — at `opacity: 0.1`, `font-size: 30vmin`, bold. In a four-pane layout it is the fastest way to tell which pane is which when your window manager has scrambled them.

**`🎨 RandomShape`.** Generates a 200 × 200 canvas at render time and uses it as a data URL. There are eight pattern generators — fluid dynamics, quantum wave, relativity field, fluid flow, particle physics, wave interference, string theory, quantum field — and it picks one at random with a random hue, saturation and lightness. Two things follow from how it is built:

- It is **regenerated every time the CSS is rewritten**, so it changes whenever you touch a background setting (and each pane in a split layout gets its own pattern, not one shared pattern).
- The base rule is `background-repeat: no-repeat` and the user-image branch sets `background-size: auto`, so a 200 × 200 canvas lands as a single tile in the middle of the pane rather than filling it.

## How it renders (the part worth knowing)

The mechanism explains most of the surprises, so it is worth three paragraphs.

xterm is handed a **transparent** terminal background — `background: 'rgba(0,0,0,0)'` — and `.xterm` and `.xterm-viewport` are forced transparent too. Electerm then injects its own stylesheet into the page and paints your image on `.xterm-screen::before`: absolutely positioned, full size, and `z-index: -1`, so it sits behind the text but in front of the pane's own background. That is the whole trick. Your text is never dimmed, because nothing is dimming it.

Local files are read over IPC and inlined as a data URL, so a `file://` path never appears in the DOM; a URL is used as-is. And because xterm thinks the background is transparent, its computed text-selection colour would be blended over transparent-black and come out wrong — so electerm recomputes the selection colour over the real visible background. If you configured an opaque selection colour, it stays opaque.

Two consequences you can observe from outside:

- **A shell that asks the terminal for its background colour gets the UI colour.** OSC 11 (`\e]11;?\a`) is answered with the theme's `main` UI colour, not the terminal palette's background — because the terminal palette's background is the thing being hidden. This was fixed in [#4407](https://github.com/electerm/electerm/issues/4407): TUI apps that query the background were getting the wrong colour under a light UI theme.
- **The WebGL renderer hides the image.** Settings → Terminal → `renderer type` offers `dom` and `webGL`. `dom` is the default and it is where backgrounds work. Under `webGL`, electerm hands xterm an opaque background instead of a transparent one, and xterm's WebGL addon has no transparency option — its canvas paints an opaque rectangle over the CSS layer. Verified by rendering both against the same DOM: the image is visible under `dom` and completely covered under `webGL`. If your background image "does not work", check this setting before anything else.

## Per-bookmark backgrounds, and the trap

Open a bookmark and scroll to `terminal background image`. It is the same field, but the dropdown only offers `default`, `[🚫]` and `[📝]` — `Index` and `🎨 RandomShape` are global-only, because they need to know about the whole tab set.

The trap: when you save a bookmark, electerm **deletes the entire background block if the image path is empty**. So a per-bookmark *text-only* background — `[📝]` with no image — is silently thrown away on save. You have to set an image path for the block to survive. If you want text backgrounds everywhere, set them globally.

The other thing to know is how the two levels combine. Per-bookmark values win — with one wrinkle. A saved bookmark carries all ten background properties, filled in from the app defaults for the ones you never touched, and the merge tests each property for truthiness. So a bookmark value of `0` reads as "not set" and the global value wins instead. In practice that means **`Blur` and `Grayscale` leak in from the global settings** (their defaults are `0`), while `Opacity`, `Brightness` and `Contrast` do not (their defaults are `1`, which is truthy). If you want per-bookmark filters to behave predictably, leave the global `Blur` and `Grayscale` at `0`, or set every bookmark's filters explicitly.

## The labels are half-untranslated

Worth knowing so you do not assume you are looking at a broken install. Ten of the strings this feature uses are not in the locale files — not in English, not in Chinese, not anywhere:

```
textBackground  index  randomShape  Opacity  Blur
Brightness  Grayscale  Contrast  terminalBackgroundText  enterTextForBackground
```

Electerm's translation lookup falls back to the key itself and capitalises the first letter. So the dropdown really does read `📝 TextBackground`, `Index` and `🎨 RandomShape`, and the filter fields really do read `Opacity`, `Blur`, `Brightness`, `Grayscale`, `Contrast` — in every language, including a Chinese UI. The keys simply were never added to `@electerm/electerm-locales`.

## Cheat sheet

- **Setting:** Settings → Terminal → `Terminal background image`; per-bookmark in the bookmark form.
- **Value:** a file path, an `https://` URL, `[🚫]` (none), `[📝]` (text), `Index` or `🎨 RandomShape` (global only), or empty for the watermark.
- **Filters:** `Opacity` 0–1, `Blur` 0–50, `Brightness` 0–10, `Grayscale` 0–1, `Contrast` 0–10 — emitted as one CSS filter chain, hidden for `[🚫]` / `Index` / `[📝]`.
- **Text background:** centred, `opacity: 0.3`, size 12–200, default font `Maple Mono`.
- **Do not set `renderer type` to `webGL`** if you want a background image — the canvas covers it.
- **Per-bookmark text-only backgrounds are dropped on save.** Set an image path, or set the text globally.

Next: [Window opacity](/blogs/window-opacity/) is the other way to make electerm less opaque — it fades the whole window including the text, which is a different trade from a background image. The [Theme editor](/blogs/theme-editor/) covers the terminal palette itself, and [Terminal image support](/blogs/terminal-image-support/) is about images *in* your output (sixel, iTerm inline images), not behind it.
