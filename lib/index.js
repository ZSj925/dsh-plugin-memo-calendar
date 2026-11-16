/**
 * dsh-plugin-memo-calendar — host half.
 *
 * One memo per calendar day, stored on this machine:
 *
 *   <DSH_HOME>/memo-calendar/entries.json      (DSH_HOME defaults to ~/.dsh)
 *
 * HTTP surface (same-origin browser requests only):
 *
 *   GET  /dsh-memo/api/ping     -> { ok, name, days, dataFile }
 *   GET  /dsh-memo/api/list     -> { entries: Record<YYYY-MM-DD, Entry>, days }
 *   POST /dsh-memo/api/save     -> { entry, removed, days }  body: { date, text }
 *   POST /dsh-memo/api/delete   -> { ok, removed, days }     body: { date }
 *
 * An empty or whitespace-only memo removes that day, so the calendar only
 * marks days that actually carry content. Writes are serialized and landed
 * with write-temp + rename: an interrupted save cannot leave a half-written
 * file behind. If the file is unreadable it is moved aside, never destroyed.
 *
 * The first activation also imports the old notebook-style notes.json from the
 * previous prototype (if present), folding each note into the local day it was
 * written, so no existing text is lost.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const PLUGIN_NAME = 'memo-calendar'
const API = '/dsh-memo/api'
const MAX_TEXT = 200_000
const MAX_ENTRIES = 5_000
const MAX_REQUEST_BYTES = 2 * 1024 * 1024
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const DATA_DIR = path.join(DSH_HOME, 'memo-calendar')
const DATA_FILE = path.join(DATA_DIR, 'entries.json')
const LEGACY_FILE = path.join(DATA_DIR, 'notes.json')

/** @type {{ version: number, entries: Record<string, { text: string, createdAt: string, updatedAt: string }> } | null} */
let state = null
/** Serialized writer: every persist waits for the previous one. */
let writeChain = Promise.resolve()

function nowIso() {
  return new Date().toISOString()
}

function emptyState() {
  return { version: 2, entries: {} }
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
  return value.replace(/\r\n/g, '\n').slice(0, MAX_TEXT)
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const text = cleanText(raw.text)
  if (text.trim() === '') return null
  const fallback = nowIso()
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : fallback
  const updatedAt = typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : createdAt
  return { text, createdAt, updatedAt }
}

function normalizeState(raw) {
  const next = emptyState()
  if (!raw || typeof raw !== 'object' || !raw.entries || typeof raw.entries !== 'object') return next
  for (const [key, value] of Object.entries(raw.entries)) {
    if (!isDateKey(key)) continue
    const entry = normalizeEntry(value)
    if (!entry) continue
    next.entries[key] = entry
    if (Object.keys(next.entries).length >= MAX_ENTRIES) break
  }
  return next
}

/** Fold the previous prototype's notebook notes into one entry per local day. */
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
    const previous = byDay.get(key)
    if (previous) {
      previous.text = `${previous.text}\n\n${text}`.slice(0, MAX_TEXT)
      previous.updatedAt = nowIso()
    } else {
      byDay.set(key, { text: text.slice(0, MAX_TEXT), createdAt: nowIso(), updatedAt: nowIso() })
    }
  }
  if (byDay.size === 0) return null

  const migrated = emptyState()
  for (const [key, entry] of byDay) migrated.entries[key] = entry
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
    const text = fs.readFileSync(DATA_FILE, 'utf8')
    return normalizeState(JSON.parse(text))
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

function upsert(date, rawText) {
  const store = getState()
  const text = cleanText(rawText)
  if (text.trim() === '') {
    if (store.entries[date]) {
      delete store.entries[date]
      return { entry: null, removed: true }
    }
    return { entry: null, removed: false }
  }
  const existing = store.entries[date]
  if (!existing && Object.keys(store.entries).length >= MAX_ENTRIES) {
    throw Object.assign(new Error(`memo limit reached (${MAX_ENTRIES} days)`), { status: 409 })
  }
  const stamp = nowIso()
  const entry = {
    text,
    createdAt: existing?.createdAt || stamp,
    updatedAt: stamp,
  }
  store.entries[date] = entry
  return { entry, removed: false }
}

function remove(date) {
  const store = getState()
  if (!store.entries[date]) return false
  delete store.entries[date]
  return true
}

function dayCount() {
  return Object.keys(getState().entries).length
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
    days: dayCount(),
    dataFile: path.basename(DATA_FILE),
  }))

  on('GET', 'list', () => {
    const store = getState()
    return {
      version: store.version,
      entries: store.entries,
      days: Object.keys(store.entries).length,
    }
  })

  on('POST', 'save', async (request) => {
    const input = await readJson(request)
    const date = typeof input.date === 'string' ? input.date : ''
    if (!isDateKey(date)) throw Object.assign(new Error('date must be YYYY-MM-DD'), { status: 400 })
    if (typeof input.text !== 'string') throw Object.assign(new Error('text is required'), { status: 400 })
    const result = upsert(date, input.text)
    await persist()
    return { ...result, days: dayCount() }
  })

  on('POST', 'delete', async (request) => {
    const input = await readJson(request)
    const date = typeof input.date === 'string' ? input.date : ''
    if (!isDateKey(date)) throw Object.assign(new Error('date must be YYYY-MM-DD'), { status: 400 })
    const removed = remove(date)
    if (removed) await persist()
    return { ok: true, removed, days: dayCount() }
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
