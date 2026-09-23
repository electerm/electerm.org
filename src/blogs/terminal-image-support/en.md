---
title: 'Show Images Right Inside the Electerm Terminal'
description: Turn on "support terminal image" for a bookmark and electerm renders pictures inline — SIXEL, iTerm inline images and Kitty graphics via @xterm/addon-image. Where the toggle lives, which commands to try, and what to know about performance.
date: 2026-09-23
tags: [terminal, images, sixel, iterm, kitty, ssh, tips]
videos: [electerm-usage-demo, electerm-terminal-keyword-highlighting, electerm-auto-copy-on-select]
bannerScript: banner.js
---

# Show Images Right Inside the Electerm Terminal

You `ls` a folder full of screenshots on a remote box and get filenames. Is `hero-final-v2-REALLY.png` the right one? The normal answer is a detour: download it over SFTP, open it locally, delete it afterwards — or start a browser-based preview, or just guess.

Electerm can skip the detour. Turn on **support terminal image** for that bookmark and pictures render **inline, in the scrollback**, right where the command ran — like the banner above. No download step, no second app.

It works through `@xterm/addon-image`, the same addon upstream xterm.js ships for this job. That means three wire protocols, not one:

- **SIXEL** — the DEC-era bitmap protocol (`ESC P ... ESC \`), still the lingua franca of terminal graphics
- **iTerm inline images (IIP)** — the `OSC 1337` protocol `imgcat` uses
- **Kitty graphics (TGP)** — partially supported, still marked WIP upstream

If the program on the other end speaks any of the three, electerm draws it.

## Turn it on (per bookmark)

The toggle is **per bookmark, not global** — graphics decoding costs memory, so only sessions that need it pay for it.

1. Open the bookmark for editing (bookmarks panel → right-click → edit, or new bookmark).
2. For **SSH** bookmarks: find the **SSH settings** section and flip **support terminal image** on. For **local terminal** bookmarks: it sits in the **auth** tab.
3. Save and **reconnect**. The image addon loads once, when the terminal is created (`src/client/components/terminal/mixins/term-init.js`), so an already-open tab needs a reconnect to pick it up.

Under the hood that is:

```js
if (tab.enableTerminalImage) {
  const ImageAddon = await loadImageAddon()
  this.imageAddon = new ImageAddon({
    pixelLimit: 33554432
  })
  term.loadAddon(this.imageAddon)
}
```

`pixelLimit: 33554432` caps a single image at ~32M pixels; everything else (SIXEL scrolling, palette, storage FIFO, placeholder for evicted images) stays at the addon defaults. The addon is lazy-loaded — if the toggle is off, the code is never even downloaded.

## Try it: three one-liners

You do not need to install anything exotic to see it work. Pick the protocol your tooling already speaks.

**SIXEL with chafa** — the quickest smoke test on most Linux boxes:

```bash
chafa -f sixel logo.png
```

Alternatives that emit SIXEL: `lsix`, ImageMagick (`convert logo.png sixel:-`), gnuplot with `set term sixel`, or anything built on libsixel.

**iTerm inline images with imgcat** — the `imgcat` shell script just base64-encodes the file into an `OSC 1337` sequence, so this works over plain SSH with no server-side support:

```bash
imgcat ./screenshots/hero-final-v2-REALLY.png
```

Supported formats here are PNG, JPEG, GIF and QOI (no animation — the first frame is drawn). The image scales past the viewport if you ask it to (`width=200%`), and the cursor lands on the first cell of the next line, so follow-up output reads naturally.

**Kitty graphics with icat:**

```bash
kitty +kitten icat photo.jpg
```

Kitty support in the addon is still WIP upstream, so expect the basics to render and the exotic sub-commands to silently no-op.

If you see escape garbage (`^[[?1;2S`, `q#0;2;...`) instead of a picture, the toggle is off or the tab has not been reconnected since you flipped it.

## What it feels like in practice

**Checking remote assets without SFTP round-trips.** `imgcat` five candidates, pick the winner, done. The image stays in the scrollback, so `Shift+PageUp` still finds it later.

**Previewing plots where they are computed.** A training script that dumps a SIXEL chart, a gnuplot session, a `chafa` thumbnail strip of a dataset — the picture appears next to the numbers that produced it, on the machine that produced them.

**Reading docs with diagrams over SSH.** Man pages cannot do this, but modern CLI tools can embed architecture sketches and screenshots directly in `--help` or status output.

Cursor behaviour is worth knowing: with SIXEL scrolling on (the default), an image at the bottom of the viewport pushes the screen up and the cursor lands at the first column of the last image row (VT340 mode). IIP images leave the cursor at the next cell of the last image line. Either way, the next prompt starts in a sane place.

## Things worth knowing

- **It is opt-in for a reason: memory.** Image decoding happens in JavaScript and holds full RGBA buffers while it works. The 32M-pixel cap plus the addon's FIFO image storage (with placeholder pattern for evicted scrollback images) keep one tab sane — but ten tabs of 4K screenshots still add up. Leave the toggle off where you do not need it.
- **Large pastes bypass batching.** Electerm's session server forwards chunks over 16 KB unbatched so multi-megabyte image sequences cannot desync the parser. You do not need to configure this; it is why a 5 MB `imgcat` does not garble the prompt that follows it.
- **Keyword highlighting stays out of the way.** The highlight addon skips any write containing a DCS sequence (`ESC P`), so highlighted keywords never corrupt an in-flight SIXEL stream.
- **Not the same as terminal background image.** The background image setting paints a watermark behind the text. This feature draws real image output *as* terminal content — selectable scrollback, resizable with the font, cleared with the screen.
- **Resize behaviour.** Images already on screen reshape on font rescale to keep their cell coverage. On terminal resize they may expand right if they were right-truncated; they never grow downward if they were bottom-truncated.
- **Security note.** Image sequences can query terminal metrics (the addon enables `CSI 14/16/18 t` size reports by default). On a normal dev box that is harmless and is what lets tools size images to your window — but if you live in a hostile-output threat model, keep the toggle off.

## A terminal that can see

Most terminal features are about text — fonts, colours, search, highlighting. This one is about admitting that sometimes the answer is not text. A thumbnail, a chart, a screenshot: rendering it where the command ran removes a whole class of "download it and look" interruptions.

If you have not tried it: edit one bookmark, flip **support terminal image** on, reconnect, and run `chafa -f sixel` on anything.
