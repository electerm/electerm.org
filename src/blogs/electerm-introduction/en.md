---
title: Introducing Electerm - Free Open-Source Terminal and SSH Client
description: Electerm is a free, open-source terminal, SSH, SFTP and remote-desktop client for Linux, macOS, Windows, Android, HarmonyOS and iOS. This guide tours its key features.
date: 2026-01-15
tags: [introduction, features, ssh, sftp, terminal]
videos: [electerm-usage-demo, electerm-terminal-and-sftp-split-view, electerm-session-layout, electerm-batch-operations, electerm-quick-commands, electerm-workspace]
---

# Introducing Electerm

**Electerm** is a free and open-source terminal / SSH / SFTP / Telnet / Serial / RDP / VNC / Spice / FTP client for Linux, macOS, Windows, Android, HarmonyOS and iOS. It is built with web technologies (Electron + React) and released under the MIT license. Source code: [github.com/electerm/electerm](https://github.com/electerm/electerm).

If you live in terminals all day, electerm tries to be the one app that covers almost everything: local shell, remote SSH, file transfer, remote desktop, workspaces, quick commands, batch operations, sync, themes, and AI assistance.

> Watch the overview first: [Electerm Usage Demo](/videos/electerm-usage-demo/)

## One app, many protocols

Most terminal apps do one thing. Electerm bundles them:

- **Terminal**: full-featured local terminal emulator with themes, background image, font settings, keyword highlighting, transparency, zoom, auto-copy-on-select.
- **SSH + SFTP**: the core workflow. SSH terminal with an SFTP file manager side-by-side, path sync between them, drag-and-drop transfer, compressed folder transfer, remote file editing, server info dashboard.
- **FTP / Telnet / Serial port**: for legacy devices, routers, embedded boards.
- **RDP / VNC / Spice**: graphical remote desktop sessions (VNC is beta), including file transfer for RDP.
- **Web**: open internal dashboards as tabs next to your terminals.

That means a typical day — SSH into prod, SFTP a build artifact, RDP into a Windows box, serial into a dev board — can all stay in one window with one bookmark store.

## Terminal + SFTP, side by side

The signature layout is terminal and SFTP in a split view for the same host:

- Open an SSH bookmark with both `enableSsh` and `enableSftp` on.
- Toggle the split with the file-manager button.
- Enable **SFTP follow terminal path** so `cd` in the shell moves the file panel automatically (and vice versa).
- Double-click a remote file to edit it locally, save to upload.
- Compress-transfer for folders, chmod editor, file-info panel.

Related videos:

- [Electerm Terminal and SFTP Split View](/videos/electerm-terminal-and-sftp-split-view/)
- [Electerm SFTP Transfer Files and Folders](/videos/electerm-sftp-transfer-files-and-folders/)
- [Electerm Drag and Drop File Transfer Between SFTP](/videos/electerm-drag-and-drop-file-transfer-between-sftp/)
- [Electerm SFTP Path Sync with Terminal](/videos/electerm-sftp-path-sync-with-terminal/)

## Bookmarks, quick commands, batch input

**Bookmarks** are electerm's connection manager: folders, tags, colors, descriptions, per-bookmark proxy, encoding, terminal type, startup directories, run-scripts after connect, and deep-link support (`ssh://user@host:22` opens electerm directly). You can even generate bookmarks from natural language with AI (see the AI post).

**Quick commands** are reusable snippets bound to a bookmark or global: one click runs `docker ps`, `kubectl get pods`, log tailing, etc. There is a template gallery in the wiki and a video walkthrough.

**Batch operations** go further:

- **Batch input / mirror input**: type once, send to many terminals at once — perfect for rolling restarts across a fleet.
- **Batch command execution**: run a script across selected sessions and collect results.

Videos:

- [Electerm Quick Commands](/videos/electerm-quick-commands/)
- [Electerm Batch Operations](/videos/electerm-batch-operations/)
- [Electerm Batch and Mirror Input to Multiple Terminals](/videos/electerm-batch-and-mirror-input-to-multiple-terminals/)

## Workspaces and session layout

If you open the same 6 sessions every morning, save them as a **workspace**: layout + connection list in one click, including auto-load on startup. Session layout (split panes, tabs) is saved per workspace, so "frontend + backend + db + logs" is one action.

- [Electerm Workspace](/videos/electerm-workspace/)
- [Electerm Session Layout](/videos/electerm-session-layout/)
- [Electerm Open Bookmarks on Startup](/videos/electerm-open-bookmarks-on-startup/)

## Sync, cloud, and portability

Bookmarks, themes and quick commands can be synced to:

- GitHub / Gitee secret gist
- WebDAV
- Custom sync server
- [electerm cloud (sync.electerm.org)](https://sync.electerm.org/)

Import/export is a plain JSON file, so migration between machines is trivial. There is also [electerm-web](https://github.com/electerm/electerm-web) and a Docker image if you want the same UI in a browser, plus [cloud.electerm.org](https://cloud.electerm.org) for the hosted online version.

Video: [Electerm Sync Data to Cloud Service](/videos/electerm-sync-data-to-cloud-service/)

## Customization without limits

- **Themes**: full UI + terminal theme editor, import from the iTerm2 color-scheme collection, share via [theme.electerm.org](https://theme.electerm.org).
- **Fonts, transparency, background image, custom CSS**: restyle almost anything; the wiki has custom-CSS examples.
- **Hotkeys**: global toggle (`Ctrl+2` by default, Guake-style), editable shortcuts.
- **Multiple instances, system title bar, startup password, local startup directory**.

Videos:

- [Electerm Theme Settings and Editing](/videos/electerm-theme-settings-and-editing/)
- [Electerm Terminal Background Settings](/videos/electerm-terminal-background-settings/)
- [Electerm Custom CSS Styling](/videos/electerm-custom-css-styling/)
- [Electerm Change Font Settings](/videos/electerm-change-font-settings/)

## SSH power features (preview)

Electerm's SSH stack covers password, public key, ssh-agent, OpenSSH certificates, keyboard-interactive (MFA/TOTP prompts), connection hopping (jump hosts), NetBird / proxy-command, SOCKS/HTTP proxy, X11 forwarding, keep-alive, and local/remote/dynamic SSH tunnels. The dedicated post [SSH in Electerm: auth, jump hosts, NetBird and tunnels](/blogs/ssh-features-guide/) walks through all of them with wiki links.

## AI built in (preview)

Command generation from natural language, explain-selection, AI-created bookmarks, theme generation, and an agent mode that runs multi-step tasks in the terminal — backed by any OpenAI-compatible API or the free [ai.electerm.org](https://ai.electerm.org) service. Full tour: [AI Features in Electerm](/blogs/ai-features-guide/).

## Where to go next

- [Install Electerm on Windows, macOS, Linux, Android and iOS](/blogs/install-electerm/)
- [Official wiki](https://github.com/electerm/electerm/wiki) — deep docs for every feature above
- [Video guides](/videos/) — 40+ short demos, one per feature
- [Download](https://electerm.org/#downloads) — pick your platform and try the demo bookmark first
