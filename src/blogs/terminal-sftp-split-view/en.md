---
title: 'Terminal + SFTP Split View in Electerm: One Click, Both Panes Together'
description: Classic tab view forces you to flip between terminal and SFTP. Electerm's split-view toggle in the session toolbar shows them side by side instead — where the icon lives, how tab vs split modes differ, and when to use each.
date: 2026-09-24
tags: [split-view, sftp, ssh, terminal, file-manager, productivity, tips]
videos: [electerm-terminal-and-sftp-split-view, electerm-sftp-path-sync-with-terminal, electerm-sftp-transfer-files-and-folders, electerm-session-layout]
featureVideo: electerm-terminal-and-sftp-split-view
bannerScript: banner.js
---

# Terminal + SFTP Split View in Electerm: One Click, Both Panes Together

You `ls` to see what is on the server, then switch tabs to drag a file, then switch back to untar it, then switch again to check it landed. Every flip costs a second and a context switch — and the filename you just read is already fading from memory by the time the file panel appears.

Electerm's fix is a single icon in the session toolbar: the **split-view toggle**. One click turns the classic terminal/SFTP tab switcher into a **side-by-side split view** — terminal on one side, SFTP file manager on the other, same host, visible together. Watch the banner above — tab, click, split. That is the whole feature.

Feature video: [Electerm Terminal and SFTP Split View](/videos/electerm-terminal-and-sftp-split-view/).

## Classic tabs vs split view

Out of the box, an SSH session with SFTP enabled looks like classic tabs. Above the terminal pane there are two type tabs — **SSH** and **SFTP** — and you see one at a time:

```
[ SSH | SFTP ]   <- type tabs, one pane visible
+----------------+
|  terminal      |
|  $ ls -la      |
+----------------+
```

Click **SFTP**, the terminal slides away and the file list takes its place. Click **SSH**, you are back. This is the same UX as PuTTY + WinSCP in one window, or two browser tabs: clean, maximum space for each side, but you can never *see* both.

Split view keeps both panes mounted at once:

```
[ SSH | SFTP ] [⧉ split on]
+--------------+--------------+
|  terminal    |  SFTP        |
|  $ tar xzf  |  app/ logs/  |
|  app.tar.gz  |  app.tar.gz  |
+--------------+--------------+
```

The command and the files it touches are on screen together. This is the layout tools like MobaXterm, Xshell, WindTerm and Tabby popularised — and the reason electerm users rarely go back once they try it.

## Where the toggle lives

Look at the **session control bar** — the thin bar directly above the terminal pane, the one that starts with the `SSH | SFTP` type tabs. Right after the type tabs comes the icon row:

1. paperclip — SFTP path follow terminal
2. **split-view — the toggle in this post** (two rectangles side by side)
3. heartbeat — server info / monitor
4. broadcast — mirror input to all terminals
5. …wrap, fullscreen, search on the right

Click the split-view icon and the current session flips between tab mode and split mode **instantly, without reconnecting**. Click it again and you are back to tabs. The state is per session tab, so `web-01` can stay split while a serial console next to it stays full-width.

> If you do not see the icon, the session has no SFTP pane to split with. Open an SSH bookmark with both `enableSsh` and `enableSftp` on — local shells, web tabs, RDP/VNC and serial sessions have nothing to split.

## A first split in 30 seconds

1. Open any SSH bookmark that has SFTP enabled.
2. Find the split-view icon in the session control bar (second icon after the paperclip).
3. Click it. The terminal shrinks to the left half, the SFTP file manager slides in on the right.
4. Click it again. Back to full-width tabs.

No setting to save, no reconnect, no layout dialog. If you like it split, just leave it — electerm remembers the per-tab choice while the tab is open, and workspaces remember the whole arrangement (more below).

## When split view earns its keep

**Untar-and-verify.** `tar xzf release.tar.gz` on the left, watch `release/` appear on the right. No tab flip to confirm the extract worked.

**Edit-and-run.** Double-click `app.js` in the SFTP pane to edit it locally, save to upload, then `node app.js` or `systemctl restart app` is already one glance away on the left.

**Chasing disk usage.** `du -sh *` says `logs/` is 4 GB. The folder is already visible on the right — right-click, download or delete, done.

**Learning an unfamiliar box.** `cat docker-compose.yml` on the left while the project tree stays visible on the right. You stop `ls`-ing because the file panel *is* the `ls` — sorted, sized, clickable.

**Drag-and-drop without hunting.** Drag a local file into the SFTP pane while the terminal stays visible, then run the install command the moment the progress bar finishes.

Tab mode still wins when space is tight: a narrow laptop screen, a `vim` session that wants every column, or an `htop` dashboard. That is exactly why it is a toggle and not a setting — flip per task, not per install.

## It pairs with path follow

Split view shows both sides. **SFTP path follow terminal** keeps them pointed at the same folder: `cd` in the shell moves the file panel, opening a folder in the file panel `cd`s the shell. The paperclip icon sits right next to the split-view icon for a reason — turn both on and you get one location, two views.

Full story: [SFTP Path Follow Terminal in Electerm](/blogs/sftp-path-follow-terminal/). If `cd` does not move the panel, check that post's troubleshooting list (shell must be bash/zsh/sh/ash, same-host panes, follow actually on).

## Split view vs session layout vs workspace

Three features with similar names, different jobs:

|  | Split view (this post) | Session layout | Workspace |
|---|---|---|---|
| **What it splits** | Terminal + SFTP *inside one session tab* | Multiple session tabs *across the window* (2x2 grid, columns, rows) | Everything — tabs + layout, saved by name |
| **Where** | Split-view icon in the session control bar | Layout controls / status bar | Workspaces panel |
| **Saved?** | Per-tab while open | Per window while open | Yes — one click restores tabs + layout |
| **Use with** | Always the starting point | Split two hosts side by side, then split-view each one's files | "Frontend + backend + db, all split" as one action |

Typical end state: a workspace called `prod` opens `web-01` and `db-01` in a 2-column session layout, each tab already in terminal+SFTP split view with path follow on. Morning routine becomes one click. Videos: [Electerm Session Layout](/videos/electerm-session-layout/), [Electerm Workspace](/videos/electerm-workspace/).

## Troubleshooting checklist

1. **No split icon?** The tab is not an SSH+SFTP session. Local terminal, web, RDP/VNC, serial and FTP-only bookmarks have no second pane to show.
2. **SFTP pane empty or errors?** The SFTP subsystem failed — permissions, `Subsystem sftp` disabled server-side, or the connection dropped. Tab mode would fail the same way; split just makes it visible.
3. **Too cramped?** That is tab mode's cue. Toggle back for full width, or widen the window — split panes share whatever width the tab has.
4. **Want split by default?** There is no global "always split" switch today. Open the bookmark, click once, and save it as part of a workspace if you want it restored automatically.

## Cheat-sheet

- **Toggle** = split-view icon (two rectangles) in the session control bar, right after the paperclip. Click = tabs ↔ side-by-side. No reconnect.
- **Tab mode** = one pane at a time (`SSH | SFTP` switcher), max space. **Split mode** = terminal + SFTP together, same host, no flipping.
- **Needs** an SSH bookmark with both SSH and SFTP enabled. Other session types have nothing to split.
- **Best friend** = path-follow toggle next to it. Split shows both sides; follow keeps them in the same folder.
- **Scale up** with session layout (many tabs on screen) and workspaces (save the whole arrangement).

Next: [SFTP Path Follow Terminal](/blogs/sftp-path-follow-terminal/) for the sync that lives inside this layout, or [SFTP Transfer Files and Folders](/videos/electerm-sftp-transfer-files-and-folders/) once both panes are open and you want to move things.
