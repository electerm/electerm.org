---
title: 'Terminal Triggers in Electerm: Let the Terminal Answer Itself'
description: Electerm triggers watch the terminal output stream and answer for you — auto-paging past --More--, replying yes to confirmations, notifying on sudo prompts. How the three trigger levels work, how matching and send actions behave, and eight presets to start from.
date: 2026-09-23
tags: [triggers, automation, terminal, ssh, auto-responder, productivity]
bannerScript: banner.js
---

# Terminal Triggers in Electerm: Let the Terminal Answer Itself

Some prompts never change. The Cisco pager says `--More--` for the hundredth time. `scp` asks `are you sure you want to continue connecting (yes/no)?` on every new host. A long `show running-config` stops every page and waits for a spacebar you are tired of pressing.

Electerm triggers automate exactly that layer: they **watch the decoded terminal output stream, match text or regular expressions, and send a response back into the session** — a space, a `y`, an Enter, or just a desktop notification. Think ZOC's auto-respond, built into every terminal tab.

> **Read this first**: a trigger sends real input to a real machine. An over-broad rule like "reply `y` to anything containing `?`" will eventually confirm something you did not mean. The safety section at the bottom is not optional reading.

## 1. The three levels, side by side

A trigger rule always has the same shape — a name, a match, an action, and a firing mode (details in section 3). What differs is **where the rule lives**, and that decides who it applies to and whether it is saved:

| | Global (predefined) | Bookmark | This session |
|---|---|---|---|
| **Where** | Settings → **triggers** | Bookmark edit form → **triggers** tab | Footer's `ƒx` icon → **This session** tab |
| **Applies to** | Every terminal tab (unless muted for one) | Every session opened from that bookmark | Only the current tab, right now |
| **Saved?** | Yes — persisted in the database and synced | Yes — stored on the bookmark record | No — in-memory only, gone when the tab closes |
| **Best for** | Pagers, confirmations, disconnect notices you always want | Logins and prompts specific to one host or role | One-off experiments before committing to a saved rule |

The footer shows the whole picture: the `ƒx` icon in the footer carries a **badge with the number of effective triggers** for the current tab. Click it and a popup opens with two tabs — **Global** (every predefined rule, switches flip the persisted on/off default) and **This session** (everything active here, switches muted per-session only). Creating and editing predefined rules happens in the Settings panel; the popup is for switching and for temporary rules.

Effective triggers for a tab = global rules (resolved with your per-session on/off overrides) + that tab's session rules. Only predefined rules persist; bookmark rules stay on the bookmark; session temp rules live on the in-memory tab.

## 2. A first trigger in 60 seconds

1. Open Settings → **triggers**, click **New** (or pick from **Presets**).
2. Name it `Cisco pager`, match type **Text**, value `--More--`.
3. Action **Send text**, value a single space, **Send Enter off**, mode **Every new match + cooldown**, cooldown `500` ms.
4. Save, then open a session and run something that pages. Each `--More--` is answered with a space, hands-free.

Prefer JSON? The editor has a **JSON** button — paste an array of rules, invalid regex or a missing match is rejected with an explanation:

```json
[
  {
    "name": "Cisco pager: --More--",
    "enabled": true,
    "match": { "type": "text", "value": "--More--", "caseSensitive": false },
    "action": { "type": "send", "value": " " },
    "sendEnter": false,
    "mode": "cooldown",
    "cooldownMs": 500
  }
]
```

## 3. How a rule works

Every rule is five decisions:

- **Match** — **Text** (a literal string, special characters are escaped for you) or **RegExp** (a raw JavaScript regular expression). Matching is **case-insensitive by default**; flip the case-sensitive switch when `Password:` and `password:` must be told apart. ANSI colour codes are stripped and carriage returns normalised before matching, so coloured prompts still match, and a match split across two network chunks still fires.
- **Action** — **Send text** writes into the session; **Notify only** shows a desktop notification with the matched snippet and sends nothing. Notify is the right answer for `sudo password` prompts: you want to be told, not auto-type a secret.
- **Send Enter** — on by default, the payload gets a trailing carriage return unless it already ends with `\r` or `\n`. Turn it off for single-key answers like a pager space. The send text supports escapes: `\n \t \r \\ \xHH` hex bytes and `^X` caret notation (`^M` is Enter, `^C` is Ctrl-C).
- **Mode** — **Every new match + cooldown** (default, each new occurrence fires but at most once per cooldown interval), **Every new match** (no throttling), or **Once per session** (fires a single time, e.g. accepting a new SSH host key with `yes`).
- **Enabled** — a per-rule switch, plus per-session overrides: muting a global rule in the footer popup affects only the current tab and is not persisted.

Two engine guarantees are worth knowing. First, **a newly enabled or edited rule ignores buffered history** — it only reacts to output that arrives after the change, so turning a rule on never replays yesterday's scrollback. Second, **cooldown consumes the suppressed occurrence** — a greedy regex anchored in old output cannot grow into later chunks and be mistaken for a fresh match.

## 4. Eight presets worth stealing

Settings → triggers → **Presets** ships eight starting points. They are ordinary rules — pick one, then edit the match or the reply to fit your hosts:

| Preset | Match | Reply |
|---|---|---|
| Cisco pager: `--More--` | text `--More--` | space, no Enter |
| Pager: press any key to continue | regex `press any key\|press .* to continue` | space, no Enter |
| Confirm: Are you sure? \[y/n\] | regex `are you sure.*\[y/n\]\|confirm.*\(y/n\)` | `y` + Enter |
| Overwrite confirm: Overwrite? (y/n) | regex `overwrite.*\(y/n\)` | `y` + Enter |
| sudo password prompt → notify | regex `\[sudo\]\s*password` | notification only |
| SSH new host key → accept once | regex `are you sure you want to continue connecting` | `yes` + Enter, once per session |
| Telnet login: auto username | regex `login[: ]*$\|username[: ]*$` | your username + Enter (fill it in) |
| Connection closed → notify | regex `connection (closed\|reset\|refused)\|lost connection` | notification only |

## 5. Recipes

**Page through anything hands-free** — the Cisco preset, or generalise the pager preset to ` --More-- |\(END\)|--More-- ` if you live in `less` and `journalctl` too.

**Accept the host key on a fleet rollout** — SSH-new-host-key preset in **once** mode. It answers `yes` to the first prompt and can never fire again in that session, so a later man-in-the-middle prompt is not auto-accepted.

**Get tapped on the shoulder by sudo** — the sudo preset with **Notify only**. The notification carries the last ~240 characters of matched output, so you see which tab needs you. Never auto-send a password: it lands in logs, in scrollback, in screen shares.

**Fill a telnet username, nothing more** — telnet-login preset answers the `login:` prompt with the username and Enter, but leaves the password prompt to you (pair it with a notify rule on `password:`).

**Watch for drops during a long migration** — connection-closed preset with **Notify only** and a 5 s cooldown. One toast per incident instead of a toast per chunk.

**Per-host login flows** — put the rule on the **bookmark**, not globally. A core switch that asks `Username:` and a Linux box that asks `login:` need different answers; bookmark triggers keep them from leaking into each other.

**Trying something risky?** Prototype it as a **This session** rule from the footer popup. It dies with the tab. Promote it to global or bookmark only after watching it behave.

## 6. Safety rules that actually matter

Auto-answer is a loaded tool. Five habits keep it safe:

1. **Anchor your regex.** `.*y/n.*` matches half the manual page. Prefer `are you sure.*\[y/n\]` — specific enough to fire on the prompt and nothing else.
2. **Prefer `once` and `cooldown` over `repeat`.** `repeat` with no throttle re-sends on every new occurrence; a prompt loop can spiral into dozens of answers per second.
3. **Notify, don't send, for secrets and destruction.** Passwords, `rm -rf`, `drop table`, `reboot` — if the cost of a wrong answer is high, the trigger should tap your shoulder, not press Enter.
4. **Mute per session, don't delete globally.** Debugging one host that echoes oddly? Flip the rule off in the footer popup's This-session tab. The global default — and every other tab — stays untouched.
5. **Test in a scratch tab first.** Session rules are free and disposable. Watch one real prompt cycle before the rule graduates to Settings or a bookmark.

## 7. Combining with the rest of electerm

- **Quick commands** send one reply on demand; triggers send it automatically. If you find yourself clicking the same quick command at the same prompt every day, that click wants to become a trigger.
- **Batch input / mirror input** drive many hosts at once; triggers answer what those hosts ask back. Mirror a command across four nodes, let a pager trigger dismiss `--More--` on all four.
- **Bookmark triggers** travel with the bookmark through sync, so the login flow you tuned on the laptop is already correct on the desktop.

## Cheat-sheet

- A trigger = **match** (text or regex, case-insensitive by default, ANSI stripped) → **action** (send text or notify) → **mode** (cooldown / every match / once per session).
- Three homes: **global** (Settings, persisted, synced), **bookmark** (travels with the host), **this session** (footer `ƒx`, in-memory only).
- Footer `ƒx` badge = effective trigger count for the current tab. Global tab flips the saved default; This-session tab mutes per tab.
- Send text supports `\n \t \r \\ \xHH ^X`; Enter is appended unless the text already ends with a newline or you switch it off.
- Rule of thumb: *routine keypress* → send, *secret or destructive* → notify, *unsure* → session-only first.

Next: [SSH in Electerm](/blogs/ssh-features-guide/) for the sessions your triggers will live in, or [Batch and Mirror Input](/blogs/batch-and-mirror-input/) for driving many terminals at once.
