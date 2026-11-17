/**
 * dsh-plugin-memo-calendar — host half.
 *
 * A calendar of days; each day holds any number of individual memos:
 *
 *   <DSH_HOME>/memo-calendar/entries.json      (DSH_HOME defaults to ~/.dsh)
 *
 * HTTP surface (same-origin browser requests only):
 *
 *   GET  /dsh-memo/api/ping     -> { ok, name, version, days, memos, dataFile }
 *   GET  /dsh-memo/api/list     -> { version, entries, days, memos }
 *   POST /dsh-memo/api/add      -> { item, items, days, memos }   body: { date, text }
 *   POST /dsh-memo/api/update   -> { item, items, days, memos }   body: { date, id, text }
 *   POST /dsh-memo/api/delete   -> { ok, removed, items, days, memos } body: { date, id }
 *   POST /dsh-memo/api/reorder  -> { items, days, memos }         body: { date, ids }
 *   POST /dsh-memo/api/move     -> { item, fromItems, toItems, days, memos }
 *                                                                  body: { fromDate, toDate, id }
 *   POST /dsh-memo/api/longterm -> { item, items, days, memos }   body: { date, id, longTerm }
 *   POST /dsh-memo/api/clear    -> { ok, removed, days, memos }   body: { date }
 *
 * Every memo is a separate item with its own id and timestamps, kept in the
 * order the user arranged. Deleting the last item removes the day from the
 * store. Writes are serialized and landed
 * with write-temp + rename, so an interrupted save cannot leave a half-written
 * file behind. A corrupt file is moved aside, never destroyed.
 *
 * Data from earlier versions is normalized on read: the previous single-text
 * day entry becomes one memo item, so existing text is preserved. The earlier
 * notebook-style notes.json is imported too, one item per notebook entry.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'

const PLUGIN_NAME = 'memo-calendar'
const API = '/dsh-memo/api'
const VERSION = 3
const MAX_TEXT = 200_000
const MAX_ITEMS_PER_DAY = 200
const MAX_ENTRIES = 5_000
const MAX_REQUEST_BYTES = 2 * 1024 * 1024
const DATE_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/

const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const DATA_DIR = path.join(DSH_HOME, 'memo-calendar')
const DATA_FILE = path.join(DATA_DIR, 'entries.json')
const LEGACY_FILE = path.join(DATA_DIR, 'notes.json')

/**
 * @typedef {{ id: string, text: string, createdAt: string, updatedAt: string }} MemoItem
 * @typedef {{ items: MemoItem[] }} DayEntry
 * @type {{ version: number, entries: Record<string, DayEntry> } | null}
 */
let state = null
/** Serialized writer: every persist waits for the previous one. */
let writeChain = Promise.resolve()

function nowIso() {
  return new Date().toISOString()
}

function emptyState() {
  return { version: VERSION, entries: {} }
}

function pad(value) {
  return value < 10 ? `0${value}` : String(value)
}

function localDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function isDateKey(value) {
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
  )
}

function cleanText(value) {
  if (typeof value !== 'string') return ''
  return value.replaceAll('\r\n', '\n').slice(0, MAX_TEXT)
}

function normalizeItem(raw, fallbackStamp) {
  if (!raw || typeof raw !== 'object') return null
  const text = cleanText(raw.text)
  if (text.trim() === '') return null
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : fallbackStamp
  const updatedAt = typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : createdAt
  const id =
    typeof raw.id === 'string' && raw.id.length > 0 && raw.id.length <= 128 ? raw.id : randomUUID()
  return { id, text, createdAt, updatedAt, longTerm: raw.longTerm === true }
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const source = Array.isArray(raw.items)
    ? raw.items
    : typeof raw.text === 'string'
      ? [{ text: raw.text, createdAt: raw.createdAt, updatedAt: raw.updatedAt }]
      : null
  if (!source) return null

  const fallback = nowIso()
  const items = []
  for (const value of source) {
    const item = normalizeItem(value, fallback)
    if (!item) continue
    items.push(item)
    if (items.length >= MAX_ITEMS_PER_DAY) break
  }
  if (items.length === 0) return null
  // Array order is user-controlled: a drag reorder persists exactly as stored.
  return { items }
}

function normalizeState(raw) {
  const next = emptyState()
  if (!raw || typeof raw !== 'object' || !raw.entries || typeof raw.entries !== 'object') return next
  for (const [key, value] of Object.entries(raw.entries)) {
    if (!isDateKey(key)) continue
    const entry = normalizeEntry(Array.isArray(value) ? { items: value } : value)
    if (!entry) continue
    next.entries[key] = entry
    if (Object.keys(next.entries).length >= MAX_ENTRIES) break
  }
  return next
}

/** Import the previous notebook prototype as one memo item per notebook note. */
function migrateLegacyNotes() {
  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(LEGACY_FILE, 'utf8'))
  } catch (error) {
    return null
  }
  const notes = Array.isArray(parsed?.notes) ? parsed.notes : []
  if (notes.length === 0) return null

  const byDay = new Map()
  const sorted = notes.slice().sort((left, right) => {
    const a = Date.parse(left?.createdAt || left?.updatedAt || '') || 0
    const b = Date.parse(right?.createdAt || right?.updatedAt || '') || 0
    return a - b
  })
  for (const note of sorted) {
    if (!note || typeof note !== 'object') continue
    const title = cleanText(note.title).trim()
    const body = cleanText(note.body).trim()
    const text = [title, body].filter(Boolean).join('\n').trim()
    if (!text) continue
    const stamp = typeof note.createdAt === 'string' ? note.createdAt : note.updatedAt
    const date = new Date(stamp)
    const key = Number.isNaN(date.getTime()) ? localDateKey(new Date()) : localDateKey(date)
    const updatedAt = typeof note.updatedAt === 'string' && note.updatedAt ? note.updatedAt : nowIso()
    const createdAt = typeof note.createdAt === 'string' && note.createdAt ? note.createdAt : updatedAt
    const items = byDay.get(key) || []
    if (items.length >= MAX_ITEMS_PER_DAY) continue
    items.push({
      id: randomUUID(),
      text: text.slice(0, MAX_TEXT),
      createdAt,
      updatedAt,
      longTerm: false,
    })
    byDay.set(key, items)
  }
  if (byDay.size === 0) return null

  const migrated = emptyState()
  for (const [key, items] of byDay) migrated.entries[key] = { items }
  try {
    writeSnapshotSync(migrated)
    return migrated
  } catch (error) {
    // Keep the old file untouched if the new one could not be written.
    return null
  }
}

function writeSnapshotSync(snapshot) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const temp = `${DATA_FILE}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(snapshot, null, 2), 'utf8')
  fs.renameSync(temp, DATA_FILE)
}

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    const normalized = normalizeState(parsed)
    if (parsed?.version !== VERSION) {
      try {
        writeSnapshotSync(normalized)
      } catch (error) {
        // The in-memory normalized state still serves this process.
      }
    }
    return normalized
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      const migrated = migrateLegacyNotes()
      return migrated || emptyState()
    }
    // Keep an unreadable file for inspection instead of overwriting it.
    try {
      fs.renameSync(DATA_FILE, `${DATA_FILE}.corrupt-${Date.now()}`)
    } catch (renameError) {
      // Nothing left to do; the next successful write replaces it.
    }
    return emptyState()
  }
}

function getState() {
  if (state === null) state = loadState()
  return state
}

/** Persist a snapshot of the current state, serialized behind earlier writes. */
function persist() {
  const snapshot = JSON.stringify(getState(), null, 2)
  const job = writeChain.then(async () => {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const temp = `${DATA_FILE}.${process.pid}.tmp`
    await fs.promises.writeFile(temp, snapshot, 'utf8')
    await fs.promises.rename(temp, DATA_FILE)
  })
  // A failed write must not poison the chain for later writes.
  writeChain = job.catch(() => {})
  return job
}

function send(response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  response.end(body)
}

/**
 * Cheap same-origin guard: refuse explicit cross-site fetches and origins that
 * do not match the Host header. Loopback bindings and the desktop shell (whose
 * origin is not http) are unaffected.
 */
function refused(request, response) {
  if (request.headers['sec-fetch-site'] === 'cross-site') {
    send(response, 403, { error: 'cross-site request refused' })
    return true
  }
  const origin = request.headers.origin
  const host = request.headers.host
  if (typeof origin === 'string' && typeof host === 'string' && /^https?:\/\//i.test(origin)) {
    try {
      if (new URL(origin).host !== host) {
        send(response, 403, { error: 'origin mismatch' })
        return true
      }
    } catch (error) {
      send(response, 400, { error: 'malformed origin' })
      return true
    }
  }
  return false
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_REQUEST_BYTES) {
        reject(Object.assign(new Error('request body too large'), { status: 413 }))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        resolve(parsed && typeof parsed === 'object' ? parsed : {})
      } catch (error) {
        reject(Object.assign(new Error('invalid JSON body'), { status: 400 }))
      }
    })
    request.on('error', reject)
  })
}

function invalid(message, status) {
  return Object.assign(new Error(message), { status })
}

function addItem(date, rawText) {
  const store = getState()
  const text = cleanText(rawText)
  if (text.trim() === '') throw invalid('text is required', 400)

  const existing = store.entries[date]
  if (existing && existing.items.length >= MAX_ITEMS_PER_DAY) {
    throw invalid(`day memo limit reached (${MAX_ITEMS_PER_DAY})`, 409)
  }
  if (!existing && Object.keys(store.entries).length >= MAX_ENTRIES) {
    throw invalid(`day limit reached (${MAX_ENTRIES})`, 409)
  }

  const stamp = nowIso()
  const item = { id: randomUUID(), text, createdAt: stamp, updatedAt: stamp, longTerm: false }
  if (existing) existing.items.push(item)
  else store.entries[date] = { items: [item] }
  return { item, items: store.entries[date].items }
}

function updateItem(date, id, rawText) {
  const store = getState()
  const entry = store.entries[date]
  if (!entry) throw invalid('memo not found', 404)
  const item = entry.items.find((candidate) => candidate.id === id)
  if (!item) throw invalid('memo not found', 404)
  const text = cleanText(rawText)
  if (text.trim() === '') throw invalid('text is required', 400)
  item.text = text
  item.updatedAt = nowIso()
  return { item, items: entry.items }
}

function setLongTerm(date, id, longTerm) {
  const store = getState()
  const entry = store.entries[date]
  if (!entry) throw invalid('memo not found', 404)
  const item = entry.items.find((candidate) => candidate.id === id)
  if (!item) throw invalid('memo not found', 404)
  item.longTerm = longTerm === true
  return { item, items: entry.items }
}

function removeItem(date, id) {
  const store = getState()
  const entry = store.entries[date]
  if (!entry) return { removed: false, item: null, items: [], dateRemoved: false }
  const index = entry.items.findIndex((candidate) => candidate.id === id)
  if (index < 0) return { removed: false, item: null, items: entry.items, dateRemoved: false }
  const [item] = entry.items.splice(index, 1)
  const dateRemoved = entry.items.length === 0
  if (dateRemoved) delete store.entries[date]
  return { removed: true, item, items: dateRemoved ? [] : entry.items, dateRemoved }
}

function clearDate(date) {
  const store = getState()
  if (!store.entries[date]) return false
  delete store.entries[date]
  return true
}

function moveItem(fromDate, toDate, id) {
  const store = getState()
  if (fromDate === toDate) throw invalid('fromDate and toDate must differ', 400)
  const source = store.entries[fromDate]
  if (!source) throw invalid('source day not found', 404)
  const index = source.items.findIndex((candidate) => candidate.id === id)
  if (index < 0) throw invalid('memo not found', 404)

  const target = store.entries[toDate]
  if (target && target.items.length >= MAX_ITEMS_PER_DAY) {
    throw invalid(`day memo limit reached (${MAX_ITEMS_PER_DAY})`, 409)
  }
  const sourceWillEmpty = source.items.length === 1
  if (!target && !sourceWillEmpty && Object.keys(store.entries).length >= MAX_ENTRIES) {
    throw invalid(`day limit reached (${MAX_ENTRIES})`, 409)
  }

  const [item] = source.items.splice(index, 1)
  const fromItems = source.items.slice()
  if (source.items.length === 0) delete store.entries[fromDate]
  if (target) target.items.push(item)
  else store.entries[toDate] = { items: [item] }
  return { item, fromItems, toItems: store.entries[toDate].items }
}

function reorderItems(date, ids) {
  const store = getState()
  const entry = store.entries[date]
  if (!entry) throw invalid('memo day not found', 404)
  if (!Array.isArray(ids)) throw invalid('ids must be an array', 400)
  if (ids.length !== entry.items.length) throw invalid('ids must list every memo exactly once', 400)
  const byId = new Map(entry.items.map((item) => [item.id, item]))
  const seen = new Set()
  const ordered = []
  for (const id of ids) {
    if (typeof id !== 'string' || seen.has(id) || !byId.has(id)) {
      throw invalid('ids must list every memo exactly once', 400)
    }
    seen.add(id)
    ordered.push(byId.get(id))
  }
  if (ordered.length !== entry.items.length) throw invalid('ids must list every memo exactly once', 400)
  entry.items = ordered
  return { items: entry.items }
}

function counts() {
  const store = getState()
  let memos = 0
  for (const entry of Object.values(store.entries)) memos += entry.items.length
  return { days: Object.keys(store.entries).length, memos }
}

function routes() {
  const list = []
  const on = (method, suffix, run) => {
    list.push({
      kind: 'exact',
      path: `${API}/${suffix}`,
      handler: (request, response) => {
        if (refused(request, response)) return
        if (request.method !== method) {
          response.setHeader('allow', method)
          send(response, 405, { error: `method ${request.method} not allowed` })
          return
        }
        Promise.resolve()
          .then(() => run(request, response))
          .then((payload) => {
            if (!response.headersSent) send(response, 200, payload === undefined ? { ok: true } : payload)
          })
          .catch((error) => {
            if (response.headersSent) {
              response.destroy()
              return
            }
            send(response, error?.status || 500, { error: String(error?.message || error) })
          })
      },
    })
  }

  on('GET', 'ping', () => ({
    ok: true,
    name: PLUGIN_NAME,
    version: VERSION,
    ...counts(),
    dataFile: path.basename(DATA_FILE),
  }))

  on('GET', 'list', () => {
    const store = getState()
    return {
      version: store.version,
      entries: store.entries,
      ...counts(),
    }
  })

  on('POST', 'add', async (request) => {
    const input = await readJson(request)
    const date = typeof input.date === 'string' ? input.date : ''
    if (!isDateKey(date)) throw invalid('date must be YYYY-MM-DD', 400)
    if (typeof input.text !== 'string') throw invalid('text is required', 400)
    const result = addItem(date, input.text)
    await persist()
    return { ...result, ...counts() }
  })

  on('POST', 'update', async (request) => {
    const input = await readJson(request)
    const date = typeof input.date === 'string' ? input.date : ''
    const id = typeof input.id === 'string' ? input.id : ''
    if (!isDateKey(date)) throw invalid('date must be YYYY-MM-DD', 400)
    if (!id) throw invalid('id is required', 400)
    if (typeof input.text !== 'string') throw invalid('text is required', 400)
    const result = updateItem(date, id, input.text)
    await persist()
    return { ...result, ...counts() }
  })

  on('POST', 'delete', async (request) => {
    const input = await readJson(request)
    const date = typeof input.date === 'string' ? input.date : ''
    const id = typeof input.id === 'string' ? input.id : ''
    if (!isDateKey(date)) throw invalid('date must be YYYY-MM-DD', 400)
    if (!id) throw invalid('id is required', 400)
    const result = removeItem(date, id)
    if (result.removed) await persist()
    return { ok: true, ...result, ...counts() }
  })

  on('POST', 'reorder', async (request) => {
    const input = await readJson(request)
    const date = typeof input.date === 'string' ? input.date : ''
    if (!isDateKey(date)) throw invalid('date must be YYYY-MM-DD', 400)
    const result = reorderItems(date, input.ids)
    await persist()
    return { ...result, ...counts() }
  })

  on('POST', 'move', async (request) => {
    const input = await readJson(request)
    const fromDate = typeof input.fromDate === 'string' ? input.fromDate : ''
    const toDate = typeof input.toDate === 'string' ? input.toDate : ''
    const id = typeof input.id === 'string' ? input.id : ''
    if (!isDateKey(fromDate) || !isDateKey(toDate)) throw invalid('fromDate and toDate must be YYYY-MM-DD', 400)
    if (!id) throw invalid('id is required', 400)
    const result = moveItem(fromDate, toDate, id)
    await persist()
    return { ...result, ...counts() }
  })

  on('POST', 'longterm', async (request) => {
    const input = await readJson(request)
    const date = typeof input.date === 'string' ? input.date : ''
    const id = typeof input.id === 'string' ? input.id : ''
    if (!isDateKey(date)) throw invalid('date must be YYYY-MM-DD', 400)
    if (!id) throw invalid('id is required', 400)
    if (typeof input.longTerm !== 'boolean') throw invalid('longTerm must be a boolean', 400)
    const result = setLongTerm(date, id, input.longTerm)
    await persist()
    return { ...result, ...counts() }
  })

  on('POST', 'clear', async (request) => {
    const input = await readJson(request)
    const date = typeof input.date === 'string' ? input.date : ''
    if (!isDateKey(date)) throw invalid('date must be YYYY-MM-DD', 400)
    const removed = clearDate(date)
    if (removed) await persist()
    return { ok: true, removed, ...counts() }
  })

  return list
}

export const name = PLUGIN_NAME

export const inject = ['webServer']

export function apply(ctx) {
  ctx.effect(() => {
    const disposers = routes().map((route) => ctx.webServer.register(route))
    return () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch (error) {
          // A disposed web server may already have dropped its route table.
        }
      }
    }
  }, 'memo-calendar: routes')
}
