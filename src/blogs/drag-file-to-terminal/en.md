---
title: 'Drag File to Terminal in Electerm: Upload with trz/rz or Just Paste the Path'
description: Drag any file onto the terminal in electerm and pick what happens — upload it with trz (trzsz) or rz (zmodem), or just paste its quoted path into the shell. How the drop dialog works for SSH, serial and local sessions, and how to set a default so it never asks again.
date: 2026-10-01
tags: [terminal, ssh, file-transfer, trzsz, zmodem, drag-drop, productivity]
bannerScript: banner.js
---

# Drag File to Terminal in Electerm: Upload with trz/rz or Just Paste the Path

You downloaded a build artifact, it is sitting in your Downloads folder, and it needs to be on the server. The usual dance: open SFTP, navigate to the right remote folder, drag the file over, wait, go back to the terminal. Or remember whether the remote has `trz` or `rz` installed, type it, then find the file picker.

Electerm shortens that to one gesture: **drag the file onto the terminal**. A small dialog asks what you meant — upload it with `trz`, upload it with `rz`, or just paste its quoted path into the shell — and then does exactly that. Watch the banner above: that is the whole feature in ten seconds.

## What actually happens on drop

Drop a file (or several) onto any terminal pane and electerm branches by session type:

| Session type | Drop shows | Why |
|---|---|---|
| **SSH** | `trz` / `rz` / paste path (`inputOnly`) | The remote shell can receive an upload, or you may only want the path typed |
| **Serial** | `XMODEM` / paste path | Serial links only speak XMODEM, there is no trz/rz channel |
| **Local / anything else** | No dialog — quoted paths are pasted directly | There is no remote to upload to; typing `"~/deploy.tar.gz" ` is the only sane answer |

Two sources are accepted. Files dragged from the OS file manager resolve through Electron's file path (`file.path`, falling back to `window.api.getPathForFile`). Files dragged from inside electerm itself — the SFTP panel or file manager — arrive as a `fromFile` payload and are resolved to their full path before the same dialog appears.

Multiple files work too: drop three logs and all three paths are uploaded, or pasted as `"a.log" "b.log" "c.log"` — space-joined, each quoted.

## The three SSH choices

The dialog is `src/client/components/terminal/drop-file-modal.jsx`, the decision logic is `src/client/components/terminal/mixins/term-file-drop.js`. In plain language:

- **`trz`** — trzsz upload (local → remote). Electerm hands your file list to the transfer layer (`window._apiControlSelectFile = filePaths`) and types `trz` + Enter into the session, exactly as if you had typed it yourself. The remote side must have trzsz installed (`trz` on `PATH`). This is the modern default — faster and more robust than zmodem, and what the app recommends elsewhere too.
- **`rz`** — classic zmodem upload. Same handshake, but with `rz` + Enter. Pick this on older boxes, minimal BusyBox environments, or jump-device CLIs where only `lrzsz` exists.
- **Paste path (`inputOnly`)** — no upload at all. The quoted local path is typed into the shell, e.g. `"/Users/zxd/Downloads/deploy.tar.gz" `. Useful when the "remote" is actually reachable over a shared mount, when you want to build the command yourself (`tar xzf` + paste), or when the file is already there and you just need its name spelled right.

If a transfer is already running, electerm refuses to stack a second one — you get an *A transfer is already in progress* warning instead of a corrupted upload.

## Stop asking: set a default

By default the behavior is `ask` — every drop shows the dialog. If you always do the same thing, set it once in **Settings → Terminal → `dragDropBehavior`** (default in `src/client/common/default-setting.js`):

- `ask` — show the dialog every time (default)
- `trz` — every SSH drop starts a trzsz upload immediately
- `rz` — every SSH drop starts a zmodem upload immediately
- `inputOnly` — every drop just pastes the quoted path

The configured default also applies to files dragged out of electerm's own SFTP panel, so a whole SFTP → terminal workflow can become a single drag with no click.

## A 30-second walkthrough

1. `ssh` into a host that has trzsz installed (`trz` should answer on the remote).
2. Drag `deploy.tar.gz` from Finder / Explorer onto the terminal pane.
3. Click **`trz`** in the dialog.
4. The terminal sends `trz`, the file picker is pre-filled with your file, the progress bar runs, and the shell returns to a prompt. The file is now in the remote working directory.

Prefer the keyboard-free repeat? Set `dragDropBehavior` to `trz` once — step 3 disappears and every future drop uploads directly.

For the paste flow, the walkthrough is even shorter: drag the file, click the paste-path button, and the quoted path lands in your current command line with a trailing space, ready for flags.

## Serial sessions: XMODEM

Serial tabs get a two-button dialog — **XMODEM** or paste path. Choosing XMODEM pre-fills the file list the same way and calls `xmodemClient.initiateSend()`, which starts the XMODEM send handshake over the serial line. Everything else (progress UI, cancel) behaves like the SSH transfers, just slower — that is the baud rate, not a bug.

## Safety notes that actually matter

- **Unsafe names are rejected.** Paths containing `"`, `'`, or line breaks are refused with a *File name contains unsafe characters* error rather than pasted half-quoted into your shell. Rename the file first.
- **Uploads go to the remote working directory.** `cd` to the right place before you drop — the dialog will not ask where the file should land.
- **`trz`/`rz` must exist on the remote.** If the remote prints `trz: command not found`, install trzsz (`https://github.com/trzsz/trzsz`) or fall back to `rz` if `lrzsz` is present. The drop only *starts* the command; the remote end has to answer it.
- **One transfer at a time.** Starting a second upload mid-transfer warns and cancels the dialog. Wait for the first to finish.

## Troubleshooting checklist

1. No dialog on drop? Local shells paste directly by design — only SSH and serial tabs ask.
2. `trz: command not found` on the remote? Install trzsz on that host, or pick `rz`.
3. Transfer starts but stalls? A second transfer may be active — look for the progress UI and cancel it first.
4. Pasted path has the wrong slashes? The pasted text is the *local* path — on an SSH session that only makes sense if the remote sees the same filesystem.
5. Dropped a file with a quote in its name and got an error? That is the unsafe-filename guard. Rename and retry.

## Cheat-sheet

- **Drop file on SSH terminal** → dialog: `trz` (trzsz upload) / `rz` (zmodem upload) / paste quoted path.
- **Drop file on serial terminal** → dialog: `XMODEM` / paste quoted path.
- **Drop file on local terminal** → quoted paths pasted, no dialog.
- **Default**: Settings → Terminal → `dragDropBehavior` (`ask` / `trz` / `rz` / `inputOnly`).
- **Under the hood**: file list is staged, then `trz`/`rz` + Enter is sent; XMODEM calls `initiateSend()`. Sources: `term-file-drop.js`, `drop-file-modal.jsx`, `file-drop-utils.js`.

Next: [SSH in Electerm](/blogs/ssh-features-guide/) for the sessions you will drop files into, or [Terminal and SFTP Split View](/videos/electerm-terminal-and-sftp-split-view/) when you would rather browse than drag.
