---
title: 'Bookmark and Category Icons - Give Every Connection a Face'
description: electerm 5.9.1 lets you put an icon on a bookmark or a bookmark category. Pick one from the built-in set, choose a local image, or paste a URL. Icons show in the bookmark tree and in tab titles, and a category passes its icon on to new bookmarks inside it.
date: 2026-11-07
tags: [bookmarks, icons, customization, ssh, productivity]
videos: [electerm-bookmark-and-category-icons, electerm-bookmark-operations, electerm-use-ai-to-create-bookmarks]
featureVideo: electerm-bookmark-and-category-icons
bannerScript: banner.js
---

# Bookmark and Category Icons - Give Every Connection a Face

A bookmark list of thirty hosts is a wall of grey text. Colour tags helped, but a small
coloured square does not tell you which machine is the Ubuntu box, which one runs Docker,
and which one is the database you should be careful with.

Since **electerm 5.9.1** a bookmark can carry an icon instead. So can a bookmark category.
The icon shows in the sidebar tree and in the tab title, which means you can spot the right
session without reading a single hostname. The 55-second walkthrough embedded above shows
the whole flow; this post is the written version.

## Where the picker is

Open a bookmark to edit it, or start a new one. The title field has a small square on its
left — the appearance button, the same one that used to open only the colour picker. Click
it and a panel opens with two tabs, **color** and **icon**. The tab you used last is
remembered, so setting icons for a whole list does not mean switching tabs every time. On
a narrow or mobile window the panel opens as a dialog rather than a popover.

Categories work the same way. When you create or rename a category in the bookmark tree,
the same appearance button sits beside the name field.

## Three ways to get an icon

| Source | How you pick it | What the bookmark keeps |
| --- | --- | --- |
| Built-in | Search the grid and click a tile | A name like `icon:ubuntu` |
| Local file | **choose file**, any browser-readable image | The absolute path to that file |
| URL | Paste the address and click **download** | A local copy in the app's data folder |

The built-in set ships with 95 icons covering operating systems, servers, databases,
clouds, AI vendors, languages and generic shapes — Ubuntu, Debian, Red Hat, Docker,
Kubernetes, Nginx, PostgreSQL, Redis, Python, AWS, and many more. The search box matches
names, labels and aliases, so `k8s` finds Kubernetes, `pg` finds PostgreSQL and `rhel`
finds Red Hat.

**choose file** accepts SVG, PNG, JPG, GIF, WebP, BMP, ICO and AVIF. The URL field is for
an icon you have on a CDN or an internal site: electerm fetches it once, saves it in its
data folder, and the bookmark points at that local copy. A bookmark you imported or synced
therefore never makes the app contact a remote host just to draw a row in the list.
Downloads are capped at 512 KB, 10 seconds and 3 redirects, so if one fails, check the
file size and whether the address is reachable.

## Icon or colour - one of them wins

An icon replaces the colour square; the colour is still kept as the fallback. Click
**default** in the picker to clear the icon and the colour comes back. You can switch
between the two as often as you like without losing the other setting.

## Categories pass their icon down

Set an icon on a category and every **new** bookmark created inside it starts with that
icon (and with the category's colour). Bookmarks that already exist are left alone. Any
single bookmark can then override or clear the inherited icon without changing the
category — useful when one host in a group is the odd one out.

## Where you will see it

- The bookmark row and the category row in the sidebar tree
- The tab title of a session opened from that bookmark
- The appearance button itself, which turns into the chosen icon

## If you write bookmarks as JSON

The field is `icon`. It takes a built-in name with an `icon:` prefix, or an absolute path
to a local image file, and nothing else:

```text
icon:ubuntu
/home/zxd/icons/router.svg
```

A remote URL is not a valid stored value — the picker downloads it first. Anything the app
cannot resolve, including a path that does not exist on this machine, falls back to the
colour square. That last point is worth remembering.

## One gotcha when syncing to another computer

Built-in icons travel with your data because every electerm install ships the same set.
Icons picked from a **local file** or **downloaded from a URL** are referenced by an
absolute path on the machine where you chose them. Sync those bookmarks to a laptop and
the rows will show their colour squares again until you pick the icon there too. If you
sync bookmarks between machines, prefer a built-in icon.

## Where next

- [Bookmark multi-select](/blogs/bookmark-multi-select/) - delete or export a set of bookmarks in one go
- [Copy a bookmark as text or JSON](/blogs/copy-bookmark-data/) - get a connection string or the whole record
- [Download electerm](/) - 5.9.1 or newer for bookmark and category icons
