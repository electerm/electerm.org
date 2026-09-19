---
title: 'Batch Input and Mirror Input in Electerm: Type Once, Drive Many Terminals'
description: Two ways to send the same keystrokes to many sessions in electerm — mirror input, which broadcasts everything you type into the active terminal to every other terminal pane, and batch input, where you tick tabs in the footer, press Enter once, and the command lands everywhere you picked.
date: 2026-09-19
tags: [batch-input, mirror-input, broadcast, ssh, productivity, sysadmin]
videos: [electerm-batch-and-mirror-input-to-multiple-terminals, electerm-batch-operations, electerm-session-layout, electerm-workspace, electerm-quick-commands]
featureVideo: electerm-batch-and-mirror-input-to-multiple-terminals
banner: /blogs/batch-and-mirror-input/banner.png
---

# Batch Input and Mirror Input in Electerm: Type Once, Drive Many Terminals

Restarting the same service on four hosts, checking a log on six app servers, running `df -h` everywhere because one node is acting strange — the commands are identical, only the machines differ. Opening four terminals and typing the same line four times is not work, it is typing practice.

Electerm has two distinct tools for this, and they are not interchangeable:

- **Mirror input** (the UI calls it *"mirror input to all terminals"*) — a toggle in the terminal's control bar. While it is on, everything written to the **active** terminal is replayed to **every other terminal pane** in the window.
- **Batch input** — the small **batch input** box in the footer. Click it, tick the tabs you care about, type one command, press Enter. It goes to exactly those tabs, once.

Feature video: [Electerm Batch and Mirror Input to Multiple Terminals](/videos/electerm-batch-and-mirror-input-to-multiple-terminals/).

> **Read this first**: both features send real input to real machines, with no confirmation dialog and no undo. Everything below assumes you can name, out loud, every host that is currently receiving your keystrokes. The safety section at the bottom is not optional reading.

## 1. The two features side by side

|  | Mirror input | Batch input |
|---|---|---|
| **Where** | Icon in the session control bar (top-right of the terminal pane), tooltip *"mirror input to all terminals"* | The **batch input** box in the footer |
| **What is sent** | Every write to the active terminal's socket — typed characters *and* pasted text | One line of text, submitted with Enter |
| **Recipients** | All other tabs whose pane is a terminal — you cannot pick a subset | Exactly the tabs you tick (with `All` / `None` shortcuts) |
| **Lifetime** | Stays on until you toggle it off; state is per session tab | One shot — the panel collapses as soon as you press Enter |
| **History** | None | Last 30 unique commands, kept locally |
| **Best for** | Interactive, exploratory, "watch it happen everywhere" work | Firing one specific command at one specific set of hosts |

If you remember one sentence: **mirror input is a mode, batch input is a message.**

## 2. Mirror input — a live broadcast from the active terminal

Open a bookmark, then look at the icon row at the top-right of the terminal pane. The broadcast icon (the little hierarchy/org-chart glyph) is off by default. Click it, and it highlights to show it is active.

From that moment, anything you type into *this* tab is also written to every other tab in the window that is a terminal pane. SFTP panes, web tabs, RDP/VNC sessions and other non-terminal panes are skipped — only real terminals receive the stream.

That makes this workflow possible:

1. Open `web-01`, `web-02`, `web-03`, `web-04` as four tabs.
2. Switch to `web-01`, enable mirror input.
3. Type `sudo systemctl restart nginx` and press Enter.
4. All four restart nginx. You watch four outputs scroll at once.

Because the broadcast hooks the socket write rather than the keyboard, a **paste is mirrored too**. Copying a block of setup commands from your notes and pasting it into the active terminal runs it on the whole set.

**When mirror input is the wrong tool**

- You want *some* of the open terminals, not all of them. Mirror input has no per-tab selection — that is batch input's job.
- Your command can behave differently per host. If host 2 asks a confirmation question and the others do not, the duplicated keystrokes desynchronise and you are now typing blind into a mismatched prompt.
- Any command that needs an interactive UI — `vim`, `top`, a `mysql` REPL, `ssh` into a further host — will render in every pane and fight itself.

Keep mirrored commands non-interactive, idempotent, and short enough that you can still read the output when four of them scroll past.

## 3. Batch input — one command, a tick-list of hosts

Batch input lives in the footer, at the bottom of the window. Click the **batch input** box and it expands into a panel with two parts: a multi-line textarea, and a list of your terminal tabs.

In that list:

- Each tab is a toggle button showing its position and title. A ticked tab has a check icon.
- The tab you are currently on is marked with a `*`.
- `All` and `None` select or clear everything at once.
- Only terminal tabs appear. Web, RDP and VNC tabs are not listed, because they cannot take terminal input.

Now type the command and press Enter. The command is sent to every ticked tab and the panel collapses.

```
df -h /
```

That is the whole interaction. Practical notes:

- **The selection is sticky.** When you reopen the panel, electerm drops tabs that no longer exist and keeps the rest of your previous ticks. If nothing valid is left, it falls back to the current tab. Convenient — and the single easiest way to accidentally hit a host you forgot was still ticked. Glance at the list every time.
- **History.** The last 30 unique commands you submitted are remembered locally, so `docker ps` or `systemctl status app` is one click away next week. Nothing leaves your machine.
- **Mobile.** On small screens the trigger collapses to a compact **B** button that opens the same panel.
- **It is a one-liner.** Batch input sends one line. For a multi-line script, chain it (`a && b && c`) or use the batch operation widget described below.

## 4. Choosing between them

| Your situation | Use |
|---|---|
| Four identical web nodes, one restart command | **Mirror input** — you get to see all four outputs live |
| Eight terminals open, but only the three staging ones may be touched | **Batch input** — tick three, leave five alone |
| You want to keep poking at the fleet after the command finishes | **Mirror input** — it stays on until you turn it off |
| You want one command, then back to normal single-terminal work | **Batch input** — it is inherently one-shot |
| Same set of hosts, same sequence, every Monday morning | **Batch operation widget** — a JSON workflow with progress tracking, also runnable as `electerm -bo workflow.json` ([wiki](https://github.com/electerm/electerm/wiki/batch-operation)) |

The batch operation widget is the third sibling in this family and worth knowing about: it connects to hosts, runs commands, transfers files over SFTP, and reports per-step progress from a JSON definition. Use it when the task should be repeatable rather than improvised. See also the [Electerm Batch Operations](/videos/electerm-batch-operations/) video.

## 5. Recipes

**Rolling restart across a pool** — mirror input, one command:

```bash
sudo systemctl restart nginx && systemctl is-active nginx
```

`is-active` on every host gives you a per-host verdict without leaving the broadcast on for long.

**Verify time sync before a deploy** — batch input, `date -u`. If one host is minutes off, you want to know before the release, not after.

**Tail logs on the app tier** — batch input, then read each tab:

```bash
tail -n 50 /var/log/app/error.log
```

**Check who is eating disk** — batch input, `du -xh --max-depth=1 /var | sort -h | tail -5`.

**Kill a stuck worker everywhere** — mirror input with a narrow pattern:

```bash
sudo pkill -f 'stuck-worker --queue=default'
```

**Push a config tweak and reload** — mirror input, so the reload output of all hosts lands in one place:

```bash
sudo install -m 644 /tmp/app.conf /etc/app/app.conf && sudo systemctl reload app
```

## 6. Safety rules that actually matter

Multi-host input is a loaded tool. Four habits keep it safe:

1. **Name the recipients before you type.** With mirror input, the recipients are "all other terminal panes". With batch input, they are "whatever is ticked". If you cannot list them, do not press Enter.
2. **Never mix roles.** Do not keep the primary database, the load balancer and the app nodes as tabs in one window while mirror input is on. Split the fleet into separate windows per role, or use batch input with an explicit tick list.
3. **Non-interactive only.** No editors, no pagers, no REPLs, no commands that ask a question. If the command needs a human to answer per host, it is not a mirror/batch command.
4. **Turn mirror input off when you are done.** It is per-tab state and easy to forget; the next thing you type goes everywhere too. Batch input has no such footgun — but it does remember your tab selection.

A useful pattern: keep a dedicated "fleet" window for mirrored work, and do your single-host debugging in a different window. The mode then cannot leak into the wrong session.

## 7. Combining with the rest of electerm

- **Workspaces** save the layout *and* the tab list, so "the four web nodes in a 2x2 grid" is one click. Pair a workspace with mirror input and your fleet window is always one action away. Video: [Electerm Workspace](/videos/electerm-workspace/).
- **Session layout** gives you the split panes (2x2 grid, columns, rows) that make mirrored output readable instead of a tab hunt. Video: [Electerm Session Layout](/videos/electerm-session-layout/).
- **Quick commands** store the one-liners you run constantly, so they are a click rather than a retype. Video: [Electerm Quick Commands](/videos/electerm-quick-commands/).
- **SFTP panes** stay out of the way — they never receive mirrored input, so you can keep a file manager open next to a broadcasting terminal.

## Cheat-sheet

- **Mirror input** = a mode. Toggle the broadcast icon in the terminal control bar. Everything you type or paste goes to all other terminal panes until you switch it off.
- **Batch input** = a message. Click the footer box, tick tabs, type one line, Enter. Remembered history, sticky selection, no per-host confirmation.
- **Batch operation widget** = a script. JSON workflow, progress per step, runnable from the CLI.
- Rule of thumb: *exploring* → mirror, *targeting* → batch, *repeating* → batch operation.

Next: [Workspaces and session layout](/blogs/electerm-introduction/) for arranging the fleet in the first place, or [SSH in Electerm](/blogs/ssh-features-guide/) if the terminals you are mirroring into still need setting up.
