---
title: 'Workspaces in Electerm: Save a Layout and Its Sessions, Restore Them in One Click'
description: A workspace stores the split layout plus the bookmarks open in each pane, so a 2x2 grid of production hosts comes back with one click — how saving, loading and deleting work, what is and is not captured, and how to make a workspace the thing electerm opens on launch.
date: 2026-10-02
tags: [workspace, layout, split-view, productivity, sysadmin, workflow]
videos: [electerm-workspace, electerm-session-layout, electerm-open-bookmarks-on-startup, electerm-bookmark-operations]
featureVideo: electerm-workspace
bannerScript: banner.js
---

# Workspaces in Electerm: Save a Layout and Its Sessions, Restore Them in One Click

Every morning the same ritual: open electerm, switch to a 2x2 layout, then open `web-01`, `web-02`, `db-01` and `cache-01` into the four panes in the right order. Nothing about that is interesting, and nothing about it is hard — it is just four clicks and a layout switch you have now performed several hundred times.

A **workspace** is electerm's answer to that: a named preset that holds *both* the layout and the set of connections that were open inside it. Click it and the window becomes that arrangement again.

The banner above is the whole feature in one loop: build a 2x2 grid, save it as `prod-web` from the layout dropdown, then click `prod-web` and watch the grid come back.

## 1. What a workspace actually stores

Saving a workspace does not snapshot your terminal scrollback or your shell state. It records exactly three things — the layout, which bookmark sits in which pane, and whether that pane was split into a terminal plus SFTP:

- **The layout** — one of the eight layout keys, the same ones the layout menu uses: `c1` (single), `c2`, `c3` (columns), `r2`, `r3` (rows), `c2x2` (grid), `c1r2` (two rows right) and `r1c2` (two columns bottom).
- **The pane contents** — stored per pane index, and each pane holds a *list* rather than a single entry. So a pane can have several stacked tabs and the workspace remembers which one was in front.
- **The split state** — a pane you had split into terminal + SFTP comes back split. This was added later than the feature itself (v3.15.120): a workspace saved before that simply has no record of it, which reads as "not split".

## 2. What does *not* get saved

**Only tabs opened from a bookmark are captured.** That is the whole rule.

| Tab opened from | Saved? |
|---|---|
| A bookmark in the sidebar | Yes — by bookmark |
| Quick connect | No |
| A local terminal / "new tab" | No |
| A web, VNC, RDP, Spice or serial tab | No |
| An SFTP tab | Only as the split-view half of a bookmark tab |

The reason is that a workspace stores a *reference*, not a connection. Bookmarks are stable, so restoring is "open bookmark X in pane 2". A quick-connect session has nothing to point at, so there is nothing to restore.

The practical consequence: if your daily setup includes a local shell, put that local shell in a bookmark too (a bookmark with no host is a perfectly valid local-terminal bookmark), and it will be part of the workspace like anything else.

## 3. Saving

The entry point is not in Settings — it is the **layout dropdown in the tab bar**, on the right-hand side. It is the icon that shows your *current* layout with a caret next to it, so a 2x2 layout shows a 2x2 grid glyph.

1. Set the layout you want (same dropdown, **layout** tab).
2. Open the bookmarks you want, in the panes you want them in.
3. Reopen the dropdown and switch to the **Workspaces** tab.
4. Press **save** — the full-width button at the top of the list.
5. In the dialog, choose **Save as new** and give it a name, or **overwrite** and pick an existing workspace from the dropdown.

`Save as new` always creates a fresh entry with a new id. `overwrite` keeps the target's id *and* its name — the name field is ignored on that path, because electerm reuses the stored name. If you want the same arrangement under a new name, use **Save as new**.

Saving also stamps the entry as just-updated, but that does not reorder the list — new entries are appended, and the rest keep their existing order.

## 4. Loading

Click a workspace in the list. That is it — there is no confirmation dialog, and no undo.

Loading does four things in order: it closes every open tab, switches to the workspace's layout, opens each stored bookmark into its recorded pane, and then restores the terminal/SFTP split on any pane that had one.

Two behaviours follow from that first step, and both surprise people once:

- **Loading is destructive.** Everything currently open closes first — including tabs that were never part of any workspace. If you were three commands into something, save it elsewhere before clicking a workspace.
- **A workspace is a preset, not a snapshot.** Loading it always produces the same thing, regardless of what you had open. It does not merge.

## 5. Deleting

Hover a workspace row and a delete icon fades in on the right. Click it, confirm the `delete?` popconfirm, and the entry is gone. Deleting a workspace never touches the bookmarks it references — it removes the preset, nothing else.

## 6. Making a workspace the thing electerm opens

This is where workspaces pay for themselves. In **Settings → common**, near the top, there is a section headed **open bookmarks on startup** with two tabs of its own:

- **bookmarks** — a tree-select where you tick bookmarks (and groups) to open at launch.
- **Workspaces** — a single-select of your saved workspaces.

Pick a workspace there and electerm loads it at startup: same layout, same panes, same sessions, before you have touched the mouse.

The two tabs in the picker are mutually exclusive, because the startup setting holds one value that can mean either thing — a set of bookmarks, or a single workspace. Switching tabs clears the other value so the two cannot conflict. There is a separate post on that whole startup chain: [What Opens When Electerm Starts](/blogs/startup-behavior/).

## 7. Where workspaces live, and how they travel

Workspaces are a normal collection in electerm's local database, sitting next to bookmarks and themes. That means:

- They are included in **data sync**, alongside your bookmarks, so a workspace saved on the laptop shows up on the desktop.
- They are included in **import/export**, and in the sync-comparison dialog, which lists workspaces as its own row.
- They survive a reinstall if you keep your data folder — see [Moving Electerm's Data Folder](/blogs/custom-data-folder/).

## 8. Three things that will bite you

**A deleted bookmark leaves a silent hole.** A workspace entry pointing at a bookmark that no longer exists opens nothing, with no warning. The pane just stays empty. If a workspace comes back one pane short, check whether that bookmark still exists.

**Overwriting does not rename.** As above, `overwrite` reuses the stored name. If you want the same arrangement under a new name, use **Save as new**.

**A workspace only covers bookmark tabs.** It is not a session-restore feature. If you want the *terminal state* (scrollback, current directory) back after a reload, that is the separate **restore terminal session on reload** setting, and it works on the tab you had, not on a saved arrangement.

## Where next

- [What Opens When Electerm Starts](/blogs/startup-behavior/) — the startup chain a workspace plugs into.
- [Terminal and SFTP Split View](/blogs/terminal-sftp-split-view/) — the per-pane split state a workspace also stores.
- [Bookmarks, Quickly](/blogs/bookmark-quick-connect/) — since every workspace entry points at one.
- [Electerm data sync](/blogs/data-sync/) — how workspaces move between machines.

The upstream wiki page for this feature is [Workspace Feature](https://github.com/electerm/electerm/wiki/Workspace-Feature). One caveat if you read it: its "Managing Workspaces in Settings" section describes a Settings → Workspace tab that does not exist in the current app — the settings modal has no Workspaces tab. Manage them from the layout dropdown in the tab bar.
