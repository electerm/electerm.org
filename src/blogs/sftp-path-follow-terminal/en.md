---
title: 'SFTP Path Follow Terminal in Electerm: One Location, Two Views'
description: Type cd in the terminal and the SFTP file panel moves with you — click a folder in SFTP and the terminal follows back. How to turn on path follow in electerm, how it tracks your shell with OSC 633, and when to switch it off.
date: 2026-09-23
tags: [sftp, ssh, terminal, file-manager, productivity, tips]
videos: [electerm-sftp-path-sync-with-terminal, electerm-terminal-and-sftp-split-view, electerm-sftp-transfer-files-and-folders]
featureVideo: electerm-sftp-path-sync-with-terminal
bannerScript: banner.js
---

# SFTP Path Follow Terminal in Electerm: One Location, Two Views

You `cd /var/www/app/logs` to read a log, then you need to grab that same log file in the file panel — so you click through `var`, `www`, `app`, `logs` a second time. Or the reverse: you browsed to the deploy folder in SFTP, and now you type the same path again in the shell to restart the app. Two views of one machine, navigated twice.

Electerm's **SFTP path follow terminal** removes the second navigation. Turn it on and the terminal and the SFTP panel share one location: `cd` in the shell moves the file panel, and opening a folder in the file panel moves the shell. Watch the banner above — that is the whole feature in ten seconds.

Feature video: [Electerm SFTP Path Sync with Terminal](/videos/electerm-sftp-path-sync-with-terminal/).

## What it actually does

With follow enabled, the two panes stay pointed at the same remote directory:

- **Terminal → SFTP.** Every time the shell's working directory changes, the SFTP panel lists the new folder. `cd /var/www/app` in the terminal, and the address bar rewrites itself to `/var/www/app` with the new file list.
- **SFTP → terminal.** Double-click (or enter) a folder in the SFTP panel, and the terminal runs the matching `cd` so its next prompt sits in that folder.

It is a two-way sync, not a one-way mirror. Whichever side you navigate, the other side catches up — which is why the typical setup is the split view: terminal on one side, SFTP on the other, both for the same host. Video: [Electerm Terminal and SFTP Split View](/videos/electerm-terminal-and-sftp-split-view/).

```
terminal:  $ cd /var/www/app          sftp:  /home/zxd  →  /var/www/app
                                              app.js  logs/  public/

sftp:      double-click logs/         terminal:  $ cd /var/www/app/logs
                                              app.log  error.log  access.log
```

## Turning it on

There are two switches, and they do the same job at different scopes:

1. **Per session — the paperclip icon.** In the session control bar above the terminal pane, the paperclip icon toggles follow for that tab. Highlighted means following. This is the one you will click daily.
2. **Default for new terminals — terminal settings.** Settings → Terminal → `sftpPathFollowSsh`. Flip it once and every new session starts with follow on.

If the toggle does nothing, check the obvious first: follow only syncs a terminal pane with **its own** SFTP pane for the same connection. A local shell, a web tab, an RDP session, or an SFTP pane opened for a different host has nothing to sync with.

## How electerm knows where your shell is

The hard part of this feature is not moving the file panel — it is knowing the shell's directory without getting in the way. Electerm does it with **shell integration over OSC 633 escape sequences**, the same standard VS Code's terminal uses:

- `OSC 633 ; A` — prompt started
- `OSC 633 ; B` — command input started
- `OSC 633 ; C` — command execution started
- `OSC 633 ; D` — command finished
- `OSC 633 ; P ; Cwd=` — current working directory

When follow is on, electerm listens for the `Cwd=` report. The shell announces "I am now in `/var/www/app`" by itself — no polling, no injected `pwd` command in your history, no parsing your prompt.

Why that matters:

- **No command injection.** Nothing extra lands in your scrollback or shell history.
- **No prompt parsing.** Custom prompts, multi-line prompts, right-side prompts, `PROMPT_COMMAND` tricks — none of them confuse it, because it never reads the prompt.
- **Accurate through anything.** `cd`, `pushd`, symlinks, a deploy script that jumps three folders — the shell reports where it ended up, not how it got there.

Technical deep-dives: [How Electerm Gets the Current Working Directory (pwd)](https://github.com/electerm/electerm/wiki/How-Electerm-Gets-the-Current-Working-Directory-(pwd)-in-Terminal-When-%22SFTP-Follow-Terminal-Path%22-Is-Enabled) and the implementation in [`src/client/components/terminal/shell.js`](https://github.com/electerm/electerm/blob/master/src/client/components/terminal/shell.js).

## Where this pays off

**Chasing logs.** `cd` into the log folder, the file list is already there, double-click the file to edit or tail it. No re-navigation.

**Deploy-and-verify.** Browse to the release folder in SFTP to confirm the artifact landed, and the terminal is already there to run `systemctl restart app`.

**Exploring an unfamiliar box.** Click around the file tree to orient yourself; the terminal follows, so when you find the interesting folder you can immediately run commands in it.

**Keeping `ls` out of your life.** The file panel *is* the `ls` — sorted, sized, clickable. With follow on, you stop listing directories to remember what is in them.

## Limits and honest warnings

This is an **experimental** feature with known rough edges, and the project says so openly: [Warning About SFTP Follow SSH Path Function](https://github.com/electerm/electerm/wiki/Warning-about-sftp-follow-ssh-path-function). What that means in practice:

- **Shell support: bash, zsh, sh, ash and similar.** Shells where the `sh`-style integration snippet works. `fish` and the Windows terminal family are not supported yet — follow will silently do nothing there.
- **If the terminal misbehaves, turn follow off first.** The integration snippet runs inside your shell; on exotic setups (heavily customised `PROMPT_COMMAND`, `precmd` hooks, minimal BusyBox shells, jump-device CLIs) it can interfere with normal terminal behaviour. The icon tooltip links straight to the warning wiki for this reason. Off is always a safe state.
- **SFTP-side navigation still costs a round trip.** Moving the file panel means listing a remote folder over SFTP. On high-latency links you will feel the panel lag a beat behind fast `cd` sequences — that is the network, not a bug.
- **`sudo -s` / `su` / containers change the answer.** The reported directory is whatever the shell believes. Entering a container mount namespace or a `chroot` can report a path the SFTP subsystem cannot resolve, and the panel will refuse to follow. Sensible behaviour — do not force it.

## Troubleshooting checklist

1. Is the paperclip icon highlighted for *this* tab?
2. Is the SFTP pane open for the *same* session (split view), not a different host?
3. Is the remote shell bash/zsh/sh/ash — not fish, not a device CLI?
4. Did the shell print any error on connect? The integration snippet logs loudly when it fails to install.
5. Still stuck? Toggle follow off and back on, or reconnect the tab. If the terminal itself renders strangely with follow on, leave it off and follow the [warning wiki](https://github.com/electerm/electerm/wiki/Warning-about-sftp-follow-ssh-path-function) for updates.

## Cheat-sheet

- **Follow on** = paperclip icon highlighted in the session control bar, or `sftpPathFollowSsh` in terminal settings for the default.
- **Terminal → SFTP**: `cd` anywhere, the file panel lists the new folder.
- **SFTP → terminal**: open a folder, the shell `cd`s there.
- **Under the hood**: OSC 633 `Cwd=` reports, no history pollution, no prompt parsing.
- **Not working?** Check shell type (no fish), same-host split view, then toggle off — off is always safe.

Next: [Terminal and SFTP Split View](/videos/electerm-terminal-and-sftp-split-view/) for the layout this feature lives in, or [SFTP Transfer Files and Folders](/videos/electerm-sftp-transfer-files-and-folders/) once you are in the right folder and want to move things.
