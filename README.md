# Memos · dsh-plugin-memo-calendar

A notes panel for [DeepSeek Harness](https://github.com/ZSj925) (DSH): open it from the
right sidebar and keep ideas, to-dos and snippets next to the conversation.

- Right sidebar **+** → **Memos** opens the panel
- Search, pin, click a row to edit; typing autosaves after 600 ms
- Closing or switching away flushes the last keystrokes with `sendBeacon`
- Notes never leave the machine: `<DSH_HOME>/memo-calendar/notes.json` (default `~/.dsh`)

## Install

```bash
# from the DSH plugin panel, or for local development:
dsh plugin add link:/path/to/dsh-plugin-memo-calendar
```

The repository *is* the installable DSH bundle: `dsh.bundle.patch` points at
`cordis.patch.yml`, the host half is `lib/index.js`, the browser half is
`lib/client.js` (no build step).

After installing, check that `dsh-plugin-memo-calendar` is enabled under
**Settings → Plugins**, reload the page, then use **+** in the right sidebar.

## Data

```
~/.dsh/memo-calendar/notes.json
{
  "version": 1,
  "notes": [
    { "id": "…", "title": "…", "body": "…", "pinned": false,
      "createdAt": "2026-11-16T09:00:00.000Z", "updatedAt": "…" }
  ]
}
```

Writes are serialized and committed with write-temp + rename, so an interrupted
write cannot leave a truncated file. A corrupt file is moved aside as
`notes.json.corrupt-<timestamp>` instead of being overwritten.

Back up the file to back up the notes; copy the directory to move machines.

## HTTP surface

Four same-origin JSON routes under `/dsh-memo/api/`:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/ping` | liveness + note count |
| GET | `/list` | all notes |
| POST | `/save` | create or update (`{ id?, title?, body?, pinned? }`) |
| POST | `/delete` | delete (`{ id }`) |

Routes refuse explicit cross-site requests (`Sec-Fetch-Site: cross-site`) and an
`Origin` that does not match `Host`.

## License

MIT
