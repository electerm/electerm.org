---
title: 'Electerm Terminal Background: Images, Text, and Five Filters'
description: Put a photo, a URL, your own text, or the tab number behind a terminal — and dim, blur and desaturate it with five filters so the text stays readable. Where the setting lives, what each mode actually paints, and two things that will surprise you (the WebGL renderer hides it, and half the labels are untranslated).
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

Once the value is a real image, five number fields appear underneath. They are not sliders — they are number inputs with the label baked into the field, so each one reads `Opacity: 1`, `Blur: 0`, and so on.

| Field | Default | Range | Step |
| --- | --- | --- | --- |
| `Opacity` | `1` | 0 – 1 | 0.05 |
| `Blur` | `0` | 0 – 50 | 0.5 |
| `Brightness` | `1` | 0 – 10 | 0.1 |
| `Grayscale` | `0` | 0 – 1 | 0.05 |
| `Contrast` | `1` | 0 – 10 | 0.1 |

They are applied in that order, as one chain: blur, then opacity, then brightness, then contrast, then grayscale.

The defaults are all no-ops, which is the right call: drop a photo in and it renders at full strength, and you only reach for the filters when the photo is too loud behind your `kubectl get pods`.

Two practical recipes:

- **A bright photo.** `Opacity: 0.35`, `Grayscale: 0.5`. Nothing else. The photo becomes a texture and your green/red output keeps its meaning.
- **A busy photo.** `Blur: 12`, `Opacity: 0.5`. Blur is the one filter that makes text unambiguously easier to read, because it removes high-frequency detail that competes with glyph edges.

Note that the filters disappear from the panel when the value is `[🚫]`, `Index` or `[📝]` — there is nothing for them to apply to. That is deliberate, not a rendering glitch.

## What each built-in mode actually paints

**The default (empty value).** Electerm paints its own watermark behind the active session in each layout pane. It keeps its aspect ratio and scales down inside a narrow split column instead of being cropped on both sides. If you have never set a background, this is what you have been looking at.

**`[🚫]` no background.** The watermark is not drawn at all. This is also the option to pick if you find the watermark distracting and do not want a replacement — and a per-bookmark `[🚫]` beats a global image, so you can switch the background off for one host.

**`[📝]` text.** Opens a modal: the text itself (up to 500 characters), a font size (12–200, default 48), a colour (default `#ffffff`), and a font family (default `Maple Mono`). It is drawn centred in the pane at 30% opacity, with newlines preserved. A single word like `PRODUCTION` at 120px is a genuinely good warning sign; a paragraph is not, because the line height and wrapping are not yours to control.

**`Index`.** Paints the session's tab number as the background — the same number as the pill in the tab bar — very faint and very large. In a four-pane layout it is the fastest way to tell which pane is which when your window manager has scrambled them.

**`🎨 RandomShape`.** Generates a pattern at render time. There are eight generators — fluid dynamics, quantum wave, relativity field, fluid flow, particle physics, wave interference, string theory, quantum field — and it picks one at random with a random hue, saturation and lightness. Two things follow:

- It is **regenerated every time you touch a background setting**, and each pane in a split layout gets its own pattern rather than one shared pattern.
- It lands as a single small tile in the middle of the pane rather than filling it.

## Two things you can observe from outside

- **A shell that asks the terminal for its background colour gets the UI colour.** TUI apps that query the terminal's background are answered with the theme's UI background, not the terminal palette's background — because the terminal palette's background is the thing being hidden. This was fixed in [#4407](https://github.com/electerm/electerm/issues/4407): under a light UI theme, apps that queried the background were getting the wrong colour.
- **The WebGL renderer hides the image.** Settings → Terminal → `renderer type` offers `dom` and `webGL`. `dom` is the default and it is where backgrounds work. Under `webGL` the renderer paints an opaque canvas over the background layer. Verified by rendering both against the same page: the image is visible under `dom` and completely covered under `webGL`. If your background image "does not work", check this setting before anything else.

## Per-bookmark backgrounds, and the trap

Open a bookmark and scroll to `terminal background image`. It is the same field, but the dropdown only offers `default`, `[🚫]` and `[📝]` — `Index` and `🎨 RandomShape` are global-only, because they need to know about the whole tab set.

The trap: when you save a bookmark, electerm **deletes the entire background block if the image path is empty**. So a per-bookmark *text-only* background — `[📝]` with no image — is silently thrown away on save. You have to set an image path for the block to survive. If you want text backgrounds everywhere, set them globally.

The other thing to know is how the two levels combine. Per-bookmark values win — with one wrinkle. A saved bookmark carries all ten background properties, filled in from the app defaults for the ones you never touched, and the merge tests each property for truthiness. So a bookmark value of `0` reads as "not set" and the global value wins instead. In practice that means **`Blur` and `Grayscale` leak in from the global settings** (their defaults are `0`), while `Opacity`, `Brightness` and `Contrast` do not (their defaults are `1`, which is truthy). If you want per-bookmark filters to behave predictably, leave the global `Blur` and `Grayscale` at `0`, or set every bookmark's filters explicitly.

## The labels are half-untranslated

Worth knowing so you do not assume you are looking at a broken install. Ten of the strings this feature uses were never translated — not into English, not into Chinese, not into anything:

`📝 TextBackground`, `Index`, `🎨 RandomShape`, `Opacity`, `Blur`, `Brightness`, `Grayscale`, `Contrast`, plus the text-background dialog's own two labels.

When electerm has no translation for a string it falls back to the internal name and capitalises the first letter. So the dropdown really does read `📝 TextBackground`, `Index` and `🎨 RandomShape`, and the filter fields really do read `Opacity`, `Blur`, `Brightness`, `Grayscale`, `Contrast` — in every language, including a Chinese UI.

## Cheat sheet

- **Setting:** Settings → Terminal → `Terminal background image`; per-bookmark in the bookmark form.
- **Value:** a file path, an `https://` URL, `[🚫]` (none), `[📝]` (text), `Index` or `🎨 RandomShape` (global only), or empty for the watermark.
- **Filters:** `Opacity` 0–1, `Blur` 0–50, `Brightness` 0–10, `Grayscale` 0–1, `Contrast` 0–10 — applied as one chain, hidden for `[🚫]` / `Index` / `[📝]`.
- **Text background:** centred, 30% opacity, size 12–200, default font `Maple Mono`.
- **Do not set `renderer type` to `webGL`** if you want a background image — the canvas covers it.
- **Per-bookmark text-only backgrounds are dropped on save.** Set an image path, or set the text globally.

Next: [Window opacity](/blogs/window-opacity/) is the other way to make electerm less opaque — it fades the whole window including the text, which is a different trade from a background image. The [Theme editor](/blogs/theme-editor/) covers the terminal palette itself, and [Terminal image support](/blogs/terminal-image-support/) is about images *in* your output (sixel, iTerm inline images), not behind it.
