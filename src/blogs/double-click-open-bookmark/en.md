---
title: 'Open a Bookmark on Double Click: One Setting for File-Manager Muscle Memory'
description: Electerm opens a session on a single click, so a habitual double click fires the action twice. A new setting makes the sidebar wait for the second click — in the bookmarks and history lists, with groups, Enter and touch devices deliberately left alone.
date: 2026-10-07
tags: [settings, bookmarks, sidebar, history, productivity, tips]
videos: [electerm-bookmark-operations]
bannerScript: banner.js
---

# Open a Bookmark on Double Click

In electerm, a click on a bookmark is not a selection. It is the whole action: the session opens, the tab appears, the sidebar retracts. That is fast, and if you came from a terminal-only world it is exactly right.

Then there is everyone else. Every file manager, every IDE file tree, every browser's bookmark manager, Windows Explorer, the Finder's list view — you click once to *point at* something and twice to *open* it. People with that habit never click a bookmark in electerm once. They click it twice, every time, and the second click goes somewhere they did not mean.

There is now a setting for that: **open bookmark on double click**.

## What the setting changes

It lives in **Settings → setting**, in the general toggle list, and it ships **off**. Nothing changes until you ask for it.

| Gesture | Setting off (default) | Setting on |
| --- | --- | --- |
| single click on a bookmark | **opens the session** | marks the row, opens nothing |
| double click on a bookmark | the first click already opened it — the second lands behind the panel | **opens the session** |
| single click on a history row | opens a session from that history entry | marks the row, opens nothing |
| single click in the settings bookmarks tab | selects the bookmark for editing | unchanged |
| single click on a group row | expands / collapses it | unchanged |
| Enter on the highlighted row | opens it | unchanged |
| tap on a touch device | opens it | unchanged — the setting is ignored |

Only the first three rows differ. Everything below them is deliberate.

## Why the second click costs something

Electerm does not merge two sessions that point at the same host: every click on a bookmark adds a tab. So what a habitual double click actually costs depends on one thing — whether your sidebar is pinned.

**Unpinned (the default).** The first click opens the session and the panel retracts immediately; there is no width animation to click through. Your second click therefore lands on whatever is behind the panel. Usually that is the terminal, where it merely focuses it. Sometimes it is a tab, or the SFTP file list, where it is a genuine unintended click.

**Pinned.** A pinned panel stays open, so both clicks land on the row and you get the same host opened twice, in two tabs.

Either way the cure is the same: make the list wait for a deliberate second click before it connects.

## The history list is where it hurts most

The history panel is a browsing surface in a way the bookmark list is not. You open it to find the host you used last week, you scroll, you click around while you look — and with the setting off every one of those clicks launches a session. It is also the list where each row carries its own action icons, so the row is busy at the exact end where a cursor tends to sit.

The setting covers history as well as bookmarks, which is why it is one switch and not two.

## What it deliberately does not touch

**The settings bookmarks tab.** Settings → bookmarks is an editing surface, not a launcher. A single click there still selects the row so you can edit it, and Enter still selects rather than opens. The setting is about the sidebar.

**Groups.** A category row toggles open and closed on a single click, so a double click would toggle it twice and land back where it started. Electerm ignores the double click on a group row entirely — click a category once and it still expands.

**Enter.** Keyboard activation is deliberate by definition, so Enter opens the highlighted bookmark even with the setting on. Keyboard-only navigation loses nothing.

**Touch.** Touch has no double click, so the setting is skipped and a tap opens the session, as before.

## The touch rule follows the pointer, not the device

Electerm tracks the input you are actually using rather than what the hardware is capable of. A touchscreen laptop counts as a mouse machine — the setting applies — until a real touch or pen event arrives, at which point it switches to tap-to-open. Reach for the mouse again and it switches back. A convertible does not get stuck in the wrong mode, and you do not have to think about which one it thinks it is.

## Cheat-sheet

- In the sidebar, one click is the whole action. If your hands expect two, turn on **open bookmark on double click** (Settings → setting, off by default).
- It applies to the **sidebar bookmarks list** and the **history list** — the two places a click launches something.
- It never applies to the **settings bookmarks tab** (an editor), to **groups** (one click toggles), to **Enter**, or to **touch**.
- With the panel **pinned**, a stray double click opens the host twice. Unpinned, the second click lands on whatever is behind the panel.
- The touch exception follows the pointer live, so a hybrid device behaves like whichever input you just used.

Next: [Bookmarks first in electerm](/blogs/bookmark-quick-connect/) for why every connection is a bookmark in the first place, or [What opens when electerm starts](/blogs/startup-behavior/) if you would rather skip the sidebar entirely at launch.
