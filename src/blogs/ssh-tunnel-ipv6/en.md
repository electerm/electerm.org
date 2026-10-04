---
title: 'SSH Tunnels Over IPv6 in Electerm — Yes to All Three Modes, No to [::1]'
description: IPv6 works in every electerm tunnel mode — L→R, R→L and the dynamic SOCKS proxy. Here is how each one was verified end to end, which field takes the address, why a bracketed [::1] fails, and the routing bug IPv6 makes easy to hit.
date: 2026-10-04
tags: [ssh, tunnel, ipv6, port-forwarding, troubleshooting]
videos: [electerm-local-to-remote-ssh-tunnel, electerm-remote-to-local-ssh-tunnel]
bannerScript: banner.js
---

# SSH Tunnels Over IPv6 in Electerm — Yes to All Three Modes, No to [::1]

More and more boxes are IPv6-only, or reachable only over IPv6 from where you happen to be sitting. So the question comes up: do electerm's SSH tunnels work over IPv6 at all?

**Yes — all three modes, with a bare IPv6 literal in the host field.** Local→Remote, Remote→Local and the dynamic SOCKS proxy all handle it, and there is no IPv6-specific switch to go and find.

Two things are worth knowing anyway. One is a formatting trap that looks like a broken tunnel. The other is a real routing bug that IPv6 makes easy to trip over.

Base reference for the three modes: [SSH Tunnels in Electerm](/blogs/ssh-tunnels/). The SSH overview this belongs to: [SSH in Electerm](/blogs/ssh-features-guide/).

## The short answer

| Mode | Field that takes the IPv6 address | What crosses the wire | Result |
|---|---|---|---|
| **L→R** `forwardLocalToRemote` | **remote** host | `direct-tcpip` with `dstIP=::1` | works |
| **R→L** `forwardRemoteToLocal` | **remote** host (the bind address) | `tcpip-forward` with `bindAddr=::1` | works |
| **Dynamic** `dynamicForward` (SOCKS) | **local** host | TCP listener on `[::1]:1080` | works |

A hostname whose AAAA record resolves somewhere also works — you do not need a literal at all. The literal is just the case people are unsure about, and it is the case that tells you whether anything in the stack is silently assuming IPv4.

## How this was checked

Not by reading the code and hoping. The three tunnel functions live in `src/app/server/ssh-tunnel.js` and take nothing but a connected SSH client — so they can be driven straight from plain Node, with no Electron, no UI and no real sshd:

1. Start a local `@electerm/ssh2` server that behaves like sshd — it binds a real TCP server on whatever address a `tcpip-forward` request asks for, and dials the destination of each `direct-tcpip` channel.
2. Start an IPv6 echo server to act as "the thing on the other side".
3. Call electerm's real `forwardLocalToRemote`, `forwardRemoteToLocal` and `dynamicForward` against that, and push actual bytes through each one.

Here is what it reported, including the address strings that crossed the wire:

```
[1] forwardLocalToRemote   remote=::1  (L->R)
  OK data round-tripped through the tunnel target
  OK direct-tcpip carried dstIP=::1
[2] forwardRemoteToLocal   remote bind=::1  (R->L)
  OK server bound tcpip-forward on ::1:25555
  OK data round-tripped from the bind address back to local
[3] dynamicForward   local listener on ::1  (SOCKS)
  OK SOCKS server accepted a TCP connection on [::1]:27777
```

A round trip, not just "no error thrown" — a tunnel that connects to the wrong target also throws no error.

## Which field gets the IPv6 address

This is the part that is easy to get backwards, because it differs per mode.

- **L→R** — the **remote** host. That address is resolved *by the server*, so `::1` means the server's own IPv6 loopback, and any other IPv6 is looked up in the server's network.
- **R→L** — also the **remote** host, but here it is a *bind* address: the server opens a listener on it. `::1` means "only reachable from the server itself", exactly like `127.0.0.1` does for IPv4.
- **Dynamic (SOCKS)** — the **local** host, because that is where the SOCKS5 listener binds on your machine. The remote host field disappears in this mode.

Both fields default to `127.0.0.1`. Two substitutions cover almost everything:

- `::1` — IPv6 loopback. The IPv6 twin of `127.0.0.1`.
- `::` — every IPv6 interface. The IPv6 twin of `0.0.0.0`, and like `0.0.0.0` it is the address you need for R→L when you want *other* machines to reach the tunnel (plus `GatewayPorts yes` on the server). On many systems `::` also accepts IPv4 connections unless `bindv6only` is set, which is a property of the server's sysctl, not of electerm.

## Why it works — the address is just a string

There is no IPv6 code path in electerm's tunnels, and that is precisely why it works.

The SSH protocol carries the address in a `tcpip-forward` request or a `direct-tcpip` channel as a **length-prefixed opaque string**. In the `@electerm/ssh2` fork, `Protocol.tcpipForward`, `forwardedTcpip` and `directTcpip` all write it with a length prefix and `utf8Write` — there is no `isIPv4` check, no parsing, no conversion anywhere on the path. The server gets the characters you typed.

On the local side, Node's `net` accepts IPv6 literals in `listen()` and `connect()` without ceremony. And electerm never sets `forceIPv4` or `forceIPv6` on the connection, so the SSH host itself resolves both families too.

So the whole feature is "we pass strings through and Node handles them". Nothing to configure, nothing to enable.

## Trap 1 — `[::1]` is rejected

Write the address **bare**. `::1`, not `[::1]`.

```
remote host: [::1]      ->  ENOTFOUND, "Unable to bind to [::1]:26000"
remote host: ::1        ->  binds fine
```

The host field is a plain text input with no bracket stripping, so `[::1]` reaches the server verbatim, the server tries to bind a host literally named `[::1]`, and DNS resolution fails.

It is an understandable mistake, because brackets are *required* in two other places you have probably just come from:

- In a URL — `socks5://[::1]:1080` is the only correct way to write it, because the host has to be separated from the port.
- On the `ssh` command line — `ssh -R '[::1]:6000:localhost:5000' user@server` needs them for the same reason.

Electerm's tunnel form has **separate host and port fields**, so the ambiguity those brackets exist to solve cannot arise. Brackets are never needed there, and always harmful. Keep them for URLs, drop them for the form.

## Trap 2 — the same remote port on two bind addresses

This one is a real bug in electerm, and IPv6 is what makes it easy to reach.

`forwardRemoteToLocal` decides which incoming connection belongs to which tunnel by comparing the **port only**:

```js
if (info.destPort !== sshTunnelRemotePort && info.destPort !== Number(sshTunnelRemotePort)) {
  return
}
```

The destination *address* on that event is ignored. Now register two R→L tunnels that share a remote port but differ in bind address:

- `127.0.0.1:28888` → your local `:30001`
- `::1:28888` → your local `:30002`

Both tunnels install a listener, and both listeners match *every* incoming channel, because both are looking at the port. Measured result: connecting to `127.0.0.1:28888` on the server is answered by the **`::1` tunnel's** local target.

Before IPv6 this collision was rare — you had to deliberately bind two different IPv4 addresses on one port. Now that loopback exists twice (`127.0.0.1` and `::1`), "same port, different family" is a natural thing to configure, and it misroutes silently: you get a working connection to the wrong service, not an error.

The fix is to compare `info.destIP` as well, and it is not in yet. **Until it is, give each R→L tunnel its own remote port** if you are mixing families.

## Recipes

**A host that is only reachable over IPv6.** Connect the bookmark using the IPv6 address (or a AAAA-resolving name), then tunnel as usual. For a service bound to IPv6 loopback on the server:

- L→R, remote `::1`, remote port `5432`, local `127.0.0.1:5433`
- `psql -h ::1 -p 5433 -U app prod`

**Reach an IPv6-only service behind the server.** Same L→R shape, with the service's IPv6 as the remote host — e.g. remote `2001:db8::20`, port `8080`. Remember it is resolved from the server's side.

**Expose your laptop on the server's IPv6.** R→L with remote host `::` (or a specific IPv6 the server owns) and `GatewayPorts yes` in the server's `sshd_config` if it must be reachable beyond the server itself.

**SOCKS over IPv6.** Dynamic mode, local host `::1`, local port `1080`. Point the app at `socks5://[::1]:1080` — brackets here, because it is a URL:

```bash
curl --socks5 '[::1]:1080' https://ifconfig.me
```

**Link-local addresses.** Something like `fe80::1%en0` will be passed through as-is, but the zone id (`%en0`) is an **interface name on the machine that resolves or binds the address** — for L→R and R→L that is the server, not your laptop. If the server's interface is named differently, the zone means nothing there. Prefer a routable address when you can.

## Server-side requirements

These are the same for IPv6 as for IPv4, but they bite harder because they are easier to forget:

- `AllowTcpForwarding no` (or `DisableForwarding`) on the server blocks all three modes.
- For R→L, the address you ask the server to bind must actually exist there. `::1` needs IPv6 loopback on the server; a specific IPv6 needs that address assigned to one of its interfaces.
- Non-loopback R→L needs `GatewayPorts yes`, and for `::` the server needs IPv6 at all.
- The remote port must be free on the server. Note that `127.0.0.1:8080` and `::1:8080` are different sockets, so a v4 bind does not block a v6 one — which is exactly how Trap 2 gets set up.

## If it does not work

| Symptom | Likely cause |
|---|---|
| `Unable to bind to [::1]:…` | Brackets in the host field. Write `::1`. |
| `Unable to bind to ::1:…` | The server cannot bind that address — no IPv6 loopback, `GatewayPorts` not set for a non-loopback address, or the address is not assigned there. |
| Connection refused through the tunnel | The tunnel is up but nothing listens at that IPv6 address *from the server's view*. Test on the server first — `curl -g 'http://[::1]:6000/'` (the `-g` stops curl treating the brackets as a glob). |
| Tunnel connects, but the wrong local service answers | The R→L port collision above. Use distinct remote ports per tunnel. |
| Local "address already in use" | Something already owns that local port. `127.0.0.1:1080` and `::1:1080` are separate sockets, so both can be free or both taken independently. |
| Everything works for IPv4, nothing for IPv6 | The server has no IPv6 route to the target, or `AllowTcpForwarding` is off. Both are server-side. |

## Cheat sheet

- Address goes in **bare** — `::1`, `::`, `2001:db8::20`. Never `[::1]`.
- Brackets belong in URLs (`socks5://[::1]:1080`) and on the `ssh` command line. Never in the host field.
- L→R and R→L take it in the **remote** field. Dynamic takes it in the **local** field.
- `::1` is the IPv6 `127.0.0.1`. `::` is the IPv6 `0.0.0.0`, and needs `GatewayPorts yes` for outside access.
- Mixing families on one remote port hits the R→L routing bug — give each tunnel its own port for now.

Next: [SSH Tunnels in Electerm](/blogs/ssh-tunnels/) for what each mode is for in the first place, or [SSH in Electerm](/blogs/ssh-features-guide/) for auth, jump hosts and NetBird around them.
