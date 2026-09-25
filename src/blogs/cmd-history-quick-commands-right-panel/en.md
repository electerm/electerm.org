---
title: 'Command History and Quick Commands Can Now Dock in the Right Panel'
description: Since v5.5.35, the command history panel and the quick commands panel each have two homes — the footer (default) and the right side panel. How to move them, how the footer buttons behave while docked, and why the choice sticks across reloads.
date: 2026-09-25
tags: [command history, quick commands, right panel, productivity, terminal]
bannerScript: banner.js
---

# Command History and Quick Commands Can Now Dock in the Right Panel

The footer of every terminal tab holds two hard-working buttons: the **history icon** (command history) and the **Q / thunder icon** (quick commands). They are useful exactly because they are one click away — and annoying for the same reason: both open floating popups that cover the terminal you are reading.

Since **v5.5.35**, both panels have **two homes**. They still live in the footer by default, but either one can be docked into the **right side panel** — the same column already hosting the AI chat and the session info panel — and moved back whenever you want.

## Two panels, two homes

| | Command history | Quick commands |
| --- | --- | --- |
| Footer home (default) | popover above the history icon | floating box above the footer |
| Right-panel home | `cmdHistory` tab, history glyph in the title | `quickCommands` tab, thunder glyph in the title |
| Same content? | Yes — same component, search, sort-by-frequency, clear, save-to-quick-command and multi-terminal run all travel with it | Yes — same component, search, label filter, sort-by-frequency all travel with it |

Under the hood it really is the same component rendered in a different place (`inline` mode): the docked version drops the trigger/popup chrome and lets the right panel's own container wrap the body, so nothing is a second implementation that can drift.

## Moving them

Each panel carries its own move icon in its header, and the two icons are mirror images sitting in the same slot:

- In the **footer**, the icon is an arrow pointing **into a bar on the right** — click it and the panel docks into the right side panel.
- Once **docked**, the icon becomes an arrow pointing **into a bar at the bottom** — click it and the panel hands itself back to the footer.

The move is always visible, never a vanishing act:

- Sending command history back to the footer **re-opens the footer popover** right away.
- Sending quick commands back to the footer **re-opens the footer box** right away.

## How the footer buttons behave while docked

Docking does not leave a dead button behind. While a panel lives in the right side panel, its footer button becomes a **panel toggle**, with the exact same contract as the info and AI buttons:

- Click the footer **history icon** → the right panel opens on the history tab; click again → it closes. The button shows an active state while its tab is up.
- Click the footer **Q icon** → the right panel opens on the quick commands tab; click again → it closes, also with an active state.

Close the right panel some other way (its own close button, another tab) and the footer buttons just work — they re-open the right tab.

## Details worth knowing

- **The choice is remembered.** Which home each panel lives in is a persisted preference, so the footer buttons keep landing where you last put the panel after a reload.
- **Quick-command pin survives the trip.** If the footer box was pinned when you docked it, the pin is kept in the store and comes back with the panel — nothing is silently lost. While docked, the panel drops its own pin/close buttons because the right panel's title bar already owns them, and the layout stops reserving the pinned box's strip of height.
- **History popover hygiene.** Docking the history panel closes its footer popover on the way out, so no orphaned popup is left pointing at a panel that is no longer there.
- **One column, three residents.** History, quick commands, AI chat and session info now share the right panel as tabs. Pin the right panel and it becomes a dock — the terminal squeezes aside and your commands stay visible beside the session instead of floating over it.

## When to dock, when not to

- **Dock** when you re-run commands all day: a pinned right panel with history or quick commands beside a wide terminal beats opening and dismissing a popup fifty times.
- **Keep the footer** when screen width is tight: on narrow windows the overlay popup covers less, and costs nothing when closed.

Either way it is one click to change your mind — that is the whole point.

Next: [SSH in Electerm](/blogs/ssh-features-guide/) for the sessions these commands run in, or [Batch and Mirror Input](/blogs/batch-and-mirror-input/) for sending one command to many terminals at once.
