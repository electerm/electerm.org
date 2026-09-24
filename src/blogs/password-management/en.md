---
title: 'Password Management in Electerm: See Every Password, Rotate Them in One Click'
description: Electerm groups all bookmark passwords on one Settings page — see which hosts share a password, copy it, search it, and rotate it across every affected bookmark at once.
date: 2026-09-24
tags: [passwords, security, bookmarks, batch-update, productivity]
---

# Password Management in Electerm: See Every Password, Rotate Them in One Click

Ten servers, one password. Then the security policy says "rotate it by Friday". Opening ten bookmark editors and pasting the new secret ten times is not rotation — it is data entry with extra steps.

Electerm has a dedicated page for exactly this: **Settings → Passwords**. It groups all your saved bookmark passwords in one list, shows which hosts share each one, and lets you change one password everywhere it is used — in a single action.

## Where it lives

Open **Settings** (the gear icon in the left sidebar), then pick **Passwords** from the settings list (`src/client/components/setting-panel/setting-passwords.jsx`, id `setting-passwords` in `constants.js`).

What you get is not a flat credential list but a **grouped view**:

- Each row = one distinct saved password.
- A blue count badge = how many bookmarks use it.
- The host cell = the bookmark titles sharing it (`web-01, web-02... (+3)`), with the full list in the hover tooltip.
- The password itself is always rendered masked (`********`) — the page never shows secrets on screen.

Groups are sorted by count descending, so the most reused password — the one you should rotate first — sits at the top.

## What each row lets you do

Every row has two actions:

- **Copy** — copies the actual password to the clipboard (`copyToClipboard`). For the "paste it into this one-off console" moment without opening the bookmark editor.
- **Change password** — opens the rotation dialog. This is the batch update: type the new password once, and electerm writes it to **every bookmark in that group** (`editItem(bookmark.id, { password: newPassword })` per bookmark).

The dialog lists the affected bookmarks by title before you confirm, so you can see the blast radius — `# web-01`, `# web-02`, … — then commit. One edit, N bookmarks updated, zero editors opened one by one.

Two more controls keep the page usable at scale:

- **Search** filters groups by bookmark title — type `staging` and only passwords used by staging hosts remain.
- **Pagination** (10 per page by default, adjustable) keeps a 200-bookmark fleet scannable.

## The rotation walkthrough

The canonical use case — Friday rotation:

1. Go to **Settings → Passwords**. The top row shows your shared secret with `count = 12`.
2. Click the **edit** icon on that row.
3. The modal shows the current value plus the 12 affected bookmarks. Type the new password in the `Input.Password` field and confirm.
4. Done — all 12 bookmarks now connect with the new secret. Next login just works.

No per-bookmark visits, no missed host that still has the old password and fails at 2 AM.

A second use case is auditing reuse: if one row says `count = 30` and spans prod *and* staging, that is a segmentation smell. Rotate prod to its own secret in one click and the groups split accordingly.

## How passwords are stored

Convenience means nothing without safe storage, so the short version of electerm's model:

- **OS-level encryption.** Secrets are encrypted with Electron's `safeStorage` (`src/app/lib/safe-storage.js`, prefix `v2:safe:`) — **macOS Keychain**, **Windows DPAPI** (bound to your user account), **Linux libsecret / gnome-keyring** with fallback. Values on disk are base64 ciphertext, not plaintext.
- **Encrypted database.** Bookmark documents are stored encrypted at rest (see the `db-enc` unit tests), and sync uploads encrypt bookmarks and profiles when a sync password is set.
- **Masked UI.** The passwords page, like the bookmark table, renders `********` plus a keyboard-style tag — copy goes through the clipboard, never through the screen. Hover tooltips show *host names*, never secret values.

Practical consequences: another user on the same machine cannot read your DB file's passwords (DPAPI/Keychain binding), and shoulder-surfing the settings page reveals counts and hostnames, not secrets.

## Limits and honest notes

- **Empty passwords are not listed.** Bookmarks with no saved password (key auth, agent-only, quick-connect one-offs you never saved) are skipped during grouping — the page is "passwords I actually stored", not "all bookmarks".
- **Batch means batch.** Changing a group's password rewrites *every* bookmark in it. That is the point — but check the affected-bookmark list in the modal before confirming, especially when prod and dev accidentally share a secret.
- **It edits bookmarks, not servers.** The page updates what electerm *sends* at login; the actual password change on the server (`passwd`, IAM rotation, panel reset) still happens wherever your provider requires. The intended order is: rotate on the server first, then batch-update electerm to match.
- **Keys and passphrases live elsewhere.** Private-key content, passphrases and certificates are edited in the bookmark editor / profiles, not on this page. The passwords page covers the `password` field; for key-based fleets see [SSH in Electerm](/blogs/ssh-features-guide/).

## Cheat-sheet

- **Find it** — Settings (gear) → Passwords. One row per distinct secret, count badge, masked value, host list.
- **Copy** — clipboard icon per row, no editor round-trip.
- **Rotate** — edit icon → new password → every bookmark sharing the old one is updated at once; the modal previews the affected list.
- **Narrow down** — search by host name, page through large fleets.
- **Top row first** — highest count = most reused = rotate it first.
- **Server first, electerm second** — change the real password on the host, then mirror it here.

Next: [SSH in Electerm](/blogs/ssh-features-guide/) for the auth methods those passwords pair with (keys, agent, certificates, MFA), or [Batch Input and Mirror Input](/blogs/batch-and-mirror-input/) when the *next* job after rotation is running one command across the whole fleet.
