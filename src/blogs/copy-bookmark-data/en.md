---
title: 'Copy a Bookmark: One Line to Paste Anywhere, or the Whole Record as JSON'
description: The bookmark form now has a copy button. It hands you the same one-line connection string the Quick Connect box and electerm:// links accept — or the complete bookmark record as JSON. Here is what each format carries, what it deliberately leaves out, and the one kind of password that will not survive the round trip.
date: 2026-10-08
tags: [bookmarks, quick-connect, share, backup, json, tips]
videos: [electerm-bookmark-operations, electerm-data-import-export]
bannerScript: banner.js
---

# Copy a Bookmark: One Line to Paste Anywhere, or the Whole Record as JSON

Electerm has always been able to turn a **string into a session**. Paste `ssh://user@host` into Quick Connect, click an `electerm://` link, let the AI build a bookmark from a sentence — all of it ends up in the same parser, and a session opens.

The other direction was missing. There was no way to get a bookmark *out* as text. You could look at a host in the sidebar, and you could not hand it to anyone.

Now there is a copy button in the bookmark form header.

## Where it is

**Settings → bookmarks**, then open a bookmark — or start a new one. In the form header, on the right, past the title and the AI button, there is a small copy icon. Click it and a menu drops down with two rows.

Each row shows a one-line preview, with the full value on hover. Click a row and it goes to your clipboard, with the usual *copied* confirmation.

Two things about **what** gets copied:

- It copies **the form as it stands right now**, including edits you have not saved yet. You do not have to save first, and the copy is not the last-saved version — it is what is on screen.
- It works on a **brand-new bookmark** too. An empty form copies an empty record.

## Format one: the one-line connection string

This is the format the **Quick Connect** box accepts, the format `electerm://` deep links use, and the format the command line takes. It is the same string you would have typed by hand.

Real examples, straight out of the button:

| Bookmark | Copied string |
| --- | --- |
| ssh, `root@10.0.0.1`, default port | `ssh://root@10.0.0.1` |
| ssh, `root@10.0.0.1`, port 2222 | `ssh://root@10.0.0.1:2222` |
| ssh with a saved password | `ssh://root:simple@10.0.0.1` |
| ssh titled "core switch" | `ssh://admin@10.0.0.1?opts={"title":"core switch"}` |
| ssh with SFTP turned off | `ssh://root@10.0.0.1?opts={"enableSftp":false}` |
| ssh with charset `gbk` | `ssh://root@10.0.0.1?opts={"encode":"gbk"}` |
| telnet, `admin@sw-01` | `telnet://admin:x@sw-01` |
| vnc, `u@desk-01` | `vnc://u@desk-01` |
| rdp, `desk-01` | `rdp://desk-01` |
| ftp, `u@nas-01` | `ftp://u@nas-01` |
| spice, `vm-01` | `spice://vm-01` |
| serial, `/dev/tty.usbserial`, 115200 | `serial:///dev/tty.usbserial:115200` |
| web, `https://10.0.0.1:8443` | `https://10.0.0.1:8443` |
| **local terminal** | *(nothing — this type has no string form)* |

### What the string leaves out, on purpose

- **The default port.** 22 for ssh, 23 for telnet, 5900 for vnc and spice, 3389 for rdp, 21 for ftp. It is not lost — the correct default is put back when the string is read.
- **Empty fields, and the per-type defaults.** An ssh bookmark already carries `xterm-256color`, `utf-8`, SFTP on, ssh-agent on. None of that is written out, because reading the string restores it. A bookmark that is all defaults comes out as just the address.
- **Everything that can run something on your machine.** Proxy command, run scripts, environment variables, interactive auto-answers, triggers — none of those go into the string, and a string that tries to carry them has them stripped on the way back in.

That last one is a deliberate property of the format, not an oversight. A clicked link, a pasted string and a shortcut file all travel the same road, so the format refuses to carry anything that could reach a shell. The cost is that a one-liner is a **connection recipe, not a full backup**: if your bookmark leans on a trigger or a run script, the string will not reproduce it.

### What rides along in `opts`

Everything else rides along as JSON — title, tunnels, connection hopping, keep-alive, charset, terminal type, per-session settings. Those round-trip cleanly.

Tunnels are the case where the line gets visibly long, because a tunnel is a record of its own rather than a single value:

```
ssh://root@10.0.0.1?opts={"sshTunnels":[{"sshTunnel":"forwardLocalToRemote","sshTunnelLocalPort":8080,"sshTunnelRemoteHost":"localhost","sshTunnelRemotePort":80}]}
```

One forward-local-to-remote tunnel: connect to port 8080 on your own machine to reach `localhost:80` on the remote host. Paste that into Quick Connect and the tunnel comes with it. A bookmark with several tunnels makes the line unwieldy — which is the case for the JSON row.

The complete grammar is in the [Quick Connect wiki page](https://github.com/electerm/electerm/wiki/quick-connect).

## Format two: the whole record as JSON

The second row gives you the bookmark as it is stored — pretty-printed JSON, every field the form holds, including the ones the one-liner refuses to carry:

```json
{
  "type": "ssh",
  "title": "core switch",
  "host": "10.0.0.1",
  "port": 2222,
  "username": "admin",
  "authType": "password",
  "password": "simple",
  "proxyCommand": "netbird ssh proxy %h %p",
  "encode": "gbk",
  "enableSftp": false,
  "term": "xterm-256color"
}
```

Trimmed — the real record has every field the form holds. Note `proxyCommand` in there: it is stored with the bookmark, and it is exactly the kind of field the one-liner refuses to carry.

Reach for this one when you want a **copy**, not a connection: moving a bookmark to another machine, keeping a record of exactly how an awkward host was configured, diffing two hosts that "should be the same", or attaching the real config to a bug report.

## What it is actually good for

- **Hand a host to someone.** Copy the one-liner, paste it into chat or a ticket. They drop it into Quick Connect — the bolt input in the new-tab menu, the empty-state box, or the sidebar bolt icon — and they are in. No screenshot of a settings dialog, no "what was the port again".
- **Make it clickable.** The same protocols are registered as deep links, so `ssh://root@10.0.0.1` becomes something a colleague can click and land in a session.
- **Move a host between machines.** The one-liner for the connection; JSON as well if you want the extras.
- **Feed the other tools.** Both formats are exactly what Quick Connect, the deep-link handler, the command line and the AI bookmark builder already read.

One asymmetry worth knowing: the deep-link handler is registered for ssh, telnet, vnc, rdp, spice, serial and ftp — the same list the string form covers. A **web** bookmark's string is just its URL, so it works in the Quick Connect box but it is not a deep link; in a chat client it is an ordinary link, and clicking it opens a browser rather than an electerm tab.

## Two things to be careful about

### The password rides along, in plain text

If the bookmark has a saved password, the string carries it: `ssh://root:simple@10.0.0.1`. The JSON carries it too. A copied string is a credential — treat it like one, and do not paste it into a group chat, a public issue or a pastebin.

If you want to hand over the connection **without** the secret, clear the password field before you copy. The copy reads the form as it stands, so an emptied field is an emptied string.

### A password containing `@` will not survive

This is the one real sharp edge. The string puts the password between a `:` and an `@`, and the parser splits on the **first** `@` it finds. So a password of `p@ss` comes back as password `p` with the host turned into `ss@10.0.0.1` — the string silently points somewhere that does not exist.

A colon in a password is fine. An at-sign is not.

The menu previews the string before you copy it, and that preview is the check: if the host part looks wrong, do not send it. For an account whose password contains `@`, use the **JSON** row instead — JSON is never parsed back, so nothing is ambiguous.

## Cheat-sheet

- The **copy button** lives in the bookmark form header (Settings → bookmarks), on the right. It reads the form as it stands, saved or not.
- **quick connect** row → the one-line string, exactly what the Quick Connect box and `electerm://` links accept.
- **JSON** row → the complete record, for backups, diffs and bug reports.
- The string drops the **default port**, **empty fields**, **per-type defaults**, and every **exec-capable field** (proxy command, run scripts, env vars, triggers). Anything you rely on from that last group needs JSON.
- **local** terminals have no string form, so the quick connect row is greyed out for them.
- The **password goes with it in plain text**, in both formats. Clear the field first if you are sharing.
- A password containing **`@`** breaks the string. Check the preview, or use JSON.

Next: [Bookmarks first in electerm](/blogs/bookmark-quick-connect/) explains why every connection in electerm is a bookmark to begin with, or [Data sync](/blogs/data-sync/) covers moving the whole set between machines.
