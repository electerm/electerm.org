---
title: 'Terminal + SFTP Split View in Electerm: One Click, Both Panes Together'
description: Classic tab view forces you to flip between terminal and SFTP. Electerm's split-view toggle in the session toolbar shows them side by side instead — plus the terminal setting that makes it the default, where the icon lives, and when to use each mode.
date: 2026-09-24
tags: [split-view, sftp, ssh, terminal, file-manager, productivity, tips]
videos: [electerm-terminal-and-sftp-split-view, electerm-sftp-path-sync-with-terminal, electerm-sftp-transfer-files-and-folders, electerm-session-layout]
featureVideo: electerm-terminal-and-sftp-split-view
bannerScript: banner.js
---

# Terminal + SFTP Split View in Electerm: One Click, Both Panes Together

You `ls` to see what is on the server, then switch tabs to drag a file, then switch back to untar it, then switch again to check it landed. Every flip costs a second and a context switch — and the filename you just read is already fading from memory by the time the file panel appears.

Electerm's fix is a single icon in the session toolbar: the **split-view toggle**. One click turns the classic terminal/SFTP tab switcher into a **split view** — terminal on one side, SFTP file manager on the other, same host, visible together. Watch the banner above — tab, click, split. That is the whole feature. And if you want it that way from the start, there is a matching toggle in **Settings → Terminal** so every new session opens already split. Both are covered below.

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

Split view mounts both panes at once:

```
[⧉ split view on]
+--------------+--------------+
|  terminal    |  SFTP        |
|  $ tar xzf  |  app/ logs/  |
|  app.tar.gz  |  app.tar.gz  |
+--------------+--------------+
```

Note what disappeared: the `SSH | SFTP` type tabs. In split mode there is nothing left to switch between, so the bar keeps only its icon row. The command and the files it touches are on screen together. This is the layout tools like MobaXterm, Xshell, WindTerm and Tabby popularised — and the reason electerm users rarely go back once they try it.

Local terminals split the same way. A local session shows **terminal | file manager** tabs instead, and split view pairs the local shell with the local file manager on the other half. What has no second pane at all is RDP, VNC, web, telnet, serial and FTP-only sessions — there the toolbar icon is not shown.

## Two ways to turn it on

**The setting — split by default.** Settings → Terminal → **show terminal and sftp in split view**. It ships off. Turn it on and every SSH or local session you open afterwards starts in split view; turn it off and they start tabbed. This is remembered across restarts, so it is the one to set once and forget.

**The toolbar icon — split this session.** The split-view icon in the session control bar flips the current tab between the two modes without reconnecting. It always wins for the tab it sits on: `web-01` can stay split while a serial console next to it stays full-width, and flipping the icon back to tab mode does not touch your global setting.

The two compose: the setting decides how a session *opens*, the icon decides what it *is*.

## Where the toggle lives

Look at the **session control bar** — the thin bar directly above the terminal pane, the one that starts with the `SSH | SFTP` type tabs. Right after the type tabs (when they are visible) comes the icon row:

1. paperclip — SFTP path follow terminal
2. **split-view — the toggle in this post** (two rectangles side by side)
3. heartbeat — keepalive, so the connection is not dropped when idle ([Session keepalive](/blogs/session-keepalive/))
4. broadcast — mirror input to all terminals
5. …wrap, fullscreen, search on the right

Click the split-view icon and the current session flips between tab mode and split mode **instantly, without reconnecting**. Click it again and you are back to tabs. The state is per session tab, so `web-01` can stay split while a serial console next to it stays full-width.

> The icon is only there when there is something to split: the session must have both SSH and SFTP enabled in its bookmark, and the session pane must be big enough (see below). On phones the icon is never shown — the `SSH | SFTP` tabs remain the way to switch.

## A first split in 30 seconds

1. Open any SSH bookmark that has SFTP enabled (or a local terminal).
2. Find the split-view icon in the session control bar (second icon after the paperclip).
3. Click it. The terminal gives up half the pane and the SFTP file manager takes the other half — to the right on a wide window, below on a tall one.
4. Drag the divider if you want the terminal wider. It opens at 50/50 and each side can be dragged from 20% to 80%.
5. Click the icon again. Back to full-width tabs.

No setting to save, no reconnect, no layout dialog. If you find yourself doing this for every session, flip the **show terminal and sftp in split view** setting in Settings → Terminal and skip step 3. Already-open sessions keep whatever mode they were in — the setting only shapes new ones.

## The split follows the shape of the window

Split view is not fixed as left/right. It looks at the shape of the session pane: a pane that is wide splits side by side, a pane that is tall splits top and bottom. So the same session is left/right on a wide monitor, stacked when you narrow the window or give the session a tall column in a multi-session layout.

It also needs room to be worth doing. A session pane narrower than 640px and shorter than 400px has nothing to gain from halving, so split view stays off there: the icon is hidden and the `SSH | SFTP` tabs keep working as usual. Widen the window, or give the session more space, and the icon comes back.

## When split view earns its keep

**Untar-and-verify.** `tar xzf release.tar.gz` on the left, watch `release/` appear on the right. No tab flip to confirm the extract worked.

**Edit-and-run.** Double-click `app.js` in the SFTP pane to edit it locally, save to upload, then `node app.js` or `systemctl restart app` is already one glance away on the left.

**Chasing disk usage.** `du -sh *` says `logs/` is 4 GB. The folder is already visible on the right — right-click, download or delete, done.

**Learning an unfamiliar box.** `cat docker-compose.yml` on the left while the project tree stays visible on the right. You stop `ls`-ing because the file panel *is* the `ls` — sorted, sized, clickable.

**Drag-and-drop without hunting.** Drag a local file into the SFTP pane while the terminal stays visible, then run the install command the moment the progress bar finishes. (On the terminal side, drag a file onto the terminal to upload it through trzsz or zmodem instead — Settings → Terminal → *drag and drop behavior* decides whether it asks.)

A bonus worth knowing: with split view on, the bottom toolbar stays with you — quick commands, command history and batch input remain available even when you click into the file pane, because the session still counts as an active terminal. In tab mode, switching to the SFTP tab hides them.

Tab mode still wins when space is tight: a narrow laptop screen, a `vim` session that wants every column, or an `htop` dashboard. That is exactly why it is a toggle and not a setting — flip per task, not per install. (And the setting covers the opposite case: per install, if split is simply how you work.)

## It pairs with path follow

Split view shows both sides. **SFTP path follow terminal** keeps them pointed at the same folder: `cd` in the shell moves the file panel, opening a folder in the file panel `cd`s the shell. The paperclip icon sits right next to the split-view icon for a reason — turn both on and you get one location, two views.

Full story: [SFTP Path Follow Terminal in Electerm](/blogs/sftp-path-follow-terminal/). If `cd` does not move the panel, check that post's troubleshooting list (shell must be bash/zsh/sh/ash, same-host panes, follow actually on).

## Split view vs session layout vs workspace

Three features with similar names, different jobs:

|  | Split view (this post) | Session layout | Workspace |
|---|---|---|---|
| **What it splits** | Terminal + SFTP *inside one session tab* | Multiple session tabs *across the window* (2x2 grid, columns, rows) | Everything — tabs + layout, saved by name |
| **Where** | Split-view icon in the session control bar, or Settings → Terminal | Layout controls / status bar | Workspaces panel |
| **Saved?** | The setting persists your default; each tab keeps its mode while open | Per window while open | Yes — one click restores tabs + layout, and which bookmark tabs were split |
| **Use with** | Always the starting point | Split two hosts side by side, then split-view each one's files | "Frontend + backend + db, all split" as one action |

Typical end state: a workspace called `prod` opens `web-01` and `db-01` in a 2-column session layout, each tab already in terminal+SFTP split view with path follow on. Morning routine becomes one click. Videos: [Electerm Session Layout](/videos/electerm-session-layout/), [Electerm Workspace](/videos/electerm-workspace/).

## Troubleshooting checklist

1. **No split icon?** Either the session has no second pane (local terminals do — web, RDP/VNC, telnet, serial and FTP-only sessions do not), or SSH/SFTP is switched off in the bookmark, or the pane is too small to halve (see above).
2. **Icon there but split does nothing?** The session pane is under 640px wide and under 400px tall, so split view falls back to the tabs. Make the window or the pane bigger.
3. **Split the wrong way round for you?** It follows the pane's shape: wide pane splits left/right, tall pane splits top/bottom. Resize the window to change it, or drag the divider to rebalance.
4. **SFTP pane empty or errors?** The SFTP subsystem failed — permissions, `Subsystem sftp` disabled server-side, or the connection dropped. Tab mode would fail the same way; split just makes it visible.
5. **Want split by default?** Settings → Terminal → **show terminal and sftp in split view**. Off by default; new sessions follow it, and the toolbar icon still overrides it per session.

## Cheat-sheet

- **Toggle** = split-view icon (two rectangles) in the session control bar, right after the paperclip. Click = tabs ↔ split. No reconnect.
- **Default** = Settings → Terminal → *show terminal and sftp in split view* (off by default). New sessions open that way; the icon still wins per session.
- **Direction** = wide pane → left/right; tall pane → stacked. Divider drags each side from 20% to 80%, opens at 50/50.
- **Needs room** = pane wider than 640px or taller than 400px; otherwise it stays tabbed and the icon hides.
- **Works on** = SSH sessions (terminal + SFTP) and local terminals (terminal + local file manager). Not on web, RDP/VNC, telnet, serial, FTP-only. Not on phones — use the tabs.
- **Best friend** = path-follow toggle next to it. Split shows both sides; follow keeps them in the same folder.
- **Scale up** with session layout (many tabs on screen) and workspaces (save the whole arrangement).

Next: [SFTP Path Follow Terminal](/blogs/sftp-path-follow-terminal/) for the sync that lives inside this layout, or [SFTP Transfer Files and Folders](/videos/electerm-sftp-transfer-files-and-folders/) once both panes are open and you want to move things.
