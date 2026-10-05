---
title: 'Run electerm From Your Terminal — the New electerm Command in PATH'
description: A new setting installs an electerm command into your PATH on Windows, macOS and Linux. What it writes on each platform, why macOS uses a small wrapper script, how to install it by hand, and how to undo it.
date: 2026-10-05
tags: [command-line, path, macos, windows, linux, productivity, tips]
---

# Run electerm From Your Terminal — the New electerm Command in PATH

You have a terminal open. You want a session on some box. Electerm is sitting there in `/Applications` or under `%LOCALAPPDATA%`, one alt-tab and a few clicks away, and every time you think: this should just be a command.

It is now. **Settings → Common → Install electerm command to PATH → Install.**

```sh
electerm                      # open the app
electerm user@example.com     # open the app and connect
```

That is the whole feature. What follows is what "add a command to `PATH`" has to mean on each platform — three different mechanisms, and on one of them it is not what you would guess.

## What it actually writes

Three platforms, three different mechanisms. Nothing is guessed: the settings row shows you which directory it used.

| Platform | What is created | Where |
|---|---|---|
| **macOS** | a small **wrapper script** — deliberately *not* a symlink | the first writable of `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin` |
| **Linux** | a **symlink** named `electerm` | the first writable of `/usr/local/bin`, `~/.local/bin`, `~/bin` |
| **Linux (AppImage)** | a symlink to the **`.AppImage` file you launched** | same |
| **Windows** | **no file at all** — the folder containing `electerm.exe` is appended to your *user* `PATH` | `HKCU\Environment` |

A few details that matter in practice:

- **If none of those directories exists and is writable, electerm creates `~/.local/bin`** and tells you it is not on your `PATH` yet, so you can add it.
- **The AppImage case is not a detail you can skip.** An AppImage runs from a temporary squashfs mount (`/tmp/.mount_electermXXXX`). A symlink pointing there works exactly once. Electerm links `$APPIMAGE` instead — the file you actually double-clicked.
- **On Windows, no launcher file is written**, because there is nothing to write: the installer already put `electerm.exe` somewhere, and the only thing missing is that the folder is not on `PATH`. Editing the *user* `PATH` needs no administrator rights, and electerm uses `[Environment]::SetEnvironmentVariable` rather than `setx` — `setx` silently truncates `PATH` at 1024 characters and expands `%VAR%` references, which is a genuinely bad way to lose entries.
- **It is idempotent, and safe to repeat.** Installing again rewrites the entry atomically (write a temp file, then rename over the target), so there is never a moment where the command does not exist. Electerm only ever replaces an entry it created itself.

## Why macOS gets a script

On macOS the entry is a small shell script rather than a symlink:

```sh
#!/bin/sh
# electerm command wrapper
# launch electerm through its real path so it can find its Helper apps
unset ELECTRON_RUN_AS_NODE
exec "/Applications/electerm.app/Contents/MacOS/electerm" "$@"
```

Two reasons, both about starting the app correctly rather than merely finding it:

- **Electron locates its Helper processes from the path of its own executable.** The command therefore has to launch the binary at its real path inside the app bundle, which is what the `exec` line does. This is the same shape VS Code ships: `/usr/local/bin/code` is a script, not a symlink.
- **The `unset` line clears `ELECTRON_RUN_AS_NODE`.** Terminals started from inside another Electron app — an IDE's integrated terminal, for instance — export that variable, and an Electron binary that sees it starts a Node runtime instead of the app. Clearing it means `electerm` behaves the same whichever terminal you run it from.

If you ever want to do it by hand, use the same script:

```sh
sudo tee /usr/local/bin/electerm >/dev/null <<'EOF'
#!/bin/sh
unset ELECTRON_RUN_AS_NODE
exec "/Applications/electerm.app/Contents/MacOS/electerm" "$@"
EOF
sudo chmod 755 /usr/local/bin/electerm
```

## Installed, Outdated, Blocked

The settings row tells you the state, and each state means something specific:

| Tag | What it means |
|---|---|
| **Installed** | The command exists and points at this app. |
| **Outdated** | A command exists but points somewhere else — you moved or reinstalled electerm. Click Install again and it is repointed. |
| **Not installed** | Nothing there yet. |
| **Blocked** | Something occupies that path and electerm did not create it. Electerm will not touch it. |

**Blocked** is the interesting one, and it is deliberate. A file called `electerm` in `/usr/local/bin` that electerm did not write is your file, not ours. Overwriting it would be a nasty surprise, so electerm stops and leaves it alone. If you hit Blocked, remove the entry yourself and install again.

**Uninstall** removes only the entry electerm created. On Windows it takes the folder back out of your user `PATH`.

## Only a packaged build can install it

If you run electerm from source, the row shows an explanation instead of buttons. That is not a missing feature: in an unpackaged run `process.execPath` is the Electron binary, not electerm, so installing would point your `electerm` command at bare Electron and break the command you were trying to create. The setting refuses to do it.

There is one more Windows-specific wrinkle: terminals that are **already open** keep the old `PATH` until you open a new one. Electerm broadcasts the environment change, but not every shell listens.

## Where next

- [How to install and set up electerm](/blogs/install-electerm/) — if you have not got the app yet, for every OS including Android and iOS.
- [Command line usage](https://github.com/electerm/electerm/wiki/Command-line-usage) — everything the command accepts once it exists: connecting to a host, `-tp` for telnet/RDP/VNC/serial, batch operation files, `DATA_PATH`.
- [Install electerm command](https://github.com/electerm/electerm/wiki/Install-electerm-command) — the wiki page for this feature, including the manual commands for all three platforms.
