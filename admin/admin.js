/* Yönetim paneli (CMS) — Supabase Auth + Postgres + Storage. Framework yok. */
(function () {
  'use strict'
  var CFG = window.SITE_CONFIG || {}
  var app = document.getElementById('app')
  var CATS = { web: 'Web Tasarım', design: 'Grafik Tasarım', video: 'Videografi' }
  var TABS = [['posts', 'Blog yazıları'], ['projects', 'Projeler'], ['gallery', 'Galeri'], ['media', 'Görseller'], ['messages', 'Mesajlar'], ['settings', 'Ayarlar']]

  /* ---------- küçük DOM yardımcıları ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag)
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]
      if (v === false || v == null) return
      if (k === 'class') el.className = v
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v)
      else if (k === 'value') el.value = v
      else el.setAttribute(k, v === true ? '' : v)
    })
    function add(c) {
      if (c == null || c === false) return
      if (Array.isArray(c)) return c.forEach(add)
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c)
    }
    for (var i = 2; i < arguments.length; i++) add(arguments[i])
    return el
  }
  function toast(msg, isErr) {
    var t = h('div', { class: 'adm-toast' + (isErr ? ' err' : ''), role: 'status' }, msg)
    document.body.appendChild(t); setTimeout(function () { t.remove() }, isErr ? 6000 : 2200)
  }
  function slugify(s) {
    var m = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' }
    return String(s || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, function (c) { return m[c] }).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90)
  }
  var today = function () { return new Date().toISOString().slice(0, 10) }

  /* ---------- ayar yoksa ---------- */
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY || !window.supabase) {
    app.innerHTML = ''
    app.appendChild(h('main', { class: 'adm-setup' }, h('div', { class: 'adm-card' },
      h('p', { class: 'adm-eyebrow' }, 'KEREM AYDIN · YÖNETİM'), h('h1', {}, 'Yönetim paneli'),
      h('p', {}, 'Bu sitenin içeriği iki yoldan yönetilebilir:'),
      h('h3', { style: 'margin:16px 0 4px' }, '1) KA-CMS (bilgisayarında çalışır)'),
      h('ol', {}, h('li', {}, 'Proje klasöründeki ', h('code', {}, 'BASLAT.bat'), ' dosyasına çift tıkla.'), h('li', {}, 'Açılan sayfada e-posta ve şifrenle giriş yap.'), h('li', {}, 'Değişiklikleri kaydedip proje klasörünün içindekileri GitHub’a yükle.')),
      h('p', {}, h('a', { class: 'adm-btn primary', href: 'http://localhost:3000/cms/' }, 'Yerel KA-CMS’i aç')),
      h('p', { class: 'adm-hint' }, 'Bu düğme sadece KA-CMS senin bilgisayarında çalışırken açılır.'),
      h('h3', { style: 'margin:20px 0 4px' }, '2) Supabase (internet üzerinden giriş)'),
      h('p', { class: 'adm-hint' }, 'config.js içine Supabase adresi ve anahtarı yazılırsa bu sayfada e-posta ve şifreyle giriş ekranı açılır. Rehber: VERITABANI-KURULUM.md'))))
    return
  }

  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY)
  var S = { tab: 'posts', sel: { posts: 0, projects: 0, gallery: 0 }, data: { posts: [], projects: [], gallery: [], messages: [], settings: {} }, media: [], dirty: false }

  /* ---------- giriş ---------- */
  function friendlyAuthError(e) {
    var m = String((e && e.message) || e || ''), c = (e && (e.code || e.error_code)) || ''
    if (c === 'invalid_credentials' || /invalid login credentials/i.test(m)) return 'E-posta veya şifre yanlış. (Supabase bu kullanıcıyı ya da şifreyi tanımıyor.)'
    if (/not confirmed/i.test(m) || c === 'email_not_confirmed') return 'E-posta onaylanmamış. Supabase > Authentication > Users’ta kullanıcıyı oluştururken “Auto Confirm User” işaretli olmalı.'
    if (/disabled/i.test(m) || c === 'email_provider_disabled') return 'Supabase’te e-posta girişi kapalı. Authentication > Sign In / Providers > Email açık (Enabled) olmalı. Sadece “Allow new users to sign up” kapatılır. [' + m + ']'
    if (/api key|apikey|jwt/i.test(m)) return 'API anahtarı reddedildi. config.js içindeki SUPABASE_ANON_KEY yanlış olabilir. [' + m + ']'
    if (/fetch|network|failed/i.test(m)) return 'Supabase’e ulaşılamadı. İnternet bağlantını ve config.js içindeki SUPABASE_URL’yi kontrol et. [' + m + ']'
    return 'Giriş hatası: ' + m + (c ? ' [' + c + ']' : '') + (e && e.status ? ' (HTTP ' + e.status + ')' : '')
  }
  function loginView(msg) {
    app.innerHTML = ''
    var err = h('p', { class: 'adm-error', role: 'alert' }, msg || '')
    var pw = h('input', { name: 'password', type: 'password', required: true, autocomplete: 'current-password' })
    var show = h('button', { type: 'button', class: 'adm-link', style: 'background:none;border:0;cursor:pointer;text-align:left;padding:0', onclick: function () { pw.type = pw.type === 'password' ? 'text' : 'password'; show.textContent = pw.type === 'password' ? 'Şifreyi göster' : 'Şifreyi gizle' } }, 'Şifreyi göster')
    var form = h('form', { class: 'adm-card', onsubmit: function (e) {
      e.preventDefault()
      var fd = new FormData(form)
      btn.disabled = true; err.textContent = ''
      sb.auth.signInWithPassword({ email: String(fd.get('email')).trim().toLowerCase(), password: String(fd.get('password')) }).then(function (r) {
        if (r.error) { err.textContent = friendlyAuthError(r.error); btn.disabled = false } else start()
      }).catch(function (ex) { err.textContent = friendlyAuthError(ex); btn.disabled = false })
    } }, h('p', { class: 'adm-eyebrow' }, 'KEREM AYDIN · CMS'), h('h1', {}, 'Yönetim paneli'),
      h('label', {}, 'E-posta', h('input', { name: 'email', type: 'email', required: true, autocomplete: 'username' })),
      h('label', {}, 'Şifre', pw), show, err)
    var btn = h('button', { class: 'adm-btn primary' }, 'Giriş yap')
    form.appendChild(btn); form.appendChild(h('a', { class: 'adm-link', href: '../tr/index.html' }, '← Siteye dön'))
    app.appendChild(h('main', { class: 'adm-login' }, form))
  }

  /* ---------- veri ---------- */
  var TABLES = { posts: 'date', projects: 'sort', gallery: 'sort', messages: 'created_at', settings: 'key' }
  function fetchAll() {
    return Promise.all(Object.keys(TABLES).map(function (t) {
      return sb.from(t).select('*').order(TABLES[t], { ascending: t === 'projects' || t === 'gallery' }).then(function (r) {
        if (r.error) throw new Error(t + ': ' + r.error.message)
        if (t === 'settings') { S.data.settings = {}; (r.data || []).forEach(function (x) { S.data.settings[x.key] = x.value }) } else S.data[t] = r.data || []
      })
    }))
  }
  function fail(e) { console.error(e); toast('Hata: ' + (e && e.message ? e.message : e), true) }

  /* ---------- görseller ---------- */
  function loadMedia() {
    return sb.storage.from('media').list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } }).then(function (r) {
      if (r.error) throw r.error
      S.media = (r.data || []).filter(function (f) { return /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name) }).map(function (f) { return { name: f.name, url: sb.storage.from('media').getPublicUrl(f.name).data.publicUrl } })
    })
  }
  function uploadFiles(files) {
    var list = Array.prototype.slice.call(files || [])
    var last = ''
    return list.reduce(function (p, f) {
      return p.then(function () {
        if (f.size > 12 * 1024 * 1024) { toast(f.name + ' 12 MB’tan büyük.', true); return }
        var ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
        var name = Date.now().toString(36) + '-' + (slugify(f.name.replace(/\.[^.]+$/, '')) || 'gorsel') + '.' + ext
        return sb.storage.from('media').upload(name, f, { cacheControl: '3600', upsert: false, contentType: f.type }).then(function (r) {
          if (r.error) throw r.error
          last = sb.storage.from('media').getPublicUrl(name).data.publicUrl
        })
      })
    }, Promise.resolve()).then(function () { return loadMedia() }).then(function () { return last })
  }
  function pickImage(cb) {
    var overlay = h('div', { class: 'adm-modal', role: 'dialog', 'aria-modal': 'true', onclick: function () { overlay.remove() } })
    var grid = h('div', { class: 'adm-media pick' })
    var file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: function () {
      uploadFiles(file.files).then(function (url) { file.value = ''; if (url) { overlay.remove(); cb(url) } else draw() }).catch(fail)
    } })
    function draw() {
      grid.innerHTML = ''
      S.media.forEach(function (m) { grid.appendChild(h('button', { type: 'button', onclick: function () { overlay.remove(); cb(m.url) } }, h('img', { src: m.url, alt: '', loading: 'lazy' }), h('span', {}, m.name))) })
      if (!S.media.length) grid.appendChild(h('p', { class: 'adm-empty' }, 'Henüz yüklenmiş görsel yok.'))
    }
    overlay.appendChild(h('div', { class: 'adm-card modal', onclick: function (e) { e.stopPropagation() } },
      h('div', { class: 'adm-rowbar' }, h('h2', {}, 'Görsel seç'), h('span', { class: 'grow' }), h('button', { class: 'adm-btn primary', onclick: function () { file.click() } }, '+ Yeni yükle'), h('button', { class: 'adm-btn', onclick: function () { overlay.remove() } }, 'Kapat'), file), grid))
    document.body.appendChild(overlay)
    loadMedia().then(draw).catch(fail)
  }

  /* ---------- ortak form parçaları ---------- */
  function field(label, el, wide) { return h('label', { class: 'adm-field' + (wide ? ' wide' : '') }, h('span', {}, label), el) }
  function bind(rec, key, tag, attrs) {
    var el = h(tag, Object.assign({ value: rec[key] == null ? '' : rec[key] }, attrs || {}))
    if (tag === 'textarea') el.value = rec[key] == null ? '' : rec[key]
    el.addEventListener('input', function () { rec[key] = (attrs && attrs.type === 'number') ? Number(el.value) : el.value; markDirty() })
    return el
  }
  function select(rec, key, options) {
    var el = h('select', {}, Object.keys(options).map(function (k) { return h('option', { value: k, selected: rec[key] === k }, options[k]) }))
    el.addEventListener('change', function () { rec[key] = el.value; markDirty() })
    return el
  }
  function tagsInput(rec) {
    var el = h('input', { value: (rec.tags || []).join(', ') })
    el.addEventListener('input', function () { rec.tags = el.value.split(',').map(function (t) { return t.trim() }).filter(Boolean); markDirty() })
    return el
  }
  function imageField(rec, key, label) {
    var wrap = h('div', { class: 'adm-field wide' })
    function draw() {
      wrap.innerHTML = ''
      wrap.appendChild(h('span', {}, label))
      wrap.appendChild(h('div', { class: 'adm-image' },
        rec[key] ? h('img', { src: previewUrl(rec[key]), alt: '' }) : h('div', { class: 'adm-noimg' }, 'Görsel yok'),
        h('div', { class: 'adm-image-actions' },
          h('button', { type: 'button', class: 'adm-btn', onclick: function () { pickImage(function (url) { rec[key] = url; markDirty(); draw() }) } }, rec[key] ? 'Değiştir' : 'Görsel seç / yükle'),
          rec[key] ? h('button', { type: 'button', class: 'adm-btn danger', onclick: function () { rec[key] = ''; markDirty(); draw() } }, 'Kaldır') : null)))
    }
    draw(); return wrap
  }
  function previewUrl(u) { if (!u) return ''; if (/^(https?:)?\/\//.test(u)) return u; return '../' + u.replace(/^\//, '').replace(/^images\//, 'assets/images/') }
  function markDirty() { S.dirty = true; var s = document.getElementById('adm-status'); if (s) s.textContent = 'Kaydedilmemiş değişiklikler var' }
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = '' } })

  /* ---------- liste + editör (posts / projects / gallery) ---------- */
  var KINDS = {
    posts: { pk: 'slug', add: 'Yeni yazı', what: 'yazı', title: function (r) { return r.title_tr }, sub: function (r) { return (CATS[r.category] || '') + ' · ' + r.date },
      blank: function () { return { slug: 'yeni-yazi-' + Date.now().toString(36), category: 'web', tags: [], date: today(), minutes: 3, title_tr: 'Yeni yazı', title_en: 'New article', excerpt_tr: '', excerpt_en: '', content_tr: '', content_en: '', image: '' } } },
    projects: { pk: 'id', add: 'Yeni proje', what: 'proje', title: function (r) { return r.title_tr }, sub: function (r) { return r.category === 'web' ? 'Web Tasarım' : 'Grafik Tasarım' },
      blank: function () { return { id: 'proje-' + Date.now().toString(36), sort: 999, title_tr: 'Yeni proje', title_en: 'New project', description_tr: '', description_en: '', category: 'design', tags: [], visual: 'sketch', image: '', logo: '' } } },
    gallery: { pk: 'id', add: 'Yeni fotoğraf', what: 'fotoğraf', title: function (r) { return r.title_tr }, sub: function () { return '' },
      blank: function () { return { sort: 999, title_tr: 'Yeni fotoğraf', title_en: 'New photo', description_tr: '', description_en: '', style: 'gallery-moon', src: '', focus: '50% 50%' } } },
  }
  function editorFields(kind, r) {
    var g = h('div', { class: 'adm-grid' })
    var add = function () { for (var i = 0; i < arguments.length; i++) g.appendChild(arguments[i]) }
    if (kind === 'posts') add(
      field('Başlık (Türkçe)', bind(r, 'title_tr', 'input'), true), field('Title (English)', bind(r, 'title_en', 'input'), true),
      field('Kategori', select(r, 'category', CATS)), field('Tarih', bind(r, 'date', 'input', { type: 'date' })),
      field('Okuma süresi (dk)', bind(r, 'minutes', 'input', { type: 'number', min: 1, max: 60 })), field('Adres (slug)', bind(r, 'slug', 'input')),
      field('Etiketler (virgülle ayır)', tagsInput(r), true), imageField(r, 'image', 'Kapak fotoğrafı'),
      field('Kısa özet (Türkçe)', bind(r, 'excerpt_tr', 'textarea', { rows: 2 }), true), field('Short excerpt (English)', bind(r, 'excerpt_en', 'textarea', { rows: 2 }), true),
      field('İçerik (Türkçe) — başlıklar “## Başlık”, paragraflar boş satırla ayrılır', bind(r, 'content_tr', 'textarea', { rows: 16, class: 'mono' }), true),
      field('Content (English) — headings “## Heading”, paragraphs separated by a blank line', bind(r, 'content_en', 'textarea', { rows: 16, class: 'mono' }), true))
    if (kind === 'projects') add(
      field('Başlık (Türkçe)', bind(r, 'title_tr', 'input'), true), field('Title (English)', bind(r, 'title_en', 'input'), true),
      field('Açıklama (Türkçe)', bind(r, 'description_tr', 'textarea', { rows: 4 }), true), field('Description (English)', bind(r, 'description_en', 'textarea', { rows: 4 }), true),
      field('Kategori', select(r, 'category', { design: 'Grafik Tasarım', web: 'Web Tasarım' })), field('Etiketler (virgülle ayır)', tagsInput(r)),
      imageField(r, 'image', 'Proje görseli'), imageField(r, 'logo', 'Logo (kartın ortasında görünür; şeffaf PNG önerilir)'))
    if (kind === 'gallery') add(
      field('Başlık (Türkçe)', bind(r, 'title_tr', 'input'), true), field('Title (English)', bind(r, 'title_en', 'input'), true),
      field('Açıklama (Türkçe)', bind(r, 'description_tr', 'textarea', { rows: 3 }), true), field('Description (English)', bind(r, 'description_en', 'textarea', { rows: 3 }), true),
      imageField(r, 'src', 'Fotoğraf'), field('Odak noktası (ör. 50% 35%)', bind(r, 'focus', 'input')))
    return g
  }
  function payload(kind, r) {
    var o = Object.assign({}, r); delete o._new; delete o._orig
    if (kind === 'posts') { o.slug = slugify(o.slug) || slugify(o.title_tr) || 'yazi-' + Date.now().toString(36); o.minutes = Math.min(60, Math.max(1, Math.round(o.minutes) || 3)); if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) o.date = today() }
    if (kind === 'projects') o.id = slugify(o.id) || slugify(o.title_tr) || 'proje-' + Date.now().toString(36)
    if (kind === 'gallery' && !/^\d{1,3}% \d{1,3}%$/.test(o.focus || '')) o.focus = '50% 50%'
    if (kind === 'gallery' && o.id == null) delete o.id
    return o
  }
  function saveRecord(kind, r) {
    var pk = KINDS[kind].pk, body = payload(kind, r), q
    if (r._new || r[pk] == null) {
      q = sb.from(kind).insert(body).select().single()
    } else if (kind !== 'gallery' && r._orig && r._orig !== body[pk]) {
      // adres (slug/id) değiştiyse eski kaydı sil, yenisini ekle
      q = sb.from(kind).insert(body).select().single().then(function (res) { if (res.error) return res; return sb.from(kind).delete().eq(pk, r._orig).then(function () { return res }) })
    } else {
      q = sb.from(kind).update(body).eq(pk, r[pk]).select().single()
    }
    return q.then(function (res) { if (res.error) throw res.error; return res.data })
  }
  function listAndEditor(kind) {
    var K = KINDS[kind], items = S.data[kind], sel = Math.min(S.sel[kind], Math.max(0, items.length - 1)); S.sel[kind] = sel
    var wrap = h('div', { class: 'adm-split' })
    var list = h('aside', { class: 'adm-list' }, h('button', { class: 'adm-btn primary full', onclick: function () {
      var r = K.blank(); r._new = true; items.unshift(r); S.sel[kind] = 0; render()
    } }, '+ ' + K.add))
    items.forEach(function (r, i) {
      list.appendChild(h('button', { class: 'adm-item' + (i === sel ? ' active' : ''), onclick: function () { S.sel[kind] = i; render() } }, h('b', {}, K.title(r) || '(başlıksız)'), K.sub(r) ? h('small', {}, K.sub(r)) : null))
    })
    wrap.appendChild(list)
    var r = items[sel]
    if (!r) { wrap.appendChild(h('p', { class: 'adm-empty' }, 'Henüz kayıt yok.')); return wrap }
    if (r._orig === undefined) r._orig = r._new ? null : r[K.pk]
    var bar = h('div', { class: 'adm-rowbar' },
      h('button', { class: 'adm-btn primary', onclick: function () {
        var btn = this; btn.disabled = true
        saveRecord(kind, r).then(function (saved) { items[sel] = saved; S.dirty = false; toast('Kaydedildi ✓'); render() }).catch(function (e) { btn.disabled = false; fail(e) })
      } }, 'Kaydet'),
      kind !== 'posts' ? h('button', { class: 'adm-btn', disabled: sel === 0, onclick: function () { reorder(kind, sel, -1) } }, '↑ Yukarı') : null,
      kind !== 'posts' ? h('button', { class: 'adm-btn', disabled: sel === items.length - 1, onclick: function () { reorder(kind, sel, 1) } }, '↓ Aşağı') : null,
      h('button', { class: 'adm-btn danger', onclick: function () {
        if (!confirm('Bu ' + K.what + ' silinsin mi?')) return
        if (r._new) { items.splice(sel, 1); S.dirty = false; return render() }
        sb.from(kind).delete().eq(K.pk, r[K.pk]).then(function (res) { if (res.error) return fail(res.error); items.splice(sel, 1); S.sel[kind] = Math.max(0, sel - 1); toast('Silindi'); render() })
      } }, 'Sil'))
    var card = h('section', { class: 'adm-card wide' }, bar)
    if (kind === 'projects') card.appendChild(h('p', { class: 'adm-hint' }, 'Anasayfada ilk 3 proje görünür; sıralamayı yukarı/aşağı ile değiştirebilirsin.'))
    if (kind === 'posts') card.appendChild(h('p', { class: 'adm-hint' }, 'Yazı adresi: post.html?slug=' + r.slug))
    card.appendChild(editorFields(kind, r))
    wrap.appendChild(card)
    return wrap
  }
  function reorder(kind, i, d) {
    var items = S.data[kind], j = i + d
    if (j < 0 || j >= items.length) return
    if (items[i]._new || items[j]._new) return toast('Önce yeni kaydı kaydet.', true)
    var a = items[i], b = items[j], pk = KINDS[kind].pk
    var order = items.map(function (x) { return x }); order.splice(i, 1); order.splice(j, 0, a)
    Promise.all(order.map(function (x, idx) { x.sort = idx; return sb.from(kind).update({ sort: idx }).eq(pk, x[pk]) })).then(function () { S.data[kind] = order; S.sel[kind] = j; render() }).catch(fail)
  }

  /* ---------- görseller & mesajlar ---------- */
  function mediaView() {
    var file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: function () { uploadFiles(file.files).then(function () { file.value = ''; toast('Yüklendi ✓'); render() }).catch(fail) } })
    var grid = h('div', { class: 'adm-media' })
    S.media.forEach(function (m) {
      grid.appendChild(h('figure', {}, h('img', { src: m.url, alt: '', loading: 'lazy' }), h('figcaption', {}, m.name),
        h('button', { class: 'adm-btn', onclick: function () { navigator.clipboard && navigator.clipboard.writeText(m.url).then(function () { toast('Adres kopyalandı') }) } }, 'Adresi kopyala'),
        h('button', { class: 'adm-btn danger', onclick: function () { if (confirm('Görsel silinsin mi?')) sb.storage.from('media').remove([m.name]).then(function () { return loadMedia() }).then(render).catch(fail) } }, 'Sil')))
    })
    return h('section', { class: 'adm-card wide' }, h('div', { class: 'adm-rowbar' }, h('button', { class: 'adm-btn primary', onclick: function () { file.click() } }, '+ Görsel yükle'), file),
      h('p', { class: 'adm-hint' }, 'Görseller Supabase Storage’daki “media” klasörüne yüklenir. 2 MB’tan büyük fotoğrafları yüklemeden önce küçültmek siteyi hızlandırır.'),
      grid, S.media.length ? null : h('p', { class: 'adm-empty' }, 'Henüz görsel yüklenmedi.'))
  }
  function messagesView() {
    var wrap = h('section', { class: 'adm-card wide' })
    if (!S.data.messages.length) wrap.appendChild(h('p', { class: 'adm-empty' }, 'Henüz mesaj yok. (İletişim formundan gelen mesajlar burada listelenir.)'))
    S.data.messages.forEach(function (m, i) {
      wrap.appendChild(h('div', { class: 'adm-msg' + (m.is_read ? '' : ' unread') }, h('h3', {}, m.subject), h('small', {}, m.name + ' · ' + m.email + ' · ' + new Date(m.created_at).toLocaleString('tr-TR')), h('p', {}, m.message),
        h('div', { class: 'adm-rowbar' },
          h('a', { class: 'adm-btn', href: 'mailto:' + m.email + '?subject=' + encodeURIComponent('Re: ' + m.subject) }, 'Yanıtla'),
          h('button', { class: 'adm-btn', onclick: function () { var next = !m.is_read; sb.from('messages').update({ is_read: next }).eq('id', m.id).then(function (r) { if (r.error) return fail(r.error); m.is_read = next; render() }) } }, m.is_read ? 'Okunmadı yap' : 'Okundu yap'),
          h('button', { class: 'adm-btn danger', onclick: function () { if (confirm('Mesaj silinsin mi?')) sb.from('messages').delete().eq('id', m.id).then(function (r) { if (r.error) return fail(r.error); S.data.messages.splice(i, 1); render() }) } }, 'Sil'))))
    })
    return wrap
  }


  var SETTING_FIELDS = [['band_tr', 'Hakkımda sayfası — “Şu sıralar” cümlesi (Türkçe)', 'text'], ['band_en', 'About page — “Currently” sentence (English)', 'text'], ['phone', 'Telefon', 'text'], ['email', 'E-posta (iletişim formu bu adrese gelir)', 'email'], ['address', 'Adres', 'text'], ['instagram', 'Instagram bağlantısı (https://...)', 'url'], ['linkedin', 'LinkedIn bağlantısı (https://...)', 'url'], ['github', 'GitHub bağlantısı (https://...)', 'url']]
  function settingsView() {
    var vals = Object.assign({}, S.data.settings), grid = h('div', { class: 'adm-grid' })
    SETTING_FIELDS.forEach(function (f) {
      var el = h('input', { type: f[2], value: vals[f[0]] || '' })
      el.addEventListener('input', function () { vals[f[0]] = el.value.trim(); markDirty() })
      grid.appendChild(field(f[1], el, f[0] === 'address' || f[0].indexOf('band_') === 0))
    })
    return h('section', { class: 'adm-card wide' },
      h('div', { class: 'adm-rowbar' }, h('button', { class: 'adm-btn primary', onclick: function () {
        var btn = this, rows = SETTING_FIELDS.map(function (f) { return { key: f[0], value: vals[f[0]] || '' } })
        if (vals.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vals.email)) return toast('E-posta adresi geçersiz.', true)
        btn.disabled = true
        sb.from('settings').upsert(rows).then(function (r) { btn.disabled = false; if (r.error) return fail(r.error); S.data.settings = vals; S.dirty = false; toast('Kaydedildi ✓'); render() })
      } }, 'Kaydet')),
      h('p', { class: 'adm-hint' }, 'Bu bilgiler iletişim sayfasında görünür. Boş bıraktığın sosyal medya simgesi gizlenir. E-postayı değiştirirsen, FormSubmit’ten gelecek “Activate” mailini yeni adreste bir kez onayla.'), grid)
  }

  /* ---------- ana görünüm ---------- */
  function render() {
    app.innerHTML = ''
    var unread = S.data.messages.filter(function (m) { return !m.is_read }).length
    var tabs = h('nav', { class: 'adm-tabs', 'aria-label': 'Bölümler' }, TABS.map(function (t) {
      var count = (t[0] === 'media' || t[0] === 'settings') ? null : (t[0] === 'messages' ? unread : S.data[t[0]].length)
      return h('button', { class: S.tab === t[0] ? 'active' : '', onclick: function () { if (S.dirty && !confirm('Kaydedilmemiş değişiklikler silinecek. Devam edilsin mi?')) return; S.dirty = false; S.tab = t[0]; if (t[0] === 'media') loadMedia().then(render).catch(fail); else refresh() } }, t[1], count != null ? h('small', {}, count) : null)
    }))
    var body = S.tab === 'media' ? mediaView() : S.tab === 'messages' ? messagesView() : S.tab === 'settings' ? settingsView() : listAndEditor(S.tab)
    app.appendChild(h('div', { class: 'adm-shell' },
      h('header', { class: 'adm-top' }, h('div', {}, h('p', { class: 'adm-eyebrow' }, 'KEREM AYDIN · CMS'), h('h1', {}, 'Yönetim paneli')),
        h('div', { class: 'adm-actions' }, h('span', { class: 'adm-status', id: 'adm-status', role: 'status' }, S.dirty ? 'Kaydedilmemiş değişiklikler var' : ''),
          h('a', { class: 'adm-btn', href: '../tr/index.html', target: '_blank', rel: 'noreferrer' }, 'Siteyi aç ↗'),
          h('button', { class: 'adm-btn', onclick: function () { sb.auth.signOut().then(function () { loginView() }) } }, 'Çıkış'))),
      tabs, body))
  }
  function refresh() { fetchAll().then(render).catch(fail) }
  function start() { app.innerHTML = '<p class="adm-empty">Yükleniyor…</p>'; fetchAll().then(function () { return loadMedia().catch(function () {}) }).then(render).catch(function (e) { fail(e); render() }) }

  sb.auth.getSession().then(function (r) { if (r.data && r.data.session) start(); else loginView() })
})()
