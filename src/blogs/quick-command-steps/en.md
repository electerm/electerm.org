---
title: 'Quick Commands: One Button, Four Steps'
description: A quick command is no longer one line of text — it is a list of steps that can type, press keys, wait for the shell to answer, and ask you for a password. How the four step types behave, how recording writes them for you, and what the labels, groups and run chip actually mean.
date: 2026-10-21
tags: [quick-command, automation, terminal, ssh, productivity, recording]
bannerScript: banner.js
---

# Quick Commands: One Button, Four Steps

Every deploy starts the same way. `cd /srv/app`, `sudo ./deploy.sh`, wait for the password prompt, type it, then wait — actually wait, do not `Ctrl+C` — until the script says it is done. Four moves, in order, every time, and the third one is the reason the first two exist.

A quick command used to be one line of text: click it, get the line. In electerm it is now a **list of steps**, and each step can do one of four things: type text, press a key, wait for the terminal to print something, or stop and ask you for a value. That is enough to turn the deploy above into one button that also knows *when* it is safe to continue.

## What a quick command is

| Field | Meaning |
| --- | --- |
| name | What the button says, 60 characters max |
| steps | What runs, top to bottom |
| labels | Zero or more labels; one command can sit in several groups |
| shortcut | Optional key combination that runs it in the active terminal |

The panel is not new. The **`Q` button in the footer** opens it as a floating box; the pin keeps it open, the arrow docks it into the right side panel, and the pencil jumps to **Settings → Quick commands**, where the full list lives with add, duplicate, delete, drag-to-reorder and JSON import/export. Right-clicking a quick command in the panel gives **Execute**, **Run in terminals…** and **Edit**.

Four `+` buttons under the step list add a step, and each row has a drag handle plus insert-above, insert-below and delete. The `#` column is the order the run follows.

## The four step types

| Type | What it sends | Option column | Use it for |
| --- | --- | --- | --- |
| **command** | The text in the value cell, plus Enter unless you untick it | Enter | Anything you would type and press Enter on |
| **key** | One named key | Repeat ×1–100 | Ctrl+C, Tab, an arrow key, F5 |
| **wait for text** | Nothing — it only pauses the run | Timeout in seconds | The next step must not run before the shell prints something |
| **ask for input** | What you type into the dialog, plus Enter unless you untick it | Enter | A password, a hostname, a ticket number |

### command

Sent as-is, so multi-line input works: one command step can paste a whole here-document. On Windows the line breaks go out as `\n\r`. Untick **Enter** when the next step continues the same line, or when the text is only part of an interactive answer.

`{{time}}`, `{{date}}` and `{{clipboard}}` are expanded **when the step is sent**, not when it is saved — epoch milliseconds, the local date, and whatever is on the clipboard at that moment.

### key

The value is a key name: `Enter`, `Tab`, `Esc`, `Space`, `Backspace`, `Delete`, `Insert`, the arrows, `Home`, `End`, `PageUp`, `PageDown`, `F1`–`F12`, or `Ctrl+A` … `Ctrl+Z`. Cursor keys and Home/End follow the tab's cursor-key mode, so they also work inside `vi` and `less`.

This is the step that keeps `Ctrl+C` honest. Typing `Ctrl+C` into a **command** step sends the six characters `Ctrl+C`; the key step sends the actual interrupt. Repeat sends the same key several times, which is how you page through a `--More--` prompt.

### wait for text

The run stops here until the tab prints the text, then continues.

- Matching is **plain text, case-insensitive** — not a regular expression. For regexp matching, use a [trigger](/blogs/terminal-triggers/) instead.
- Colours and other escape sequences are stripped first, including the case where ssh splits one escape sequence across two chunks.
- Only output that arrives **after the previous step was sent** counts, so a wait never matches the prompt already on screen before you clicked.
- A match consumes the output up to its end: two wait steps in a row need two separate matches, not one line containing both strings.
- **Timeout** is in seconds; blank means 10, `0` waits with no limit. When it runs out the run ends with `timed out waiting for "…"` and the remaining steps are not sent.

### ask for input

The value is the question shown in the dialog. The answer is typed into the terminal **at that step**, exactly as if you had typed it: it is not stored in the quick command, and later steps cannot read it back. **hidden** (the eye button) makes it a password field, and the eye flips it back so you can check what you typed.

**Enter** decides whether a carriage return follows the answer. Cancelling the dialog ends the run as cancelled — nothing after that step is sent. An empty answer is allowed; with Enter ticked it sends a bare Enter.

Run the same command in several terminals and the dialog is shared by default, with **mirror input to all terminals** ticked. Untick it and each terminal gets its own dialog, queued one at a time. Ticking it again folds the pending questions back into one.

## Delay is before the step, not after

Every row has a delay in milliseconds, and it runs **before** that step. Blank means 100 ms; `0` is allowed. This is the knob for a slow shell: after a big `ls`, or before typing into a prompt that appears a moment after the command.

## A deploy in four steps

Here is the sequence from the top of this post, written as steps:

| # | Type | Value | Option | Why |
| --- | --- | --- | --- | --- |
| 1 | command | `cd /srv/app && sudo ./deploy.sh` | Enter | Starts the script |
| 2 | wait for text | `password` | 20s | sudo is about to ask, do not type into nothing |
| 3 | ask for input | `sudo password` | hidden, Enter | The secret, asked once, never stored |
| 4 | wait for text | `deployed` | 120s | The script's own success line |

What you see when you click it:

1. A chip appears in the footer after half a second: `deploy web 1/4`.
2. The command lands on the prompt line, exactly as if you had typed it.
3. `[sudo] password for zxd:` appears; the chip switches to `2/4` and says `wait for text "password"` — the step matched, and the run moved on.
4. The dialog opens with the question, the terminal tab name, and a password field. You type; the chip says `3/4 ask for input`.
5. You press OK. The script continues, prints `Pulling latest… building…`, and the chip is on `4/4`, `wait for text "deployed"`.
6. `deployed 2 services in 41s` appears, the chip goes away, the prompt is yours again.

The important part is not that it types for you — a clipboard could do that. It is step 2 and step 4: the run **does not race the shell**. It reads the output stream and moves when the output says it can.

## Running

| Action | Result |
| --- | --- |
| Click a quick command | Runs in the active tab |
| Right-click → **Run in terminals…** | Pick any number of tabs; the same steps run in each |
| Footer chip → **stop** | Stops every quick command running in that tab |
| Right-click a running tab | Also offers **stop quick command** |

- A run is bound to the tab it started in. Switching tabs does not move it; closing the tab ends it.
- The chip only appears if the run lasts longer than **500 ms**, so one-shot commands do not flash the UI. It carries the name, the step progress `3/7`, the text being waited for or **ask for input**, and `+N` when several runs share a tab.
- **Stop quick command** is a shortcut in Settings → Shortcuts and is unbound by default. Bind it if you abort long runs often.
- A shortcut set on a quick command runs it in the active terminal without opening the panel. It is checked before the built-in shortcuts, so it shadows one using the same keys — the shortcut editor warns when the keys are taken.

## Recording writes the steps for you

Build the sequence by doing it once:

1. Open the panel and click the red dot. The floating box closes so it does not cover the terminal.
2. Work normally in that tab. Typed text, pasted text and keys are all captured.
3. Enter ends a **command** step. Typing a few characters and then pressing Tab saves them as a command step without Enter plus a key step. Consecutive identical keys collapse into one step with a repeat count. Backspace edits text that has not been sent yet; a Backspace after a sent command becomes a key step.
4. Escape sequences that are not a known key are dropped, so terminal replies such as cursor-position reports are not replayed.
5. **Save** opens the quick command form with the recorded steps filled in and the label `recorded`. **×** throws the recording away.

Everything you typed is kept, passwords included, and the steps are saved to your data — and synced, if sync is on. electerm warns you when recording starts for exactly that reason. Recorded steps all start with a delay of `0`.

## Labels, groups and search

- A quick command can carry several labels and appears under each of them; commands with no label come last, under **default**.
- Grouping is a toggle in the panel and **off by default**. Headings sort by name, each one collapses, and the collapsed set is remembered.
- Typing in the search box opens every heading, so a match is never hidden inside a collapsed group. Search matches the name and the text of every step.
- The label dropdown filters to one label and composes with the search box.
- **sort by frequency** orders by how often each command was run. Dragging is disabled while sorting or grouping, because the order on screen is not the stored one.

There is also an **AI** tab in the form when AI is configured: describe the command, and the generated name, steps and labels are written into the manual form for you to check before saving.

## Older quick commands still run

A quick command saved before steps existed holds one command string. It still works: the string becomes a single command step, and the old **input only** setting becomes an unticked **Enter** on that step. Open it and it is an ordinary step row — nothing to migrate by hand.

## Wait step or trigger?

Both watch output, and they are easy to confuse. They answer different questions.

|  | wait for text (step) | trigger |
| --- | --- | --- |
| Belongs to | One quick command run | The session, always on |
| Blocks the next step | Yes | No |
| Match | Plain text, case-insensitive | Text or regular expression |
| Action | Nothing, it only gates the run | Send text, or notify only |
| Repeats | Once per step | Every match, with cooldown, or once per session |
| Timeout | Yes | No |
| Set up | Inside the command | A rule in Settings → Triggers |

Use a **wait step** when the sequence is scripted and you run it on demand. Use a **trigger** when the same reaction should happen every time the text appears, without anyone clicking.

## Numbers worth knowing

- Chip appears after **500 ms**; two clicks within **200 ms** are one run (the call is debounced).
- Default step delay **100 ms**; default wait timeout **10 s**; `0` waits forever.
- The panel asks for a name of at most **60** characters; a key step repeats at most **100** times.
- A wait step with empty text is skipped, and the form refuses to save one.

## Try it

Pick the command you retype most — the deploy, the jump host, the log tail — and write it as three or four steps with one wait in the middle. The first time it waits for the password prompt instead of typing into it, you will notice the difference.

More detail, including every field and edge case: [the quick commands wiki](https://github.com/electerm/electerm/wiki/quick-commands). For automatically answering prompts you meet in every session, read [Terminal Triggers](/blogs/terminal-triggers/).
