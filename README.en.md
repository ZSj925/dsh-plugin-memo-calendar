# Calendar memos for DeepSeek Harness

> [简体中文](README.md) · English

A small DSH plugin that turns a month calendar into a collection of daily
memos. Pick a day, add memos one by one, and everything stays on this machine.

![Calendar icon](icon.svg)

## What it does

- A full month calendar in the main panel, opened from the sidebar's panel list.
- Any number of separate memos per day, added one at a time.
- Composer at the bottom of the day panel: type a memo, then **Add** or press
  `Ctrl`/`Cmd`+`Enter`.
- Each memo can be edited or deleted independently; **Clear day** removes all
  memos for the selected day after a second confirmation.
- Drag the grip handle beside a memo to reorder the day's list; the new order
  is saved immediately and survives restarts.
- On any day other than today, each memo offers **Move to today**, which appends
  it to today's list.
- Star any memo to mark it **Long-term**. The editor's Long-term tab collects
  starred memos across dates; click a date chip to return to its source day.
- Calendar cells show the number of memos and a preview of the latest one.
- Today is marked with a tinted cell, a subtle ring, and a small dot beside the date; the date itself looks like every other day.
- Previous / next month, a Today shortcut, and day/memo totals.
- Light and dark themes inherit the host's `--dsw-*` tokens; all UI copy is
  localized in English and Simplified Chinese.
- Data never leaves the machine.

## Install

The repository is itself an installable DSH bundle: `package.json` declares
`dsh.bundle.patch`, the host half is `lib/index.js`, and the browser half is
`lib/client.js` (no build step).

From GitHub:

```bash
dsh plugin add github:ZSj925/dsh-plugin-memo-calendar
```

Or install the checked-out directory:

```bash
dsh plugin add link:/absolute/path/to/dsh-plugin-memo-calendar
```

After installation, reload the Web UI. The calendar icon appears in the
sidebar's panel list; selecting it opens the calendar. If the entry is missing,
check that `dsh-plugin-memo-calendar` is enabled under **Settings → Plugins**.

## Data

```
<DSH_HOME>/memo-calendar/entries.json      # default: ~/.dsh/memo-calendar/entries.json
```

```json
{
  "version": 3,
  "entries": {
    "2026-11-16": {
      "items": [
        {
          "id": "6f0d0e1a-…",
          "text": "First memo for the day.",
          "createdAt": "2026-11-16T10:00:00.000Z",
          "updatedAt": "2026-11-16T10:00:00.000Z"
        },
        {
          "id": "88d1c5b2-…",
          "text": "A second memo, kept long-term.",
          "createdAt": "2026-11-16T10:05:00.000Z",
          "updatedAt": "2026-11-16T10:05:00.000Z",
          "longTerm": true
        }
      ]
    }
  }
}
```

A long-term memo still belongs to its source day; `longTerm: true` only makes it
appear in the Long-term tab as well. Deleting the last memo of a day removes that
day. Writes are serialized and landed with write-temp + rename; a corrupt file is kept as
`entries.json.corrupt-<timestamp>` rather than being overwritten. Copy that one
file to back up the calendar.

Earlier data is normalized when read: the old single-text day entry becomes one
memo item, and the notebook-style `notes.json` is imported as one item per
notebook entry. Existing text is preserved.

## HTTP surface

Nine same-origin JSON routes under `/dsh-memo/api/`:

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| GET | `/ping` | — | `{ ok, name, version, days, memos, dataFile }` |
| GET | `/list` | — | `{ version, entries, days, memos }` |
| POST | `/add` | `{ date, text }` | `{ item, items, days, memos }` |
| POST | `/update` | `{ date, id, text }` | `{ item, items, days, memos }` |
| POST | `/delete` | `{ date, id }` | `{ ok, removed, items, days, memos }` |
| POST | `/reorder` | `{ date, ids }` | `{ items, days, memos }` |
| POST | `/move` | `{ fromDate, toDate, id }` | `{ item, fromItems, toItems, days, memos }` |
| POST | `/longterm` | `{ date, id, longTerm }` | `{ item, items, days, memos }` |
| POST | `/clear` | `{ date }` | `{ ok, removed, days, memos }` |

Dates are local calendar dates in `YYYY-MM-DD` form. Routes refuse explicit
cross-site requests (`Sec-Fetch-Site: cross-site`) and an `Origin` that does not
match `Host`.

## Development

No bundler is required. Validate both halves with:

```bash
node --check lib/index.js
node --check lib/client.js
```

The client module is a lazy `window.__ModuleLoader__` factory. It registers a
`main` panel named `memo-calendar` and the matching `sidebar.panellist` icon.

## License

MIT
