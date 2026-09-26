---
title: 'Connection Hopping in Electerm: Jump Hosts Without the ProxyJump Dance'
description: Reach private servers through one or more jump hosts in electerm — how the ordered hop list works, per-hop auth (agent, keys on the jump host, passwords), the v1.50.65 order change, and hopping for SSH, VNC and RDP.
date: 2026-09-27
tags: [ssh, jump-host, bastion, hopping, security, productivity]
videos: [electerm-connection-hop, electerm-connection-jump]
bannerScript: banner.js
---

# Connection Hopping in Electerm: Jump Hosts Without the ProxyJump Dance

Your database lives at `10.0.0.5`. No public IP, no port 22 on the internet — the only way in is `laptop → bastion.example.com → 10.0.0.5`. With OpenSSH you would write a `ProxyJump` stanza, juggle `-J` flags and agent forwarding, and re-type two passwords in the right order.

Electerm turns that chain into an ordered list on the bookmark: add each hop with its own host, user and credential, and the final destination stays what the bookmark already says. Watch the banner above — one loop connects hop 1, tunnels through it with `forwardOut`, then lands on the target. That loop is this whole article.

Base references: [Connection Hopping Behavior Change since v1.50.65](https://github.com/electerm/electerm/wiki/Connection-Hopping-Behavior-Change-in-electerm-since-v1.50.65) and the SSH overview this post belongs to: [SSH in Electerm](/blogs/ssh-features-guide/).

## The 30-second mental model

A hop chain is just nested SSH connections. Electerm dials them **in the order you list them**, each one tunneled inside the previous via `conn.forwardOut`, and opens the shell only on the last host:

```
laptop ──SSH──► bastion ──forwardOut──► gateway ──forwardOut──► 10.0.0.5 (shell here)
```

Three facts that clear up most confusion:

- The **bookmark's own host is the final destination** — it is *not* in the hop list. The list holds only the intermediaries.
- The list is **connection order, top first**: row 1 = first dialed, last row = the hop just before the target. Drag the `⋮⋮` handle to reorder.
- Under the list electerm renders the full path live: `👤 -> bastion -> gateway -> 10.0.0.5` (`renderPaths` in `src/client/components/bookmark-form/common/connection-hopping.jsx`). If the path reads wrong, the order is wrong.

## Where hopping lives in electerm

Open any SSH bookmark → the **Connection Hopping** tab (`src/client/components/bookmark-form/config/ssh.js` → `connectionHoppingTab()`, UI in `connection-hopping.jsx` + `connection-hopping-form.jsx`):

1. Fill **host** (required), **port** (default `22`), **username**.
2. Pick an **auth type** and fill the credential — password, private key + optional passphrase, certificate, or a saved **profile**. Each hop has independent auth.
3. Shortcut: **choose from bookmarks** — pick an existing bookmark and its host/user/auth lands in the form. Edit the password if that bookmark never stored one.
4. Click the add button. The row appears as `user:*****@host:port (privateKey:*****)`, with edit pencil and delete icons.
5. Repeat for hop 2, hop 3… **Save the bookmark and connect.** Electerm dials hop 1, then hop 2 through hop 1, and so on, then the bookmark host through the last hop. Terminal, SFTP and SSH tunnels all ride the final connection.

Need to change one later? Pencil to edit (modal), minus to delete, drag to reorder. A bookmark can hold **as many hops as needed** (`connectionHoppings` is an array in `src/client/common/bookmark-schemas.js`).

Power-user note: quick-connect strings carry hops too, e.g. `ssh://user@10.0.0.5?opts={"connectionHoppings":[{"host":"bastion.example.com","port":22,"username":"jumper"}]}`.

## The v1.50.65 order change (read this once)

Since **v1.50.65** the list means *connection order*. The engine (`adjustConnectionOrder` in `src/app/server/session-ssh.js`) takes row 1 as the first connection and appends the bookmark's own host/port/user/key as the final step:

```js
// what you see: hops = [bastion, gateway], bookmark host = 10.0.0.5
// what connects: bastion -> gateway -> 10.0.0.5
const [firstHopping, ...restHoppings] = initOptions.connectionHoppings
initOptions.connectionHoppings = [...restHoppings, currentHostHopping]
```

Before that version the order semantics were reversed, so bookmarks created with the old client show a one-time warning banner (`ConnectionHoppingWarningText`, `hasOldConnectionHoppingBookmark`) linking to the [wiki](https://github.com/electerm/electerm/wiki/Connection-Hopping-Behavior-Change-in-electerm-since-v1.50.65). If you see that banner: read the wiki, drag the rows into connection order, click "have read", and you are done forever.

> Rule of thumb: the `👤 -> …` path under the table must read like your `ssh -J bastion,gateway target` command, left to right.

## 1. Single hop: the bastion case

**Shape:** bookmark host = `10.0.0.5` (private), hops = `[bastion.example.com]`.

**Setup:**

- Bookmark itself: host `10.0.0.5`, port `22`, username `dbadmin`, your DB-side credential.
- Hop row 1: host `bastion.example.com`, port `22`, username `jumper`, bastion credential.
- Path line should read `👤 -> bastion.example.com -> 10.0.0.5`.

Save, connect. Electerm SSHes to the bastion first, calls `conn.forwardOut('127.0.0.1', 0, '10.0.0.5', 22)` on it, and runs the next SSH handshake through that stream (`jump()` / `hopping()` in `session-ssh.js`). CLI twin: `ssh -J jumper@bastion.example.com dbadmin@10.0.0.5`.

Video: [Electerm Connection Hop](/videos/electerm-connection-hop/) (and the older [Electerm Connection Jump](/videos/electerm-connection-jump/) recorded before the order change — row order there is legacy).

## 2. Multi-hop chains

Add rows top-down in dial order. Example — `laptop → bastion → 10.0.0.9 (gateway) → 10.0.0.5 (db)`:

- Hop row 1: `bastion.example.com`
- Hop row 2: `10.0.0.9` (as reachable *from the bastion* — private addresses are fine from row 2 on)
- Bookmark host: `10.0.0.5` (as reachable *from 10.0.0.9*)

Each hop's `host:port` is resolved **from the previous hop's network**, exactly like chained `ProxyJump`. Every hop connection is kept in `this.conns` and all of them are torn down together when you close the tab (`endConns` / `kill()` — no orphaned bastion sessions).

There is no hardcoded hop limit. Two or three is typical; beyond that, check whether a VPN, NetBird route or one SOCKS tunnel would serve you better (see below).

## 3. Per-hop auth: agent, jump-host keys, passwords

Each hop authenticates independently, and electerm tries hard to avoid prompting you. In order, per hop (`jumpConnect` / `retryJump` / `readPrivateKeyInJumpServer`):

1. **SSH agent first.** Agent forwarding semantics apply to the whole chain, and electerm enables the agent by default (`useSshAgent`, custom `sshAgent` path supported). If the agent can auth a hop, no key reading happens for that hop.
2. **Keys living on the jump host.** If the agent fails and the hop has no explicit password/key, electerm lists `~/.ssh/*.pub` on the *current* hop and tries each private key through it (`ls ~/.ssh`, `cat <key>`). A passphrase prompt appears only if a key needs one.
3. **Saved password / key on the hop row.** Whatever you stored in the form is tried before any prompt.
4. **Interactive prompt as last resort.** `password for user@hop` (or `passphase for hop/keypath`) pops in the login dialog. Keyboard-interactive-only targets auto-fill the saved password without showing a prompt (#4427, `onKeyboardEvent` with `passwordOverride`).
5. **Host-key confirm per hop.** Each new hop/host triggers the known-hosts verifier (`createHostVerifier`, `getHostVerificationTarget`), so a first-time bastion asks once, then never again.

Practical consequences:

- Prefer the **agent** for daily use: load keys once in `ssh-agent` / 1Password / KeePassXC and leave hop rows credential-free.
- For unattended bookmarks (a shared jump user), store the hop **password or key in the row**, or point the row at a **profile**.
- Hop rows accept **certificates** too — same `privateKey + certificate + passphrase` triple as the main bookmark, matched against the hop's principals.

## 4. Hopping for VNC / RDP (and Spice)

Hopping is not SSH-tabs-only. VNC, RDP and Spice bookmarks have the same tab, implemented differently (`src/app/server/session-hop.js` → `createHopProxy`): electerm pops the last hop, opens a throwaway SSH session to it with a **dynamic SOCKS forward** on a free loopback port, and points the desktop protocol at `socks5://127.0.0.1:<freePort>`. Close the desktop tab and the SSH session is killed with it.

So a VNC server at `10.0.0.20:5900` behind the same bastion is just: VNC bookmark host `10.0.0.20` + hop row `bastion.example.com`. Same mental model, same ordering.

## 5. Hopping vs tunnels vs ProxyCommand vs NetBird

| Need | Use | Why |
|---|---|---|
| Shell/SFTP on a host behind a bastion | **Hopping** (this post) | Chain-aware auth per hop, whole session rides through |
| Reach a *port* (DB, admin UI) behind a server you already SSH to | **SSH tunnel** (`-L`) | No extra hop login; see [SSH tunnels](/blogs/ssh-tunnels/) |
| Mesh / SSO / private DNS (NetBird, Tailscale-style, `cloudflared`, `aws ssm`) | **ProxyCommand** / NetBird | Transport is a command's stdio, not a hop SSH login; see [SSH overview](/blogs/ssh-features-guide/) |
| Static hop with exotic `ssh_config` options | `ProxyJump` in `~/.ssh/config` + plain bookmark | Electerm honors agent; hopping UI is easier to share with a team |

Notes from the code: when a bookmark has hops, **proxy-command/NetBird auto-detect is skipped** (`maybeProxyCommandSock` returns early) and **X11 forwarding setup is skipped for intermediate hops** — the shell channel opens only on the final host.

## Troubleshooting checklist

1. **Wrong host reached / "connection refused" on hop 2+** — the hop's host is resolved from the *previous* hop, not your laptop. SSH onto hop 1 and try the hop-2 address there first. Private `10.x` names belong in rows 2+, never as "works from my laptop".
2. **Order looks backwards** — you may carry a pre-v1.50.65 bookmark. Check the `👤 -> …` path: it must read in dial order. Drag rows, confirm the warning away.
3. **"All configured authentication methods failed" on a hop** — the hop row has no usable credential *and* the agent has no key *and* the jump host holds no `~/.ssh` key. Add the hop password/key, or load the key into your agent. Keyboard-interactive-only targets need their password saved on the bookmark (auto-filled, #4427).
4. **Password prompt asks for the wrong host** — hop prompts are named `password for user@hop-host`. Read the hostname in the dialog; the target password lives on the bookmark, hop passwords live on rows.
5. **Hop allows shell but forwarding fails** — intermediate servers need `AllowTcpForwarding yes` (default on most distros). `AllowTcpForwarding no` / `DisableForwarding` on a bastion breaks every hop past it — server-admin fix, not an electerm bug.
6. **Host-key prompt loops** — each hop verifies independently. "Trust" once per new hop/host; a changed server key must be cleared in known-hosts like any SSH client.
7. **Chain drops with the tab** — by design: hops live in `conns` bound to the session lifecycle. Reconnect rebuilds the whole chain; for work that must survive the network, run the payload in tmux on the target (plus [session keepalive](/blogs/session-keepalive/) for idle kills).

## Cheat-sheet

- Final destination = **bookmark host**. Hops list = **intermediaries in dial order**, `👤 -> hop1 -> hop2 -> target`.
- Each hop: host + port + user + its own credential (agent / jump-host `~/.ssh` keys / saved password / cert / profile). "Choose from bookmarks" fills the form.
- Since v1.50.65 list order = connection order; old bookmarks get a one-time warning with the wiki link.
- Engine: `forwardOut` per hop, one ssh2 `Client` per hop, all killed with the tab. VNC/RDP hops ride a dynamic-SOCKS proxy instead.
- Hops + tunnels compose: hop to the private net, then `-L` the DB port — one bookmark does both.
- CLI twins: single hop `ssh -J jumper@bastion dbadmin@10.0.0.5`, chain `ssh -J bastion,gateway target`.

Next: [SSH in Electerm](/blogs/ssh-features-guide/) for auth, tunnels and NetBird that pair with these hops — or [SSH Tunnels](/blogs/ssh-tunnels/) when you need a port, not a shell, on the far side.
