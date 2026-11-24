-- =====================================================================
--  Kerem Aydın — site veritabanı (Supabase / PostgreSQL)
--  Supabase panelinde  SQL Editor > New query  kısmına yapıştırıp RUN'a bas.
-- =====================================================================

create table if not exists public.projects (
  id text primary key,
  sort int not null default 0,
  title_tr text not null default '', title_en text not null default '',
  description_tr text not null default '', description_en text not null default '',
  category text not null default 'design' check (category in ('design','web')),
  tags text[] not null default '{}',
  visual text not null default 'sketch',
  image text not null default '',
  logo text not null default ''
);
alter table public.projects add column if not exists logo text not null default '';

create table if not exists public.gallery (
  id bigint generated always as identity primary key,
  sort int not null default 0,
  title_tr text not null default '', title_en text not null default '',
  description_tr text not null default '', description_en text not null default '',
  style text not null default 'gallery-moon',
  src text not null default '',
  focus text not null default '50% 50%'
);

create table if not exists public.posts (
  slug text primary key,
  category text not null default 'web' check (category in ('web','design','video')),
  tags text[] not null default '{}',
  date date not null default current_date,
  minutes int not null default 3,
  title_tr text not null default '', title_en text not null default '',
  excerpt_tr text not null default '', excerpt_en text not null default '',
  content_tr text not null default '', content_en text not null default '',
  image text not null default ''
);

create table if not exists public.settings (
  key text primary key,
  value text not null default ''
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 160),
  subject text not null check (char_length(subject) between 1 and 160),
  message text not null check (char_length(message) between 1 and 4000),
  is_read boolean not null default false
);

-- Güvenlik (RLS): herkes içeriği OKUYABİLİR, sadece giriş yapmış yönetici DEĞİŞTİREBİLİR.
alter table public.projects enable row level security;
alter table public.gallery  enable row level security;
alter table public.posts    enable row level security;
alter table public.messages enable row level security;
alter table public.settings enable row level security;

drop policy if exists "projects herkes okur" on public.projects;
drop policy if exists "projects yonetici" on public.projects;
create policy "projects herkes okur" on public.projects for select using (true);
create policy "projects yonetici" on public.projects for all to authenticated using (true) with check (true);

drop policy if exists "gallery herkes okur" on public.gallery;
drop policy if exists "gallery yonetici" on public.gallery;
create policy "gallery herkes okur" on public.gallery for select using (true);
create policy "gallery yonetici" on public.gallery for all to authenticated using (true) with check (true);

drop policy if exists "posts herkes okur" on public.posts;
drop policy if exists "posts yonetici" on public.posts;
create policy "posts herkes okur" on public.posts for select using (true);
create policy "posts yonetici" on public.posts for all to authenticated using (true) with check (true);

drop policy if exists "settings herkes okur" on public.settings;
drop policy if exists "settings yonetici" on public.settings;
create policy "settings herkes okur" on public.settings for select using (true);
create policy "settings yonetici" on public.settings for all to authenticated using (true) with check (true);

-- İletişim mesajları: ziyaretçi sadece GÖNDEREBİLİR, okuyamaz; yönetici okur/siler.
drop policy if exists "messages herkes gonderir" on public.messages;
drop policy if exists "messages yonetici" on public.messages;
create policy "messages herkes gonderir" on public.messages for insert to anon, authenticated with check (true);
create policy "messages yonetici" on public.messages for all to authenticated using (true) with check (true);

-- Görsel deposu (Storage): "media" adlı herkese açık klasör
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists "media herkes okur" on storage.objects;
drop policy if exists "media yonetici yazar" on storage.objects;
create policy "media herkes okur" on storage.objects for select using (bucket_id = 'media');
create policy "media yonetici yazar" on storage.objects for all to authenticated using (bucket_id = 'media') with check (bucket_id = 'media');

-- Veri API erişim izinleri (Supabase'te "yeni tablolara otomatik erişim" kapalı olsa da çalışsın diye)
grant usage on schema public to anon, authenticated;
grant select on public.projects, public.gallery, public.posts, public.settings to anon;
grant insert on public.messages to anon;
grant all on public.projects, public.gallery, public.posts, public.settings, public.messages to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- =====================  BAŞLANGIÇ İÇERİĞİ (mevcut site içeriği)  =====================
insert into public.projects (id, sort, title_tr, title_en, description_tr, description_en, category, tags, visual, image, logo) values ($q$kara-kalem$q$, 0, $q$Kara Kalem — Kurt Çizimi$q$, $q$Pencil Study — Wolf Illustration$q$, $q$Kurt karakterini kara kalem çiziminden renklendirilmiş son çalışmaya taşıyan illüstrasyon. Form, ışık ve sıcak sarı vurgularla karaktere güçlü bir odak kazandırıyor.$q$, $q$A wolf-character illustration developed from a pencil study into a colored final piece. Form, light and warm yellow accents give the artwork a strong focal point.$q$, $q$design$q$, array[$q$Kara kalem$q$,$q$Photoshop$q$,$q$Renklendirme$q$]::text[], $q$sketch$q$, $q$assets/images/projects/kara-kalem.webp$q$, $q$$q$) on conflict (id) do nothing;
insert into public.projects (id, sort, title_tr, title_en, description_tr, description_en, category, tags, visual, image, logo) values ($q$history-brush$q$, 1, $q$History Brush — Barış Akarsu$q$, $q$History Brush — Barış Akarsu$q$, $q$Photoshop History Brush tekniğini kullanarak arşiv fotoğrafı üzerinde yapılan görsel düzenleme çalışması. Siyah-beyaz tonlar ve portre kompozisyonu, aracın farklı aşamalarını görünür kılıyor.$q$, $q$A Photoshop History Brush study built around an archival portrait. Monochrome tones and the portrait composition make the editing process the focus.$q$, $q$design$q$, array[$q$Photoshop$q$,$q$History Brush$q$,$q$Fotoğraf düzenleme$q$]::text[], $q$history$q$, $q$assets/images/projects/history-brush.webp$q$, $q$$q$) on conflict (id) do nothing;
insert into public.projects (id, sort, title_tr, title_en, description_tr, description_en, category, tags, visual, image, logo) values ($q$smart-object$q$, 2, $q$Smart Object Projesi$q$, $q$Smart Object Project$q$, $q$Photoshop’ta Smart Object (akıllı nesne) mantığıyla hazırladığım bulut ve martı kompozisyonu. Katmanları bozmadan yeniden düzenlenebilen bir akış üzerine kurulu.$q$, $q$A cloud-and-seagull composition built with Photoshop Smart Objects, set up as a non-destructive workflow that can be re-edited without breaking the layers.$q$, $q$design$q$, array[$q$Photoshop$q$,$q$Smart Object$q$,$q$Kompozisyon$q$]::text[], $q$history$q$, $q$assets/images/projects/smart-object.webp$q$, $q$$q$) on conflict (id) do nothing;
insert into public.projects (id, sort, title_tr, title_en, description_tr, description_en, category, tags, visual, image, logo) values ($q$second-brain$q$, 3, $q$İkinci Beyin — Kişisel Sistem$q$, $q$Second Brain — Personal System$q$, $q$Notları, günlük kayıtları, izlenecekleri ve iş takibini bir araya getiren kişisel düzen. Dağınık fikirleri geri bulunabilir ve işe yarar kılar.$q$, $q$A personal system for notes, daily logs, watchlists and work tracking. It turns scattered thoughts into something searchable and useful.$q$, $q$web$q$, array[$q$VS Code$q$,$q$Organizasyon$q$,$q$Kişisel iş akışı$q$]::text[], $q$notes$q$, $q$assets/images/second-brain.webp$q$, $q$$q$) on conflict (id) do nothing;
insert into public.gallery (sort, title_tr, title_en, description_tr, description_en, style, src, focus) values (0, $q$Akdeniz Üniversitesi$q$, $q$Akdeniz University$q$, $q$Gerçekliğe adım attığım ilk yer.$q$, $q$The first place where I stepped into reality.$q$, $q$gallery-villa$q$, $q$assets/images/gallery/akdeniz-universitesi.webp$q$, $q$50% 45%$q$);
insert into public.gallery (sort, title_tr, title_en, description_tr, description_en, style, src, focus) values (1, $q$Patara’da gün batımı$q$, $q$Sunset at Patara$q$, $q$Kaş’tayken Patara Plajı’nda çektim.$q$, $q$Taken on Patara Beach while I was in Kaş.$q$, $q$gallery-moon$q$, $q$assets/images/gallery/patara-gun-batimi.webp$q$, $q$50% 45%$q$);
insert into public.gallery (sort, title_tr, title_en, description_tr, description_en, style, src, focus) values (2, $q$Samsun — memleketim$q$, $q$Samsun — my hometown$q$, $q$Doğduğum şehir. Atatürk Anıtı’nın önünden geçerken hep kökümü hatırlarım.$q$, $q$The city I was born in. Passing the Atatürk Monument always reminds me where I come from.$q$, $q$gallery-moon$q$, $q$assets/images/gallery/samsun-ataturk-aniti.webp$q$, $q$50% 35%$q$);
insert into public.gallery (sort, title_tr, title_en, description_tr, description_en, style, src, focus) values (3, $q$Burada kral biziz$q$, $q$We are the kings here$q$, $q$Çocukluğumdan beri fanatik bir Samsunsporluyum; kırmızı-beyaz tutkum tribünlerde yaşıyor.$q$, $q$I’ve been a die-hard Samsunspor fan since childhood; my red-and-white passion lives in the stands.$q$, $q$gallery-villa$q$, $q$assets/images/gallery/samsunspor-tribun.jpg$q$, $q$56% 50%$q$);
insert into public.gallery (sort, title_tr, title_en, description_tr, description_en, style, src, focus) values (4, $q$Geri dönüşümden bayrak$q$, $q$A flag from recycled waste$q$, $q$Geri dönüşüm atıklarından yapılmış dev bir Türk bayrağı. Fikri ve emeği çok hoşuma gitti.$q$, $q$A giant Turkish flag made from recycled waste. I loved both the idea and the effort behind it.$q$, $q$gallery-desk$q$, $q$assets/images/gallery/geri-donusum-turk-bayragi.jpg$q$, $q$55% 40%$q$);
insert into public.posts (slug, category, tags, date, minutes, title_tr, title_en, excerpt_tr, excerpt_en, content_tr, content_en, image) values ($q$yapay-zeka-ile-kisisel-web-sitesi$q$, $q$web$q$, array[$q$v0$q$,$q$yapay zekâ$q$,$q$web tasarım$q$,$q$Next.js$q$]::text[], $q$2026-11-12$q$, 5, $q$Yapay Zekâ ile Kişisel Web Sitesi Nasıl Yapılır?$q$, $q$Building a Personal Website with AI$q$, $q$Bir fikri ilk taslaktan çalışan kişisel siteye dönüştürürken izlediğim adımlar.$q$, $q$The steps I follow when turning an idea into a working personal website.$q$, $q$## Fikri netleştirmek

Bir web sitesine başlamadan önce renk seçmekten daha önemli bir şey var: ne anlatacağını bilmek. Benim kişisel sitem için çıkış noktası, tasarım ve yazılım ilgimi Kurt Dedektif karakteriyle bir araya getirmekti. Bu küçük hikâye, sitenin görsel yönünü ve tonunu belirlememe yardımcı oldu.

Yapay zekâ araçlarını kullanırken de önce ihtiyacı tarif ediyorum. Kime sesleniyorum, hangi bölümlere ihtiyacım var ve ziyaretçi sayfada ne yapabilmeli? Net cevaplar, sonraki her kararı kolaylaştırıyor.

Bu aşamada bir liste hazırlamak da işimi kolaylaştırıyor: hangi bilgiler mutlaka görünmeli, hangi içerikler daha sonra eklenecek ve hangi ayrıntılar ziyaretçinin karar vermesine yardım edecek? Böylece tasarım, yalnızca güzel görünen bir yüzey değil, belirli bir amaca hizmet eden bir düzen haline geliyor.

## İlk taslaktan sayfaya

v0 ile ilk arayüz taslağını oluşturup sonra gerçek içerik ve sayfa yapısını ekledim. Ana sayfada kısa bir tanıtım, öne çıkan projeler ve galeri önizlemesi bulunuyor. Hakkımda, projeler, galeri, blog ve iletişim bölümleri ise bilgiyi daha düzenli hale getiriyor.

Yapay zekâdan gelen ilk sonuç son ürün değil, üzerinde düşünebileceğim bir başlangıç noktası. Başlıkların hiyerarşisini, aralıkları, mobil görünümü ve metinlerin doğal Türkçe olup olmadığını tek tek kontrol etmek gerekiyor.

İçerik taslağını oluşturduktan sonra her bölümün birbiriyle nasıl konuştuğuna bakıyorum. Proje kartlarından ilgili sayfalara giden bağlantılar, yazılardan kategori filtrelerine ulaşmak ve dil değiştiricinin aynı içeriği koruması, bu akışın küçük ama önemli parçaları.

## Sonuç: insan dokunuşu

Araçlar üretimi hızlandırabilir; neyin doğru hissettirdiğine yine tasarımcı karar verir. Renk paletini, içerik akışını ve küçük etkileşimleri gözden geçirip gerçek cihaz boyutlarında test etmek işin önemli kısmı.

Bu süreç bana iyi bir kişisel sitenin sadece kendini tanıtan bir sayfa olmadığını hatırlattı. Üretim biçimini ve kararların arkasındaki düşünceyi de anlatan yaşayan bir portfolyo.

Yayın öncesi son turda bağlantıları, başlıkları, klavye ile gezinmeyi ve küçük ekrandaki boşlukları yeniden kontrol ediyorum. Geri bildirim geldikçe metinleri ve görsel kararları iyileştirmek de sürecin doğal devamı. Bana göre iyi bir sonuç, ilk fikri korurken bu küçük kontrollerle olgunlaşıyor.$q$, $q$## Start with a clear idea

Before choosing colors, I think about what the site needs to say. For my portfolio, the starting point was bringing my interest in design and development together with the Wolf Detective character. That small story gave the visual direction and tone a foundation.

When using AI tools, I first describe the need. Who am I speaking to, which sections matter, and what should visitors be able to do? Clear answers make every following decision easier.

A short checklist helps at this stage: which information must be visible, what can be added later, and which details will help someone understand the work? That keeps the visual design connected to a purpose instead of becoming decoration on its own.

## From a draft to a site

I used v0 to shape the first interface, then added the real content and page structure. The homepage introduces me, highlights selected projects and previews the gallery. About, projects, gallery, blog and contact pages organize the rest.

An AI-generated first result is not the final product; it is a starting point to think with. Hierarchy, spacing, mobile layouts and natural language all need a careful review.

After the first content pass, I check how each section connects. Links from project cards, category filters on articles and a language switch that keeps the same page are small details, but they make the whole experience feel more considered.

## The human touch

Tools can speed up production, but a designer still decides what feels right. Reviewing the palette, content flow and small interactions, then testing at real screen sizes, remains essential.

This process reminded me that a good personal website is more than a page that introduces you. It is a living portfolio that also shows how you work and the thinking behind your decisions.

Before launch, I make another pass over links, headings, keyboard navigation and spacing on smaller screens. Feedback can lead to more careful copy and visual choices. To me, a strong result keeps the original idea intact while gaining confidence through these small checks.$q$, '') on conflict (slug) do nothing;
insert into public.posts (slug, category, tags, date, minutes, title_tr, title_en, excerpt_tr, excerpt_en, content_tr, content_en, image) values ($q$story-tasariminda-tekrar-kullanilabilir-sistem$q$, $q$design$q$, array[$q$Instagram$q$,$q$Photoshop$q$,$q$Story$q$,$q$tasarım$q$]::text[], $q$2026-11-08$q$, 4, $q$Instagram Story Tasarımında Tekrar Kullanılabilir Sistem$q$, $q$A Reusable System for Instagram Story Design$q$, $q$Villa tanıtım içeriklerinde tutarlı, okunaklı ve hızlı üretilebilir bir düzen kurmak.$q$, $q$Creating a consistent, readable and repeatable layout for villa features.$q$, $q$## Tekrarlanan ihtiyacı görmek

Bir villa için Story hazırlarken aynı tür bilgiler tekrar tekrar karşımıza çıkıyor: villa adı, konum, kişi kapasitesi ve müsaitlik bilgisi. Her görseli sıfırdan tasarlamak hem vakit alıyor hem de markanın görünümünde küçük farklılıklar yaratabiliyor.

Önce içerik sırasını belirlemek işe yarıyor. İzleyicinin ilk bakışta neyi görmesi, sonra hangi bilgiyi okuması gerektiğini düşünerek düzenin iskeletini kuruyorum.

Bu düzeni kurarken içerik sahibinden gelen bilgileri tek tek doğrulamak önemli. Tasarım güzel görünse bile yanlış tarih veya eksik özellik kullanıcıyı yanıltabilir. Net bir içerik listesi, hem üretim sırasında tekrar tekrar soru sormayı azaltıyor hem de son kontrolde hata bulmayı kolaylaştırıyor.

## Şablon değil, sistem

Tekrar kullanılabilir bir yapı kurmak, her görseli birbirinin aynısı yapmak demek değil. Yazı stilleri, kenar boşlukları ve marka renkleri sabit kalırken fotoğrafın ışığı ve kompozisyonu tasarıma karakter katabiliyor.

Photoshop’ta katmanları ve metin alanlarını adlandırmak, bir sonraki düzenlemede işleri kolaylaştırıyor. 9:16 ölçüsünde tasarlarken önemli metinleri kenarlardan uzak tutmak ve telefonda okunabilirliği kontrol etmek de önemli.

Birden fazla Story aynı seride yayınlanacaksa başlık boyutlarını ve bilgi bloklarını tutarlı bırakıyorum. Böylece görseller arasında dolaşan kişi her seferinde yeni bir düzeni çözmek zorunda kalmıyor; dikkatini fotoğrafa ve villanın özelliklerine verebiliyor.

## Tutarlılık güven verir

Son kontrolde görseli telefon ekranında inceliyor, metin yoğunluğunu ve kontrastı kontrol ediyorum. Bir Story’nin görevi yalnızca güzel görünmek değil, bilgiyi doğru ve rahat biçimde aktarmak.

İyi bir sistem zamandan tasarruf sağlarken markanın tanınmasını da kolaylaştırıyor. Bence başarılı sosyal medya tasarımında bu iki hedef birbirini tamamlıyor.

Küçük bir tasarım kontrol listesi burada yardımcı oluyor: metin güvenli alanda mı, fotoğrafın üzerinde yeterli kontrast var mı, konum ve müsaitlik bilgisi ilk bakışta seçiliyor mu? Bu sorulara yanıt vermek, son çıktının hem estetik hem de kullanışlı kalmasını sağlıyor.$q$, $q$## Notice the repeating need

Villa Stories often need the same information: a property name, location, guest capacity and availability. Designing each graphic from scratch takes time and can introduce small inconsistencies in the brand’s look.

I start by deciding the information order. What should a viewer notice first, and what should they read next? That becomes the foundation of the layout.

I also verify the details provided for each property. A polished graphic is not useful if a date is wrong or a feature is missing. A clear content checklist reduces repeated questions during production and makes the final review more reliable.

## A system, not a template

A reusable structure does not mean every graphic has to look identical. Typography, margins and brand colors can stay consistent while each photo’s light and composition bring its own character.

Naming layers and text areas in Photoshop makes the next edit easier. For a 9:16 format, key text should stay away from the edges and remain readable on a phone screen.

When several Stories belong to one series, I keep headline sizes and information blocks consistent. Viewers do not have to decode a new layout each time, so they can focus on the image and the property itself.

## Consistency builds trust

For the final review, I check the design on a phone and look at text density and contrast. A Story should not only look good; it should communicate clearly and comfortably.

A thoughtful system saves time and makes a brand easier to recognize. In my view, those two goals support each other in effective social design.

A short checklist helps: is the text within safe margins, does it contrast with the photograph, and can viewers quickly spot the location and availability? Answering those questions keeps the final piece both attractive and practical.$q$, '') on conflict (slug) do nothing;
insert into public.posts (slug, category, tags, date, minutes, title_tr, title_en, excerpt_tr, excerpt_en, content_tr, content_en, image) values ($q$bir-videoyu-dikey-ve-yatay-formata-uyarlamak$q$, $q$video$q$, array[$q$video kurgu$q$,$q$ffmpeg$q$,$q$Reels$q$,$q$animasyon$q$]::text[], $q$2026-11-03$q$, 4, $q$Bir Videoyu Dikey ve Yatay Formata Uyarlamak$q$, $q$Adapting One Video for Vertical and Horizontal Formats$q$, $q$Aynı hikâyeyi farklı ekranlarda iyi anlatmak için kurguda nelere dikkat ediyorum?$q$, $q$What I consider when telling the same story across different screen shapes.$q$, $q$## Kadrajı baştan düşünmek

Bir videoyu 16:9 yatay formattan 9:16 dikey formata çevirmek yalnızca kırpmak değildir. Ana konu, yazılar ve hareket farklı bir alana taşınır. Çekim aşamasında ana aksiyonu güvenli bir bölgede tutmak, sonradan uyarlama yapmayı kolaylaştırır.

Dikey videoda telefon arayüzü de görüntünün bir parçası gibi düşünülmeli. Üst ve alt bölümlere çok yakın yerleştirilen yazılar uygulama düğmelerinin altında kalabilir.

Kurguya başlamadan önce kaynak görüntüleri her iki oranda da inceliyorum. Önemli hareketin kenarlara çok yakın olup olmadığını ve konu için çevrede yeterli boşluk kalıp kalmadığını bilmek, hangi planların yeniden kadrajlanabileceğini gösteriyor.

## Hikâyenin ritmini korumak

Farklı oranlar için aynı kurguyu kullanmak yerine her formatın ritmine yeniden bakıyorum. Yatay versiyonda mekânı anlatan geniş planlar işe yararken, dikey versiyonda daha yakın ve net bir odak gerekebiliyor.

Logo animasyonlarında da markanın görünür kalacağı alanı önceden belirlemek önemli. Geçişlerin süresi ve müzik vuruşları değişse bile videonun temel duygusu aynı kalmalı.

Dikey versiyon daha hızlı başlamaya ihtiyaç duyabilir; izleyicinin dikkatini ilk saniyelerde yakalamak gerekir. Yatay versiyonda ise bir mekânın atmosferini kurmak için daha uzun bir açılış planı anlamlı olabilir. İki düzenleme de aynı hikâyeye hizmet eder, fakat anlatım temposu değişebilir.

## Dışa aktarmadan önce

Son aşamada videoyu telefonda ve geniş ekranda izliyorum. Metinlerin taşmadığını, önemli anların kadraj dışında kalmadığını ve ses seviyesinin dengeli olduğunu kontrol ediyorum.

Tek kaynaktan farklı formatlar üretmek, her kanala uygun düşünmeyi gerektiriyor. Birkaç dakikalık bu kontrol, içeriğin nerede izlenirse izlensin daha özenli hissettirmesini sağlıyor.

Dışa aktarma ayarlarını da her kanal için ayrıca gözden geçiriyorum. Görüntü oranı, çözünürlük ve ses biçimi doğru değilse iyi bir kurgu bile ekranda beklenen sonucu vermeyebilir. Dosyaları adlandırıp sürümlerini düzenli tutmak, teslim sırasında karışıklık yaşanmasını önlüyor.$q$, $q$## Think about framing early

Turning a 16:9 landscape video into 9:16 is more than cropping. The subject, titles and motion all move into a different space. Keeping the main action in a safe area while shooting makes later adaptations easier.

In vertical video, the phone interface is part of the viewing context. Text too close to the top or bottom can sit underneath app controls.

Before editing, I review the source footage in both ratios. I look for subjects too close to an edge and whether there is enough breathing room around the action. That makes it easier to see which shots can be reframed without losing what matters.

## Keep the story’s rhythm

Rather than using the exact same edit for every ratio, I review the rhythm for each format. Wide establishing shots can work well in landscape, while a vertical cut may need a closer, clearer focus.

For logo animation, it helps to decide in advance where the brand should stay visible. Transitions and music timing can change while the core feeling remains consistent.

A vertical version may need a quicker opening to meet the viewer’s attention in the first seconds. A landscape version can take longer to establish a place and its atmosphere. Both edits can tell the same story while using a different pace.

## Before export

I watch the finished video on both a phone and a larger screen. I check that titles stay in frame, key moments are visible and audio levels feel balanced.

Creating multiple formats from one source means thinking about each channel. A few minutes of review helps the content feel considered wherever it is watched.

I also review export settings for each destination. The wrong aspect ratio, resolution or audio format can undermine an otherwise thoughtful edit. Clear file names and organized versions make the final handoff simpler and prevent confusion.$q$, '') on conflict (slug) do nothing;
insert into public.settings (key, value) values ($q$band_tr$q$, $q$Kişisel illüstrasyon, fotoğraf düzenleme ve web projeleri üzerinde çalışıyorum.$q$) on conflict (key) do nothing;
insert into public.settings (key, value) values ($q$band_en$q$, $q$Working on personal illustration, photo editing and web projects.$q$) on conflict (key) do nothing;
insert into public.settings (key, value) values ($q$phone$q$, $q$0543 498 25 11$q$) on conflict (key) do nothing;
insert into public.settings (key, value) values ($q$email$q$, $q$kerem.aydn555@gmail.com$q$) on conflict (key) do nothing;
insert into public.settings (key, value) values ($q$address$q$, $q$Antalya, Türkiye$q$) on conflict (key) do nothing;
insert into public.settings (key, value) values ($q$instagram$q$, $q$$q$) on conflict (key) do nothing;
insert into public.settings (key, value) values ($q$linkedin$q$, $q$$q$) on conflict (key) do nothing;
insert into public.settings (key, value) values ($q$github$q$, $q$$q$) on conflict (key) do nothing;
