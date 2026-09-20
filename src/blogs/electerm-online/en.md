---
title: 'Electerm Online: Your Terminal, in a Browser Tab'
description: electerm online (cloud.electerm.org) is the electerm you already know, running in a browser — SSH, SFTP, FTP, RDP, VNC, SPICE and Telnet sessions, GitHub sign-in, no install, the same bookmarks and themes on a laptop or a phone.
date: 2026-09-20
tags: [electerm-online, cloud, browser, ssh, sftp, rdp, vnc, mobile]
videos: [electerm-usage-demo, electerm-sync-data-to-cloud-service, electerm-workspace, electerm-data-import-export]
bannerScript: banner.js
---

# Electerm Online: Your Terminal, in a Browser Tab

You are on a machine that is not yours. A locked-down work laptop with no admin rights. A borrowed desktop. A tablet, or a phone. Somewhere on the other side of that is a server you need to reach right now — and you cannot install anything.

[**cloud.electerm.org**](https://cloud.electerm.org) is the answer to that. It is electerm, the same application you would otherwise download, running as a web service in a browser tab. Sign in with GitHub and your connections are there.

Feature video: [Electerm Usage Demo](/videos/electerm-usage-demo/).

## What it actually is

Not a slimmed-down "web terminal". It is the electerm client itself, served over HTTP: the same tab bar, the same session control bar, the same footer, the same themes, the same keyboard shortcuts you already have in your fingers.

|  |  |
|---|---|
| **URL** | [cloud.electerm.org](https://cloud.electerm.org) |
| **Sign-in** | GitHub OAuth. No registration, no password to invent |
| **Cost** | Free |
| **Runs on** | Any modern desktop or mobile browser |
| **Session types** | SSH, SFTP, FTP, RDP, VNC, SPICE, Telnet |
| **Not included** | Local terminal, serial port, web-page tabs |

Two sentences in, here is the honest framing: this is the desktop client minus the three things that only make sense when you are sitting at your own machine. Everything else came along.

## Getting in

1. Open [cloud.electerm.org](https://cloud.electerm.org) and click **Sign in with GitHub**. Authorise the app; you land in the main UI. No email confirmation, no account to create.
2. If you already use desktop electerm, do not rebuild your bookmarks by hand — **export** your data from the desktop app and **import** it into the online one. Bookmarks, quick commands, themes and the rest come across in one file. Video: [Electerm Data Import Export](/videos/electerm-data-import-export/).
3. Add a connection the same way you would on the desktop — or ask the AI assistant to create the bookmark from a sentence, if you have an LLM API key configured.

That is the whole onboarding. From there the interface is the one you already know.

## What you get, feature by feature

**Every protocol the desktop app speaks.** SSH, SFTP, FTP, RDP, VNC, SPICE and Telnet. A Windows box over RDP, a hypervisor console over VNC or SPICE, a switch over Telnet, an old FTP host — all in the same tab bar, next to your SSH sessions.

**The SSH feature set, not a subset.** Agent forwarding, local and remote port forwarding, dynamic SOCKS proxying, X11 forwarding, SSH tunnelling, and connection hopping through a jump host. Video: [Electerm Connection Hop](/videos/electerm-connection-hop/).

**The AI assistant.** Point it at any OpenAI-compatible LLM API and it will generate commands, explain the command you just selected, write scripts, create bookmarks from a plain-English description, and run tasks in Agent mode. If you would rather not configure a key, [ai.electerm.org](https://ai.electerm.org) is a free endpoint for electerm users.

**Your data, synced where you choose.** Bookmarks, themes and quick commands go to a GitHub secret gist, a Gitee secret gist, electerm Sync Cloud, a custom server, or WebDAV — the same options the desktop app offers. Video: [Electerm Sync Data to Cloud Service](/videos/electerm-sync-data-to-cloud-service/).

**The workflow features that make electerm electerm.** Quick commands, [mirror input and batch input](/blogs/batch-and-mirror-input/) for driving many terminals at once, split panes and 2x2 layouts, drag-and-drop file transfer between two SFTP sessions, and the [timestamp tooltip](/blogs/timestamp-tooltip/) that turns any epoch number in your logs into a date.

**Themes, including custom CSS.** The built-in iTerm theme set, plus your own theme and your own CSS if you want to go further.

**Double-click to edit a small remote file.** The same gesture as the desktop app: double-click a file in an SFTP pane and edit it in place.

**Fourteen interface languages.** The whole UI is localised, not just the menus.

**Workspaces.** Save a layout *and* its connection list, and load the whole working set in one action. Video: [Electerm Workspace](/videos/electerm-workspace/).

## On a phone, for real

This is the part that surprises people. The online version is built for touch as well as for a mouse, so a phone browser is a first-class client, not a fallback. The layout adapts, the control bar collapses to a menu, and the batch input trigger becomes a compact button.

It is not how you would want to spend a day writing YAML. It is exactly what you want when a deploy breaks at dinner and your laptop is in the other room: open the tab, connect, restart the service, close it.

## When to use which

There are now three ways to run electerm, and they are not competitors:

| Your situation | Use |
|---|---|
| Your own machine, full features, offline | **Desktop electerm** — local terminal, serial port, everything |
| A machine you cannot install on, or a phone | **electerm online** — nothing to install, just a browser |
| Your own server, your own data, self-hosted | **electerm-web** — run it yourself, including in Docker |

[electerm-web](https://github.com/electerm/electerm-web) is the source code; electerm online is a service built on the same idea, run for everyone. If "no third party in the middle" is a hard requirement for you, self-host electerm-web instead — that is a legitimate choice, and the project supports it.

## Security, stated plainly

Read this part before you put a production database password into it.

- **Credentials are stored on the server, and SSH connections are proxied through it.** That is how a browser client works — a browser cannot open a raw TCP socket to port 22. Your traffic passes through the maintainer's VPS in transit.
- **Prefer key-based authentication.** Generate a key, put the public half on the server, use the private half in the online client. It is better practice everywhere and it matters more here.
- **Do not park your most sensitive credentials in it.** If a host needs a password you would not type into someone else's laptop, use the desktop client, or self-host.
- **It is one developer, a small VPS, and no guarantees.** The project says so plainly on the landing page, and I would rather repeat it than let you find out later.

None of that is a reason not to use it. It is the reason to use it *knowingly*, with key auth, for the hosts where a browser client is the right tool.

## Being a good citizen

The service is free and it runs on one small VPS. It is not a place to park a permanent `htop` or to proxy gigabytes of file transfer on someone else's bandwidth. Use it for what it is good at — reaching a host when you have no other client — and use the desktop app when you are at your own desk.

## The short version

- **cloud.electerm.org** is electerm in a browser: same UI, same features, nothing to install.
- **Sign in with GitHub**, import your desktop data, and your bookmarks are where you left them.
- **SSH, SFTP, FTP, RDP, VNC, SPICE, Telnet** — and it works properly on a phone.
- **Not** the desktop app: no local shell, no serial port. Use the desktop for those.
- **Be honest about the trade-off**: credentials live server-side and SSH is proxied. Use keys, skip your crown jewels, or self-host electerm-web.

Open [cloud.electerm.org](https://cloud.electerm.org) in a tab next to this one. If you have not set up the desktop app yet, start with [Install Electerm](/blogs/install-electerm/) or the [introduction to electerm](/blogs/electerm-introduction/).
