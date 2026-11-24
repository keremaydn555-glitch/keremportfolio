# Kerem Aydın — Site + KA-CMS (tek klasör)

```
(bu klasör)
├─ index.html, tr/, en/, admin/, assets/   ← web sitesi (GitHub Pages'te yayınlanan)
├─ cms/                                    ← KA-CMS (yönetim paneli sunucusu)
├─ BASLAT.bat  /  baslat.sh                ← CMS'i başlatır
└─ README.md, VERITABANI-KURULUM.md
```
Tek klasör, tek zip: hepsini GitHub'a yükleyebilirsin. `cms` klasöründe şifre/mesaj YOKTUR; onlar
bilgisayarında `C:\Users\<sen>\.ka-cms` klasöründe ayrı tutulur ve GitHub'a gitmez.

## 1) CMS'i çalıştırma
1. **Node.js** kurulu olmalı (nodejs.org → LTS). Kontrol: terminalde `node -v`.
2. **BASLAT.bat**'a çift tıkla (VS Code'da: terminal → `node cms/server.js`).
3. Tarayıcı `http://localhost:3000/cms/` adresini açar.
4. **İlk açılışta** hesabını oluşturursun: **e-posta** ve **şifre** (en az 8 karakter). Sonraki girişlerde aynısını yazarsın.
5. Siteyi bu bilgisayarda görmek için `http://localhost:3000/`. Menüdeki **Admin** sekmesi (İletişim'in yanında) panele götürür.
6. Kapatmak için siyah pencerede `Ctrl+C`.

## 2) Panel bölümleri
| Bölüm | Ne yapar |
|---|---|
| Panel | Özet sayılar, son yazılar |
| Yazılar | Blog yazıları: başlık, kategori, etiket, kapak fotoğrafı, TR/EN içerik |
| Kategoriler ve Etiketler | Kategori ve etiket listesi, yazı sayıları |
| Sayfalar | Anasayfa, Hakkımda, Projeler, Galeri, Blog, İletişim metinleri (TR/EN) |
| Projeler / Galeri | Kart ekle, sil, sırala, görsel ata |
| Medya | Görsel yükle (büyükler otomatik küçültülür) |
| Mesajlar | İletişim formundan gelenler (CMS açıkken) |
| Eklentiler | Galeri örnekleri, iletişim formu, harita, sosyal simgeler aç/kapat |
| Ayarlar | Telefon, e-posta, adres, sosyal medya bağlantıları |

Değişiklikten sonra sağ üstteki **Kaydet**'e bas. CMS `assets/js/seed.js` dosyasını günceller; site içeriğini oradan okur.

## 3) Admin sekmesi
Menüde **İletişim**'in yanında **Admin** var.
- CMS bu bilgisayarda çalışırken (localhost) → doğrudan KA-CMS giriş ekranı.
- GitHub'daki canlı sitede → `/admin/`: Supabase bağlıysa e-posta + şifre girişi, değilse yerel CMS'in nasıl açılacağını anlatan sayfa.

## 4) GitHub'da yayınlama
1. CMS'te değişiklikleri yap, **Kaydet**.
2. GitHub'da repoya gir → **Add file → Upload files**.
3. Bu klasörün **içindekilerin hepsini** (Ctrl+A) sürükle → **Commit changes**.
4. 1-2 dk sonra `https://KULLANICI.github.io/REPO/` güncellenir (Ctrl+F5).

## 5) Vize için (PDF kriterleri)
| Ders isteği | Nerede |
|---|---|
| Anasayfa: hakkımda, projeler, galeri örnekleri | Anasayfa |
| Hakkımda: vesikalık, eğitim, ilgi alanı, yetenek | Hakkımda + Yetenekler |
| Projeler / Galeri | Projeler, Galeri |
| Blog: 3 yazı, kategori + etiket | Blog (panelde Yazılar, Kategoriler ve Etiketler) |
| İletişim: adres, telefon, form, harita | İletişim |
| TR / EN, responsive | Sağ üstte TR/EN; telefon/tablet uyumlu |
| Yönetici paneli: sayfalar, yazılar, eklentiler | Panelde **Sayfalar**, **Yazılar**, **Eklentiler** |
| Alan adı + hosting | GitHub Pages (ücretsiz) |

**Rapor ekran görüntüleri:** panelde Sayfalar, Yazılar, Kategoriler ve Etiketler, Eklentiler.
**YouTube videosu:** panele giriş yap → Sayfalar, Yazılar, Eklentiler → siteyi aç, sayfaları gez → TR/EN geç.

## 6) Sorun giderme
- **"Node.js bulunamadı":** nodejs.org'dan LTS kur, BASLAT.bat'ı tekrar çalıştır.
- **Port dolu:** CMS 3001, 3002... dener; siyah pencerede yazan adresi aç.
- **Şifreyi unuttum:** `C:\Users\<sen>\.ka-cms\admin.json` dosyasını sil, CMS'i yeniden başlat, yeni e-posta ve şifre belirle.
- **GitHub'da eski görünüyor:** Ctrl+F5; Actions'ta yeşil tik var mı bak.

## 7) Supabase (yedek yol)
`assets/js/config.supabase.js` içeriğini `assets/js/config.js`'e kopyala ve `VERITABANI-KURULUM.md`'ye bak. Varsayılan ayar Supabase'siz çalışır.
