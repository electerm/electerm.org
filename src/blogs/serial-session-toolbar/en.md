---
title: 'Serial Sessions Get a Control Toolbar in electerm'
description: 'Serial tabs in electerm 5.11.8 gain one toolbar icon with DTR RTS and break control, CTS DSR DCD indicators, ascii hex dec and bin views of received data, and raw byte send in four formats.'
date: 2026-11-20
tags: [serial, hardware, terminal, debugging, hex, update]
videos: [electerm-serial-port]
bannerScript: banner.js
---

# Serial sessions get a control toolbar

A serial tab in electerm is a terminal onto a device. That is enough for a lot of hardware work —
until the device answers in bytes instead of text, or says nothing at all because a control line is
in the wrong state. The usual fix is to keep another utility open next to electerm.

Since **electerm 5.11.8**, serial tabs have their own session toolbar for those moments. One icon
opens a panel with DTR, RTS and break control, CTS, DSR and DCD status, four ways to read incoming
data, and a raw-send field that writes exactly the bytes you type.

The serial tab itself is not new; the toolbar is. If you have never opened a serial session, the
short walkthrough linked at the end covers making the first connection.

## 1. Where the panel lives

Open a serial bookmark and look at the session control bar above the terminal. On desktop there is
a sliders icon next to the other session icons. Hover it and the tooltip reads *Serial: DTR / RTS /
break, view of received data, send bytes*. Click it and a panel opens beside the terminal, so the
device output stays visible while you work.

On a phone the same sliders icon sits inside the **…** menu and opens the same panel as a dialog
titled **Serial**. The controls and their order are identical on both.

The icon turns green when something other than the plain ASCII view is active — a HEX, DEC or BIN
view, a frame byte, or a break pulse still flashing. One glance tells you the session is not in its
default state.

## 2. Drive the lines, watch the other side

The top row of the panel has three buttons. DTR and RTS are switches; break is an action.

| Control | What a click does | How you see its state |
| --- | --- | --- |
| DTR | Flips the line between asserted and idle | The button is blue while asserted |
| RTS | Flips the line between asserted and idle | The button is blue while asserted |
| Break | Holds the line low for about 250 ms, then releases it | The lightning icon flashes briefly |

Break is a pulse on purpose. A break left switched on would silence the port until somebody turned
it off again, so the panel never shows it as latched.

Under the buttons are three read-only lights. Green means asserted; idle stays in the normal text
colour. Hovering a light gives its full name and state.

| Light | Full name | What it tells you |
| --- | --- | --- |
| CTS | Clear to send | The device is ready to receive |
| DSR | Data set ready | The device is present and ready |
| DCD | Carrier detect | A carrier is detected |

There is no RI (ring indicator) light in the panel.

DTR and RTS start asserted when the session opens. The panel refreshes the lights about three times
a second while the tab is active, and reads them immediately when you return to the app window.
Line state is not saved in the bookmark, so a new session starts from those same defaults.

One caveat: if you enable RTS/CTS hardware flow control on the bookmark, the driver owns RTS and can
refuse a change. When that happens the panel shows a red error line instead of silently changing
nothing.

## 3. Read bytes instead of characters

**Received data as** is a four-button row: **ASCII HEX DEC BIN**.

| View | What one byte looks like | Bytes per line |
| --- | --- | --- |
| ASCII | The character itself, with the bookmark's receive line-ending setting applied | however the device sends it |
| HEX | Two uppercase digits, for example `4A` | 16 |
| DEC | Decimal 0–255, padded to three characters | 16 |
| BIN | Eight 0 and 1 digits, for example `01001010` | 8 |

ASCII is the default and behaves like a normal terminal. In the other three views an **ASCII
column** is appended by default, showing printable characters next to the numbers and a `.` for
anything else. The checkbox is disabled in ASCII view, where the column would be redundant.

Two options help with binary protocols:

- **Frame start** and **Frame stop** each take one byte in hex, for example `10` or `0xFF`. With a
  start byte set, a new line begins at that byte; with a stop byte set, the line ends after it. All
  bytes already received are redrawn with the new boundaries, and the entered value stays in the
  field when the box is unchecked.
- In HEX, DEC and BIN the **arrow keys move a highlighted byte** through the received data instead
  of going to the device. The panel shows that byte's offset, its hex, decimal and binary values,
  and its printable character if it has one.

Changing the view clears the visible screen and redraws the bytes kept from this session — up to
roughly 256 KB — so you can compare formats without reconnecting. The earlier ASCII output remains
in scrollback, and the redraw is not written into the session log again.

## 4. Send exactly the bytes you typed

At the bottom of the panel, pick a format from the drop-down, type into the field and press
**Send** or Enter. The placeholder changes with the format.

| Format | Examples you can type | Notes |
| --- | --- | --- |
| HEX | `1B 41 0D`, `0x1B,0x41`, `1B410D` | Spaces, commas and semicolons separate bytes; `0x` is optional; a continuous string is split into pairs |
| DEC | `27 65 13` | Whole numbers from 0 to 255 |
| BIN | `00011011 01000001`, `0b00011011` | `0b` is optional |
| ASCII | `AT\r\n`, `\x1B` | Recognises `\r`, `\n`, `\t`, `\\` and `\xHH` escapes |

Invalid input shows a red error under the field and sends nothing — an odd number of hex digits, a
number outside one byte, or a character that needs more than one byte in ASCII mode.

**Raw means raw.** Ordinary typing in a serial tab gets the bookmark's transmit line ending, which
is `\r` by default. The raw-send field adds nothing at all, so include `0D` or `0A` yourself when the
device expects a line ending. The receive line-ending setting still applies, but only in ASCII view.

## 5. Things to know

- The panel labels are in English for now; the serial controls have no translated strings yet.
- DTR and RTS are set to asserted on every connect and are not remembered between sessions.
- Break always releases by itself after roughly a quarter of a second.
- With RTS/CTS flow control enabled, RTS belongs to the flow control driver and may not change.
- Only CTS, DSR and DCD are displayed; RI is not.
- Arrow keys navigate the byte cursor in HEX, DEC and BIN — they are not forwarded to the device.
- The byte views redraw the screen on every switch. If you need an untouched record, keep the
  terminal log enabled; the redraw itself is not logged.

## 6. Try it

1. Update to **electerm 5.11.8** or newer.
2. Create a new bookmark with type **serial**, choose the device path, and set baud rate, data bits,
   stop bits and parity to match the device. `9600`, `8`, `1`, `none` is the default.
3. Open the tab, click the sliders icon, and watch **CTS**, **DSR** and **DCD**.
4. Toggle **DTR** once and check that the device reacts.
5. Set **Received data as** to HEX, then send `48 65 6C 6C 6F 0D` — `Hello` followed by a carriage
   return — and read the reply as bytes.
6. If the device frames replies with `0x10`, set **Frame start** to `10` and each reply will begin
   on a new line.

Device-specific questions and bug reports are welcome in the
[electerm issue tracker](https://github.com/electerm/electerm/issues).
