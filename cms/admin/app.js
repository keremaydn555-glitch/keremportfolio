/* KA-CMS yönetim paneli (framework yok) */
(function () {
  'use strict'
  var app = document.getElementById('app')
  var CATS = { web: 'Web Tasarım', design: 'Grafik Tasarım', video: 'Videografi' }
  var S = { C: null, schema: { pages: [] }, view: 'dashboard', sel: { posts: 0, projects: 0, gallery: 0 }, dirty: false, messages: [], media: [] }
  var MENU = [['dashboard', 'Panel'], ['g', 'İÇERİK'], ['posts', 'Yazılar'], ['taxonomy', 'Kategoriler ve Etiketler'], ['pages', 'Sayfalar'], ['projects', 'Projeler'], ['gallery', 'Galeri'], ['media', 'Medya'], ['messages', 'Mesajlar'], ['g', 'SİSTEM'], ['plugins', 'Eklentiler'], ['settings', 'Ayarlar']]
  var TITLES = { dashboard: 'Panel', posts: 'Yazılar', taxonomy: 'Kategoriler ve Etiketler', pages: 'Sayfalar', projects: 'Projeler', gallery: 'Galeri', media: 'Medya Kütüphanesi', messages: 'Mesajlar', plugins: 'Eklentiler', settings: 'Ayarlar' }

  /* ---------- yardımcılar ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag)
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]; if (v === false || v == null) return
      if (k === 'class') el.className = v
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v)
      else el.setAttribute(k, v === true ? '' : v)
    })
    function add(c) { if (c == null || c === false) return; if (Array.isArray(c)) return c.forEach(add); el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c) }
    for (var i = 2; i < arguments.length; i++) add(arguments[i])
    return el
  }
  function toast(msg, err) { var t = h('div', { class: 'toast' + (err ? ' err' : ''), role: 'status' }, msg); document.body.appendChild(t); setTimeout(function () { t.remove() }, err ? 6000 : 2400) }
  function api(method, path, body, raw) {
    var opt = { method: method, credentials: 'same-origin', headers: { 'X-CMS': '1' } }
    if (raw) { opt.body = raw } else if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body) }
    return fetch('/cms/api' + path, opt).then(function (r) { return r.json().catch(function () { return {} }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'HTTP ' + r.status); e.status = r.status; throw e } return d }) })
  }
  function fail(e) { if (e && e.status === 401) { return boot() } console.error(e); toast('Hata: ' + (e && e.message ? e.message : e), true) }
  function markDirty() { S.dirty = true; var s = document.getElementById('status'); if (s) s.textContent = 'Kaydedilmemiş değişiklikler var'; var b = document.getElementById('savebtn'); if (b) b.disabled = false }
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = '' } })
  function slugify(s) { var m = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }; return String(s || '').toLocaleLowerCase('tr').replace(/[çğıöşü]/g, function (c) { return m[c] }).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) }
  var today = function () { return new Date().toISOString().slice(0, 10) }
  function sectionsToText(s) { return (s || []).map(function (x) { return '## ' + x.heading + '\n\n' + x.paragraphs.join('\n\n') }).join('\n\n') }
  function textToSections(t) {
    return String(t || '').split(/^##\s+/m).map(function (b) { return b.trim() }).filter(Boolean).map(function (block) { var l = block.split('\n'), head = l.shift().trim(); return { heading: head, paragraphs: l.join('\n').split(/\n\s*\n/).map(function (p) { return p.trim() }).filter(Boolean) } })
  }
  var imgSrc = function (u) { return !u ? '' : /^(https?:)?\/\//.test(u) ? u : '/' + u.replace(/^\//, '') }

  /* ---------- form parçaları ---------- */
  function field(label, el, wide) { return h('label', { class: 'field' + (wide ? ' wide' : '') }, h('span', {}, label), el) }
  function bind(obj, key, tag, attrs) {
    var el = h(tag, attrs || {}); el.value = obj[key] == null ? '' : obj[key]
    el.addEventListener('input', function () { obj[key] = attrs && attrs.type === 'number' ? Number(el.value) : el.value; markDirty() })
    return el
  }
  function select(obj, key, options) {
    var el = h('select', {}, Object.keys(options).map(function (k) { return h('option', { value: k }, options[k]) })); el.value = obj[key]
    el.addEventListener('change', function () { obj[key] = el.value; markDirty() }); return el
  }
  function tagsInput(obj) { var el = h('input'); el.value = (obj.tags || []).join(', '); el.addEventListener('input', function () { obj.tags = el.value.split(',').map(function (t) { return t.trim() }).filter(Boolean); markDirty() }); return el }
  function imageField(obj, key, label) {
    var wrap = h('div', { class: 'field wide' })
    function draw() {
      wrap.innerHTML = ''; wrap.appendChild(h('span', {}, label))
      wrap.appendChild(h('div', { class: 'imgfield' }, obj[key] ? h('img', { src: imgSrc(obj[key]), alt: '' }) : h('div', { class: 'noimg' }, 'Görsel yok'),
        h('div', { class: 'rowbar', style: 'margin:0' },
          h('button', { type: 'button', class: 'btn', onclick: function () { pickMedia(function (u) { obj[key] = u; markDirty(); draw() }) } }, obj[key] ? 'Değiştir' : 'Görsel seç / yükle'),
          obj[key] ? h('button', { type: 'button', class: 'btn danger', onclick: function () { obj[key] = ''; markDirty(); draw() } }, 'Kaldır') : null)))
    }
    draw(); return wrap
  }

  /* ---------- medya ---------- */
  function loadMedia() { return api('GET', '/media').then(function (l) { S.media = l }) }
  function resizeIfBig(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || (file.size < 1.2e6)) return resolve(file)
      var img = new Image(), url = URL.createObjectURL(file)
      img.onload = function () {
        var max = 1800, sc = Math.min(1, max / Math.max(img.width, img.height))
        var c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url)
        c.toBlob(function (b) { if (!b || b.size >= file.size) return resolve(file); var f = new File([b], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }); resolve(f) }, 'image/webp', 0.86)
      }
      img.onerror = function () { resolve(file) }; img.src = url
    })
  }
  function uploadFiles(files) {
    var last = ''
    return Array.prototype.slice.call(files || []).reduce(function (p, f) {
      return p.then(function () { return resizeIfBig(f) }).then(function (ff) { return api('POST', '/upload?name=' + encodeURIComponent(ff.name), undefined, ff) }).then(function (r) { last = r.url })
    }, Promise.resolve()).then(function () { return loadMedia() }).then(function () { return last })
  }
  function pickMedia(cb) {
    var overlay = h('div', { class: 'modal', onclick: function () { overlay.remove() } })
    var grid = h('div', { class: 'media' })
    var file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: function () { uploadFiles(file.files).then(function (u) { file.value = ''; if (u) { overlay.remove(); cb(u) } else draw() }).catch(fail) } })
    function draw() { grid.innerHTML = ''; S.media.forEach(function (m) { grid.appendChild(h('button', { type: 'button', class: 'pick', onclick: function () { overlay.remove(); cb(m.url) } }, h('img', { src: imgSrc(m.url), alt: '', loading: 'lazy' }), h('span', {}, m.name))) }); if (!S.media.length) grid.appendChild(h('p', { class: 'empty' }, 'Henüz görsel yok.')) }
    overlay.appendChild(h('div', { class: 'card', onclick: function (e) { e.stopPropagation() } }, h('div', { class: 'rowbar' }, h('h2', {}, 'Görsel seç'), h('span', { class: 'grow' }), h('button', { class: 'btn primary', onclick: function () { file.click() } }, '+ Bilgisayardan yükle'), h('button', { class: 'btn', onclick: function () { overlay.remove() } }, 'Kapat'), file), grid))
    document.body.appendChild(overlay); loadMedia().then(draw).catch(fail)
  }
  function mediaView() {
    var file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: function () { uploadFiles(file.files).then(function () { file.value = ''; toast('Yüklendi ✓'); render() }).catch(fail) } })
    var grid = h('div', { class: 'media' })
    S.media.forEach(function (m) {
      grid.appendChild(h('figure', {}, h('img', { src: imgSrc(m.url), alt: '', loading: 'lazy' }), h('figcaption', {}, m.name + (m.upload ? '' : ' (site görseli)')),
        m.upload ? h('button', { class: 'btn danger', onclick: function () { if (confirm('Görsel silinsin mi?')) api('DELETE', '/media?name=' + encodeURIComponent(m.name)).then(function () { return loadMedia() }).then(render).catch(fail) } }, 'Sil') : null))
    })
    return h('div', { class: 'card' }, h('div', { class: 'rowbar' }, h('button', { class: 'btn primary', onclick: function () { file.click() } }, '+ Görsel yükle'), file),
      h('p', { class: 'hint' }, 'Yüklenen görseller ', h('code', {}, 'site/assets/images/uploads'), ' klasörüne kaydedilir. Büyük fotoğraflar yüklenirken otomatik küçültülür.'), grid)
  }

  /* ---------- liste + editör (yazılar, projeler, galeri) ---------- */
  var KINDS = {
    posts: { add: 'Yeni yazı ekle', what: 'yazı', title: function (r) { return r.title.tr }, sub: function (r) { return (CATS[r.category] || '') + ' · ' + r.date }, order: false,
      blank: function () { return { slug: 'yeni-yazi-' + Date.now().toString(36), category: 'web', tags: [], date: today(), minutes: 3, title: { tr: 'Yeni yazı', en: 'New article' }, excerpt: { tr: '', en: '' }, sections: { tr: [], en: [] }, image: '' } } },
    projects: { add: 'Yeni proje ekle', what: 'proje', title: function (r) { return r.title.tr }, sub: function (r) { return r.category === 'web' ? 'Web Tasarım' : 'Grafik Tasarım' }, order: true,
      blank: function () { return { id: 'proje-' + Date.now().toString(36), title: { tr: 'Yeni proje', en: 'New project' }, description: { tr: '', en: '' }, category: 'design', tags: [], visual: 'sketch', image: '', logo: '' } } },
    gallery: { add: 'Yeni fotoğraf ekle', what: 'fotoğraf', title: function (r) { return r.title.tr }, sub: function () { return '' }, order: true,
      blank: function () { return { title: { tr: 'Yeni fotoğraf', en: 'New photo' }, description: { tr: '', en: '' }, style: 'gallery-moon', src: '', position: '50% 50%' } } },
  }
  function editorFields(kind, r) {
    var g = h('div', { class: 'grid' }), add = function () { for (var i = 0; i < arguments.length; i++) g.appendChild(arguments[i]) }
    if (kind === 'posts') {
      var bodyTr = h('textarea', { class: 'mono', rows: 16 }), bodyEn = h('textarea', { class: 'mono', rows: 16 })
      bodyTr.value = sectionsToText(r.sections.tr); bodyEn.value = sectionsToText(r.sections.en)
      bodyTr.addEventListener('input', function () { r.sections.tr = textToSections(bodyTr.value); markDirty() }); bodyEn.addEventListener('input', function () { r.sections.en = textToSections(bodyEn.value); markDirty() })
      add(field('Başlık (Türkçe)', bind(r.title, 'tr', 'input'), true), field('Title (English)', bind(r.title, 'en', 'input'), true),
        field('Kategori', select(r, 'category', CATS)), field('Tarih', bind(r, 'date', 'input', { type: 'date' })),
        field('Okuma süresi (dk)', bind(r, 'minutes', 'input', { type: 'number', min: 1, max: 60 })), field('Adres (slug)', bind(r, 'slug', 'input')),
        field('Etiketler (virgülle ayır)', tagsInput(r), true), imageField(r, 'image', 'Kapak fotoğrafı'),
        field('Kısa özet (Türkçe)', bind(r.excerpt, 'tr', 'textarea', { rows: 2 }), true), field('Short excerpt (English)', bind(r.excerpt, 'en', 'textarea', { rows: 2 }), true),
        field('İçerik (Türkçe) — başlık için “## Başlık”, paragraflar boş satırla ayrılır', bodyTr, true), field('Content (English) — “## Heading”, paragraphs separated by a blank line', bodyEn, true))
    }
    if (kind === 'projects') add(
      field('Başlık (Türkçe)', bind(r.title, 'tr', 'input'), true), field('Title (English)', bind(r.title, 'en', 'input'), true),
      field('Açıklama (Türkçe)', bind(r.description, 'tr', 'textarea', { rows: 4 }), true), field('Description (English)', bind(r.description, 'en', 'textarea', { rows: 4 }), true),
      field('Kategori', select(r, 'category', { design: 'Grafik Tasarım', web: 'Web Tasarım' })), field('Etiketler (virgülle ayır)', tagsInput(r)),
      imageField(r, 'image', 'Proje görseli'), imageField(r, 'logo', 'Logo (isteğe bağlı, kartın ortasında görünür; PNG önerilir)'))
    if (kind === 'gallery') add(
      field('Başlık (Türkçe)', bind(r.title, 'tr', 'input'), true), field('Title (English)', bind(r.title, 'en', 'input'), true),
      field('Açıklama (Türkçe)', bind(r.description, 'tr', 'textarea', { rows: 3 }), true), field('Description (English)', bind(r.description, 'en', 'textarea', { rows: 3 }), true),
      imageField(r, 'src', 'Fotoğraf'), field('Odak noktası (ör. 50% 35%)', bind(r, 'position', 'input')))
    return g
  }
  function listAndEditor(kind) {
    var K = KINDS[kind], items = S.C[kind], sel = Math.min(S.sel[kind], Math.max(0, items.length - 1)); S.sel[kind] = sel
    var list = h('aside', { class: 'list' }, h('button', { class: 'btn primary full', onclick: function () { var r = K.blank(); if (kind === 'posts') items.unshift(r); else items.push(r); S.sel[kind] = kind === 'posts' ? 0 : items.length - 1; markDirty(); render() } }, '+ ' + K.add))
    items.forEach(function (r, i) { list.appendChild(h('button', { class: 'item' + (i === sel ? ' active' : ''), onclick: function () { S.sel[kind] = i; render() } }, h('b', {}, K.title(r) || '(başlıksız)'), K.sub(r) ? h('small', {}, K.sub(r)) : null)) })
    var wrap = h('div', { class: 'split' }, list), r = items[sel]
    if (!r) { wrap.appendChild(h('p', { class: 'empty' }, 'Henüz kayıt yok.')); return wrap }
    function move(d) { var j = sel + d; if (j < 0 || j >= items.length) return; var t = items[sel]; items[sel] = items[j]; items[j] = t; S.sel[kind] = j; markDirty(); render() }
    var card = h('div', { class: 'card' }, h('div', { class: 'rowbar' },
      K.order ? h('button', { class: 'btn', disabled: sel === 0, onclick: function () { move(-1) } }, '↑ Yukarı') : null,
      K.order ? h('button', { class: 'btn', disabled: sel === items.length - 1, onclick: function () { move(1) } }, '↓ Aşağı') : null,
      kind === 'posts' ? h('a', { class: 'btn', href: '/tr/post.html?slug=' + encodeURIComponent(r.slug), target: '_blank', rel: 'noreferrer' }, 'Yazıyı görüntüle ↗') : null,
      h('span', { class: 'grow' }),
      h('button', { class: 'btn danger', onclick: function () { if (!confirm('Bu ' + K.what + ' silinsin mi?')) return; items.splice(sel, 1); S.sel[kind] = Math.max(0, sel - 1); markDirty(); render() } }, 'Sil')))
    if (kind === 'projects') card.appendChild(h('p', { class: 'hint', style: 'margin:-6px 0 12px' }, 'Anasayfada ilk 3 proje görünür; sıralamayı yukarı/aşağı ile değiştirebilirsin.'))
    card.appendChild(editorFields(kind, r)); wrap.appendChild(card); return wrap
  }

  /* ---------- kategoriler ve etiketler ---------- */
  function taxonomyView() {
    var posts = S.C.posts, tags = {}
    posts.forEach(function (p) { p.tags.forEach(function (t) { (tags[t] = tags[t] || []).push(p.title.tr) }) })
    var rows = Object.keys(CATS).map(function (k) { var n = posts.filter(function (p) { return p.category === k }).length; return h('tr', {}, h('td', {}, CATS[k]), h('td', {}, k), h('td', {}, n)) })
    var trows = Object.keys(tags).sort().map(function (t) { return h('tr', {}, h('td', {}, h('span', { class: 'tag' }, '#' + t)), h('td', {}, tags[t].length), h('td', {}, tags[t].join(', '))) })
    return h('div', { class: 'two' },
      h('div', { class: 'card' }, h('h2', {}, 'Kategoriler'), h('p', { class: 'hint' }, 'Bir yazının kategorisi Yazılar bölümünden seçilir.'), h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Ad'), h('th', {}, 'Kısa ad'), h('th', {}, 'Yazı sayısı'))), h('tbody', {}, rows))),
      h('div', { class: 'card' }, h('h2', {}, 'Etiketler'), h('p', { class: 'hint' }, 'Etiketler yazı düzenlenirken virgülle eklenir; burada otomatik listelenir.'), h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Etiket'), h('th', {}, 'Yazı'), h('th', {}, 'Hangi yazılarda'))), h('tbody', {}, trows.length ? trows : h('tr', {}, h('td', { colspan: 3 }, 'Henüz etiket yok'))))))
  }

  /* ---------- sayfalar ---------- */
  function pagesView() {
    var wrap = h('div', {})
    wrap.appendChild(h('div', { class: 'card page-block' }, h('p', { class: 'hint', style: 'margin:0' }, 'Sitedeki sayfa metinlerini buradan değiştirirsin. Alan boş kalırsa sitenin varsayılan metni kullanılır. Gri yazı varsayılan metindir. Satır başı için Enter kullanabilirsin.')))
    S.schema.pages.forEach(function (pg) {
      var card = h('div', { class: 'card page-block' }, h('div', { class: 'rowbar' }, h('h3', {}, pg.label), h('span', { class: 'badge' }, '/' + pg.id), h('span', { class: 'grow' }), h('a', { class: 'btn', href: '/tr/' + (pg.id === 'home' ? 'index' : pg.id) + '.html', target: '_blank', rel: 'noreferrer' }, 'Sayfayı aç ↗')))
      pg.fields.forEach(function (f) {
        var k = pg.id + '.' + f.key
        var cur = function () { return S.C.pageTexts[k] || (S.C.pageTexts[k] = { tr: '', en: '' }) }
        var mk = function (lang) { var el = h('textarea', { rows: f.multiline || (f[lang] || '').length > 90 ? 3 : 2, placeholder: f[lang] }); el.value = (S.C.pageTexts[k] && S.C.pageTexts[k][lang]) || ''; el.addEventListener('input', function () { cur()[lang] = el.value; markDirty() }); return el }
        var a = mk('tr'), b = mk('en')
        card.appendChild(h('div', { class: 'pf' }, h('b', {}, f.label), h('div', { class: 'grid' }, field('Türkçe', a), field('English', b)),
          h('button', { class: 'btn', style: 'margin-top:8px', onclick: function () { delete S.C.pageTexts[k]; a.value = ''; b.value = ''; markDirty() } }, 'Varsayılana dön')))
      })
      wrap.appendChild(card)
    })
    return wrap
  }

  /* ---------- mesajlar ---------- */
  function messagesView() {
    var wrap = h('div', {})
    if (!S.messages.length) wrap.appendChild(h('div', { class: 'card empty' }, 'Henüz mesaj yok. Siteyi bu bilgisayarda (CMS ile) açıp iletişim formunu doldurunca mesajlar burada görünür. GitHub’daki canlı sitenin formu mesajı e-postana gönderir.'))
    S.messages.forEach(function (m) {
      wrap.appendChild(h('div', { class: 'msg' + (m.read ? '' : ' unread') }, h('b', {}, m.subject), h('div', { class: 'hint', style: 'margin:2px 0' }, m.name + ' · ' + m.email + ' · ' + new Date(m.created).toLocaleString('tr-TR')), h('p', {}, m.message),
        h('div', { class: 'rowbar', style: 'margin:0' },
          h('a', { class: 'btn', href: 'mailto:' + m.email + '?subject=' + encodeURIComponent('Re: ' + m.subject) }, 'Yanıtla'),
          h('button', { class: 'btn', onclick: function () { api('PATCH', '/messages/' + m.id, { read: !m.read }).then(function () { m.read = !m.read; render() }).catch(fail) } }, m.read ? 'Okunmadı yap' : 'Okundu yap'),
          h('button', { class: 'btn danger', onclick: function () { if (confirm('Mesaj silinsin mi?')) api('DELETE', '/messages/' + m.id).then(function () { S.messages = S.messages.filter(function (x) { return x.id !== m.id }); render() }).catch(fail) } }, 'Sil'))))
    })
    return wrap
  }

  /* ---------- eklentiler ---------- */
  var PLUGINS = [
    { id: 'language', name: 'Çok Dilli İçerik (TR / EN)', ver: '1.0', desc: 'Her sayfa, yazı ve proje için Türkçe ve İngilizce içerik; sitede dil değiştirici.', core: true },
    { id: 'media', name: 'Medya Kütüphanesi', ver: '1.0', desc: 'Görsel yükleme, otomatik küçültme ve içeriklere görsel atama.', core: true },
    { id: 'taxonomy', name: 'Kategori ve Etiketler', ver: '1.0', desc: 'Blog yazıları için kategori, etiket ve etikete göre filtreleme.', core: true },
    { id: 'inbox', name: 'Mesaj Kutusu', ver: '1.0', desc: 'İletişim formundan gelen mesajları panelde listeler (yerel çalışırken).', core: true },
    { id: 'home_gallery', name: 'Anasayfa Galeri Örnekleri', ver: '1.0', desc: 'Anasayfada galeriden 3 örnek fotoğraf gösterir.' },
    { id: 'contact_form', name: 'İletişim Formu', ver: '1.0', desc: 'İletişim sayfasındaki mesaj formu (e-postana ve panele iletir).' },
    { id: 'contact_map', name: 'Google Harita', ver: '1.0', desc: 'İletişim sayfasındaki harita kutusu.' },
    { id: 'social_links', name: 'Sosyal Medya Simgeleri', ver: '1.0', desc: 'İletişim sayfasında Instagram, LinkedIn, GitHub simgeleri (Ayarlar’daki bağlantılarla).' },
  ]
  function pluginsView() {
    var card = h('div', { class: 'card' }, h('p', { class: 'hint', style: 'margin:0 0 6px' }, 'Eklentiler sitenin özelliklerini açıp kapatır. Değişiklik Kaydet’ten sonra siteye yansır.'))
    PLUGINS.forEach(function (p) {
      var on = p.core || S.C.plugins[p.id] !== false
      var sw = p.core ? h('span', { class: 'badge core' }, 'Çekirdek') : h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: on, onchange: function (e) { S.C.plugins[p.id] = e.target.checked; markDirty(); render() } }), h('i'))
      card.appendChild(h('div', { class: 'plugin' }, h('div', {}, h('h3', {}, p.name, h('span', { class: 'badge' + (on ? '' : ' off') }, on ? 'Etkin' : 'Devre dışı'), h('span', { class: 'badge core' }, 'v' + p.ver)), h('p', {}, p.desc)), sw))
    })
    return card
  }

  /* ---------- ayarlar ---------- */
  function settingsView() {
    var st = S.C.settings, g = h('div', { class: 'grid' })
    ;[['phone', 'Telefon', 'text'], ['email', 'E-posta (iletişim formu bu adrese gider)', 'email'], ['address', 'Adres', 'text', true], ['instagram', 'Instagram bağlantısı (https://...)', 'url'], ['linkedin', 'LinkedIn bağlantısı (https://...)', 'url'], ['github', 'GitHub bağlantısı (https://...)', 'url'], ['band_tr', 'Hakkımda sayfası — “Şu sıralar” cümlesi (Türkçe)', 'text', true], ['band_en', 'About page — “Currently” sentence (English)', 'text', true]].forEach(function (f) { g.appendChild(field(f[1], bind(st, f[0], 'input', { type: f[2] }), f[3])) })
    return h('div', { class: 'card' }, h('p', { class: 'hint', style: 'margin:0 0 12px' }, 'Bu bilgiler iletişim sayfasında görünür. Boş bıraktığın sosyal medya simgesi gizlenir. E-posta değişirse FormSubmit’ten gelen “Activate” mailini yeni adreste bir kez onayla.'), g)
  }

  /* ---------- panel ---------- */
  function dashboardView() {
    var C = S.C, unread = S.messages.filter(function (m) { return !m.read }).length
    var stat = function (n, label, view) { return h('button', { class: 'stat', onclick: function () { go(view) } }, h('b', {}, n), h('span', {}, label)) }
    var recent = C.posts.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1 }).slice(0, 5)
    return h('div', {},
      h('div', { class: 'stats' }, stat(C.posts.length, 'Yazı', 'posts'), stat(S.schema.pages.length, 'Sayfa', 'pages'), stat(C.projects.length, 'Proje', 'projects'), stat(C.gallery.length, 'Galeri fotoğrafı', 'gallery'), stat(unread, 'Okunmamış mesaj', 'messages')),
      h('div', { class: 'two' },
        h('div', { class: 'card' }, h('h2', {}, 'Son yazılar'), h('table', {}, h('tbody', {}, recent.map(function (p) { return h('tr', {}, h('td', {}, p.title.tr), h('td', {}, CATS[p.category]), h('td', {}, p.date)) })))),
        h('div', { class: 'card' }, h('h2', {}, 'Siteyi GitHub’da güncelleme'), h('ol', { class: 'steps' },
          h('li', {}, 'Değişiklikleri yap ve ', h('b', {}, 'Kaydet’e'), ' bas.'),
          h('li', {}, 'Proje klasörünün içindekileri (hepsini) GitHub’a yükle.'),
          h('li', {}, 'GitHub Pages 1-2 dakikada yayınlar.'),
          h('li', {}, 'Şifren ve mesajların bilgisayarında ayrı bir yerde tutulur, GitHub’a gitmez.')))))
  }
  function go(v) { if (S.dirty && !confirm('Kaydedilmemiş değişiklikler var. Yine de çıkılsın mı? (Değişiklikler kaybolur)')) return; if (S.dirty) { S.dirty = false; return reload(v) } S.view = v; prep().then(render) }
  function prep() { var v = S.view; if (v === 'messages' || v === 'dashboard') return api('GET', '/messages').then(function (m) { S.messages = m }).catch(function () {}); if (v === 'media') return loadMedia(); return Promise.resolve() }
  function save() {
    var b = document.getElementById('savebtn'); b.disabled = true; document.getElementById('status').textContent = 'Kaydediliyor…'
    api('PUT', '/content', { projects: S.C.projects, gallery: S.C.gallery, posts: S.C.posts, settings: S.C.settings, pageTexts: S.C.pageTexts, plugins: S.C.plugins }).then(function (r) { S.C = r.content; S.dirty = false; toast('Kaydedildi ✓ — site dosyaları güncellendi'); render() }).catch(function (e) { b.disabled = false; fail(e) })
  }
  function render() {
    app.innerHTML = ''
    var unread = S.messages.filter(function (m) { return !m.read }).length
    var nav = h('nav', { 'aria-label': 'Menü' }, MENU.map(function (m) {
      if (m[0] === 'g') return h('div', { class: 'grp' }, m[1])
      var cnt = m[0] === 'posts' ? S.C.posts.length : m[0] === 'projects' ? S.C.projects.length : m[0] === 'gallery' ? S.C.gallery.length : m[0] === 'messages' ? unread : null
      return h('button', { class: S.view === m[0] ? 'active' : '', onclick: function () { go(m[0]) } }, TITLES[m[0]], cnt ? h('small', {}, cnt) : null)
    }))
    var body = S.view === 'dashboard' ? dashboardView() : S.view === 'taxonomy' ? taxonomyView() : S.view === 'pages' ? pagesView() : S.view === 'media' ? mediaView() : S.view === 'messages' ? messagesView() : S.view === 'plugins' ? pluginsView() : S.view === 'settings' ? settingsView() : listAndEditor(S.view)
    var showSave = ['media', 'messages', 'taxonomy', 'dashboard'].indexOf(S.view) < 0
    app.appendChild(h('div', { class: 'shell' },
      h('aside', { class: 'side' }, h('div', { class: 'brand' }, h('b', {}, 'Kerem Aydın'), h('small', {}, 'KA-CMS · İÇERİK YÖNETİMİ')), nav,
        h('div', { class: 'side-foot' }, h('a', { class: 'btn', href: '/tr/index.html', target: '_blank', rel: 'noreferrer' }, 'Siteyi görüntüle ↗'), h('button', { class: 'btn', onclick: function () { api('POST', '/logout').then(function () { S.dirty = false; boot() }) } }, 'Çıkış yap'))),
      h('main', { class: 'main' }, h('div', { class: 'topbar' }, h('h1', {}, TITLES[S.view]),
        h('div', { class: 'actions' }, h('span', { class: 'status', id: 'status', role: 'status' }, S.dirty ? 'Kaydedilmemiş değişiklikler var' : ''), showSave ? h('button', { class: 'btn primary', id: 'savebtn', disabled: !S.dirty, onclick: save }, 'Kaydet') : null)),
        h('div', { class: 'content' }, body))))
  }
  function reload(v) { api('GET', '/content').then(function (r) { S.C = r.content; S.schema = r.schema; S.view = v || S.view; return prep() }).then(render).catch(fail) }

  /* ---------- giriş / ilk kurulum ---------- */
  function authView(setup) {
    app.innerHTML = ''
    var err = h('p', { class: 'error', role: 'alert' })
    var email = h('input', { type: 'email', required: true, autocomplete: 'username', placeholder: 'ornek@gmail.com' })
    var pw = h('input', { type: 'password', required: true, autocomplete: setup ? 'new-password' : 'current-password', minlength: setup ? 8 : 1 })
    var pw2 = setup ? h('input', { type: 'password', required: true, autocomplete: 'new-password', minlength: 8 }) : null
    var show = h('button', { type: 'button', class: 'btn', onclick: function () { var t = pw.type === 'password' ? 'text' : 'password'; pw.type = t; if (pw2) pw2.type = t; show.textContent = t === 'password' ? 'Şifreyi göster' : 'Şifreyi gizle' } }, 'Şifreyi göster')
    var btn = h('button', { class: 'btn primary' }, setup ? 'Hesabı oluştur ve gir' : 'Giriş yap')
    var form = h('form', { onsubmit: function (e) {
      e.preventDefault(); err.textContent = ''
      if (setup && pw.value !== pw2.value) { err.textContent = 'İki şifre aynı değil.'; return }
      btn.disabled = true
      api('POST', setup ? '/setup' : '/login', { email: email.value, password: pw.value }).then(function () { boot() }).catch(function (ex) { err.textContent = ex.message; btn.disabled = false })
    } },
      h('small', {}, 'KEREM AYDIN · KA-CMS'), h('h1', {}, setup ? 'İlk kurulum' : 'Yönetim paneli'),
      setup ? h('p', { class: 'hint', style: 'margin:0' }, 'Panele girişte kullanacağın e-posta ve şifreyi belirle (şifre en az 8 karakter). Bilgiler sadece bu bilgisayarda tutulur.') : null,
      h('label', { class: 'field' }, h('span', {}, 'E-posta'), email),
      h('label', { class: 'field' }, h('span', {}, setup ? 'Yeni şifre' : 'Şifre'), pw),
      setup ? h('label', { class: 'field' }, h('span', {}, 'Şifre (tekrar)'), pw2) : null,
      show, err, btn, h('a', { href: '/tr/index.html', style: 'text-align:center;font-size:12px' }, '← Siteye dön'))
    app.appendChild(h('main', { class: 'login' }, form))
  }
  function boot() {
    api('GET', '/status').then(function (s) { if (s.setup) return authView(true); if (!s.auth) return authView(false); S.view = 'dashboard'; reload('dashboard') }).catch(function () { app.innerHTML = '<p style="padding:24px;font-family:sans-serif">CMS sunucusuna ulaşılamıyor. Terminalde <code>node server.js</code> çalışıyor mu?</p>' })
  }
  boot()
})()
