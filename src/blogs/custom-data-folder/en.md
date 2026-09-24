---
title: 'Custom Data Folder in Electerm: Point DATA_PATH Anywhere'
description: By default electerm keeps bookmarks, passwords and settings in an OS-specific folder. Set the DATA_PATH environment variable and you can move all of it — to another drive, a synced folder, or a portable USB stick. Default locations, migration steps, and per-OS guides for Windows, macOS and Linux.
date: 2026-09-24
tags: [data-path, backup, portable, sync, tips]
---

# Custom Data Folder in Electerm: Point DATA_PATH Anywhere

Bookmarks, saved passwords, quick commands, themes, triggers, sync settings — everything electerm remembers lives in one data folder on disk. By default that folder is picked by your OS, buried somewhere under your user profile. That is fine until it isn't: your `C:` drive is full, you want the data inside Dropbox, you run electerm from a USB stick, or you keep separate "work" and "personal" profiles.

The fix is one environment variable: **`DATA_PATH`**. If it is set when electerm starts, electerm uses it as the data root. If it is not set, electerm falls back to the default location. That is the whole mechanism:

```js
// src/app/lib/sqlite.js, src/app/lib/nedb.js, src/app/lib/storage-key.js
const appDataPath = process.env.DATA_PATH || resolve(appPath, 'electerm')
```

Everything underneath — `users/default_user/electerm.db`, `electerm_data.db`, `storage-key.enc`, session logs — moves together. No registry hack, no config file edit, no reinstall.

> Also documented in the wiki: [Command line usage — DATA_PATH](https://github.com/electerm/electerm/wiki/Command-line-usage). The old variable name `DB_PATH` you may see in older discussions means the same thing; `DATA_PATH` is the current name.

## 1. Default locations (when DATA_PATH is not set)

| OS | Default data root | Your database lives under |
|---|---|---|
| macOS | `~/Library/Application Support/electerm` | `.../users/default_user/` |
| Linux | `~/.config/electerm` | `.../users/default_user/` |
| Windows (installer) | `C:\Users\<you>\AppData\Roaming\electerm` | `...\users\default_user\` |
| Windows (portable `.tar.gz`) | folder next to `electerm.exe` | `...\electerm\users\default_user\` |

The per-user folder is what you usually care about (same paths the [Troubleshoot wiki](https://github.com/electerm/electerm/wiki/Troubleshoot) quotes):

- macOS: `~/Library/Application Support/electerm/users/default_user`
- Linux: `~/.config/electerm/users/default_user`
- Windows: `C:\Users\<you>\AppData\Roaming\electerm\users\default_user`

Inside you will find `electerm.db` and `electerm_data.db` (v2+ databases), plus keys, logs and widget data. Setting `DATA_PATH=/my/folder` replaces the **data root** — electerm then creates `/my/folder/users/default_user/...` on first start. So point it at the parent, not at the `users` folder itself.

## 2. When a custom folder pays off

- **Disk space.** Move data off a cramped system drive onto `D:\data\electerm` or `/mnt/data/electerm`.
- **Cloud backup/sync.** Point it into Dropbox, OneDrive, iCloud Drive or Synology Drive so every machine shares the same bookmarks (quit electerm on the other machines first — see caveats).
- **Portable use.** Keep electerm plus data on one USB stick: `DATA_PATH=E:\electerm-data`.
- **Separate profiles.** `DATA_PATH=~/.electerm-work` for work, `DATA_PATH=~/.electerm-personal` for home, launched from two shortcuts.
- **Clean reinstalls and debugging.** Start with an empty folder to test whether a crash comes from your data, without touching the real thing.

## 3. Move your existing data (all OSes, 4 steps)

1. **Quit electerm completely** (tray icon too — a running instance keeps writing to the database).
2. **Copy the whole data root** to the new place, preserving structure:
   ```bash
   # macOS example
   cp -r ~/Library/Application\ Support/electerm /Volumes/Data/electerm-data

   # Linux example
   cp -r ~/.config/electerm ~/Dropbox/electerm-data

   # Windows (PowerShell)
   xcopy "$env:APPDATA\electerm\*" "D:\data\electerm-data\" /E /I /H
   ```
3. **Start electerm once with `DATA_PATH` set** (per-OS instructions below) and check your bookmarks are there.
4. Only then, optionally delete or rename the old folder as backup. Keep a backup until you are sure — the encryption key (`storage-key.enc`) moves with the data, and without it encrypted fields cannot be read.

To go back, just start electerm without `DATA_PATH`: the default folder is used again.

## 4. Linux

One-off test:

```bash
DATA_PATH=/mnt/data/electerm-data electerm
```

If you installed from a path that is not on `PATH`, use the full binary path. To make it permanent, export it in your shell startup:

```bash
# ~/.bashrc or ~/.zshrc
export DATA_PATH="/mnt/data/electerm-data"
```

GUI launchers do not read `.bashrc`. For the app-menu icon, edit (or copy to `~/.local/share/applications/`) the `.desktop` file:

```ini
Exec=env DATA_PATH=/mnt/data/electerm-data /usr/bin/electerm %U
```

Then `update-desktop-database ~/.local/share/applications` if your distro needs it. Flatpak/Snap wrapped installs may ignore host env vars — launching the binary from a terminal is the reliable check.

## 5. macOS

One-off test from a terminal:

```bash
DATA_PATH=/Volumes/Data/electerm-data /Applications/electerm.app/Contents/MacOS/electerm
```

Shell `export` in `~/.zshrc` only affects terminal launches, **not** double-clicking the app in Finder or the Dock — macOS strips custom env vars from GUI launches. Pick one:

- **Always launch from terminal / script** with the variable set (simplest, scriptable per profile).
- **A wrapper with Automator/Shortcuts**: a "Run Shell Script" app containing the line above, saved to `/Applications`, then drag that to the Dock.
- **`launchctl setenv`** (applies after re-login, affects the whole session — use only if you are comfortable with it):
  ```bash
  launchctl setenv DATA_PATH /Volumes/Data/electerm-data
  # undo: launchctl unsetenv DATA_PATH
  ```

Verify by checking that `electerm.db` appears under your custom folder after first launch.

## 6. Windows

One-off test in Command Prompt:

```cmd
set DATA_PATH=D:\data\electerm-data
"C:\Program Files\electerm\electerm.exe"
```

Or PowerShell:

```powershell
$env:DATA_PATH = "D:\data\electerm-data"
& "C:\Program Files\electerm\electerm.exe"
```

Make it permanent:

1. `Win + R` → `sysdm.cpl` → Advanced → Environment Variables, add **user** variable `DATA_PATH` = `D:\data\electerm-data`. Or in one command:
   ```cmd
   setx DATA_PATH "D:\data\electerm-data"
   ```
   (Restart electerm — and any open terminal — after `setx`.)
2. For a per-shortcut setup instead of a system-wide variable, clone the Start Menu shortcut and set its Target to:
   ```
   cmd /c "set DATA_PATH=D:\data\electerm-data && start "" "C:\Program Files\electerm\electerm.exe""
   ```

Notes for Windows users:

- Use an **absolute path** with a drive letter. UNC paths (`\\server\share`) and mapped drives that are not yet connected at login are fragile — prefer a local disk.
- Portable builds (`win-x64-portable.tar.gz`) already keep data next to `electerm.exe`; `DATA_PATH` still wins if you set it.
- Antivirus/ransomware-protection may block writes to Documents/OneDrive — if the folder stays empty, allow `electerm.exe` first.

## 7. Verify it worked

- A fresh `users/default_user/` tree (with `electerm.db`, `electerm_data.db`) appears in your custom folder on first launch.
- Your bookmarks, themes and history show up (if you copied old data).
- Run from a terminal once and watch stderr: a typo'd or uncreatable path logs an error instead of silently using the default.

## 8. Caveats worth 30 seconds

1. **Quit first, one writer at a time.** Never run two electerm instances against the same `DATA_PATH` (and never let Dropbox sync it while electerm is open on two machines). SQLite does not like that.
2. **Absolute paths only.** Relative paths resolve against an unpredictable working directory, especially for GUI launches.
3. **Permissions matter.** The folder must be readable *and* writable by your user. Network mounts with odd ownership are the #1 "it starts empty" cause.
4. **Back up before moving.** Copy, don't cut — and keep the backup until the new location has survived a restart or two. Embedded sync (WebDAV/gist) keeps working; it just syncs *from* the new folder.
5. **Empty folder = fresh start.** That is a feature (clean test profile), but double-check the variable for typos before panicking about "lost" bookmarks — your old folder is untouched.

## Cheat-sheet

- Mechanism: `DATA_PATH` set → use it; unset → OS default (`~/Library/Application Support/electerm`, `~/.config/electerm`, `%APPDATA%\electerm`).
- It points at the **data root**; electerm appends `users/default_user/...` itself.
- One-off: `DATA_PATH=/path/to/data electerm` (Linux/macOS) or `$env:DATA_PATH="D:\data"; electerm.exe` (Windows).
- Permanent: shell rc / `.desktop` file (Linux), wrapper app or `launchctl setenv` (macOS), user env var or dedicated shortcut (Windows).
- Migrate with: quit → copy whole folder → launch with `DATA_PATH` → verify → delete old.

Next: [Command line usage wiki](https://github.com/electerm/electerm/wiki/Command-line-usage) for the other env vars (`PROXY_*`, `NO_PROXY_SERVER`), or the [Troubleshoot wiki](https://github.com/electerm/electerm/wiki/Troubleshoot) when something breaks and you need the default paths again.
