# Calendar memos for DeepSeek Harness

A small DSH plugin that turns a month calendar into a daily journal. Pick any
day, write, and the text is saved on this machine automatically.

![Calendar icon](icon.svg)

## What it does

- A full month calendar in the main panel, opened from the sidebar's panel list.
- Every day keeps one memo; days with text show a dot and a short preview.
- Click a day to edit it. The editor autosaves after 700 ms, and `Ctrl`/`Cmd`+`S`
  saves immediately.
- Switching days, closing the panel, or closing the page flushes pending text.
- Previous / next month, a Today shortcut, and a count of recorded days.
- A two-step **Clear day** action so a day cannot be wiped by one stray click.
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
  "version": 2,
  "entries": {
    "2026-11-16": {
      "text": "First line of the day…",
      "createdAt": "2026-11-16T10:00:00.000Z",
      "updatedAt": "2026-11-16T10:02:00.000Z"
    }
  }
}
```

An empty memo removes its day, so only days that carry content are marked.
Writes are serialized and landed with write-temp + rename; a corrupt file is
kept as `entries.json.corrupt-<timestamp>` rather than being overwritten.
Copy that one file to back up the journal.

The first activation also imports the notebook-style `notes.json` left by the
earlier prototype, folding each note into the local day it was written, so
existing text is not lost.

## HTTP surface

Four same-origin JSON routes under `/dsh-memo/api/`:

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| GET | `/ping` | — | `{ ok, name, days, dataFile }` |
| GET | `/list` | — | `{ version, entries, days }` |
| POST | `/save` | `{ date, text }` | `{ entry, removed, days }` |
| POST | `/delete` | `{ date }` | `{ ok, removed, days }` |

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
