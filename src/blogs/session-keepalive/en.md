---
title: 'Session Keepalive in Electerm: The Heartbeat Icon That Actually Keeps You Logged In'
description: The heartbeat icon in electerm's session toolbar sends Enter every few seconds when you are idle — resetting TMOUT and app-layer idle killers that TCP keepalive cannot reach. Where to find it, how it works under the hood, and when to turn it off.
date: 2026-09-24
tags: [keepalive, ssh, tmout, terminal, session, productivity, tips]
bannerScript: banner.js
---

# Session Keepalive in Electerm: The Heartbeat Icon That Actually Keeps You Logged In

You leave an SSH session alone for five minutes to read docs. You come back, and it says `timed out waiting for input: auto-logout`. Or the bastion silently drops you. Or the firewall in between decides an idle TCP flow is a dead flow. Your SSH-level keepalive was on the whole time — and it did nothing.

That is the session this post is about. Electerm has a second, stronger keepalive: the **heartbeat icon in the session toolbar**. Click it, and electerm sends an **Enter (`\n`) every few seconds while you are idle** — waking the shell up, resetting its idle alarm, and generating real application-layer activity. Watch the banner above — idle timer climbs, heart beats, Enter flies, idle timer resets. That loop is the whole feature.

## Where the icon lives

Look at the **session control bar** — the thin bar above the terminal pane (`src/client/components/session/session-control.jsx`).

From left to right you will see the `SSH / SFTP` pane tabs, the paperclip (SFTP path follow), the split-view toggle, then the **heartbeat**: a heart outline with an EKG pulse line through it (`HeartbeatIcon` in `src/client/components/icons/heartbeat.jsx` — heart path plus a `160,512 310,512 370,310 450,714 ...` polyline).

- **Grey = off.** This is the default. Nothing is sent.
- **Highlighted (orange/red, `.sess-icon.active` → `--warn`) = on for this tab.** Click again to turn it off.

It is **per tab, in-memory only** (`keepaliveEnabled` in `src/client/components/session/session.jsx`, toggled via `term.toggleKeepalive()` in `src/client/components/terminal/mixins/term-attach.js`). There is no global switch — you opt each session in, which is exactly right for a feature that sends keystrokes.

> It only appears for terminal-type sessions (SSH or local shell). SFTP-only panes, web tabs and RDP sessions have nothing to send Enter to, so the icon hides itself.

## What it actually sends

Not a TCP packet. Not an SSH `keepalive@openssh.com` message. A real newline into the PTY:

1. Every **3 seconds** the client checks: *has there been no terminal output AND no keyboard input for 3 seconds?* (`_keepaliveInterval = 3000` in `src/client/components/terminal/attach-addon-custom.js`, `_checkKeepalive`).
2. If yes — and the WebSocket is still `OPEN` — it sends `{ action: 'keepalive' }` down the existing socket.
3. The server writes `\n\r\x1b[K` to the PTY (`src/app/server/session-server.js`).
4. Bash's `read()` wakes up, the `TMOUT` alarm resets, bash re-displays the prompt. The client suppresses that echo for ~500 ms (`startOutputSuppression(500, null, true)`) so you see a quiet prompt redraw instead of scrollback spam.

```
idle 3s ──► client: { action: 'keepalive' } ──► server: term.write('\n\r\x1b[K')
                                                          │
bash read() wakes ◄── TTY delivers line ──◄── PTY ────────┘
TMOUT reset, prompt redrawn, echo suppressed on screen
```

Two details worth knowing:

- **Why `\n` and not a NUL byte?** In canonical mode the TTY line discipline only delivers data to `read()` when a newline completes the line — `\x00` would sit in the buffer forever and never wake the shell. The code comment in `session-server.js` says exactly this.
- **It stays quiet while you work.** Typing or receiving output resets both idle clocks, so the heartbeat never fires mid-command. It only speaks when you have gone silent.

## Why this beats TCP / SSH keepalive

Electerm already has the normal transport keepalive: `keepaliveInterval` (default 10 s) and `keepaliveCountMax` (default 10) in Settings → SSH, plumbed through `term-socket.js` into `session-ssh.js`. That is the equivalent of OpenSSH's `ServerAliveInterval` — it keeps the **wire** alive.

The heartbeat keeps the **shell** alive. Different layer, different killers:

| | SSH / TCP keepalive | Session heartbeat (this post) |
|---|---|---|
| **Sends** | SSH protocol ignore / TCP ACK | Real `\n` into the PTY |
| **Default cadence** | Every 10 s (`keepaliveInterval`) | Every 3 s of true idle |
| **Stops NAT / firewall idle timeout?** | Usually yes | Yes — and with real traffic |
| **Stops shell `TMOUT` auto-logout?** | **No** — the shell never sees it | **Yes** — `read()` wakes, alarm resets |
| **Stops bastion / jump-host / WAF app idle kill?** | Often **no** — they watch keystrokes, not packets | **Yes** in practice — it looks like activity |
| **Visible side effect** | None | Prompt redraw (echo suppressed) |
| **Scope** | Per bookmark / global setting | Per-tab toggle, off by default |

The mental model: **TCP keepalive tells the network "this socket is still here". The heartbeat tells the shell "the user just pressed Enter on an empty line".** Middleboxes and shells that kill "idle" sessions are watching for the second kind.

So when the transport keepalive "doesn't work" — session still dies with `TMOUT`, or the gateway still boots you at 5 minutes — it is usually not broken. It was never the tool for that killer. Turn on the heart.

## When it pays off

- **`TMOUT` / `autologout` servers.** Compliance-hardened boxes with `TMOUT=300` that log you out mid-incident. The heartbeat is the only client-side fix that does not require root to change the server.
- **Bastions and jump hosts with idle policies.** Many gateways kill sessions after N minutes without *application* data. Encrypted SSH keepalives do not count; an Enter does.
- **Hotel Wi-Fi / aggressive NAT.** Anything that reaps idle flows. A newline every 3 s is traffic no middlebox ignores.
- **Long watches.** `tail -f`, a migration running in tmux, waiting on CI — output flowing means the heartbeat stays silent; output stalled means it starts guarding the session. Exactly backwards from what you would fear.
- **Serial consoles.** The icon also works on local/serial terminal types where SSH keepalive does not even exist.

## Limits and honest warnings

This icon sends **real input to a real machine**, and it is opt-in for that reason. The project leaves it off by default and scopes it to one tab. Respect that:

- **It presses Enter.** On an empty shell prompt that is harmless (prompt redraw). Anywhere else, think first: **turn it off before opening `vim`, `nano`, `emacs`, a TUI installer, or a `read -p` / password prompt.** A stray newline in insert mode inserts a line; at a `Are you sure? (y/N)` prompt it accepts the default — which on an empty default is usually safe, but do not gamble.
- **Expect a re-prompt shimmer.** Every few seconds of idleness, the prompt line redraws. The 500 ms output suppression hides the echo, but on a slow link you may glimpse it. That shimmer *is* the keepalive working.
- **It does not survive reconnects.** Like all per-tab state, toggling is gone when the tab closes. Reconnect → click the heart again.
- **It does not replace tmux/screen.** If the network truly dies, no keepalive saves you. For work that must survive a laptop sleep, run it inside tmux *and* keep the heart on so the outer session stays up to watch it.
- **Automation filters ignore it.** Trigger matching and shell-integration logic explicitly skip keepalive echo (`attach-addon-custom.js`), so your triggers will not fire on the heartbeat's own prompt redraw.

## Troubleshooting checklist

1. Is the heartbeat icon **highlighted** for *this* tab? (Grey = off.)
2. Is the tab a **terminal** (SSH / local), not SFTP-only or RDP?
3. Is the session dying from `TMOUT` (says `auto-logout`) or from the network (frozen, then `broken pipe`)? Heartbeat fixes the first reliably; the second wants both keepalives plus tmux.
4. Seeing prompt redraws while typing? You should not — it only fires after 3 s with no input *and* no output. If it fires mid-work, something is holding the idle clocks (report it).
5. In an editor and the cursor jumps? That is the heartbeat Enter landing in the wrong place — click the heart off until you are back at a shell prompt.

## Cheat-sheet

- **On** = heartbeat icon highlighted in the session control bar (`session-control.jsx` → `HeartbeatIcon`, `.keepalive-icon.active`).
- **What** = `\n` into the PTY every 3 s of true idle (`attach-addon-custom.js` → `session-server.js`), echo suppressed for 500 ms.
- **Why not just SSH keepalive** = transport keepalive cannot reset `TMOUT` or app-layer idle killers; a newline can.
- **Off when** = editors, TUIs, password prompts, destructive confirmations. Back at a prompt, back on.
- **Scope** = this tab only, in-memory, off by default.

Next: [SSH in Electerm](/blogs/ssh-features-guide/) for the transport keepalive settings this feature complements, or [Terminal Triggers](/blogs/terminal-triggers/) if you want the terminal to *answer* prompts instead of just staying awake for them.
