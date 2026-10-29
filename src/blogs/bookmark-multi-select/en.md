---
title: 'Bookmark Multi-Select: Delete or Export a Dozen at Once'
description: The bookmarks tab in electerm settings has a second mode — the tree becomes a checklist, with a search box and two buttons that act on everything you tick. Delete a whole cluster of retired hosts, or export the twelve bookmarks you actually want on the new machine as a plain JSON array.
date: 2026-10-29
tags: [bookmarks, export, import, batch, ssh, productivity]
bannerScript: banner.js
---

# Bookmark Multi-Select: Delete or Export a Dozen at Once

You shut down a cluster last month and its twelve bookmarks are still sitting in a category you keep scrolling past. Or the opposite: you are setting up a new laptop and want twenty of your three hundred bookmarks on it — not all three hundred, and not a hand-pruned copy of the whole backup file. Both jobs are the same job: act on *a set* of bookmarks. One row at a time, that is twelve right-clicks for the first and a JSON edit for the second.

Settings → **Bookmarks** has a second mode for exactly that. The tree becomes a checklist, and everything you tick can be deleted or exported in one go.

## Where the switch is

Open the settings dialog and pick the **Bookmarks** tab. Above the tree there is a row of icon buttons:

```
[book+] [folder+] [pencil] [export] [import] [code]        ☰
```

The **pencil** is the one. Click it and the tree is replaced by the picker: same categories, same bookmarks, but with a checkbox on every row, a search box on top, and three buttons underneath.

The bookmarks panel in the left sidebar is not this: it exists to open sessions, and its hover icons edit or delete one row. The batch screen lives in the tab that also holds the bookmark form, because that is where you go to manage bookmarks rather than use them.

## The tree, with checkboxes

Categories and bookmarks both get a checkbox. Bookmarks keep the colour dot and the `title - user@host:port` label they have in the list, so the picker looks like the thing you already know, with squares in front of it.

Two behaviours worth knowing before you click:

**Ticking a category ticks everything inside it.** Ticking `prod` selects `prod` and every bookmark and sub-category under it — that is the whole point of a category checkbox. Untick one of its bookmarks and the category goes indeterminate rather than checked.

**Search narrows the tree to the branches that still contain a match, and expands them.** Type `redis` and you get the category that holds `redis-cache`, with the match visible inside it; clear the box and your own expansion comes back.

## Two buttons, two different counts

The buttons carry a number, and the two numbers are not always the same:

| Button | The number counts | What it acts on |
| --- | --- | --- |
| Delete selected (N) | every ticked row — categories **and** bookmarks | removes those rows |
| Export (N) | ticked **bookmarks** only | writes a JSON array of those bookmarks |

That difference is not a rounding artefact, it falls straight out of the data. Tick a category that holds two bookmarks and the category's own box ticks itself, so N reads 3 for delete — the category is a row you selected, and deleting it is a real operation. A category is not a bookmark, so it cannot appear in the file: export reads 2.

Tick two bookmarks in two different categories, the way the banner does, and both buttons read (2).

## Delete selected

Click it and the ticked rows are gone. No confirmation dialog, no undo — this is the same store operation the row menu uses, applied to a set instead of one item. What that costs:

- **A ticked category goes with its contents.** Because ticking a category ticks its children, `Delete selected` on `prod` removes the category *and* every bookmark inside it. That differs from deleting a category from a row's hover menu, which moves its bookmarks and sub-categories up to the parent instead. Use the batch delete when the branch is really going away; use the row menu when you only want to dissolve the folder.
- **`default` survives.** It is the category every install has, so it is filtered out of the deletion set. Its ticked bookmarks still go.
- **You stay in the picker**, with an empty selection and a shorter tree, so you can keep going. `Cancel` is what leaves.

## Export selected

`Export (N)` writes **a bare JSON array** of the selected bookmark objects — not the `{ bookmarkGroups, bookmarks }` object that the toolbar's full-backup export produces:

```json
[
  {
    "id": "9f3c1a7e-4b2d-4f18-9a55-0d6c1f8b7e21",
    "title": "prod-web",
    "host": "10.0.4.21",
    "port": 22,
    "username": "deploy",
    "authType": "privateKey",
    "privateKeyPath": "~/.ssh/id_ed25519"
  },
  {
    "id": "2b7d9c04-6e51-4a8c-bb0e-73f4c2a91d55",
    "title": "db-primary",
    "host": "10.0.4.8",
    "port": 22,
    "username": "deploy"
  }
]
```

Every field of each bookmark travels with it — password or key path, tunnels, quick commands, terminal theme, colour, description — because the objects are copied out of the store as they are, not projected into a smaller shape.

The file is named `bookmarks-YYYY-MM-DD-HH-mm-ss.json` and lands in the folder you pick in the save dialog; the dialog opens in the folder you used last time. Then the app's usual export notification appears with the path, a **reveal** link, and the standing warning: *exported file is plain text and may contain sensitive data like passwords and private keys, keep it safe*.

**The selection survives the export.** The boxes stay ticked and you stay in edit mode, so "export these, then delete these" is one pass rather than two.

## The file imports back

`Import` (the arrow icon next to the pencil) accepts both shapes. A full backup restores categories and bookmarks; a bare array like this one becomes a single new category named `imported_<timestamp>` holding exactly those bookmarks.

Ids are preserved and collisions are skipped, so importing the same file twice does not duplicate anything — the second pass finds every id already in the store and adds nothing. That also makes the array a decent seed for a team set of shared hosts: export, hand the file over, the other side imports and gets one tidy category to move rows out of.

## Three details that will bite you

**`hide IP` masks the list, not the file.** With hide IP on, the picker shows `deploy@10.*.*:22`, which is what makes the screen safe to paste into a ticket. The exported JSON has the real host either way.

**A category you select is deleted with its contents** — see above. It is the one place where the batch action is more destructive than the per-row one.

**Export needs edit mode.** The button does not exist in the normal tree, and it is not in the toolbar's menu either; the pencil is the way in. `Cancel` and clicking outside the picker both leave without touching anything.

## A workflow that fits

The migration case, end to end:

1. Settings → Bookmarks → pencil.
2. Search for the project name, tick the bookmarks you want (tick their category if you want the whole lot).
3. `Export (N)`, pick a folder, done — you have an array you can read in any editor.
4. On the other machine: import the file, then drag the rows out of `imported_<timestamp>` into real categories and delete the shell.

The cleanup case is the same three steps with `Delete selected` in place of export — and if the branch is a retired cluster, ticking its category and deleting is the honest one-click version of "get this out of my list".

## Try it

You need three bookmarks and ten seconds. Open the bookmarks tab, click the pencil, and tick a category to watch its whole subtree fill in — the count on `Delete selected` tells you exactly how much is about to disappear. Then untick everything and press `Cancel`; nothing is written until you press one of the two buttons.
