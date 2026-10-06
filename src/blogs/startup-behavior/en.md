---
title: 'What Opens When Electerm Starts: Default Tab, Bookmarks, or a Whole Workspace'
description: Three settings decide what electerm shows at launch — whether to open a default local terminal at all, which bookmarks to open, and whether to restore a saved workspace instead. Plus where the local shell actually starts, and the precedence order electerm follows.
date: 2026-10-02
tags: [startup, settings, bookmarks, workspace, local-terminal, productivity]
videos: [electerm-open-bookmarks-on-startup, electerm-set-local-startup-directory, electerm-session-layout, electerm-workspace]
featureVideo: electerm-open-bookmarks-on-startup
bannerScript: banner.js
---

# What Opens When Electerm Starts: Default Tab, Bookmarks, or a Whole Workspace

Launch electerm and something is already there: a local terminal tab, sitting in your home directory, waiting. That is the out-of-the-box behaviour, and for a lot of people it is exactly right.

For everyone else it is a small daily annoyance. If you open electerm to reach four production hosts, a local shell you never use is one wasted tab and one extra keystroke, every time. If you open it to run one command locally, being greeted by nothing at all is worse.

All of that is configurable, and the three controls live in two places. The banner above is the whole decision in one loop: the default local tab, then nothing, then a saved workspace.

## 1. The three knobs

| Setting | Where | Default | What it does |
|---|---|---|---|
| **open default tab when app start** | Settings → setting | **on** | When nothing else is configured, open a default tab at launch |
| **open bookmarks on startup** | Settings → setting | empty | Open a chosen set of bookmarks (or one workspace) at launch |
| **start directory:local** | Settings → terminal | empty | Starting path for the local side of SFTP panes |

Two of those are on the same settings screen, one after the other: the **open bookmarks on startup** picker sits near the top, and the **open default tab when app start** toggle is further down in the general toggle list.

## 2. The launch chain

The whole decision comes down to one question: *was anything configured for startup?* Electerm checks it in a fixed order, and the first branch that matches wins.

1. **A workspace was chosen** → load it. Layout, panes and sessions come back exactly as saved. The default tab is *not* opened.
2. **Bookmarks were chosen** → open each one. The default tab is *not* opened.
3. **Nothing was chosen** → open the default tab, but only if **open default tab when app start** is on.
4. **Nothing was chosen and the toggle is off** → open nothing. The window shows the empty state.

Note what is missing: there is no "and also" anywhere. These are alternatives, not layers. Choosing bookmarks suppresses the default tab; choosing a workspace suppresses both.

## 3. Turning the default local terminal off

This is the one people come looking for. In **Settings → setting**, find **open default tab when app start** and switch it off.

What you get at launch is an empty window with the "no session" panel: a row of buttons at the top (**new tab**, **new bookmark**, and **create bookmark by AI** if AI is configured), the electerm logo, and your connection history below it. Nothing is connected, nothing is consuming a shell, and the first thing you click is the thing you actually wanted.

Two things worth knowing about that toggle:

- It only governs the *default* tab. If you have bookmarks or a workspace configured for startup, the toggle is irrelevant — electerm never gets as far as looking at it.
- It is a per-machine setting stored in your config, so it syncs with your settings if you use data sync.

## 4. Opening bookmarks at launch

Back in **Settings → setting**, the section headed **open bookmarks on startup** has its own two tabs: **bookmarks** and **Workspaces**.

The **bookmarks** tab is a tree-select over your bookmark tree, and it is checkable — so you can tick individual bookmarks, or tick a whole group and get everything under it. What gets stored is a flat list of the individual bookmarks, not the group you ticked: picking a group saves its contents.

That matters in practice, and it is why the picker shows you the leaves. Reorder or rename the group later and the startup list keeps working, because it points at the bookmarks themselves rather than at the group.

This is the setting the video walkthrough below covers, and it is the right one when your startup set is *a few independent sessions* rather than a fixed arrangement. If you care about **which pane** each session lands in, you want a workspace instead.

## 5. Opening a workspace at launch

Same section, switch to the **Workspaces** tab, pick one from the dropdown. That is the whole configuration.

The two tabs are mutually exclusive by design, and switching between them clears the other side. Electerm can only follow one of the two startup branches, so it does not let you configure both at once — pick your workspace and any previously ticked bookmarks are discarded, and the reverse is true as well.

If the Workspaces tab is empty, you have not saved a workspace yet — that is done from the layout dropdown in the tab bar, not from Settings. See [Workspaces in Electerm](/blogs/workspace-feature/).

## 6. "Default tab" is not always one tab

A detail that surprises people who use a split layout: the default tab is created **once per pane**.

So if you last used a 2x2 grid, launching electerm with the default tab on gives you **four** local terminals, one per pane — not one.

| Layout | Panes |
|---|---|
| `c1` single | 1 |
| `c2` two columns | 2 |
| `c3` three columns | 3 |
| `r2` two rows | 2 |
| `r3` three rows | 3 |
| `c2x2` grid | 4 |
| `c1r2` two rows right | 3 |
| `r1c2` two columns bottom | 3 |

If four local shells at launch is not what you want, that is another reason to configure explicit startup sessions — or to use `c1` and let the layout restore later.

## 7. Where the local terminal actually starts

The local shell does not start in a directory you configure; it starts in your **home directory**, because that is what the process is spawned with.

To make it open somewhere else, electerm types a `cd` into the shell as the first startup script. Three things can supply that path, in this order:

| Source | Set by |
|---|---|
| The restored working directory | Only when **restore terminal session on reload** is on |
| The bookmark's own start directory | The bookmark's **start directory:remote** field |
| The command-line folder | The `-d` / `--init-folder` flag |

So the command-line flag is the one that changes where the *default* local terminal opens:

```bash
electerm -d ~/code/my-project
```

Two caveats on that flag:

- **It is skipped when startup sessions are configured.** The flag is only adopted when nothing is set to open at launch *and* the default tab is enabled. Configure bookmarks or a workspace at startup and `-d` silently stops applying to the default tab.
- **It is deliberately not local-only.** `-d` was added as "ssh/local terminal init folder", and it shows: the same `cd` is queued for any tab that has no start directory of its own — **SSH tabs included**. It is a `cd`, so a path that does not exist remotely fails harmlessly and the shell carries on. Because the value is never cleared, later tabs opened without a start directory of their own inherit it too.

The separate **start directory:local** setting is a different value. It is read as the starting path for the local half of an **SFTP** pane, and it is also what the `-d` flag writes into a session opened from the command line. It is not consulted when the local terminal picks its `cd`.

## 8. Three things that will bite you

**A configured startup list beats everything, silently.** Set bookmarks or a workspace at startup and both the default tab and `-d` stop doing anything. If launching electerm no longer opens your local shell, check that picker before anything else.

**A workspace with a deleted bookmark opens a gap.** Startup runs the same load path as clicking a workspace manually — a workspace entry pointing at a bookmark that no longer exists opens nothing and says nothing. If a workspace comes back one pane short, that is the cause.

**The startup setting holds two different kinds of value.** A list means bookmarks, a single workspace id means a workspace. This is why the picker's two tabs clear each other, and why hand-editing your config to put a workspace id in a list produces a startup with no tabs at all rather than a workspace.

## Where next

- [Workspaces in Electerm](/blogs/workspace-feature/) — what the workspace branch of the launch chain actually restores.
- [Electerm Session Layout](/videos/electerm-session-layout/) — the eight layouts, and why the default tab multiplies.
- [Custom data folder](/blogs/custom-data-folder/) — where these settings live on disk.
- [Data sync](/blogs/data-sync/) — how startup settings travel between machines.
