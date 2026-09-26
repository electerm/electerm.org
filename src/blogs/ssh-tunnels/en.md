---
title: 'SSH Tunnels in Electerm: Local, Remote and Dynamic (SOCKS) Forwarding Without the Flags'
description: Master all three SSH tunnel types in electerm — local (-L), remote (-R) and dynamic SOCKS (-D): what each one does, when to use it, and how to set it up click by click in the bookmark editor.
date: 2026-09-26
tags: [ssh, tunnel, port-forwarding, socks, security, productivity]
videos: [electerm-local-to-remote-ssh-tunnel, electerm-remote-to-local-ssh-tunnel, electerm-dynamic-socks-proxy]
bannerScript: banner.js
---

# SSH Tunnels in Electerm: Local, Remote and Dynamic (SOCKS) Forwarding Without the Flags

`ssh -L`, `ssh -R` and `ssh -D` are three of the most useful flags in all of computing — and three of the easiest to mix up. Which side listens? Which side connects? Which direction does traffic flow?

Electerm puts all three in the bookmark editor as plain **L→R**, **R→L** and **dynamic (SOCKS proxy)** rows, with live tooltips that show your own host and port back at you. Watch the banner above — one loop cycles through all three modes. That loop is this whole article.

Base reference: [How to Use SSH Tunnel](https://github.com/electerm/electerm/wiki/How-to-use-ssh-tunnel). The SSH overview this post belongs to: [SSH in Electerm](/blogs/ssh-features-guide/).

## The 30-second mental model

Every SSH tunnel rides inside an SSH connection you already have. The only questions are **who listens** and **who gets reached**:

| Mode in electerm | CLI equivalent | Who listens | You get | Use it when |
|---|---|---|---|---|
| **L→R** `forwardLocalToRemote` | `ssh -L [localHost:]localPort:remoteHost:remotePort` | your laptop | something on/near the server | remote DB, admin UI, internal API |
| **R→L** `forwardRemoteToLocal` | `ssh -R [remoteHost:]remotePort:localHost:localPort` | the server | something on your laptop | show a teammate your local dev server, receive a webhook |
| **Dynamic** `dynamicForward` (SOCKS proxy) | `ssh -D [localHost:]localPort` | your laptop (SOCKS5) | *any* host, resolved through the server | browse as the server, reach many internal hosts at once |

One sentence each:

- **L→R:** "open an address on *my* machine that leads to an address on the *server's* side."
- **R→L:** "open an address on the *server* that leads back to an address on *my* machine."
- **Dynamic:** "open a SOCKS5 proxy on *my* machine; every connection I send through it exits from the *server*."

> The `remoteHost` in a tunnel is resolved **from the server's point of view**. `127.0.0.1` as remote host means "the server itself", not your laptop. That single fact clears up most tunnel confusion.

## Where tunnels live in electerm

Open any SSH bookmark → scroll to the **SSH tunnel** section (`src/client/components/bookmark-form/common/ssh-tunnels.jsx` + `ssh-tunnel-form.jsx`):

1. Pick the type: **L→R**, **R→L**, or **dynamicForward (socks proxy)**. L→R is the default.
2. Fill **local** host + port and (except dynamic) **remote** host + port. Defaults are `127.0.0.1:12200` local and `127.0.0.1:12300` remote — change them to your real ports.
3. Give it a **name** (e.g. `pg-prod`, `webhook`, `socks-home`) so the list stays readable.
4. Click the add button. The tunnel appears in the table as `→ local:… → remote:…` (or `socks5://…` for dynamic). Hover the `?` icons any time — the tooltip renders your *actual typed values* back as a flow diagram (`renderSshTunnelFlow`).
5. **Save the bookmark and connect.** Tunnels come up automatically with the session — no extra click, no background `ssh -fN` process to babysit.

Need to change one later? Hit the edit pencil in the table row, or the minus icon to delete. A bookmark can hold **many tunnels** (`sshTunnels` is an array) — e.g. Postgres + Redis + admin UI, all on one connection.

Under the hood (`src/app/server/ssh-tunnel.js`):

- L→R opens a TCP server on your machine (`net.createServer`) and dials out through the SSH connection (`conn.forwardOut`) per incoming socket.
- R→L asks the server to listen (`conn.forwardIn`) and pipes each inbound connection back to your machine (`net.connect`).
- Dynamic starts a local SOCKS5 server (`socksv5-server`) and forwards every SOCKS request through the connection (`conn.forwardOut`).
- Each accepted connection is isolated — one failing socket closes just itself, never the tunnel — and everything is torn down when the SSH connection closes.

Power-user note: quick-connect strings can carry tunnels too, e.g. `ssh://user@host:22?opts={"sshTunnels":[{"sshTunnel":"forwardLocalToRemote","sshTunnelLocalPort":8080,"sshTunnelRemoteHost":"localhost","sshTunnelRemotePort":80}]}`.

## 1. Local → Remote (`-L`): reach into the server's world

**The shape:** electerm listens on `localHost:localPort` on your laptop. Anything you send there is forwarded through the SSH connection to `remoteHost:remotePort` as seen from the server.

```
browser → 127.0.0.1:5000 (your laptop)
              │  SSH connection
              ▼
server → remoteHost:6000 (server's network)
```

**Setup (example: remote Postgres only listening on localhost):**

- Type: **L→R**
- Local: `127.0.0.1`, `5433` (use 5433 locally to avoid clashing with your own Postgres on 5432)
- Remote: `127.0.0.1`, `5432`
- Name: `pg-prod`

Save, connect, then point your client at `127.0.0.1:5433`:

```bash
psql -h 127.0.0.1 -p 5433 -U app prod
```

More examples with the same shape:

- Remote admin UI on port 3000 → local `127.0.0.1:5000`, open `http://127.0.0.1:5000`.
- Internal service reachable only from the server, e.g. remote `10.0.0.8:8080` → local `127.0.0.1:8080`. Remember: the remote host is resolved by the *server*, so private VPC addresses work here.
- CLI twin: `ssh -L 5433:127.0.0.1:5432 user@server`.

Video: [Local to Remote SSH Tunnel](/videos/electerm-local-to-remote-ssh-tunnel/).

## 2. Remote → Local (`-R`): let the server reach back to you

**The shape:** the *server* listens on `remoteHost:remotePort`. Anything connecting there is forwarded back through the SSH connection to `localHost:localPort` on your laptop.

```
teammate / webhook → server:6000
                        │  SSH connection (backwards)
                        ▼
your laptop ← 127.0.0.1:5000
```

**Setup (example: demo your local dev server to someone who can reach the server):**

- Type: **R→L**
- Remote: `127.0.0.1`, `6000`
- Local: `127.0.0.1`, `5000` (where `npm run dev` is listening)
- Name: `demo-friday`

Save, connect, then anyone on the server opening `http://127.0.0.1:6000` gets *your* local `:5000`.

Other uses:

- Receive a third-party webhook on your laptop via the server's public address.
- Expose a local API to a remote test runner without deploying.
- CLI twin: `ssh -R 6000:127.0.0.1:5000 user@server`.

Two gotchas specific to `-R`:

- If you want the remote port reachable from *other* machines (not just the server itself), the remote host must be `0.0.0.0` **and** the server needs `GatewayPorts yes` in `sshd_config`. Otherwise it stays loopback-only — which is the safe default.
- If the remote port is already taken on the server, the tunnel fails to bind. Pick another port.

Video: [Remote to Local SSH Tunnel](/videos/electerm-remote-to-local-ssh-tunnel/).

## 3. Dynamic (`-D`): a SOCKS5 proxy that exits from the server

**The shape:** electerm listens on `localHost:localPort` speaking SOCKS5. Point any SOCKS-aware app at it; each connection is forwarded through the SSH connection to whatever destination the app asked for, resolved by the server.

```
browser --SOCKS5--> 127.0.0.1:1080 (your laptop)
                        │  SSH connection
                        ▼  exits from the server
any host on the internet / VPC
```

**Setup:**

- Type: **dynamicForward (socks proxy)** — the remote host/port fields disappear, because there is no single destination.
- Local: `127.0.0.1`, `1080`
- Name: `socks-prod`

Save, connect, then:

- Firefox: Settings → Network → SOCKS5 `127.0.0.1:1080` (enable *proxy DNS* so names resolve through the server too).
- Chrome: `chrome --proxy-server="socks5://127.0.0.1:1080"`.
- curl: `curl --socks5 127.0.0.1:1080 https://ifconfig.me` — the returned IP is the *server's*, proving traffic exits there.
- CLI twin: `ssh -D 1080 user@server`.

Why dynamic instead of three `-L` tunnels? When the destinations are many, unknown upfront, or DNS-only-resolvable inside the VPC, one SOCKS proxy replaces an endless list of static forwards.

Video: [Dynamic SOCKS Proxy](/videos/electerm-dynamic-socks-proxy/).

## Troubleshooting checklist

1. **"Port already in use" locally** — another app (or another tunnel) owns `localPort`. `lsof -i :5433` / `netstat -tlnp`, then pick a free port. Local ports under 1024 need root — stay above them.
2. **Connection refused through the tunnel** — the tunnel is up but nothing listens at `remoteHost:remotePort` *from the server*. SSH into the server and try `curl remoteHost:remotePort` there first.
3. **Wrong `remoteHost` perspective** — `127.0.0.1` means the *server itself*. If the target is your laptop, you picked the wrong direction (you want R→L, not L→R).
4. **R→L reachable only on the server** — expected without `GatewayPorts yes` + remote host `0.0.0.0`. That is a server-side `sshd_config` change, not an electerm bug.
5. **Tunnel dies with the session** — by design: tunnels are bound to the SSH connection lifecycle (`conn.on('close')` tears them down). Reconnect and they come back; for work that must survive the network, run the payload inside tmux as well.
6. **Server forbids forwarding** — `AllowTcpForwarding no` (or `DisableForwarding`) on the server blocks all three modes. Needs a server admin to relax.
7. **SOCKS app ignores the proxy** — many apps need per-app proxy settings *and* remote DNS enabled; a quick `curl --socks5` test separates "tunnel broken" from "app not using the tunnel".

## Cheat-sheet

- Reach something near the server → **L→R** (`ssh -L localPort:remoteHost:remotePort`). Local port is yours, remote address is the server's view.
- Let the server reach your laptop → **R→L** (`ssh -R remotePort:localHost:localPort`). Needs `GatewayPorts` for non-loopback exposure.
- Reach *many* things as the server → **Dynamic SOCKS** (`ssh -D localPort`), point the app at `socks5://127.0.0.1:localPort`.
- In electerm: bookmark → tunnel section → type + hosts + ports + name → add → save → connect. Edit with the pencil, delete with the minus. Many tunnels per bookmark are fine.
- Tunnels start with the session and die with it — one connection, zero stray `ssh -fN` processes.

Next: [SSH in Electerm](/blogs/ssh-features-guide/) for auth, jump hosts and NetBird that pair with these tunnels — or [Session Keepalive](/blogs/session-keepalive/) if your long-lived tunneled sessions keep getting idle-killed.
