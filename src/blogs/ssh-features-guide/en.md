---
title: 'SSH in Electerm: Authentication, Jump Hosts, NetBird and Tunnels'
description: Master SSH in electerm — password and public-key auth, ssh-agent, OpenSSH certificates, MFA keyboard-interactive prompts, connection hopping, NetBird and proxy-command, and local/remote/dynamic SSH tunnels.
date: 2026-06-20
tags: [ssh, authentication, tunnel, netbird, jump-host, security]
videos: [electerm-connection-hop, electerm-connection-jump, electerm-local-to-remote-ssh-tunnel, electerm-remote-to-local-ssh-tunnel, electerm-dynamic-socks-proxy, electerm-view-ssh-server-info, electerm-batch-operations]
---

# SSH in Electerm: Authentication, Jump Hosts, NetBird and Tunnels

SSH is electerm's most-used protocol, and its bookmark editor exposes almost the full OpenSSH feature set through a GUI. This post maps each option to its wiki doc and demo video.

Base references: [SSH Agent](https://github.com/electerm/electerm/wiki/ssh-agent), [SSH Certificate Authentication Guide](https://github.com/electerm/electerm/wiki/SSH-Certificate-Authentication-Guide-for-electerm), [How to Use SSH Tunnel](https://github.com/electerm/electerm/wiki/How-to-use-ssh-tunnel), [Connection Hopping Behavior Change since v1.50.65](https://github.com/electerm/electerm/wiki/Connection-Hopping-Behavior-Change-in-electerm-since-v1.50.65), [SSH Proxy Command and NetBird Support](https://github.com/electerm/electerm/wiki/SSH-Proxy-Command-and-NetBird-Support), [Keep SSH Session Alive](https://github.com/electerm/electerm/wiki/Keep-SSH-Session-Alive).

## 1. Password authentication

The simplest path: bookmark → username + password → connect. Electerm stores the secret in the OS keychain-encrypted store (optionally behind a startup password), supports `keyboard-interactive` fallback, custom `serverHostKey` / `cipher` lists, charset (`encode`, `envLang`) for CJK servers ([GBK example](https://github.com/electerm/electerm/wiki/Connecting-to-Servers-with-Special-Character-Encoding)), and run-scripts after connect.

Tip: use **quick-connect** (`user@host`, `ssh://user:password@host:22`) for one-offs you don't want to save. Full connection-string reference: [Quick Connect](https://github.com/electerm/electerm/wiki/quick-connect).

## 2. Public-key authentication

Bookmark → PrivateKey/Certificate section → paste key content or pick a key file → optional **passphrase**. Electerm accepts RSA / ed25519 / ECDSA keys, `~/.ssh/config`-style passphrases, and per-bookmark `authType` (`password | privateKey | profiles`). Saved auth can be reused across bookmarks via **profiles**.

Generate a key if you need one:

```bash
ssh-keygen -t ed25519 -C "laptop-electerm"
ssh-copy-id user@server
```

## 3. SSH agent and agent forwarding

Electerm enables **ssh-agent** by default: on connect it tries `$SSH_AUTH_SOCK`, so keys loaded in `ssh-agent` / Pageant / 1Password / KeePassXC just work without re-entering passphrases. Per bookmark you can:

- turn **Use SSH Agent** off,
- set a **custom agent path** if your agent socket is non-standard.

This mirrors OpenSSH agent forwarding semantics for hop chains. Details: [SSH Agent wiki](https://github.com/electerm/electerm/wiki/ssh-agent).

## 4. OpenSSH certificate authentication

For teams, certificates beat static `authorized_keys`: the server trusts a CA once, and every user cert signed by that CA works until its expiry — no key distribution, built-in revocation, principals and forced commands.

Server side (once):

```bash
# CA key
ssh-keygen -t ed25519 -f ca_key -C "SSH CA"
# trust the CA on each server (/etc/ssh/sshd_config):
# TrustedUserCAKeys /etc/ssh/ca_key.pub
```

Issue a user cert:

```bash
ssh-keygen -s ca_key -I user-01 -n ubuntu,deploy \
  -V -1w:+52w -z 1 id_ed25519.pub
# produces id_ed25519-cert.pub
ssh-keygen -L -f id_ed25519-cert.pub  # verify principals, validity
```

In electerm: bookmark → PrivateKey/Certificate → import **private key + certificate file** → optional passphrase → username must match a certificate principal. Full 700-line walkthrough with screenshots and troubleshooting: [SSH Certificate Authentication Guide](https://github.com/electerm/electerm/wiki/SSH-Certificate-Authentication-Guide-for-electerm).

## 5. MFA / two-factor logins

Servers with TOTP / Duo / hardware-key second factors typically implement them as **keyboard-interactive** prompts after the first factor. Electerm renders those prompts natively in the login dialog — enter password, then the TOTP code when asked. No extra setting is needed; if `ssh -o PreferredAuthentications=keyboard-interactive` works from a terminal, the same server works in electerm. For flaky networks also tune keep-alive ([Keep SSH Session Alive](https://github.com/electerm/electerm/wiki/Keep-SSH-Session-Alive)).

## 6. Connection hopping (jump hosts)

Need `laptop → bastion → internal-db`? Add **connection hoppings** to the bookmark: each hop has its own host/port/user/password/key/cert. Since **v1.50.65** the order is: connect each hop in listed order, then the final bookmark host through them (older bookmarks keep the legacy order for compatibility).

Example: bookmark host = `10.0.0.5` (private), hops = `[bastion.example.com]`. Electerm dials bastion first, then tunnels to `10.0.0.5` through it. Chain as many hops as needed.

- Wiki: [Connection Hopping Behavior Change since v1.50.65](https://github.com/electerm/electerm/wiki/Connection-Hopping-Behavior-Change-in-electerm-since-v1.50.65)
- Videos: [Electerm Connection Hop](/videos/electerm-connection-hop/) and the older [Electerm Connection Jump](/videos/electerm-connection-jump/)

## 7. NetBird and proxy-command

Electerm supports OpenSSH-style **ProxyCommand** per bookmark (`%h` host, `%p` port, `%r` user expanded), which unlocks `netbird ssh proxy`, `cloudflared access ssh`, `aws ssm session-manager-plugin`, `kubectl exec` transports — the whole SSH session (terminal, SFTP, tunnels) rides through the command's stdio.

**NetBird is zero-config**: if the `netbird` binary is installed and you connect to a `100.64.0.0/10` peer address, electerm runs `netbird ssh detect`, then `netbird ssh proxy`, and shows the SSO login URL in a notification. Host-key checking is skipped for proxied connections (ephemeral keys — same as NetBird's own ssh_config). Set `ELECTERM_NETBIRD_BIN` if the binary is not in `PATH`.

```text
# bookmark Settings → proxy command examples:
netbird ssh proxy %h %p
cloudflared access ssh --hostname %h
```

Wiki: [SSH Proxy Command and NetBird Support](https://github.com/electerm/electerm/wiki/SSH-Proxy-Command-and-NetBird-Support). Generic SOCKS5/HTTP proxies go in the bookmark `proxy` field (`socks5://127.0.0.1:1080`); see [proxy format](https://github.com/electerm/electerm/wiki/proxy-format).

## 8. SSH tunnels: -L, -R and -D in GUI form

Bookmark → tunnel section. Three modes ([wiki](https://github.com/electerm/electerm/wiki/How-to-use-ssh-tunnel)):

| Mode | CLI equivalent | Example |
|---|---|---|
| Forward local → remote | `ssh -L 5000:localhost:6000` | visit `http://127.0.0.1:5000`, get `remote:6000` |
| Forward remote → local | `ssh -R 6000:localhost:5000` | visit `http://remote:6000`, get your local `:5000` |
| Dynamic (SOCKS) | `ssh -D 1080` | point the browser at `socks5://127.0.0.1:1080` |

Set local/remote host+port per tunnel, give it a name, save — tunnels come up with the session automatically. Videos:

- [Local to Remote SSH Tunnel](/videos/electerm-local-to-remote-ssh-tunnel/)
- [Remote to Local SSH Tunnel](/videos/electerm-remote-to-local-ssh-tunnel/)
- [Dynamic SOCKS Proxy](/videos/electerm-dynamic-socks-proxy/)

## 9. Operate at scale

Combine the above with **batch operations** (run one command across N SSH sessions), **mirror input**, **quick commands**, X11 forwarding (`Use X11`), server-info dashboard (CPU/mem/disk/net/processes — [video](/videos/electerm-view-ssh-server-info/)), and trzsz/rzsz file transfer inside the terminal. If a session drops, keep-alive + auto-reconnect + workspace restore bring the fleet back in one click.

## Cheat-sheet

- Simple homelab → password or key bookmark, done.
- Laptop with hardware keys → enable ssh-agent, no passphrases in electerm.
- Team of 20+ → CA + short-lived certificates, principals per role.
- Private VPC → hopping or NetBird/proxy-command, never expose port 22.
- Dev loop → `-L` tunnel for remote DB/admin UI, `-D` SOCKS for browsing as the server.

Next: [AI Features in Electerm](/blogs/ai-features-guide/) — generate commands, bookmarks and themes from natural language, and let agent mode run the boring parts for you.
