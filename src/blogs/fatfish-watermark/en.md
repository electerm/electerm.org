---
title: 'Fatfish Terminal Watermark - A New Widget on widgets.electerm.org'
description: Fatfish Terminal Watermark replaces electerm's built-in white wordmark with the 大肥鱼 whale-girl sprite. Two artwork styles, four settings, installed from widgets.electerm.org at a pinned commit with per-file sha256 verification. Covers install, options, custom backgrounds and the artwork's fan-art licence.
date: 2026-11-16
tags: [widgets, watermark, terminal, customization, registry]
banner: https://cdn.jsdelivr.net/gh/electerm/electerm-widget-fatfish-watermark@61ae2ec00218457ebebf6bb83fcb8bf33df6be7c/assets/source-front.png
bannerScript: banner.js
---

# Fatfish Terminal Watermark: a new widget in the registry

electerm paints a faint white `electerm` wordmark behind the terminal text. On a dark theme it is a
quiet bit of branding; on a light theme it is almost invisible. If you would rather have something
with a bit more character there, the newest entry on
[widgets.electerm.org](https://widgets.electerm.org/widget/fatfish-watermark/) is for you.

**Fatfish Terminal Watermark** replaces that wordmark with 大肥鱼 — the blue-haired whale-girl that
grew out of the DeepSeek community. It is a widget, so it installs and runs from
**Settings → Widgets** instead of asking you to edit electerm. Two artworks ship with it, four knobs
control how it looks, and stopping it leaves no trace.

<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start;margin:1.5em 0">
  <div style="flex:1 1 220px;min-width:0">
    <img src="https://cdn.jsdelivr.net/gh/electerm/electerm-widget-fatfish-watermark@61ae2ec00218457ebebf6bb83fcb8bf33df6be7c/assets/source-front.png" alt="The original 大肥鱼 chibi sprite, blue hair and a white headdress" style="width:100%;max-width:235px">
    <div><small>Original PNG — the untouched source sprite (255 × 340), the default.</small></div>
  </div>
  <div style="flex:1 1 220px;min-width:0">
    <img src="https://cdn.jsdelivr.net/gh/electerm/electerm-widget-fatfish-watermark@61ae2ec00218457ebebf6bb83fcb8bf33df6be7c/assets/fatfish-pixel-art.png" alt="The same character as chunky eight-colour pixel art" style="width:100%;max-width:235px">
    <div><small>Colour pixel art — the same character, reduced to an eight-colour grid.</small></div>
  </div>
</div>

Both images are served straight from the widget's own repository through jsDelivr, pinned to the
same commit the registry hashed — nothing is copied into electerm.org.

## 1. What you are installing

| | |
| --- | --- |
| Name | Fatfish Terminal Watermark |
| Widget id | `fatfish-watermark` |
| Version in the registry | 1.4.0 |
| Package | 14 files, 210,198 bytes (about 205 KB) |
| Needs | electerm **5.11.8** or newer |
| Licence | MIT for the code; MIT for the sprite, with attribution |

It is an **instance widget**: it does not add a panel or a button to your terminal, it just runs
quietly and paints the watermark. The registry currently indexes **9 widgets** in the build stamped
`2026-11-16T00:21:05.611Z`; this is the only one that changes the terminal's artwork.

## 2. Install from the Online tab

Open **Settings → Widgets → Online**, find *Fatfish Terminal Watermark* and press **Install**. The
confirmation dialog shows the version, author, repository, the full 40-character commit and the file
count before anything is downloaded. electerm then fetches that exact commit, hashes all 14 files and
only copies the widget into place if every hash matches the registry digest.

The pinned commit for this build is:

```
electerm/electerm-widget-fatfish-watermark#61ae2ec00218457ebebf6bb83fcb8bf33df6be7c
```

That string is also what the registry's **Copy install** button gives you. Paste it into
**Settings → Widgets → Import** for electerm-web, an offline machine, or simply as a shortcut. The
Import path does not check the per-file digest; use the Online tab when you want the verification.
Using the bare repository name without the `#sha` pulls the default branch instead of the pinned
commit.

> **Version check.** Widgets have been in electerm since 5.6.10 and the Online tab since 5.10.0.
> This one uses a newer way of applying widget styles, which arrived in **5.11.8** — on an older
> build it will install but fail to start.

## 3. Turn it on

**Settings → Widgets → Fatfish Terminal Watermark → Start widget**. The watermark appears behind the
text in every terminal pane; windows opened afterwards get it too. To take it off, press **Stop**
under **Running instances**.

Leave **Apply on launch** on and electerm adds the widget to its auto-run list, so it comes back at
every start. Turn that off if you only want it for this session.

## 4. The four settings

| Option | Default | What it does |
| --- | --- | --- |
| Artwork style | Original PNG | The untouched sprite, or the eight-colour pixel version. |
| Opacity (%) | 20 | Strength, clamped to 5–60 and drawn at 1.4× (20 → 28%). |
| Height (%) | 78 | Height relative to the terminal pane; width follows the artwork. Clamped to 30–95. |
| Apply on launch | on | Re-apply on every launch via electerm's auto-run list. |

Two details worth knowing. The original is never scaled past its own 340 px height, so a tall window
cannot turn it into a blur; the pixel version is generated at 510 × 680 and is meant to scale. And
only the style you choose is loaded, so switching to the pixel version keeps the injected stylesheet
small — about 12 KB instead of about 201 KB.

## 5. It stays out of your way

The watermark only replaces the **default** background. If you set your own terminal background —
an image, a text watermark, a tab index, or "no background" — electerm stops drawing its wordmark,
and the widget stops drawing too. It does not overwrite your choice, does not write to
**Settings → Common → Custom CSS**, and does not change any terminal-background setting. The only
things electerm stores are the widget's own form values and its auto-run entry.

The stylesheet belongs to the running instance: **Stop**, deleting the widget or quitting the app
removes it cleanly, with no leftover rule in the next session. It sits behind the text at 28%
opacity by default, so it never competes with your prompt. Because the widget does not depend on
the desktop runtime, the same folder works in electerm-web as well.

Want to compare before committing? The repository ships a
[preview page](https://github.com/electerm/electerm-widget-fatfish-watermark/blob/main/preview.html)
that shows both styles and a no-watermark baseline across six terminal themes. Open it in a browser;
no install needed.

## 6. Where the artwork comes from

大肥鱼 is **community fan art**, not an official DeepSeek asset. The sprite is an MIT-licensed chibi
illustration from [1190fasheqi/dafeiyu-pet](https://github.com/1190fasheqi/dafeiyu-pet); the pixel
version is a derivative reduced to a 51 × 68 grid of eight flat colours. The character's credits,
the upstream licence and the attribution that must be kept are written up in the repository's
[NOTICE.md](https://github.com/electerm/electerm-widget-fatfish-watermark/blob/main/NOTICE.md).

It is an unofficial, non-commercial fan-art watermark. If you redistribute the artwork — in a theme
pack, a screenshot set or a product — read that NOTICE first; brand and character rights are separate
from the MIT grant on the sprite file.

## 7. The usual widget caveat

A widget's code runs inside electerm's main process with full Node privileges: it can read files,
use the network and run commands. The registry's per-file hashes prove you got the bytes the author
published at that commit; they do not prove the author is trustworthy. Open the **View source at this
commit** link in the install dialog, or browse the
[repository](https://github.com/electerm/electerm-widget-fatfish-watermark), before confirming.

## 8. Try it

1. Update to **electerm 5.11.8** or newer.
2. Open **Settings → Widgets → Online** and install *Fatfish Terminal Watermark*.
3. Press **Start widget** and look at a terminal pane. Then set **Artwork style** to *Colour pixel
   art* and try **Opacity** 35 to see how far you can push it.
4. Set a custom background image in **Settings → Terminal → Terminal background image** and watch
   the watermark quietly step aside; switch back to the default and it returns.
5. Press **Stop** under **Running instances** when you want the plain wordmark back.

- Widget page: [widgets.electerm.org/widget/fatfish-watermark](https://widgets.electerm.org/widget/fatfish-watermark/)
- Source and artwork notice: [electerm/electerm-widget-fatfish-watermark](https://github.com/electerm/electerm-widget-fatfish-watermark)
- How the registry verifies files: [widgets.electerm.org: find a widget, verify every file](/blogs/widgets-registry/)
- Widget basics: [User Widgets: your own panel, without touching the app](/blogs/user-widgets/)
