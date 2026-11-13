// Test-Backend für die Oberflächen-Tests mit Konto.
//
// Bildet die Schnittstellen nach, die die App von Supabase nutzt – Anmeldung per Code, Tabellen-Zugriff (PostgREST)
// und Funktionen (RPC). Dahinter steht eine echte PostgreSQL mit allen Migrationen aus supabase/migrations:
// Jede Anfrage läuft mit den Rechten der App (Rolle „authenticated“, Row Level Security), genau wie im Betrieb.
// So prüfen die Tests Spalten, Regeln und Funktionen der Datenbank mit – nicht nur die Oberfläche.
//
// Nur für Tests: Der Anmeldecode ist immer 123456, Zugriffstoken werden nicht signiert.
// Voraussetzung: psql und ein PostgreSQL-Server (PGHOST, PGUSER, PGPASSWORD), siehe scripts/db-test.mjs.
import http from 'node:http'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { prepareDatabase } from '../../scripts/db-test.mjs'

const PORT = Number(process.env.E2E_BACKEND_PORT ?? 54321)
const DB = process.env.E2E_DB ?? 'teller_e2e'
/** Zeilen je Antwort – bewusst klein, damit die Tests das seitenweise Laden der App mit üben (Supabase: 1000) */
const MAX_ROWS = Number(process.env.E2E_MAX_ROWS ?? 25)
const OTP = '123456'
const ANON_KEY = 'e2e-anon-key'

// --- Datenbank ---------------------------------------------------------------------------------------------

function parseError(text) {
  const m = /ERROR:\s+([0-9A-Z]{5}):\s+(.*)/.exec(text)
  const detail = /DETAIL:\s+(.*)/.exec(text)
  const hint = /HINT:\s+(.*)/.exec(text)
  return { code: m?.[1] ?? 'XX000', message: m?.[2] ?? text.trim(), details: detail?.[1] ?? null, hint: hint?.[1] ?? null }
}

/** SQL über psql ausführen; liefert die nicht leeren Ausgabezeilen oder den Datenbankfehler */
function psql(sql) {
  return new Promise((resolve) => {
    const child = execFile(
      'psql',
      ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-d', DB, '-f', '-'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) resolve({ error: parseError(stderr || err.message) })
        else resolve({ lines: stdout.split('\n').filter((l) => l !== '') })
      },
    )
    child.stdin.end(`\\set VERBOSITY verbose\n${sql}`)
  })
}

/** Text als SQL-Literal (Dollar-Quoting: psql ersetzt darin keine Variablen, Backslashes bleiben wörtlich) */
function lit(value) {
  if (value === null || value === undefined) return 'null'
  const s = String(value)
  let tag = 'q'
  while (s.includes(`$${tag}$`)) tag += 'x'
  return `$${tag}$${s}$${tag}$`
}

class ApiError extends Error {
  constructor(status, body) {
    super(body.message)
    this.status = status
    this.body = body
  }
}

function ident(name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new ApiError(400, { code: 'PGRST100', message: `Ungültiger Name: ${name}` })
  return `"${name}"`
}

/** Befehle mit den Rechten eines Kontos (oder ohne Anmeldung) in einer Transaktion ausführen */
function asUser(claims, statements) {
  return psql(
    [
      'begin;',
      `select set_config('request.jwt.claims', ${lit(claims ? JSON.stringify(claims) : '')}, true) as c \\gset`,
      `set local role ${claims ? 'authenticated' : 'anon'};`,
      ...statements,
      'commit;',
    ].join('\n'),
  )
}

const STATUS = { 23505: 409, 23503: 409, 42501: 403, PGRST116: 406, PGRST202: 404 }
function dbError(error) {
  return new ApiError(STATUS[error.code] ?? 400, error)
}

/** Tabellen, Spalten, Primärschlüssel und Funktionen – wie der „schema cache“ von PostgREST */
let schema = { columns: {}, pks: {}, functions: {} }
async function loadSchema() {
  const res = await psql(`
    select jsonb_build_object(
      'columns', (select jsonb_object_agg(table_name, cols) from (
        select table_name, jsonb_agg(column_name order by ordinal_position) as cols
        from information_schema.columns where table_schema = 'public' group by table_name) c),
      'pks', (select jsonb_object_agg(table_name, cols) from (
        select tc.table_name, jsonb_agg(kcu.column_name order by kcu.ordinal_position) as cols
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
        where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public' group by tc.table_name) k),
      'functions', (select jsonb_object_agg(p.proname, p.prorettype::regtype::text)
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype)
    )::text;`)
  if (res.error) throw new Error(res.error.message)
  schema = JSON.parse(res.lines[0])
}

function table(name) {
  if (!schema.columns[name]) {
    throw new ApiError(404, { code: 'PGRST205', message: `Could not find the table 'public.${name}' in the schema cache` })
  }
  return name
}

function column(tbl, name) {
  if (!schema.columns[tbl].includes(name)) {
    throw new ApiError(400, { code: 'PGRST204', message: `Could not find the '${name}' column of '${tbl}' in the schema cache` })
  }
  return ident(name)
}

// --- PostgREST: Filter, Sortierung ----------------------------------------------------------------------------

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'])
const OPS = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }

function splitList(inner) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (quoted) {
      if (ch === '\\' && i + 1 < inner.length) cur += inner[++i]
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

function conditions(tbl, params) {
  const conds = []
  for (const [key, raw] of params) {
    if (RESERVED.has(key)) continue
    const col = `${ident(tbl)}.${column(tbl, key)}`
    const dot = raw.indexOf('.')
    const op = dot < 0 ? raw : raw.slice(0, dot)
    const value = dot < 0 ? '' : raw.slice(dot + 1)
    if (op === 'is') {
      if (!['null', 'true', 'false'].includes(value)) throw new ApiError(400, { code: 'PGRST100', message: `Ungültiger Filter: ${raw}` })
      conds.push(`${col} is ${value}`)
    } else if (op === 'in') {
      const list = splitList(value.replace(/^\(/, '').replace(/\)$/, ''))
      conds.push(list.length && value !== '()' ? `${col} in (${list.map(lit).join(', ')})` : 'false')
    } else if (OPS[op]) {
      conds.push(`${col} ${OPS[op]} ${lit(value)}`)
    } else {
      throw new ApiError(400, { code: 'PGRST100', message: `Filter wird vom Test-Backend nicht unterstützt: ${key}=${raw}` })
    }
  }
  return conds.length ? `where ${conds.join(' and ')}` : ''
}

function ordering(tbl, params) {
  const raw = params.get('order')
  if (!raw) return ''
  const parts = raw.split(',').map((p) => {
    const [name, ...mods] = p.split('.')
    const dir = mods.includes('desc') ? 'desc' : 'asc'
    const nulls = mods.includes('nullsfirst') ? 'nulls first' : mods.includes('nullslast') ? 'nulls last' : ''
    return `${column(tbl, name)} ${dir} ${nulls}`.trim()
  })
  return `order by ${parts.join(', ')}`
}

// --- PostgREST: Lesen, Einfügen, Ändern, Löschen -------------------------------------------------------------

function prefers(req, token) {
  return String(req.headers.prefer ?? '')
    .split(',')
    .map((s) => s.trim())
    .includes(token)
}
const wantsObject = (req) => String(req.headers.accept ?? '').includes('application/vnd.pgrst.object+json')

function single(rows) {
  if (rows.length !== 1) {
    throw new ApiError(406, {
      code: 'PGRST116',
      message: 'JSON object requested, multiple (or no) rows returned',
      details: `The result contains ${rows.length} rows`,
      hint: null,
    })
  }
  return rows[0]
}

async function restGet(req, tbl, params, claims) {
  const where = conditions(tbl, params)
  const offset = Number(params.get('offset') ?? 0)
  const limit = Math.min(Number(params.get('limit') ?? MAX_ROWS), MAX_ROWS)
  const wantCount = prefers(req, 'count=exact')
  const T = `public.${ident(tbl)}`
  const res = await asUser(claims, [
    `select jsonb_build_object(
       'rows', coalesce((select jsonb_agg(j order by rn) from (
         select to_jsonb(p) as j, row_number() over () as rn
         from (select * from ${T} ${where} ${ordering(tbl, params)} limit ${limit} offset ${offset}) p) n), '[]'::jsonb),
       'count', ${wantCount ? `(select count(*) from ${T} ${where})` : 'null'})::text;`,
  ])
  if (res.error) throw dbError(res.error)
  const { rows, count } = JSON.parse(res.lines[0])
  const range = rows.length ? `${offset}-${offset + rows.length - 1}` : '*'
  const headers = { 'Content-Range': `${range}/${count ?? '*'}` }
  if (wantsObject(req)) return { status: 200, body: single(rows), headers }
  return { status: count !== null && rows.length < count ? 206 : 200, body: rows, headers }
}

async function restPost(req, tbl, params, claims, body) {
  const rows = Array.isArray(body) ? body : [body]
  const T = `public.${ident(tbl)}`
  const upsert = prefers(req, 'resolution=merge-duplicates')
  const missingDefault = prefers(req, 'missing=default')
  // Ohne „missing=default“ bekommen fehlende Felder NULL: Dann gelten für jede Zeile dieselben Spalten
  const union = params.get('columns')
    ? splitList(params.get('columns'))
    : [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const statements = rows.map((row) => {
    const keys = missingDefault || rows.length === 1 ? Object.keys(row) : union
    if (!keys.length) return `insert into ${T} default values returning to_jsonb(${ident(tbl)}.*)::text;`
    const cols = keys.map((k) => column(tbl, k)).join(', ')
    let sql = `insert into ${T} (${cols}) select ${cols} from jsonb_populate_record(null::${T}, ${lit(JSON.stringify(row))}::jsonb)`
    if (upsert) {
      const target = (params.get('on_conflict') ? splitList(params.get('on_conflict')) : schema.pks[tbl]).map((k) => column(tbl, k))
      const sets = keys.map((k) => column(tbl, k)).filter((c) => !target.includes(c))
      sql += ` on conflict (${target.join(', ')}) do ${sets.length ? `update set ${sets.map((c) => `${c} = excluded.${c}`).join(', ')}` : 'nothing'}`
    }
    return `${sql} returning to_jsonb(${ident(tbl)}.*)::text;`
  })
  const res = await asUser(claims, statements)
  if (res.error) throw dbError(res.error)
  const created = res.lines.map((l) => JSON.parse(l))
  if (!prefers(req, 'return=representation')) return { status: 201, body: null }
  return { status: 201, body: wantsObject(req) ? single(created) : created }
}

async function restPatch(req, tbl, params, claims, body) {
  const T = `public.${ident(tbl)}`
  const keys = Object.keys(body)
  if (!keys.length) return { status: 204, body: null }
  const sets = keys.map((k) => `${column(tbl, k)} = r.${column(tbl, k)}`).join(', ')
  const res = await asUser(claims, [
    `update ${T} set ${sets} from jsonb_populate_record(null::${T}, ${lit(JSON.stringify(body))}::jsonb) r ${conditions(tbl, params)} returning to_jsonb(${ident(tbl)}.*)::text;`,
  ])
  if (res.error) throw dbError(res.error)
  const rows = res.lines.map((l) => JSON.parse(l))
  if (!prefers(req, 'return=representation')) return { status: 204, body: null }
  return { status: 200, body: wantsObject(req) ? single(rows) : rows }
}

async function restDelete(req, tbl, params, claims) {
  const res = await asUser(claims, [`delete from public.${ident(tbl)} ${conditions(tbl, params)} returning to_jsonb(${ident(tbl)}.*)::text;`])
  if (res.error) throw dbError(res.error)
  if (!prefers(req, 'return=representation')) return { status: 204, body: null }
  return { status: 200, body: res.lines.map((l) => JSON.parse(l)) }
}

async function rpc(name, claims, args) {
  const returns = schema.functions[name]
  if (!returns) {
    throw new ApiError(404, { code: 'PGRST202', message: `Could not find the function public.${name} in the schema cache`, details: null, hint: null })
  }
  const list = Object.entries(args ?? {})
    .map(([k, v]) => `${ident(k)} => ${typeof v === 'number' || typeof v === 'boolean' ? String(v) : lit(v)}`)
    .join(', ')
  const call = `public.${ident(name)}(${list})`
  const res = await asUser(claims, [returns === 'void' ? `select ${call};` : `select coalesce(to_jsonb(${call})::text, 'null');`])
  if (res.error) throw dbError(res.error)
  if (returns === 'void') return { status: 204, body: null }
  // Auch „nichts“ kommt wie bei PostgREST als JSON zurück (null)
  return { status: 200, json: res.lines[0] }
}

// --- Anmeldung (GoTrue) --------------------------------------------------------------------------------------

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')

function decodeToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return payload?.sub ? payload : null
  } catch {
    return null
  }
}

function userObject(id, email) {
  const now = new Date().toISOString()
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: now,
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: now,
    updated_at: now,
  }
}

function session(id, email) {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600
  const payload = { sub: id, email, role: 'authenticated', aud: 'authenticated', iat, exp, session_id: randomUUID() }
  return {
    access_token: `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.${Buffer.from('test').toString('base64url')}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    refresh_token: `${b64({ sub: id, email })}.${randomUUID()}`,
    user: userObject(id, email),
  }
}

async function ensureUser(email) {
  const res = await psql(
    `insert into auth.users (email) values (${lit(email)}) on conflict (email) do update set email = excluded.email returning id;`,
  )
  if (res.error) throw dbError(res.error)
  return res.lines[0]
}

/** Anmeldelinks „aus der Mail“: Token → Konto. Jeder Link gilt einmal; Tests holen ihn über /__link ab. */
const links = new Map()
const lastLink = new Map()

function linkUrl(token) {
  const { redirect } = links.get(token)
  return `http://127.0.0.1:${PORT}/auth/v1/verify?token=${token}&type=magiclink&redirect_to=${encodeURIComponent(redirect)}`
}

async function auth(req, path, url, body) {
  const bearer = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (req.method === 'POST' && path === '/otp') {
    if (!/^\S+@\S+$/.test(body.email ?? '')) throw new ApiError(400, { code: 400, error_code: 'validation_failed', msg: 'Unable to validate email address: invalid format' })
    const email = body.email.toLowerCase()
    const id = await ensureUser(email)
    const token = randomUUID()
    links.set(token, { id, email, redirect: url.searchParams.get('redirect_to') ?? 'http://localhost:4174' })
    lastLink.set(email, token)
    return { status: 200, body: {} }
  }
  // Klick auf den Link in der Mail: zurück zur App, die Sitzung hängt an der Adresse (wie bei Supabase ohne PKCE)
  if (req.method === 'GET' && path === '/verify') {
    const link = links.get(url.searchParams.get('token'))
    const target = link?.redirect ?? url.searchParams.get('redirect_to') ?? 'http://localhost:4174'
    if (!link) {
      return { status: 303, body: null, headers: { Location: `${target}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired` } }
    }
    links.delete(url.searchParams.get('token'))
    const s = session(link.id, link.email)
    const fragment = new URLSearchParams({
      access_token: s.access_token,
      expires_in: String(s.expires_in),
      expires_at: String(s.expires_at),
      refresh_token: s.refresh_token,
      token_type: 'bearer',
      type: 'magiclink',
    })
    return { status: 303, body: null, headers: { Location: `${target}#${fragment}` } }
  }
  if (req.method === 'POST' && path === '/verify') {
    if (body.token !== OTP) throw new ApiError(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' })
    const email = String(body.email ?? '').toLowerCase()
    return { status: 200, body: session(await ensureUser(email), email) }
  }
  if (req.method === 'POST' && path === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    try {
      const { sub, email } = JSON.parse(Buffer.from(String(body.refresh_token).split('.')[0], 'base64url').toString('utf8'))
      return { status: 200, body: session(sub, email) }
    } catch {
      throw new ApiError(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' })
    }
  }
  if (req.method === 'GET' && path === '/user') {
    const claims = decodeToken(bearer)
    if (!claims) throw new ApiError(401, { code: 401, error_code: 'no_authorization', msg: 'Invalid JWT' })
    return { status: 200, body: userObject(claims.sub, claims.email) }
  }
  if (req.method === 'POST' && path === '/logout') return { status: 204, body: null }
  throw new ApiError(404, { code: 404, error_code: 'not_found', msg: `Vom Test-Backend nicht unterstützt: ${req.method} /auth/v1${path}` })
}

// --- HTTP ----------------------------------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (!text) return resolve(null)
      try {
        resolve(JSON.parse(text))
      } catch {
        reject(new ApiError(400, { code: 'PGRST102', message: 'Ungültiges JSON' }))
      }
    })
    req.on('error', reject)
  })
}

async function handle(req) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname
  if (path === '/__health') return { status: 200, body: { ok: true, tables: Object.keys(schema.columns).length } }
  // Nur für Tests: der Link, der in der letzten Anmelde-Mail an diese Adresse stünde
  if (path === '/__link') {
    const token = lastLink.get(String(url.searchParams.get('email') ?? '').toLowerCase())
    if (!token || !links.has(token)) throw new ApiError(404, { message: 'Für diese Adresse wurde kein Link angefordert.' })
    return { status: 200, body: { url: linkUrl(token) } }
  }
  const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : null

  if (path.startsWith('/auth/v1/')) return auth(req, path.slice('/auth/v1'.length), url, body ?? {})

  if (path.startsWith('/rest/v1/')) {
    const bearer = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
    const claims = bearer && bearer !== ANON_KEY ? decodeToken(bearer) : null
    const rest = path.slice('/rest/v1/'.length)
    if (rest.startsWith('rpc/')) return rpc(rest.slice(4), claims, body)
    const tbl = table(rest)
    if (req.method === 'GET') return restGet(req, tbl, url.searchParams, claims)
    if (req.method === 'POST') return restPost(req, tbl, url.searchParams, claims, body ?? {})
    if (req.method === 'PATCH') return restPatch(req, tbl, url.searchParams, claims, body ?? {})
    if (req.method === 'DELETE') return restDelete(req, tbl, url.searchParams, claims)
  }
  throw new ApiError(404, { code: 'PGRST125', message: `Vom Test-Backend nicht unterstützt: ${req.method} ${path}` })
}

const server = http.createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] ?? '*',
    'Access-Control-Expose-Headers': 'Content-Range',
    'Access-Control-Max-Age': '600',
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return
  }
  let out
  try {
    out = await handle(req)
  } catch (e) {
    if (e instanceof ApiError) out = { status: e.status, body: e.body }
    else {
      console.error(e)
      out = { status: 500, body: { code: 'XX000', message: String(e?.message ?? e) } }
    }
  }
  if (process.env.E2E_BACKEND_LOG) console.log(req.method, req.url, '→', out.status)
  const payload = out.json ?? (out.body === null || out.body === undefined ? '' : JSON.stringify(out.body))
  res.writeHead(out.status, { ...cors, ...(out.headers ?? {}), ...(payload ? { 'Content-Type': 'application/json; charset=utf-8' } : {}) })
  res.end(payload)
})

// Live-Verbindungen (Realtime) bietet das Test-Backend nicht an – die App fällt dann auf regelmäßiges Nachladen zurück
server.on('upgrade', (_req, socket) => socket.destroy())

try {
  const files = prepareDatabase(DB)
  await loadSchema()
  server.listen(PORT, '127.0.0.1', () => console.log(`Test-Backend bereit: http://127.0.0.1:${PORT} (${files.length} Migrationen, Datenbank ${DB})`))
} catch (e) {
  console.error('Test-Backend konnte nicht starten – ist PostgreSQL erreichbar (psql, PGHOST/PGUSER/PGPASSWORD)?\n' + (e?.message ?? e))
  process.exit(1)
}
