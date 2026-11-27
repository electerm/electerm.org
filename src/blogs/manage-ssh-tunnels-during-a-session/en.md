---
title: 'Manage SSH tunnels during a session'
description: 'Use the session toolbar in electerm 5.20.0 to open a temporary port forward, stop it when you’re done, and keep working in the same SSH tab.'
date: 2026-11-28
tags: [ssh, tunnels, port forwarding, session toolbar]
---

Say you’re watching a web app’s logs over SSH and want to see the page it just served. The app listens on port `3000` on the server’s loopback address. In electerm 5.20.0, you can forward that port to your laptop from the open SSH tab and keep watching the logs while you browse. [v5.20.0 release notes](https://github.com/electerm/electerm/releases/tag/v5.20.0)

## Open the web app in your local browser

1. In the connected SSH tab, click the plug icon in the session toolbar to open **SSH tunnel**. On mobile, open the **⋯** menu first.
2. Click **New SSH tunnel** and choose **L→R** (local to remote). Under **Local**, enter host `127.0.0.1` and an unused port on your laptop, such as `8080`. Under **Remote**, enter host `127.0.0.1` and port `3000`. The remote address is the one the SSH server uses to reach the app.
3. Give the tunnel a name like `web-preview` and click **Start**. When its row shows **Running**, open `http://127.0.0.1:8080` in your laptop’s browser. Requests to that address now reach the app through your SSH connection.

## Stop, restart, or remove a tunnel

Click **Stop** beside `web-preview` when you’re done. The local port is freed, and the row stays in the panel with its addresses and a **Start** button. Your shell and the tab’s other tunnels keep running. To remove the row as well, click its **−** icon. You can also remove a running tunnel directly.

If a tunnel fails to start, its row shows the error. For example, if port `8080` is already in use, remove the failed entry and add it again with a free local port.

## What happens when you reconnect?

A tunnel added from the toolbar lasts for that SSH connection. When you reconnect, electerm starts the tunnels saved in the bookmark again, including any you stopped or removed from the previous session. To have `web-preview` start every time, add it in the bookmark’s SSH tunnel settings and save the bookmark.

The toolbar also supports **R→L**, **-D socks**, and **-R socks**. For a diagram and a worked example of each direction, see the [SSH tunnels guide](/blogs/ssh-tunnels/).
