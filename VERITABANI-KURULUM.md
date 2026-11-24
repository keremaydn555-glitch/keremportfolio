# Veritabanı (Supabase) + GitHub Pages kurulum rehberi

GitHub Pages sadece **statik dosya** yayınlar; JSON dosyasına yazamaz. Bu yüzden içerik (yazılar, projeler,
galeri, mesajlar, görseller) **Supabase** adlı ücretsiz bir veritabanında tutulur. Site ve admin paneli
tarayıcıdan doğrudan Supabase ile konuşur.

> Supabase'i hiç kurmasan da site çalışır: `assets/js/seed.js` içindeki yedek içeriği gösterir.
> Sadece admin paneli ve veritabanına kayıt için Supabase gerekir.

## 1) Supabase projesi aç (≈5 dk)
1. https://supabase.com → **Start your project** → GitHub ile giriş yap.
2. **New project**: ad `kerem-site`, güçlü bir veritabanı şifresi seç (bir yere not al), bölge olarak **Frankfurt** seç.
3. Proje hazır olunca soldan **SQL Editor → New query**.
4. `supabase-kurulum.sql` dosyasının **tamamını** yapıştır → **RUN**.
   Bu; tabloları (projects, gallery, posts, messages), güvenlik kurallarını (RLS), görsel deposunu (`media`)
   ve mevcut site içeriğini kurar. **SQL'i sadece bir kez çalıştır** (tekrar çalıştırırsan galeri kayıtları çoğalır).

## 2) Admin kullanıcısı oluştur
1. Soldan **Authentication → Users → Add user → Create new user**.
2. Kendi e-postanı ve şifreni yaz, **Auto Confirm User** kutusunu işaretle.
3. **Authentication → Sign In / Providers → Email** altında **"Allow new users to sign up" kapalı** olsun
   (kimse kendine hesap açıp panele giremesin).

## 3) Anahtarları siteye yaz
1. **Project Settings → API** sayfasında iki değeri kopyala:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** key
2. `assets/js/config.js` dosyasını aç, boş alanlara yapıştır:
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...',
   ```
   anon key **gizli değildir**, sitede görünmesi normaldir. Güvenliği RLS kuralları sağlar:
   herkes içeriği okuyabilir, **sadece giriş yapan sen** değiştirebilirsin; ziyaretçi sadece mesaj gönderebilir.
   (**service_role** anahtarını ASLA buraya yazma.)

## 4) GitHub Pages'e yayınla
1. GitHub'da yeni repo aç (ör. `kerem-site`), bu klasörün **içindekileri** (index.html, tr/, en/, admin/, assets/ ...) yükle.
2. Repo → **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root)** → Save.
3. 1-2 dk sonra site `https://KULLANICI-ADIN.github.io/kerem-site/` adresinde açılır.
   Admin paneli: `.../admin/`

## 5) İlk kullanım
- `/admin/` aç → Supabase'te oluşturduğun e-posta/şifre ile gir.
- **Blog / Projeler / Galeri**: kaydı seç, düzenle, **Kaydet**. Değişiklik siteye anında yansır (yeniden yayın gerekmez).
- **Görseller**: yükle; blog kapağı, proje ve galeri alanlarında "Görsel seç" ile kullan.
- **Mesajlar**: iletişim formundan gelenler burada listelenir.
- **Ayarlar**: telefon, e-posta, adres ve sosyal medya bağlantıları (boş bıraktığın sosyal simge sitede gizlenir).
- **Projeler**: her projede isteğe bağlı **Logo** alanı vardır (şeffaf PNG önerilir, kartın ortasında görünür).

## İletişim formu (e-posta)
Form iki yere gönderir: (1) **kerem.aydn555@gmail.com**'a e-posta (FormSubmit.co üzerinden), (2) veritabanındaki **Mesajlar**.
**İlk kez** form gönderdiğinde Gmail'ine FormSubmit'ten bir **"Activate"** e-postası gelir; bağlantıya tıkla.
Sonrası otomatik çalışır (spam klasörünü de kontrol et). Bu adımı kendin bir deneme mesajıyla yap.

## Sık sorulanlar
- **Panel "Veritabanı bağlı değil" diyor:** config.js'e URL/key yazılmamış.
- **Giriş olmuyor:** Users'ta "Auto Confirm" işaretli mi? E-posta/şifre doğru mu?
- **Kaydederken "row-level security" hatası:** SQL'in tamamı çalışmamış, 1. adımı tekrar çalıştır.
- **İçerik değişmiyor:** tarayıcıda Ctrl+F5.
- **İngilizce/Türkçe:** her kayıtta iki dil için ayrı alanlar vardır.
