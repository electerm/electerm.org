---
title: 'Electerm Theme Editor: Design a Theme, Watch It Repaint'
description: theme.electerm.org is a free browser editor for electerm themes — 33 colours, a live preview running the real electerm, AI generation from a sentence, cloud save with GitHub sign-in, and a public board of community themes you can copy in one click.
date: 2026-09-21
tags: [theme, editor, colors, customization, ai, sharing]
videos: [electerm-theme-settings-and-editing, electerm-usage-demo]
bannerScript: banner.js
---

# Electerm Theme Editor: Design a Theme, Watch It Repaint

Changing how electerm looks has always meant editing a list. Thirty-three lines of `key=value`, one wrong hex and the terminal is unreadable, and the only way to find out is to save it, apply it, and squint at the result.

[**theme.electerm.org**](https://theme.electerm.org) fixes the loop. It is a free theme editor in a browser tab: pick colours, watch a real electerm repaint as you pick them, then save the theme to the cloud and put it on a public board for other people to copy.

It is also one click away from inside the app — the theme settings form in electerm has a `https://theme.electerm.org` link in its top-right corner.

Feature video: [Electerm Theme Settings and Editing](/videos/electerm-theme-settings-and-editing/).

## What it actually is

|  |  |
|---|---|
| **URL** | [theme.electerm.org](https://theme.electerm.org) |
| **Cost** | Free |
| **Sign-in** | GitHub OAuth — only needed for AI, saving, publishing and liking |
| **Design without signing in** | Yes: the editor and the live preview are open |
| **What you edit** | 33 colours — 12 for the app UI, 21 for the terminal |
| **Preview** | A real electerm running at [demo.electerm.org](https://demo.electerm.org), driven live |
| **Save** | Up to 10 themes per account, published to a public board |

You do not need an account to try it. Open the page, drag colours around, watch the preview. Sign in when you want to keep something.

## Thirty-three colours, two groups

The theme editor splits them the way electerm does.

**UI colours — 12 of them.** `main`, `main-dark`, `main-light`, `text`, `text-light`, `text-dark`, `text-disabled`, and the five accents `primary`, `info`, `success`, `error`, `warn`. These paint the chrome: the tab bar, the session control bar, the footer, dialogs, buttons, status dots.

**Terminal colours — 21.** The terminal background, foreground and cursor; the selection background; and the sixteen ANSI slots, normal and bright — `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white` and their `bright*` twins. These are the colours `ls --color`, `git diff`, `htop` and every shell prompt actually use.

Two ways to set them, both in the same panel:

- **Colour picker** — a native colour input per key, with the key name under it. Fast for "this red is wrong".
- **Text editor** — the same `key=value` list electerm itself speaks, with `terminal:` prefixes, syntax highlighted. Fast for "shift every accent two steps warmer".

They are two views of one theme: change a swatch and the text updates, edit the text and the swatches move. Import a `.txt` and it fills both.

## The preview is the real app, not a mock

This is the part that makes the editor worth using. The preview pane is an iframe of [demo.electerm.org](https://demo.electerm.org) — an actual electerm client — and the editor talks to it over `postMessage`, handing the palette to the running app's store. The app registers it as a theme and switches to it, exactly as if you had picked a built-in one.

So what you are looking at is not an approximation of electerm. It is electerm, with your colours, including the parts a mock would get wrong: the tab count pill, the per-session control bar, the footer, the block cursor, how the ANSI palette reads against *your* background.

If the preview looks wrong, it will look wrong in the app.

## Or describe it and let the AI do the first draft

There is an **AI** tab. Type a sentence — *"a warm sunset over the desert, dark background with orange and pink accents"* — and it returns a complete palette: all 33 keys, filled in.

The generated result is not dropped in raw. It is parsed, then normalised against the schema: missing keys are filled from the defaults, invalid colour values are replaced, unknown keys are dropped, and the name is capped. A model that returns a malformed JSON blob with a stray code fence still produces a usable theme, which you then edit like any other.

Two honest notes. It needs you to be signed in. And the model runs on the same free endpoint the rest of electerm's AI uses, [ai.electerm.org](https://ai.electerm.org) — so it is a first draft, not a design system. Good for breaking the blank page, not for the last 10%.

## Saving, sharing, and the board

Sign in with GitHub and the editor grows a **Save** button and a **Share to Board** button. A theme is private until you publish it; publishing puts it on [the board](https://theme.electerm.org/themes/) with your GitHub name and avatar on it. Up to 10 themes per account.

The board is a gallery of what people have made, sorted by newest or by most liked. Each card shows a strip of the theme's colours, so you can scan a screen of them and know which ones you want. Open one and you get:

- **A live preview** of that theme, in the same real-electerm iframe.
- **Copy config** — the whole theme to your clipboard in electerm's own text format.
- **Download** — the same thing as a `.txt`.
- **Edit** — loads the theme into the editor so you can remix it, which is how most good themes get made.
- **Like**, and **share** out to Twitter or Facebook.

The 310 classic themes electerm ships with — the iTerm set — are listed there too, so the board is both a gallery and a reference shelf.

## Getting it into electerm

Three routes, all quick:

1. **Copy config → paste.** In the editor or on a theme's page, hit **Copy Config**. In electerm, open **Settings → Theme**, add or edit a theme, switch to the **text editor** tab, and paste. It validates the result before it will save.
2. **Download → import.** Hit **Download** on a theme page to get a `.txt`, then use **Import from file** in electerm's theme form. The name comes across with it.
3. **Edit from the app.** The theme form links straight to the editor, so you can go app → editor → back in one round trip.

One detail worth knowing on route 1: the site's copied text starts with a `themeName=` line, and electerm's text editor validates each key against the list it knows — `themeName` is not on it, so it will complain about an unsupported property. Paste from the second line down, and type the name into the theme name field. (Route 2 has no such problem.)

## Two things that will surprise you

- **electerm ties the terminal background to the UI `main` colour.** Save a theme in the app and it forces `terminal:background` to equal `main`. So if you set a dark terminal background and a lighter app background on the site, the app will flatten them. Design them as one colour, or accept that they will be.
- **Names are capped differently.** The site allows 50 characters; electerm's theme name field caps at 30. Keep names short and nothing gets truncated.

## The short version

- **[theme.electerm.org](https://theme.electerm.org)** is a free browser editor for electerm themes — 33 colours, live preview, cloud save, public board.
- **The preview is the real client**, not a mock: a live electerm driven over `postMessage`.
- **An AI tab** turns one sentence into a complete, validated palette — a first draft, not a finished theme.
- **Sign in with GitHub** to save (10 per account) and publish; browse and copy without an account at all.
- **Copy Config → paste into electerm's theme text editor**, skipping the `themeName=` line, or download the `.txt` and use Import from file.
- **Browse the board first** if you would rather not design from scratch — copy someone's theme and change what you dislike.

If you have not touched electerm's theme settings yet, the [introduction to electerm](/blogs/electerm-introduction/) is the place to start; if you want the AI side in more depth, see [AI features in electerm](/blogs/ai-features-guide/).
