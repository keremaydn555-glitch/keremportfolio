# Kerem Aydın — Statik site (HTML / CSS / JS)

GitHub Pages'te yayınlanır, içerik Supabase veritabanından gelir. Framework / derleme adımı yoktur.

```
index.html        → dile göre tr/ veya en/'e yönlendirir
tr/  en/          → index, about, skills, projects, gallery, blog, post, contact
admin/            → yönetim paneli (CMS)
assets/css        → style.css
assets/images     → kare sayfaları (wolf-sheet-*.webp), proje görselleri
assets/js         → config.js (veritabanı ayarı), site.js, wolf-scene.js (3D kurt), seed.js (yedek içerik)
supabase-kurulum.sql  → veritabanı kurulumu
VERITABANI-KURULUM.md → adım adım kurulum
tools/            → siteyi yeniden üreten betikler (isteğe bağlı)
```

## Yerelde açmak (VS Code)
VS Code'da klasörü aç → **Live Server** eklentisi ile `index.html` → "Open with Live Server".
(Terminal: `python -m http.server 8000` → http://localhost:8000)
> `index.html`'e çift tıklayıp doğrudan açarsan da çalışır (3D karakter dahil); Supabase, form ve Google Maps için internet gerekir. Admin paneli ve form gönderimi için siteyi GitHub Pages'te veya Live Server'da açmak daha güvenilirdir.

## İletişim bilgileri
Telefon, e-posta ve adres `tr/contact.html` ile `en/contact.html` içindedir. Form e-postası `assets/js/config.js` → `CONTACT_EMAIL`.
