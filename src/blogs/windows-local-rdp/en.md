---
title: 'Open an electerm bookmark in Windows Remote Desktop'
description: 'Use an RDP bookmark to launch the Windows Remote Desktop client, sign in through Windows, and switch back to an electerm tab when you need a proxy or SSH hop.'
date: 2026-11-23
tags: [rdp, windows, bookmarks]
---

If you keep your server addresses in electerm but prefer Windows Remote Desktop Connection for multi-monitor work, you can now launch it straight from an RDP bookmark. The Windows desktop app remembers your choice for each bookmark, so you can use the Windows client for your workstation and keep other remote desktops inside electerm.

## Open a bookmark with the Windows client

1. In electerm on Windows, edit an existing RDP bookmark or create one for the remote PC. Enter its host and port (the default is `3389`).
2. On the **Auth** tab, just below **Network level authentication (NLA)**, turn on **Open with the local RDP client (Windows Only)** and save the bookmark.
3. Open the bookmark as usual. Windows starts Remote Desktop Connection (`mstsc.exe`) in a separate window. Sign in there if Windows prompts you.

electerm passes the address, port, NLA setting and any username you supplied. If you entered a plain username and a separate domain, it passes the domain too. Windows handles credentials, so a password saved in the electerm bookmark stays in electerm.

## When to use the built-in client

The Windows client connects directly from your PC. If a server is reachable only through the bookmark’s SOCKS proxy or SSH connection hops, use the built-in client for that host. electerm shows a warning if you launch the Windows client with either setting configured.

The electerm tab stays open after launch. From there you can launch the Windows client again or click **Switch to built-in RDP** to connect inside the current tab. To make the built-in client the default for future connections to this host, turn off the local-client switch in the bookmark and save it.
