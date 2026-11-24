#!/usr/bin/env node
/* KA-CMS — Kerem Aydın içerik yönetim sistemi (yerel sunucu, bağımlılık yok)
   Çalıştır:  node server.js   →  http://localhost:3000/cms/
   İçeriği data/content.json'da tutar, her kayıtta ../site/assets/js/seed.js dosyasını günceller. */
'use strict'
const http = require('http'), fs = require('fs'), fsp = fs.promises, path = require('path'), crypto = require('crypto'), cp = require('child_process')

const ROOT = __dirname
const SITE = path.resolve(process.env.SITE_DIR || path.join(ROOT, '..'))   // cms klasörü sitenin kök klasörünün içindedir
// Şifre, gizli anahtar ve mesajlar PROJE KLASÖRÜNÜN DIŞINDA tutulur (GitHub'a yanlışlıkla gitmesin): C:\Users\<sen>\.ka-cms
const DATA = path.resolve(process.env.KA_CMS_DATA || path.join(require('os').homedir(), '.ka-cms'))
const ADMIN_DIR = path.join(ROOT, 'admin')
const MEDIA_DIR = path.join(SITE, 'assets', 'images', 'uploads')
const SEED_FILE = path.join(SITE, 'assets', 'js', 'seed.js')
const FILES = { content: path.join(DATA, 'content.json'), admin: path.join(DATA, 'admin.json'), secret: path.join(DATA, 'secret.txt'), messages: path.join(DATA, 'messages.json'), schema: path.join(ROOT, 'pages-schema.json') }
const START_PORT = Number(process.env.PORT) || 3000

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8', '.sql': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' }
const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])

/* ---------- yardımcılar ---------- */
const readJSON = async (f, fallback) => { try { return JSON.parse(await fsp.readFile(f, 'utf-8')) } catch { return fallback } }
async function writeJSON(f, data) { await fsp.mkdir(path.dirname(f), { recursive: true }); const tmp = f + '.tmp'; await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8'); await fsp.rename(tmp, f) }
const str = (v, max = 20000) => (typeof v === 'string' ? v.slice(0, max) : '')
const bi = (v, max) => { const o = v && typeof v === 'object' ? v : {}; return { tr: str(o.tr, max), en: str(o.en, max) } }
const tagsOf = (v) => (Array.isArray(v) ? v.map((t) => str(t, 60).trim()).filter(Boolean).slice(0, 12) : [])
function slugify(input) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }
  return String(input || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (c) => map[c] || c).normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90)
}
const imageUrl = (v) => { const s = str(v, 600).trim(); return s === '' || /^assets\/images\/[\w./-]+$/.test(s) || /^https:\/\//.test(s) ? s : '' }
const sectionsOf = (v) => (Array.isArray(v) ? v.slice(0, 40).map((s) => ({ heading: str(s && s.heading, 200), paragraphs: Array.isArray(s && s.paragraphs) ? s.paragraphs.map((p) => str(p, 8000)).filter(Boolean).slice(0, 60) : [] })) : [])

/* ---------- içerik ---------- */
const PLUGIN_IDS = ['home_gallery', 'contact_form', 'contact_map', 'social_links']
async function loadSchema() { return readJSON(FILES.schema, { pages: [] }) }
function sanitize(input, schema) {
  const o = input && typeof input === 'object' ? input : {}
  const seen = new Set()
  const posts = (Array.isArray(o.posts) ? o.posts : []).slice(0, 300).map((p, i) => {
    p = p || {}
    let slug = slugify(p.slug) || slugify(p.title && p.title.tr) || `yazi-${i + 1}`
    while (seen.has(slug)) slug = `${slug}-${i + 1}`
    seen.add(slug)
    return { slug, category: ['web', 'design', 'video'].includes(p.category) ? p.category : 'web', tags: tagsOf(p.tags), date: /^\d{4}-\d{2}-\d{2}$/.test(str(p.date, 10)) ? p.date : new Date().toISOString().slice(0, 10), minutes: Math.min(60, Math.max(1, Math.round(Number(p.minutes)) || 3)), title: bi(p.title, 200), excerpt: bi(p.excerpt, 500), sections: { tr: sectionsOf(p.sections && p.sections.tr), en: sectionsOf(p.sections && p.sections.en) }, image: imageUrl(p.image) }
  })
  const pids = new Set()
  const projects = (Array.isArray(o.projects) ? o.projects : []).slice(0, 100).map((p, i) => {
    p = p || {}
    let id = slugify(p.id) || slugify(p.title && p.title.tr) || `proje-${i + 1}`
    while (pids.has(id)) id = `${id}-${i + 1}`
    pids.add(id)
    return { id, title: bi(p.title, 200), description: bi(p.description, 1200), category: p.category === 'web' ? 'web' : 'design', tags: tagsOf(p.tags), visual: str(p.visual, 30) || 'sketch', image: imageUrl(p.image), logo: imageUrl(p.logo) }
  })
  const gallery = (Array.isArray(o.gallery) ? o.gallery : []).slice(0, 300).map((g, i) => {
    g = g || {}
    return { id: i + 1, title: bi(g.title, 200), description: bi(g.description, 600), style: ['gallery-moon', 'gallery-villa', 'gallery-desk'].includes(g.style) ? g.style : 'gallery-moon', src: imageUrl(g.src), position: /^\d{1,3}% \d{1,3}%$/.test(str(g.position, 12)) ? g.position : '50% 50%' }
  })
  const s = o.settings && typeof o.settings === 'object' ? o.settings : {}
  const settings = {}
  for (const k of ['phone', 'email', 'address', 'instagram', 'linkedin', 'github', 'band_tr', 'band_en']) settings[k] = str(s[k], 400).trim()
  for (const k of ['instagram', 'linkedin', 'github']) if (settings[k] && !/^https?:\/\//.test(settings[k])) settings[k] = ''
  if (settings.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(settings.email)) settings.email = ''
  const pageTexts = {}
  const valid = new Set(); (schema.pages || []).forEach((pg) => pg.fields.forEach((f) => valid.add(`${pg.id}.${f.key}`)))
  const pt = o.pageTexts && typeof o.pageTexts === 'object' ? o.pageTexts : {}
  for (const k of Object.keys(pt)) if (valid.has(k)) { const v = bi(pt[k], 2000); if (v.tr || v.en) pageTexts[k] = v }
  const plugins = {}
  for (const id of PLUGIN_IDS) plugins[id] = !(o.plugins && o.plugins[id] === false)
  return { projects, gallery, posts, settings, pageTexts, plugins }
}
async function initialContent() {
  let seed = {}
  try { const txt = await fsp.readFile(SEED_FILE, 'utf-8'); seed = JSON.parse(txt.slice(txt.indexOf('=') + 1).trim().replace(/;$/, '')) } catch {}
  return sanitize({ projects: seed.projects, gallery: seed.gallery, posts: seed.posts, settings: seed.settings, pageTexts: seed.pageTextsRaw || {}, plugins: seed.plugins }, await loadSchema())
}
async function loadContent() { return (await readJSON(FILES.content, null)) || (await (async () => { const c = await initialContent(); await writeJSON(FILES.content, c); return c })()) }
async function saveContent(raw) {
  const schema = await loadSchema(), c = sanitize(raw, schema)
  await writeJSON(FILES.content, c)
  const pageTexts = []
  for (const pg of schema.pages || []) for (const f of pg.fields) {
    const v = c.pageTexts[`${pg.id}.${f.key}`]
    if (!v) continue
    for (const lang of ['tr', 'en']) if (v[lang] && v[lang] !== f[lang]) pageTexts.push({ page: pg.id, lang, selector: f.selector, text: v[lang] })
  }
  const seed = { projects: c.projects, gallery: c.gallery, posts: c.posts, settings: c.settings, plugins: c.plugins, pageTexts, pageTextsRaw: c.pageTexts }
  await fsp.mkdir(path.dirname(SEED_FILE), { recursive: true })
  await fsp.writeFile(SEED_FILE, `/* KA-CMS tarafından otomatik üretilir. Elle düzenleme; içeriği CMS panelinden değiştir. */\nwindow.SEED_DATA = ${JSON.stringify(seed, null, 1)};\n`, 'utf-8')
  return c
}

/* ---------- kimlik doğrulama ---------- */
let SECRET = null
async function secret() { if (SECRET) return SECRET; try { SECRET = (await fsp.readFile(FILES.secret, 'utf-8')).trim() } catch { SECRET = crypto.randomBytes(32).toString('hex'); await fsp.mkdir(DATA, { recursive: true }); await fsp.writeFile(FILES.secret, SECRET) } return SECRET }
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex')
const hmac = (v) => secret().then((s) => crypto.createHmac('sha256', s).update(v).digest('hex'))
async function makeToken() { const exp = String(Date.now() + 12 * 3600 * 1000); return `${exp}.${await hmac(exp)}` }
async function isAuthed(req) {
  const m = /(?:^|;\s*)ka_cms=([^;]+)/.exec(req.headers.cookie || '')
  if (!m) return false
  const [exp, sig] = m[1].split('.')
  if (!exp || !sig || Number(exp) < Date.now()) return false
  const good = await hmac(exp)
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))
}
const attempts = new Map()
const tooMany = (ip) => { const a = attempts.get(ip); return a && Date.now() - a.t < 10 * 60e3 && a.n >= 8 }
const noteAttempt = (ip, ok) => { if (ok) return void attempts.delete(ip); const a = attempts.get(ip); attempts.set(ip, !a || Date.now() - a.t > 10 * 60e3 ? { n: 1, t: Date.now() } : { n: a.n + 1, t: a.t }) }
const msgRate = new Map()

/* ---------- http ---------- */
function send(res, code, body, headers = {}) { res.writeHead(code, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(body) }
const json = (res, code, obj, headers) => send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', ...headers })
function readBody(req, limit = 1.5e6) { return new Promise((resolve, reject) => { const chunks = []; let n = 0; req.on('data', (c) => { n += c.length; if (n > limit) { reject(Object.assign(new Error('Dosya çok büyük'), { status: 413 })); req.destroy() } else chunks.push(c) }); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject) }) }
const readJSONBody = async (req, limit) => { try { return JSON.parse((await readBody(req, limit)).toString('utf-8') || '{}') } catch (e) { if (e.status) throw e; return {} } }

async function listImages() {
  const out = []
  const walk = async (dir, rel) => { let ents = []; try { ents = await fsp.readdir(dir, { withFileTypes: true }) } catch { return } for (const e of ents) { const r = rel + '/' + e.name; if (e.isDirectory()) await walk(path.join(dir, e.name), r); else if (IMG_EXT.has(path.extname(e.name).toLowerCase()) && !/^(wolf-|apple-icon)/.test(e.name) && !/^assets\/images\/blog-/.test(r)) { const st = await fsp.stat(path.join(dir, e.name)); out.push({ name: e.name, url: r, upload: r.startsWith('assets/images/uploads/'), time: st.mtimeMs, size: st.size }) } } }
  await walk(path.join(SITE, 'assets', 'images'), 'assets/images')
  return out.sort((a, b) => (b.upload - a.upload) || b.time - a.time)
}

async function api(req, res, pathname, query) {
  const ip = req.socket.remoteAddress || 'local'
  const method = req.method
  if (method !== 'GET' && req.headers.origin) { try { if (new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: 'Geçersiz kaynak' }) } catch { return json(res, 403, { error: 'Geçersiz kaynak' }) } }
  const admin = await readJSON(FILES.admin, null)

  if (pathname === '/cms/api/status' && method === 'GET') return json(res, 200, { setup: !admin, auth: await isAuthed(req) })
  if (pathname === '/cms/api/setup' && method === 'POST') {
    if (admin) return json(res, 409, { error: 'Hesap zaten oluşturulmuş.' })
    const { email, password } = await readJSONBody(req)
    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return json(res, 400, { error: 'Geçerli bir e-posta adresi yaz.' })
    if (typeof password !== 'string' || password.length < 8) return json(res, 400, { error: 'Şifre en az 8 karakter olmalı.' })
    const salt = crypto.randomBytes(16).toString('hex')
    await writeJSON(FILES.admin, { email: email.trim().toLowerCase(), salt, hash: hashPw(password, salt) })
    return json(res, 200, { ok: true }, { 'Set-Cookie': `ka_cms=${await makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200` })
  }
  if (pathname === '/cms/api/login' && method === 'POST') {
    if (!admin) return json(res, 409, { error: 'Önce hesabı oluştur.' })
    if (tooMany(ip)) return json(res, 429, { error: 'Çok fazla deneme. 10 dakika sonra tekrar dene.' })
    const { email, password } = await readJSONBody(req)
    const emailOk = !admin.email || (typeof email === 'string' && email.trim().toLowerCase() === admin.email)
    const pwOk = typeof password === 'string' && crypto.timingSafeEqual(Buffer.from(hashPw(password, admin.salt), 'hex'), Buffer.from(admin.hash, 'hex'))
    const ok = emailOk && pwOk
    noteAttempt(ip, ok)
    if (!ok) return json(res, 401, { error: 'E-posta veya şifre yanlış.' })
    return json(res, 200, { ok: true }, { 'Set-Cookie': `ka_cms=${await makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200` })
  }
  if (pathname === '/cms/api/logout' && method === 'POST') return json(res, 200, { ok: true }, { 'Set-Cookie': 'ka_cms=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' })

  // Herkese açık: iletişim formundan gelen mesaj
  if (pathname === '/cms/api/message' && method === 'POST') {
    const now = Date.now(), r = (msgRate.get(ip) || []).filter((t) => now - t < 3600e3)
    if (r.length >= 15) return json(res, 429, { error: 'Çok fazla mesaj' })
    msgRate.set(ip, [...r, now])
    const b = await readJSONBody(req, 20000)
    const m = { id: crypto.randomBytes(6).toString('hex'), created: new Date().toISOString(), name: str(b.name, 120).trim(), email: str(b.email, 160).trim(), subject: str(b.subject, 160).trim(), message: str(b.message, 4000).trim(), read: false }
    if (!m.name || !m.email || !m.subject || !m.message) return json(res, 400, { error: 'Eksik alan' })
    const list = await readJSON(FILES.messages, []); list.unshift(m); await writeJSON(FILES.messages, list.slice(0, 500))
    return json(res, 200, { ok: true })
  }

  if (!(await isAuthed(req))) return json(res, 401, { error: 'Giriş gerekli' })

  if (pathname === '/cms/api/content' && method === 'GET') { const c = await loadContent(); return json(res, 200, { content: c, schema: await loadSchema() }) }
  if (pathname === '/cms/api/content' && method === 'PUT') { const c = await saveContent(await readJSONBody(req, 5e6)); return json(res, 200, { content: c }) }
  if (pathname === '/cms/api/media' && method === 'GET') return json(res, 200, await listImages())
  if (pathname === '/cms/api/upload' && method === 'POST') {
    const orig = str(query.get('name'), 150), ext = path.extname(orig).toLowerCase()
    if (!IMG_EXT.has(ext)) return json(res, 400, { error: 'Sadece jpg, png, webp, gif, avif yüklenebilir.' })
    const buf = await readBody(req, 15e6)
    if (!buf.length) return json(res, 400, { error: 'Boş dosya' })
    const name = `${Date.now().toString(36)}-${slugify(path.basename(orig, ext)) || 'gorsel'}${ext}`
    await fsp.mkdir(MEDIA_DIR, { recursive: true }); await fsp.writeFile(path.join(MEDIA_DIR, name), buf)
    return json(res, 200, { name, url: 'assets/images/uploads/' + name })
  }
  if (pathname === '/cms/api/media' && method === 'DELETE') {
    const name = str(query.get('name'), 200)
    if (!name || name !== path.basename(name)) return json(res, 400, { error: 'Geçersiz ad' })
    await fsp.unlink(path.join(MEDIA_DIR, name)).catch(() => {}); return json(res, 200, { ok: true })
  }
  if (pathname === '/cms/api/messages' && method === 'GET') return json(res, 200, await readJSON(FILES.messages, []))
  const mm = /^\/cms\/api\/messages\/([a-f0-9]+)$/.exec(pathname)
  if (mm && (method === 'PATCH' || method === 'DELETE')) {
    let list = await readJSON(FILES.messages, [])
    if (method === 'DELETE') list = list.filter((m) => m.id !== mm[1])
    else { const b = await readJSONBody(req); list = list.map((m) => (m.id === mm[1] ? { ...m, read: !!b.read } : m)) }
    await writeJSON(FILES.messages, list); return json(res, 200, { ok: true })
  }
  return json(res, 404, { error: 'Bulunamadı' })
}

async function serveFile(res, base, rel, headOnly) {
  let p = path.normalize(path.join(base, decodeURIComponent(rel)))
  if (!p.startsWith(base)) return send(res, 403, 'Forbidden')
  try { const st = await fsp.stat(p); if (st.isDirectory()) p = path.join(p, 'index.html') } catch { return send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' }) }
  try { const data = await fsp.readFile(p); return send(res, 200, headOnly ? '' : data, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' }) } catch { return send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' }) }
}

const server = http.createServer(async (req, res) => {
  try {
    const host = (req.headers.host || '').split(':')[0]
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return send(res, 403, 'Forbidden')
    const u = new URL(req.url, 'http://localhost')
    const pathname = u.pathname
    if (pathname.startsWith('/cms/api/')) return await api(req, res, pathname, u.searchParams)
    if (pathname === '/cms' ) { res.writeHead(302, { Location: '/cms/' }); return res.end() }
    if (pathname.startsWith('/cms/')) return serveFile(res, ADMIN_DIR, pathname.slice(5) || 'index.html', req.method === 'HEAD')
    if (pathname === '/assets/js/config.js') {
      const c = await readJSON(FILES.content, null)
      const email = (c && c.settings && c.settings.email) || ''
      return send(res, 200, `/* KA-CMS yerel önizleme: içerik seed.js'ten gelir */\nwindow.SITE_CONFIG = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '', CONTACT_EMAIL: ${JSON.stringify(email || 'kerem.aydn555@gmail.com')}, LOCAL_CMS: true };\n`, { 'Content-Type': MIME['.js'] })
    }
    return serveFile(res, SITE, pathname === '/' ? 'index.html' : pathname.slice(1), req.method === 'HEAD')
  } catch (e) {
    console.error(e)
    return json(res, e.status || 500, { error: e.message || 'Sunucu hatası' })
  }
})

function listen(port, tries = 0) {
  server.once('error', (e) => { if (e.code === 'EADDRINUSE' && tries < 10) listen(port + 1, tries + 1); else { console.error('Sunucu başlatılamadı:', e.message); process.exit(1) } })
  server.listen(port, '127.0.0.1', async () => {
    await fsp.mkdir(DATA, { recursive: true }); await loadContent()
    const base = `http://localhost:${port}`
    console.log(`\n  KA-CMS çalışıyor\n  Site : ${base}/\n  Panel: ${base}/cms/\n  Hesap/mesaj verisi: ${DATA}\n\n  Kapatmak için Ctrl+C\n`)
    if (!process.env.NO_OPEN) { const cmd = process.platform === 'win32' ? `start "" "${base}/cms/"` : process.platform === 'darwin' ? `open "${base}/cms/"` : `xdg-open "${base}/cms/"`; cp.exec(cmd, () => {}) }
  })
}
listen(START_PORT)
