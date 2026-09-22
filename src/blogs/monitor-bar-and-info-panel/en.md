---
title: 'Monitor Bar and Info Panel: Watch a Server Without Typing top'
description: A 28px strip above the footer samples CPU, memory, disk, network and uptime over the SSH connection you already have open — and the info panel docks the same machine into the right sidebar. How to turn both on, and how to read the numbers they give you.
date: 2026-09-22
tags: [monitor, ssh, server, performance, disk, info-panel, productivity]
videos: [electerm-view-ssh-server-info, electerm-session-layout, electerm-terminal-and-sftp-split-view]
featureVideo: electerm-view-ssh-server-info
bannerScript: banner.js
---

# Monitor Bar and Info Panel: Watch a Server Without Typing `top`

You are staring at a deploy. The log has not moved for forty seconds and you want to know *why*: is the box out of memory, is the disk full, is the network the bottleneck, or is it just slow? The honest answer costs a context switch. `htop` — read it — `q`. Then `df -h`. Then `uptime`. Three commands, and one of them is a full-screen TUI that takes over the pane you were reading.

Electerm answers that question in the chrome instead of in your scrollback. A **28 pixel strip above the footer** samples the machine every few seconds *over the SSH connection you already have open*, and a **right-side info panel** shows the same machine in full when the strip is not enough.

## Two ways in, one machine

Both surfaces read the same data, produced by the same monitor, on the same session. They differ in how much of it they show and where they put it.

| | Monitor bar | Info panel |
| --- | --- | --- |
| Where | 28px strip above the footer, spanning the terminal | right sidebar, 500px (pinnable) |
| Opened by | Settings → Terminal → **monitor bar** | the chart icon in the footer |
| Sessions | SSH only | any session, including a local terminal |
| Shape | nine glanceable items | full tables, sections you choose |
| While open | — | the bar hides, to avoid showing the same thing twice |

## Turning the bar on

Settings → Terminal → **monitor bar**. It ships **off**, deliberately: the bar runs commands on the remote host every few seconds, and electerm does not poll a server you did not ask it to poll.

Once it is on, an SSH tab carries a strip that reads like a sentence about that host:

```
web-01   CPU 37%  ⣀⣠⣠⣀   Mem 3.2 GiB / 15.6 GiB   ↑ 1.2 MiB/s   ↓ 4.6 MiB/s   Up 12d 06h   zxd +2   /:43% /home:18% /var:91%
```

That is the hostname, current CPU load, five minutes of CPU history as a sparkline, memory in use out of memory installed, upload and download rate on the primary interface, uptime, who is logged in, and the usage percentage of the first three filesystems. All of it, without leaving the pane.

### What each item costs

The bar is a set of small `POSIX shell` probes, not an agent you install. This is the complete list of what can run:

| Item | What you see | Refresh | What runs on the server |
| --- | --- | --- | --- |
| hostname | `web-01` | once | `uname -s -n -r -m` + `PRETTY_NAME=` from `/etc/os-release` |
| cpu | `CPU 37%` | 5s | two `grep '^cpu ' /proc/stat` samples, 100ms apart |
| cpuHistory | the sparkline | 5s | the same sample, kept as history |
| memory | `Mem 3.2 GiB / 15.6 GiB` | 5s | `cat /proc/meminfo` |
| upload | `↑ 1.2 MiB/s` | 5s | `tx_bytes` from `/sys/class/net/*` |
| download | `↓ 4.6 MiB/s` | 5s | `rx_bytes` from the same probe |
| uptime | `Up 12d 06h` | 5s | `cat /proc/uptime` |
| users | `zxd +2` | 30s | `who` |
| disks | `/:43% /home:18% /var:91%` | 10s | `df -Pk` |

Note the intervals: CPU, memory, network and uptime change constantly and are read every five seconds; the disk table every ten; who is logged in every thirty; and the kernel and OS strings once per session, because they cannot change under a running session. That is also why the bar is cheap — the whole point is that it is not a monitoring daemon.

## The controls are not there until you need them

Sweep the mouse over the bar and two controls fade in on the right: a **filter** (choose which of the nine items exist for you) and a **close** button that turns the bar off, exactly as the setting does. Move away and they are gone, so the strip stays a strip.

On a touch device there is no hover, so the controls are simply always on — same idea, different input.

## Green, amber, red — with a dead band

Values are colour-coded, and every disk mount gets its own level:

| Level now | normal again | warning | critical |
| --- | --- | --- | --- |
| normal | — | ≥ 80% | ≥ 90% |
| warning | < 75% | 75–89% | ≥ 90% |
| critical | < 80% | 80–84% | ≥ 85% |

The asymmetry is the interesting part. A straightforward threshold would flip the colour every time load hovered on 80%, and a bar that blinks between white and amber while you are reading it is worse than no bar at all. So dropping back takes five points of margin: once the level is `warning`, it only returns to normal below 75%, and once it is `critical` it hangs on until load is genuinely down (below 85%).

A warning or critical item also grows a small triangle in front of its value, so a red `/:91%` in a corner still catches your eye when you are not looking directly at it.

## Click any item for the real answer

Hovering an item opens a popover; click it and the popover pins so you can read without holding the mouse still. Escape closes it. Inside is where the bar stops being a glance and starts being a tool.

**cpu** — current, average, minimum and maximum over the last five minutes, drawn as a 360×88 sparkline, followed by the top ten processes by CPU: PID, user, CPU, memory and the command line, ellipsised. Every row has a kill button, so "which runaway process is eating the box, and stop it" is one popover, no `htop`.

**memory** — used with its percentage, available, total, and swap used against its total. If the kernel is older than `MemAvailable` (3.14), the numbers come from `MemFree` and the popover says **compatibility memory** rather than quietly giving you a worse number.

**upload / download** — a per-interface table: name, IPv4 address, current rate, and the total counters since boot. The interface holding the default route is marked with `*`, because that is the one the bar is summarising. On a wide window you also get the sent/received totals; on a narrow one the table drops to the columns that fit.

**uptime** — how long the box has been up, and the boot moment as a wall-clock timestamp, which is usually the thing you actually wanted ("did it reboot last night?").

**users** — one row per login session: user, TTY, login time, and the source address you came from.

**disks** — one row per mount: percentage, used, available, total and filesystem, with the percentages coloured by the levels above.

**hostname** — hostname, address, OS, kernel, architecture, and the shell with its version.

Two small things that make this usable in a hurry: **clicking a value cell copies it** (and a finished text selection wins over the click, so drag-selecting inside a cell never clobbers your clipboard), and at the bottom of every popover there is an **info** button that hands you off to the panel.

## The info panel: the same machine, in full

The panel opens from the chart icon in the terminal footer, and it is **per session** — switch tabs and it shows that tab's machine, not a global dashboard.

It is an overlay by default: 500px wide, starting below the window chrome and **stopping above the footer**, because the footer holds the very icon that toggles it. A full-height overlay would bury its own trigger. Pin it and it becomes a dock instead: the terminal is squeezed out of the way and the panel owns the right column top to bottom.

The top of the panel is the terminal's own detail, not the server's:

```
ID: 4f1c2a7e-...
[ ] save terminal log to file
    [ ] addTimeStampToTermLog
    terminal log path: ~/electerm-logs/web-01.log   [reveal]
[sections ▾]
```

The session ID, the log-to-file switch, the timestamp switch (which only appears once you are saving a log — a timestamp on a log you are not writing is noise), the resolved path with a button to reveal it in your file manager, and the section filter.

Below that, the sections you selected, always in the same order regardless of the order you toggled them — `hostname` first, then the rest:

| Section | Contents |
| --- | --- |
| hostname | hostname, address, OS, kernel, arch, shell |
| uptime | uptime, boot time |
| cpu | current / average / min / max, chart, top processes |
| mem | used, available, total, swap |
| activities | full process table, sorted by CPU or memory |
| network | every interface, rates and totals |
| disks | every mount, not just the first three |
| users | every login session |

The default selection is uptime, cpu, mem, activities, network and disks; `users` is off until you ask for it. An older `swap` entry in your saved config is folded into `mem`, so you never end up with the same numbers twice.

## Local terminals get a different section

A local shell has an operating system too, but on macOS and Windows there is no `/proc` to read. So for a local tab the hostname section is resolved **locally, through the app**, with no shell command sent anywhere: `macOS 15.1`, `Windows 11 (10.0.22631)`, `Linux 6.8.0-45-generic`, plus hostname, kernel, architecture and the configured shell with its version (probed with `<shell> --version`, or `$PSVersionTable.PSVersion` on Windows PowerShell).

What you do not get locally is the metrics — CPU, memory, disk. Those are read from `/proc` and `/sys` on a Linux host, which is exactly what the panel is for. This is also why the monitor bar is SSH-only: there is no local machine to monitor the same way.

## When the panel is open, the bar steps aside

Open the info panel on an SSH tab and the monitor bar disappears. It is not a bug and not a space problem: the two surfaces read the same monitor, so showing both is duplication — and the panel's bottom edge lands precisely where the 28px strip lives, so it would be showing through. The bar also hides while a modal is open, so it never competes with a dialog for the same corner.

Close the panel and the strip is back, with its history intact — the CPU sparkline does not restart.

## What is actually happening on the wire

None of this opens a second connection, and none of it touches your shell:

- Every probe is a **separate exec request on the SSH connection you already have**. Nothing is typed into the interactive shell, nothing appears in your scrollback, and nothing ends up in your shell history.
- Each command gets a **5 second timeout**. A hung `df` on a dead NFS mount cannot wedge the bar.
- A command that exits `126`/`127` or complains about `not found` marks that section as **unavailable** and stops polling it — this is what a minimal container or an old busybox looks like, and re-asking every five seconds would be rude.
- Any other failure keeps the **last good value** and marks it `stale` with the time of that reading, instead of flashing `—` at you.
- Repeated failures back off exponentially, up to one minute between attempts.
- **Polling stops when the window is not visible.** A backgrounded electerm is not a monitoring agent; switch away and the commands stop.
- One monitor per session is shared by the bar and the panel, and it is torn down five minutes after the last thing watching it goes away.
- The CPU history is the **last 60 samples** — five minutes at a 5s interval — and the sparkline **breaks** its line where samples are missing, so a stale period is never drawn as a smooth straight line.

## The numbers worth trusting, and the ones worth understanding

**CPU is a delta, not a reading.** `/proc/stat` only carries cumulative counters since boot, so electerm takes two samples 100ms apart and computes the change, excluding idle and I/O wait. That is why the first value after you connect is blank rather than zero.

**Memory uses `MemAvailable`, not `MemFree`.** `MemFree` is "nothing is using this right now", which on a healthy Linux box is a depressingly small number — page cache counts as used. `MemAvailable` is "the kernel thinks it could hand this back if asked", which is the number you actually want when you are deciding whether the box is under pressure.

**Network rates are deltas too, and the reset cases are handled.** The first sample has no rate. Neither does the first sample after the default interface changes (a VPN coming up, a container bridge appearing), nor after the counters go backwards — which is what a reboot looks like when you are reading byte counters. In all three cases the bar shows `—` instead of a spectacular, entirely fictional spike.

**Upload and download follow one interface.** The default route's interface (`ip route show default`), not the sum of everything on the box. Otherwise a docker bridge and a VPN tunnel would both be counted on top of the real traffic.

**Disks skip the pseudo filesystems.** `tmpfs`, `devtmpfs`, `proc`, `cgroup`, `squashfs` and friends are filtered out, and `overlay` is only kept when it is mounted at `/` — which is how you want it in a container. The bar shows the first three mounts after sorting by priority (`/` first, then `/home`, `/var`, `/data`), and `+N` if there are more; the panel shows all of them.

## One setting for screenshots

If you share your screen, stream, or paste a panel into a ticket, turn on **hide IP**. It strips the address out of the hostname section, the network table and the users table in one go — which is why the users table has a source-address column that is conditional rather than permanent. The monitor bar never shows an address to begin with.

## Try it, on a busy host

The bar is most convincing on a machine that is actually doing something. Connect somewhere, turn the panel on, and leave it open while you run a build or a batch of `rsync` — you get the shape of the work: CPU climbing, memory filling, the disk climbing while the network is quiet, then all of it relaxing. Five minutes of history is enough to tell the difference between "slow" and "paging".

There is a 65 second walk through the same feature, recorded against electerm: [electerm: view SSH server info](https://www.bilibili.com/video/BV1DkJazkEVG) — memory, CPU, uptime, processes, disks and network, in one tour.
