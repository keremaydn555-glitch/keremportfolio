/* Kerem Aydın — site betiği (framework yok). Veriyi Supabase'ten okur; yoksa seed.js'e düşer. */
(function () {
  'use strict'
  var CFG = window.SITE_CONFIG || {}
  var LANG = document.body.getAttribute('data-lang') || 'tr'
  var PAGE = document.body.getAttribute('data-page') || 'home'
  var T = (window.I18N || {})[LANG] || {}
  var ICONS = window.ICONS || {}
  var HAS_DB = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY)

  /* ---------- yardımcılar ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
  function icon(name, size) { var svg = ICONS[name] || ''; return size ? svg.replace(/width="\d+"/, 'width="' + size + '"').replace(/height="\d+"/, 'height="' + size + '"') : svg }
  function imgUrl(u) {
    if (!u) return ''
    if (/^(https?:)?\/\//.test(u) || u.indexOf('data:') === 0) return u
    if (u.indexOf('/images/') === 0) return '../assets' + u
    if (u.charAt(0) === '/') return '..' + u
    return '../' + u
  }
  function fmtDate(d, long) {
    try { return new Intl.DateTimeFormat(LANG === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: long ? 'long' : 'short', year: 'numeric' }).format(new Date(d + 'T12:00:00')) } catch (e) { return d }
  }
  function $(sel, root) { return (root || document).querySelector(sel) }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)) }

  /* ---------- veri katmanı ---------- */
  // Eski "anon" anahtarı (eyJ...) Bearer olarak da gönderilir; yeni "publishable" anahtar (sb_publishable_...) sadece apikey başlığında gönderilir.
  function dbHeaders(extra) {
    var h = { apikey: CFG.SUPABASE_ANON_KEY }
    if (/^eyJ/.test(CFG.SUPABASE_ANON_KEY || '')) h.Authorization = 'Bearer ' + CFG.SUPABASE_ANON_KEY
    return Object.assign(h, extra || {})
  }

  function parseSections(text) {
    return String(text || '').split(/^##\s+/m).map(function (b) { return b.trim() }).filter(Boolean).map(function (block) {
      var lines = block.split('\n'), heading = lines.shift().trim()
      return { heading: heading, paragraphs: lines.join('\n').split(/\n\s*\n/).map(function (p) { return p.trim() }).filter(Boolean) }
    })
  }
  var map = {
    projects: function (r) { return { logo: r.logo || '', id: r.id, title: { tr: r.title_tr, en: r.title_en }, description: { tr: r.description_tr, en: r.description_en }, category: r.category, tags: r.tags || [], visual: r.visual || 'sketch', image: r.image || '' } },
    gallery: function (r) { return { id: r.id, title: { tr: r.title_tr, en: r.title_en }, description: { tr: r.description_tr, en: r.description_en }, style: r.style || 'gallery-moon', src: r.src || '', position: r.focus || '50% 50%' } },
    posts: function (r) { return { slug: r.slug, category: r.category, tags: r.tags || [], date: r.date, minutes: r.minutes, title: { tr: r.title_tr, en: r.title_en }, excerpt: { tr: r.excerpt_tr, en: r.excerpt_en }, sections: { tr: parseSections(r.content_tr), en: parseSections(r.content_en) }, image: r.image || '' } },
  }
  var ORDER = { projects: 'sort.asc', gallery: 'sort.asc', posts: 'date.desc' }
  var cache = {}
  function load(table) {
    if (cache[table]) return cache[table]
    var seed = (window.SEED_DATA || {})[table] || []
    if (!HAS_DB) return (cache[table] = Promise.resolve(seed))
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort() }, 7000)
    cache[table] = fetch(CFG.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + table + '?select=*&order=' + ORDER[table], { headers: dbHeaders(), signal: ctl.signal })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(function (rows) { return rows.map(map[table]) })
      .catch(function (e) { console.warn('Veritabanına ulaşılamadı, yedek içerik gösteriliyor:', e); return seed })
      .then(function (v) { clearTimeout(timer); return v })
    return cache[table]
  }

  /* ---------- şablonlar ---------- */
  var CAPTIONS = { 'second-brain': 'PERSONAL SYSTEM', 'history-brush': 'PHOTOSHOP / STUDY', 'kara-kalem': 'INK / COLOR', 'smart-object': 'SMART OBJECT' }
  function projectCard(p, i) {
    var kinds = T.projectKinds || {}
    return '<article class="project-card"><a class="project-art art-' + esc(p.visual) + '" href="projects.html" aria-label="' + esc(p.title[LANG]) + '">' +
      (p.logo ? '<img class="project-logo" src="' + esc(imgUrl(p.logo)) + '" alt="' + esc(p.title[LANG]) + ' logo" loading="lazy">' : '') +
      (p.image ? '<img class="project-photo" src="' + esc(imgUrl(p.image)) + '" alt="' + esc(p.title[LANG]) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '">' : '') +
      '<span class="art-no">0' + (i + 1) + '</span><span class="art-ornament" aria-hidden="true"></span><span class="art-caption">' + esc(CAPTIONS[p.id] || 'KEREM / 2026') + '</span>' +
      '<span class="art-arrow">' + icon('ArrowUpRight', 18) + '</span></a><div class="project-card-copy"><p class="project-type">' + esc(kinds[p.category] || '') + '</p><h3>' + esc(p.title[LANG]) + '</h3><p>' + esc(p.description[LANG]) + '</p><div class="tag-row">' +
      p.tags.map(function (t) { return '<span>' + esc(t) + '</span>' }).join('') + '</div></div></article>'
  }

  function renderProjects(el) {
    var limit = parseInt(el.getAttribute('data-limit') || '0', 10)
    return load('projects').then(function (list) {
      var items = limit ? list.slice(0, limit) : list
      el.innerHTML = items.map(projectCard).join('')
      // Next.js sürümünde .art-arrow doğrudan svg'ydi; stil aynı kalsın:
      $$('.art-arrow', el).forEach(function (w) { var s = w.firstElementChild; if (s) { s.classList.add('art-arrow'); w.replaceWith(s) } })
    })
  }

  function renderGallery(el) {
    var glimit = parseInt(el.getAttribute('data-limit') || '0', 10)
    return load('gallery').then(function (all) {
      var items = glimit ? all.slice(0, glimit) : all
      var openLabel = (T.gallery || {}).open || ''
      el.innerHTML = '<div class="gallery-grid' + (items.length <= 3 ? ' gallery-grid-few' : '') + '">' + items.map(function (g, i) {
        return '<button type="button" class="gallery-tile ' + esc(g.style) + '" data-i="' + i + '" aria-label="' + esc(openLabel + ': ' + g.title[LANG]) + '">' +
          (g.src ? '<img class="gallery-photo" src="' + esc(imgUrl(g.src)) + '" alt="' + esc(g.title[LANG]) + '" loading="lazy" style="object-position:' + esc(g.position || '50% 50%') + '">' : '') +
          '<span class="gallery-visual-mark">' + String(i + 1).padStart(2, '0') + '</span><span class="gallery-caption"><b>' + esc(g.title[LANG]) + '</b><small>' + esc(g.description[LANG]) + '</small></span><span class="gallery-zoom">' + icon('ArrowUpRight', 17) + '</span></button>'
      }).join('') + '</div>'
      var box
      function close() { if (box) { box.remove(); box = null } }
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close() })
      $$('.gallery-tile', el).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var g = items[+btn.getAttribute('data-i')]
          close()
          box = document.createElement('div')
          box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', g.title[LANG])
          box.innerHTML = '<div class="lightbox-image ' + esc(g.style) + '">' + (g.src ? '<img src="' + esc(imgUrl(g.src)) + '" alt="' + esc(g.title[LANG]) + '">' : '') +
            '<button class="lightbox-close" type="button" aria-label="' + esc((T.form || {}).close || 'Close') + '">×</button><span class="lightbox-title">' + esc(g.title[LANG]) + '<small>' + esc(g.description[LANG]) + '</small></span></div>'
          box.addEventListener('click', close)
          $('.lightbox-image', box).addEventListener('click', function (e) { e.stopPropagation() })
          $('.lightbox-close', box).addEventListener('click', close)
          document.body.appendChild(box)
        })
      })
    })
  }

  function renderBlog(el) {
    return load('posts').then(function (posts) {
      var cats = T.categories || {}, readLabel = (T.blog || {}).read || ''
      var params = new URLSearchParams(location.search)
      var state = { filter: 'all', tag: params.get('tag') || '' }
      var labels = { web: 'WEB / 01', design: 'STUDIO / 02', video: 'MOTION / 03' }
      function draw() {
        var list = state.tag ? posts.filter(function (p) { return p.tags.indexOf(state.tag) > -1 }) : state.filter === 'all' ? posts : posts.filter(function (p) { return p.category === state.filter })
        var chips = ['all', 'design', 'web', 'video'].map(function (k) {
          return '<button type="button" data-f="' + k + '" class="filter-chip' + (!state.tag && state.filter === k ? ' active' : '') + '" aria-pressed="' + (!state.tag && state.filter === k) + '">' + esc(cats[k]) + '</button>'
        }).join('') + (state.tag ? '<button type="button" data-clear="1" class="filter-chip active">#' + esc(state.tag) + ' ×</button>' : '')
        var cards = list.length ? '<div class="post-grid">' + list.map(function (p) {
          return '<article class="post-card"><div class="post-art post-art-' + esc(p.category) + '">' + (p.image ? '<img class="post-cover" src="' + esc(imgUrl(p.image)) + '" alt="" loading="lazy">' : '') + '<span>' + esc(labels[p.category] || '') + '</span><i></i></div>' +
            '<div class="post-meta"><span>' + esc(cats[p.category]) + '</span><time datetime="' + esc(p.date) + '">' + esc(fmtDate(p.date)) + '</time></div><h2>' + esc(p.title[LANG]) + '</h2><p>' + esc(p.excerpt[LANG]) + '</p>' +
            '<div class="tag-row">' + p.tags.map(function (t) { return '<a href="blog.html?tag=' + encodeURIComponent(t) + '">#' + esc(t) + '</a>' }).join('') + '</div>' +
            '<a class="read-link" href="post.html?slug=' + encodeURIComponent(p.slug) + '">' + esc(readLabel) + icon('ArrowUpRight', 15) + '</a></article>'
        }).join('') + '</div>' : '<p class="filter-empty">' + esc((T.form || {}).noTag) + '</p>'
        el.innerHTML = '<div class="blog-filters" aria-label="' + esc((T.form || {}).filter) + '">' + chips + '</div>' + cards
        $$('[data-f]', el).forEach(function (b) { b.addEventListener('click', function () { state.filter = b.getAttribute('data-f'); state.tag = ''; draw() }) })
        var clear = $('[data-clear]', el); if (clear) clear.addEventListener('click', function () { state.tag = ''; draw() })
      }
      draw()
    })
  }

  function ctaHtml() {
    var h = T.home || {}
    return '<section class="contact-cta"><span class="cta-spark">✳</span><p class="eyebrow">' + esc(h.ctaEyebrow) + '</p><h2>' + esc(h.contactTitle) + '</h2><p>' + esc(h.contactText) + '</p><a class="button button-primary" href="contact.html">' + esc(h.contactButton) + icon('ArrowUpRight', 16) + '</a><span class="cta-orbit" aria-hidden="true"></span></section>'
  }
  function renderPost(el) {
    var slug = new URLSearchParams(location.search).get('slug')
    return load('posts').then(function (posts) {
      var post = posts.filter(function (p) { return p.slug === slug })[0]
      var b = T.blog || {}
      if (!post) {
        el.innerHTML = '<div class="not-found"><span>404</span><h1>' + esc((T.form || {}).notFound) + '</h1><a class="inline-link" href="blog.html">' + esc(b.back) + icon('ArrowUpRight', 15) + '</a></div>'
        return
      }
      var cat = (T.categories || {})[post.category] || ''
      document.title = post.title[LANG] + ' — Kerem Aydın'
      var meta = $('meta[name="description"]'); if (meta) meta.setAttribute('content', post.excerpt[LANG])
      el.innerHTML = '<a class="article-back" href="blog.html">' + icon('ArrowUpRight', 15) + esc(b.back) + '</a><div class="article-header"><p class="eyebrow"><span class="eyebrow-line"></span>' + esc(cat) + '</p><h1>' + esc(post.title[LANG]) + '</h1><p class="article-excerpt">' + esc(post.excerpt[LANG]) + '</p><div class="article-meta"><time datetime="' + esc(post.date) + '">' + esc(fmtDate(post.date, true)) + '</time><span>·</span><span>' + esc(post.minutes) + ' ' + esc(b.min) + '</span></div></div>' +
        '<div class="article-art post-art-' + esc(post.category) + '">' + (post.image ? '<img class="post-cover" src="' + esc(imgUrl(post.image)) + '" alt="' + esc(post.title[LANG]) + '">' : '') + '<span>' + esc(cat.toUpperCase()) + '</span><i></i></div>' +
        '<article class="article-body">' + post.sections[LANG].map(function (s) { return '<section><h2>' + esc(s.heading) + '</h2>' + s.paragraphs.map(function (p) { return '<p>' + esc(p) + '</p>' }).join('') + '</section>' }).join('') +
        '<div class="tag-row article-tags">' + post.tags.map(function (t) { return '<a href="blog.html?tag=' + encodeURIComponent(t) + '">#' + esc(t) + '</a>' }).join('') + '</div></article>' + ctaHtml()
    })
  }

  var renderers = { projects: renderProjects, gallery: renderGallery, blog: renderBlog, post: renderPost }
  $$('[data-render]').forEach(function (el) { var fn = renderers[el.getAttribute('data-render')]; if (fn) fn(el) })



  /* ---------- CMS: sayfa metinleri ve eklentiler (seed.js'ten) ---------- */
  var SEED = window.SEED_DATA || {}
  ;(SEED.pageTexts || []).forEach(function (o) {
    if (o.page !== PAGE || o.lang !== LANG || !o.text) return
    var el = document.querySelector(o.selector)
    if (el) el.innerHTML = esc(o.text).replace(/\n/g, '<br>')
  })
  var PLUG = SEED.plugins || {}
  ;[['home_gallery', '.gallery-home'], ['contact_form', '#contact-form'], ['contact_map', '.map-frame'], ['social_links', '.social-links']].forEach(function (p) {
    if (PLUG[p[0]] === false) $$(p[1]).forEach(function (el) { el.classList.add('is-hidden') })
  })

  /* ---------- iletişim ayarları (CMS > Ayarlar) ---------- */
  var settings = Object.assign({}, (window.SEED_DATA || {}).settings || {})
  function telHref(v) { var d = String(v).replace(/[^\d+]/g, ''); if (d.charAt(0) === '+') return d; if (d.indexOf('90') === 0 && d.length >= 12) return '+' + d; return '+90' + d.replace(/^0/, '') }
  function applySettings() {
    $$('[data-setting]').forEach(function (el) {
      var k = el.getAttribute('data-setting'), v = settings[k]
      if (!v) return
      el.textContent = v
      var pre = el.getAttribute('data-prefix')
      if (pre && el.tagName === 'A') el.setAttribute('href', pre + (k === 'phone' ? telHref(v) : v))
    })
    $$('[data-social]').forEach(function (a) { var v = settings[a.getAttribute('data-social')]; if (v && /^https?:\/\//.test(v)) { a.setAttribute('href', v); a.classList.remove('is-hidden') } else a.classList.add('is-hidden') })
  }
  if (HAS_DB) {
    fetch(CFG.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/settings?select=*', { headers: dbHeaders() })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(function (rows) { rows.forEach(function (r) { settings[r.key] = r.value }); applySettings() })
      .catch(function () { applySettings() })
  } else applySettings()

  // Admin sekmesi: KA-CMS bu bilgisayarda çalışıyorsa yerel panele, değilse sitenin /admin/ sayfasına gider
  if (CFG.LOCAL_CMS) $$('[data-admin-link]').forEach(function (a) { a.setAttribute('href', '/cms/') })

  /* ---------- menü, dil bağlantısı ---------- */
  var toggle = $('#menu-toggle'), nav = $('#main-nav')
  if (toggle && nav) {
    function setOpen(open) {
      nav.classList.toggle('is-open', open)
      toggle.setAttribute('aria-expanded', String(open))
      toggle.setAttribute('aria-label', toggle.getAttribute(open ? 'data-close' : 'data-open'))
      $('[data-icon="open"]', toggle).classList.toggle('is-hidden', open)
      $('[data-icon="close"]', toggle).classList.toggle('is-hidden', !open)
    }
    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')) })
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setOpen(false) }) })
  }
  if (PAGE === 'post' || PAGE === 'blog') $$('[data-lang-link]').forEach(function (a) { if (a.getAttribute('href')) a.setAttribute('href', a.getAttribute('href') + location.search) })

  /* ---------- anasayfa: kurt sahnesi + portre ---------- */
  var host = $('#wolf-host')
  if (host && window.initWolfScene) {
    try { window.initWolfScene(host, { sheets: ['../assets/images/wolf-sheet-0.webp', '../assets/images/wolf-sheet-1.webp', '../assets/images/wolf-sheet-2.webp'], poster: '../assets/images/wolf-animation-poster.webp' }); host.classList.remove('wolf-scene-loading') }
    catch (e) { console.warn('WebGL başlatılamadı', e); host.style.background = "#14110f url('../assets/images/wolf-animation-poster.webp') 63% 52% / contain no-repeat" }
  }
  var stage = $('#orb-stage'), orb = $('#orb')
  if (stage && orb) {
    stage.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return
      var b = orb.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5
      orb.style.setProperty('--tilt-x', (-y * 22).toFixed(2) + 'deg'); orb.style.setProperty('--tilt-y', (x * 22).toFixed(2) + 'deg')
      orb.style.setProperty('--shine-x', ((x + 0.5) * 100).toFixed(1) + '%'); orb.style.setProperty('--shine-y', ((y + 0.5) * 100).toFixed(1) + '%')
    })
    stage.addEventListener('pointerleave', function () { orb.style.setProperty('--tilt-x', '0deg'); orb.style.setProperty('--tilt-y', '0deg') })
  }

  /* ---------- iletişim formu ---------- */
  var form = $('#contact-form')
  if (form) {
    var ok = $('#form-ok'), err = $('#form-err'), btn = $('.form-submit', form), F = T.form || {}
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      ok.classList.add('is-hidden'); err.classList.add('is-hidden')
      var d = {}; new FormData(form).forEach(function (v, k) { d[k] = String(v).trim() })
      if (d._honey) { ok.classList.remove('is-hidden'); $('span', ok).textContent = F.ok; return } // bot
      if (!d.name || !d.email || !d.subject || !d.message || !form.checkValidity()) { err.textContent = F.invalid; err.classList.remove('is-hidden'); form.reportValidity && form.reportValidity(); return }
      var label = btn.firstChild.textContent; btn.disabled = true; btn.firstChild.textContent = F.sending
      var jobs = []
      // 1) E-posta (Gmail'ine düşer) — FormSubmit.co
      jobs.push(fetch('https://formsubmit.co/ajax/' + encodeURIComponent(settings.email || CFG.CONTACT_EMAIL || (window.SITE_CONTACT || {}).email), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: d.name, email: d.email, subject: d.subject, message: d.message, _subject: 'Siteden yeni mesaj: ' + d.subject, _replyto: d.email, _template: 'table', _captcha: 'false' }),
      }).then(function (r) { return r.json().catch(function () { return {} }).then(function (j) { if (!r.ok || j.success === 'false' || j.success === false) throw new Error('mail'); return true }) }))
      // 2a) Yerel CMS (bilgisayarında KA-CMS çalışıyorsa "Mesajlar" bölümüne düşer)
      if (CFG.LOCAL_CMS) jobs.push(fetch('/cms/api/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: d.name, email: d.email, subject: d.subject, message: d.message }) }).then(function (r) { if (!r.ok) throw new Error('cms'); return true }))
      // 2b) Veritabanı (Supabase panelindeki "Mesajlar")
      if (HAS_DB) jobs.push(fetch(CFG.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/messages', {
        method: 'POST', headers: dbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ name: d.name, email: d.email, subject: d.subject, message: d.message }),
      }).then(function (r) { if (!r.ok) throw new Error('db'); return true }))
      var settle = function (p) { return p.then(function () { return true }, function () { return false }) }
      Promise.all(jobs.map(settle)).then(function (res) {
        btn.disabled = false; btn.firstChild.textContent = label
        if (res.some(Boolean)) { $('span', ok).textContent = F.ok; ok.classList.remove('is-hidden'); form.reset() }
        else { err.textContent = F.err; err.classList.remove('is-hidden') }
      })
    })
  }
})()
