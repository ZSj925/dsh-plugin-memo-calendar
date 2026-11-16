/**
 * dsh-plugin-memo-calendar —— host half.
 *
 * Owns the notes store and the small HTTP surface the browser half talks to:
 *
 *   GET  /dsh-memo/api/ping     → { ok, version, notes }
 *   GET  /dsh-memo/api/list     → { notes: Note[] }
 *   POST /dsh-memo/api/save     → { note: Note }        body: { id?, title?, body?, pinned? }
 *   POST /dsh-memo/api/delete   → { ok: true, removed } body: { id }
 *
 * Notes live in one JSON file under the DSH home directory, so they survive
 * plugin reinstalls and host restarts:
 *
 *   <DSH_HOME>/memo-calendar/notes.json      (DSH_HOME defaults to ~/.dsh)
 *
 * Writes are serialized and landed with write-temp + rename, so an interrupted
 * write can never leave a half-written file behind; a corrupt file is moved
 * aside instead of being overwritten.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'

const PLUGIN_NAME = 'memo-calendar'
const API = '/dsh-memo/api'
const MAX_NOTES = 5000
const MAX_TITLE = 200
const MAX_BODY = 200_000
const MAX_REQUEST_BYTES = 2 * 1024 * 1024

const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const DATA_DIR = path.join(DSH_HOME, 'memo-calendar')
const DATA_FILE = path.join(DATA_DIR, 'notes.json')

/** @type {{ version: number, notes: any[] } | null} */
let state = null
/** Serialized writer: every persist waits for the previous one. */
let writeChain = Promise.resolve()

function nowIso() {
  return new Date().toISOString()
}

function emptyState() {
  return { version: 1, notes: [] }
}

function cleanText(value, max) {
  if (typeof value !== 'string') return ''
  const text = value.replace(/\r\n/g, '\n')
  return text.length > max ? text.slice(0, max) : text
}

function normalizeNote(raw) {
  const note = {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : randomUUID(),
    title: cleanText(raw?.title, MAX_TITLE),
    body: cleanText(raw?.body, MAX_BODY),
    pinned: raw?.pinned === true,
    createdAt: typeof raw?.createdAt === 'string' && raw.createdAt ? raw.createdAt : nowIso(),
    updatedAt: typeof raw?.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : nowIso(),
  }
  return note
}

function normalizeState(raw) {
  const notes = Array.isArray(raw?.notes) ? raw.notes.filter((n) => n && typeof n === 'object').map(normalizeNote) : []
  return { version: 1, notes }
}

function loadState() {
  try {
    const text = fs.readFileSync(DATA_FILE, 'utf8')
    const parsed = JSON.parse(text)
    return normalizeState(parsed)
  } catch (error) {
    if (error && error.code === 'ENOENT') return emptyState()
    // Keep the unreadable file instead of destroying it, then start clean.
    try {
      fs.renameSync(DATA_FILE, `${DATA_FILE}.corrupt-${Date.now()}`)
    } catch (renameError) {
      // Nothing left to do; the next write replaces it.
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
    const tmp = `${DATA_FILE}.${process.pid}.tmp`
    await fs.promises.writeFile(tmp, snapshot, 'utf8')
    await fs.promises.rename(tmp, DATA_FILE)
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

function upsert(input) {
  const store = getState()
  const id = typeof input.id === 'string' && input.id ? input.id : null
  const existing = id ? store.notes.find((note) => note.id === id) : undefined
  if (existing) {
    if (typeof input.title === 'string') existing.title = cleanText(input.title, MAX_TITLE)
    if (typeof input.body === 'string') existing.body = cleanText(input.body, MAX_BODY)
    if (typeof input.pinned === 'boolean') existing.pinned = input.pinned
    existing.updatedAt = nowIso()
    return existing
  }
  if (store.notes.length >= MAX_NOTES) {
    throw Object.assign(new Error(`notes limit reached (${MAX_NOTES})`), { status: 409 })
  }
  const note = normalizeNote({
    title: input.title,
    body: input.body,
    pinned: input.pinned,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  })
  store.notes.unshift(note)
  return note
}

function remove(id) {
  const store = getState()
  const index = store.notes.findIndex((note) => note.id === id)
  if (index < 0) return false
  store.notes.splice(index, 1)
  return true
}

function handle(list) {
  const routes = []
  const on = (method, suffix, run) => {
    routes.push({
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

  on('GET', 'ping', () => ({ ok: true, name: PLUGIN_NAME, notes: getState().notes.length, dataFile: path.basename(DATA_FILE) }))

  on('GET', 'list', () => {
    const store = getState()
    return { notes: store.notes.slice(), total: store.notes.length }
  })

  on('POST', 'save', async (request) => {
    const input = await readJson(request)
    const note = upsert(input)
    await persist()
    return { note }
  })

  on('POST', 'delete', async (request) => {
    const input = await readJson(request)
    const id = typeof input.id === 'string' ? input.id : ''
    if (!id) throw Object.assign(new Error('id is required'), { status: 400 })
    const removed = remove(id)
    if (removed) await persist()
    return { ok: true, removed }
  })

  return routes
}

export const name = PLUGIN_NAME

export function apply(root) {
  // Local wait instead of an object-level inject: nothing here must delay apply.
  root.inject(['webServer'], (ctx) => {
    ctx.effect(() => {
      const disposers = handle(ctx).map((route) => ctx.webServer.register(route))
      return () => {
        for (const dispose of disposers) {
          try {
            dispose()
          } catch (error) {
            // A disposed web server may already have dropped its table.
          }
        }
      }
    }, 'memo-calendar: routes')
  })
}

export default { name: PLUGIN_NAME, apply }
