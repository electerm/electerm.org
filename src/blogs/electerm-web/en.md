---
title: 'Electerm-web: Self-Host Electerm in Your Browser with Docker'
description: electerm-web is the self-hosted web version of electerm — the full terminal client (SSH, SFTP, FTP, RDP, VNC, SPICE, Telnet) running on your own server in Docker. When to choose it over desktop or cloud, how to deploy in one command, and how to lock it down and customize it.
date: 2026-09-24
tags: [electerm-web, self-hosted, docker, browser, ssh, customization]
bannerScript: banner.js
---

# Electerm-web: Self-Host Electerm in Your Browser with Docker

Desktop electerm is great when you are sitting at your own machine. [Electerm online](/blogs/electerm-online/) is great when you are on someone else's machine and just need a browser tab. But there is a third situation: **you have your own server, you want your own data, your own login, your own rules** — no third party in the middle.

That is [**electerm-web**](https://github.com/electerm/electerm-web): the web-app version of electerm, packaged so you can run it yourself — most easily with Docker — and open it from any browser, including a phone.

> **One sentence:** electerm-web is electerm running on *your* machine, served over HTTP, used from a browser tab. Same UI, same SSH/SFTP/RDP/VNC stack, but you own the server.

Feature video: [Electerm Usage Demo](/videos/electerm-usage-demo/).

## Desktop vs online vs web: which one?

They share the same codebase and the same face, but they answer different questions:

| | Desktop electerm | Electerm online (cloud) | electerm-web (self-hosted) |
|---|---|---|---|
| **Runs on** | Your laptop / desktop | Maintainer's VPS | Your VPS, NAS, home lab, Raspberry Pi |
| **Open with** | Installed app | [cloud.electerm.org](https://cloud.electerm.org), GitHub sign-in | `http://your-server:8082`, your own password |
| **Data lives** | On your machine | On the cloud server | On your disk / Docker volume |
| **Install needed on client?** | Yes | No, just a browser | No, just a browser |
| **Best for** | Daily driver, local shell, serial port | Borrowing a machine, quick fix from a phone | Personal gateway you control |

Try the hosted demo first if you just want to look: [demo.electerm.org](https://demo.electerm.org). If you like what you see and want it under your own control, keep reading.

## What it actually runs

Not a "lite" terminal. It is the electerm client served as a web app: the same tab bar, session control bar, footer, themes, and keyboard shortcuts, with almost the full protocol list:

**SSH, SFTP, FTP, Telnet, RDP, VNC, SPICE** — plus the SSH feature set (agent forwarding, local/remote port forwarding, dynamic SOCKS, X11 forwarding, tunnelling, connection hopping), quick commands, triggers, batch/mirror input, split panes, drag-and-drop SFTP, workspaces, the AI assistant, sync via gist/WebDAV/custom server, and 14 interface languages.

Two honest differences from the desktop app:

- **Local terminal and serial port are host-side.** On a VPS there is no useful "local shell" to give a browser user, so you will normally disable it (see below). Serial only makes sense if the USB dongle is plugged into the host.
- **The browser cannot open raw TCP to port 22.** SSH sessions are proxied through your server — which is exactly why you want that server to be *yours*.

## When the desktop app cannot do it

This is the part people discover late:

1. **A machine you cannot install on.** Locked-down work laptop without admin rights, a Chromebook, a library PC, a customer's jump box — if it has a modern browser, it has electerm.
2. **A device with no desktop build.** iPad, Android tablet, a phone at dinner when the deploy breaks. The web UI is responsive; the phone layout is usable for restart-the-service fixes.
3. **Reaching a private network from outside.** Put electerm-web on a small box *inside* your home lab or office network, expose just the web UI through Tailscale / WireGuard / nginx, and your bookmarks to `192.168.x.x` hosts suddenly work from a hotel.
4. **One gateway, many clients.** Your bookmarks, themes and quick commands live on the server. Open the same URL from laptop, tablet and phone — same setup, nothing to sync.
5. **Kiosk / shared-machine scenarios.** A workshop PC or a NOC screen that should only offer SSH into fixed hosts: deploy once, bookmark the hosts, hand out the URL instead of installing and configuring every seat.

If none of that sounds like you, stay on the desktop app. If even one does, self-hosting earns its keep.

## Where custom control comes in

The cloud service gives you zero knobs. Your own instance gives you all of them:

- **Your auth.** Put a password in front of the whole UI (`ENABLE_AUTH`), backed by your own `SERVER_SECRET`.
- **Your attack surface.** Turn off the local terminal on an internet-facing host (`DISABLE_LOCAL_TERMINAL=1`).
- **Your data directory.** Point `DB_PATH` at a Docker volume — or straight at your desktop electerm data folder to reuse the same bookmarks.
- **Your network.** Bind `HOST`/`PORT`, sit nginx with TLS in front (examples ship in the repo), restrict by IP, VPN-only, whatever your policy says.
- **Your code.** `config.js` supports a custom `Db` wrapper and `extensions.appExtend` — mount extra Express routes, some with JWT login required. Plus [init from URL query string](https://github.com/electerm/electerm-web/wiki/Init-from-url-query-string) for pre-filled connections.

That is the real pitch: not just "electerm without installing", but "electerm behind *your* rules".

## Deploy it: Docker in one command

The fastest path is the prebuilt image ([electerm-web-docker](https://github.com/electerm/electerm-web-docker), `zxdong262/electerm-web` on Docker Hub). Data lives in `/home/electerm/data` inside the container, the app listens on `5577`.

Basic, no login (only for localhost / VPN):

```sh
docker run --init \
  -v $(pwd)/electerm-web-data:/home/electerm/data \
  -e "DB_PATH=/home/electerm/data" \
  -e "HOST=0.0.0.0" \
  -p 8082:5577 \
  zxdong262/electerm-web
```

Then visit `http://127.0.0.1:8082`.

With a login password (do this for anything internet-facing):

```sh
docker run --init \
  -v $(pwd)/electerm-web-data:/home/electerm/data \
  -e "DB_PATH=/home/electerm/data" \
  -e "HOST=0.0.0.0" \
  -e "SERVER_SECRET=some_server_secret" \
  -e "SERVER_PASS=password_to_login" \
  -e "ENABLE_AUTH=1" \
  -p 8082:5577 \
  zxdong262/electerm-web
```

On Linux, add `--user "$(id -u):$(id -g)"` to avoid data files owned by root.

Prefer Compose? `docker-compose.yml`:

```yaml
services:
  electerm-web:
    image: zxdong262/electerm-web:latest
    container_name: electerm-web
    volumes:
      - ./electerm-data:/home/electerm/data
    environment:
      - DB_PATH=/home/electerm/data
      - HOST=0.0.0.0
      # - SERVER_SECRET=some_server_secret
      # - SERVER_PASS=password_to_login
      # - ENABLE_AUTH=1
    ports:
      - "8082:5577"
    init: true
    restart: unless-stopped
```

```sh
UID=$(id -u) GID=$(id -g) docker-compose up -d
```

### Reuse your desktop data

Point the volume at your existing desktop folder instead of a fresh directory, and your bookmarks come along:

```sh
# macOS
docker run --init --user "$(id -u):$(id -g)" \
  -v "/Users/<you>/Library/Application Support/electerm":/home/electerm/data \
  -e "DB_PATH=/home/electerm/data" -e "HOST=0.0.0.0" \
  -p 8082:5577 zxdong262/electerm-web

# Linux
docker run --init --user "$(id -u):$(id -g)" \
  -v "/home/<you>/.config/electerm":/home/electerm/data \
  -e "DB_PATH=/home/electerm/data" -e "HOST=0.0.0.0" \
  -p 8082:5577 zxdong262/electerm-web
```

Or keep it clean: start fresh in Docker, then use the desktop app's **export** and the web app's **Data Sync → import**. Video: [Electerm Data Import Export](/videos/electerm-data-import-export/).

### From source (one line)

On a Linux/Mac host with Node.js 24:

```sh
curl -o- https://electerm.org/scripts/one-line-web.sh | bash
# or: wget -qO- https://electerm.org/scripts/one-line-web.sh | bash
```

On Windows (PowerShell):

```powershell
Invoke-WebRequest -Uri "https://electerm.org/scripts/one-line-web.bat" -OutFile "one-line-web.bat"
cmd.exe /c ".\one-line-web.bat"
```

For production from source: `npm run build`, then `npm run prod` (or `./build/bin/run-prod.sh`) — the server listens on `5577` by default. See the [electerm-web README](https://github.com/electerm/electerm-web) for dev mode (`npm start` + `npm run dev` → `http://127.0.0.1:5580`).

## Lock it down properly

electerm-web is for **personal use**. Treat an internet-exposed instance like the SSH gateway it is:

1. **Enable auth, always, on the open internet.** `ENABLE_AUTH=1` with a long random `SERVER_SECRET` and a strong `SERVER_PASS`. No auth = anyone with the URL gets your terminals.
2. **Disable the local terminal on a server.** `DISABLE_LOCAL_TERMINAL=1` — a browser user has no business with the host's shell.
3. **Put TLS in front.** The repo ships `examples/nginx.conf` and `examples/nginx-ssl.conf` — bind a domain, terminate HTTPS at nginx, proxy to `127.0.0.1:5577`.
4. **Prefer key auth for your SSH hosts.** Generate a key, install the public half on each server, use the private half in electerm-web. Passwords typed into any web app travel further than you think.
5. **Keep it single-user in your head.** There is one login (`SERVER_PASS`), one data directory. It is your personal gateway, not a team bastion with audit logs. For shared fleets, pair it with per-host OS users and keys.

Do those five and a €5 VPS becomes a perfectly respectable personal jump host.

## Customizing further

Once it runs, three files control everything:

- **`.env`** (from `.sample.env`): `HOST`, `PORT`, `SERVER`, `CDN`, `SERVER_SECRET`, `SERVER_USER`, `SERVER_PASS`, `TOKEN_EXPIRED_TIME`, `DB_PATH`, plus the flags above.
- **`config.js`** (from `config.sample.js`): plug in your own `Db` class (Mongo-like `find`/`findOne`/`insert`/`update`/`remove`) or `extensions` with `appExtend(app, jwtMiddleWare, jwtErrorHandler)` to add routes — public ones and login-protected ones.
- **`examples/nginx*.conf`**: copy-paste starting points for domain + TLS.

And for scripted entry points, the [init-from-URL wiki](https://github.com/electerm/electerm-web/wiki/Init-from-url-query-string) lets you craft links that open electerm-web with a connection pre-filled — handy for a status page with a "SSH into this box" button.

## The short version

- **electerm-web** ([source](https://github.com/electerm/electerm-web), [docker](https://github.com/electerm/electerm-web-docker)) is electerm you host yourself and use from a browser.
- **Use it when** you cannot install (locked-down laptop, Chromebook, tablet, phone), you need into a private network from outside, or you want one gateway with your own auth, data and network rules.
- **Deploy it** with one `docker run`, reuse your desktop bookmarks via `DB_PATH` or export/import.
- **Secure it**: `ENABLE_AUTH`, `DISABLE_LOCAL_TERMINAL`, nginx + TLS, SSH keys, personal-use mindset.

Related: [Electerm Online](/blogs/electerm-online/) for the zero-deploy option, [Install Electerm](/blogs/install-electerm/) for the desktop app, [SSH in Electerm](/blogs/ssh-features-guide/) for what to do once you are connected.
