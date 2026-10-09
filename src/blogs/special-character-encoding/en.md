---
title: 'Connecting to Servers with Special Character Encoding in Electerm (GBK, Big5, Shift_JIS and More)'
description: Garbled text on an older Chinese, Japanese or Korean server? Set the Encode field and ENV:LANG on the bookmark, or switch encoding on the fly from the footer. How electerm decodes terminal output, encodes your keystrokes and handles SFTP file names.
date: 2026-10-10
tags: [encoding, gbk, big5, shift-jis, ssh, sftp, telnet, ftp, troubleshooting]
---

# Connecting to Servers with Special Character Encoding in Electerm

You connect to an older server and the terminal fills with `�`, `????` or `ÖÐÎÄ`. File names in SFTP look like random symbols. Nothing is broken — the server just speaks **GBK**, **Big5**, **Shift_JIS** or another non-UTF-8 charset, while your client assumed UTF-8.

Electerm handles this with a per-bookmark **Encode** setting, and a quick switcher in the terminal footer when you want to try something without editing the bookmark. This post uses GBK as the example, but the steps are the same for every encoding.

## Step 1: Set the encoding on the bookmark

Open the bookmark editor for your SSH bookmark and set two fields:

1. **Encode** — select `gbk` from the list.
2. **ENV:LANG** — set it to the matching locale, for example `zh_CN.GBK` (use the GBK locale your server actually has).

Why both? They do different jobs:

- **Encode** tells *electerm* how to turn bytes into characters and back.
- **ENV:LANG** tells the *shell on the server* which locale to use, so programs like `ls`, `man` or `vim` emit text in the same charset. If the two disagree, you get garbage even though the setting "looks right".

Save the bookmark and connect.

## Step 2: Connect

Once the bookmark carries the right settings:

- **Terminal output** is decoded as GBK, so Chinese text displays correctly.
- **What you type** is encoded to GBK before it is sent. Typing `你好` into `echo` or a file name arrives as the bytes the server expects, not as UTF-8.
- **SFTP file names** follow the same encoding, so remote folders with Chinese names list, rename, upload and download correctly.

Changes take effect on the next connection with the updated bookmark.

## Switch encoding on the fly

You do not always know the right charset up front. In the terminal **footer** there is an encoding selector (on mobile, a translation icon that opens a menu). Pick another encoding and the terminal switches decoding **immediately**, in the running session — no reconnect.

This is the fastest way to find out what a server really uses: flip through `gbk`, `big5`, `shift-jis`, `euc-kr` until the text becomes readable, then write the winner into the bookmark.

Note the footer switcher changes how *output is decoded* for the current tab. To make it permanent, set it in the bookmark.

## Supported encodings

The list includes:

- `utf-8` (default)
- Simplified Chinese: `gbk`, `gb2312`, `gb18030`, `hz-gb-2312`
- Traditional Chinese: `big5`
- Japanese: `shift-jis`, `euc-jp`, `iso-2022-jp`
- Korean: `euc-kr`, `iso-2022-kr`
- Unicode variants: `utf-16le`, `utf-16be`
- Western / Central European: the `iso-8859-*` series and `windows-125x` code pages
- Cyrillic and others: `koi8-r`, `koi8-u`, `ibm866`, `windows-1251`, `windows-874`, `macintosh` and more

## Which connection types use it

The Encode field appears on the bookmark forms for:

- **SSH** — terminal and SFTP
- **Telnet** — terminal input is encoded the same way
- **FTP** — file names are converted between the chosen encoding and the FTP control connection

## How it works under the hood

For the curious, the pieces are small:

- **Output (server → you):** the terminal keeps a streaming `TextDecoder` created with the tab's encoding. Using a streaming decoder matters: a multi-byte GBK or Shift_JIS character can be split across two network packets, and the decoder holds the partial bytes until the rest arrives.
- **Input (you → server):** on the app side, keystrokes are converted with `iconv-lite` before being written to the channel. For `utf-8` (and its aliases) nothing is converted. If conversion ever fails, electerm falls back to writing the raw text rather than dropping your input.
- **SFTP:** when the encoding is not UTF-8, the SFTP layer is created with `iconv-lite` and the chosen charset, so path names are encoded and decoded consistently. Folder transfers use the same setting.

## Troubleshooting garbled text

1. **Check what the server uses.** In a session, run:

   ```bash
   locale
   echo $LANG
   ```

   A value ending in `.GBK`, `.GB18030`, `.BIG5`, `.SJIS` or `.eucJP` tells you the charset.
2. **Make Encode match.** The bookmark's Encode must equal the server's real charset. If you are unsure, use the footer switcher to find one that displays correctly.
3. **Set ENV:LANG too.** If the server does not accept the locale, install it on the server first (`locale -a` lists what is available), otherwise the shell falls back to `C` or `POSIX`.
4. **Reconnect.** Bookmark changes apply on the next connection.
5. **Remember file contents are bytes.** Electerm fixes *display* and *file names*. A text file saved in GBK and opened in a UTF-8 editor will still look wrong in that editor — that is the editor's encoding, not the connection's.

## Notes

- If the server is UTF-8, leave Encode at `utf-8` and ENV:LANG at something like `en_US.UTF-8`. Setting a legacy encoding on a UTF-8 server *causes* garbled text.
- `GBK` and `GB2312` are not identical, but GBK is a superset, so `gbk` is the safe choice for either. Use `gb18030` if you also need rare characters.
- The environment variable `LANG` is set for the SSH session; it does not change anything permanently on the server.

Legacy charsets are not going away on long-lived servers, network gear and embedded devices. With a one-line bookmark setting, electerm makes them just another connection.
