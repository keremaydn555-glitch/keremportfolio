/* ============================================================
   VERİTABANI AYARI (Supabase)
   Kurulum rehberi: VERITABANI-KURULUM.md
   İki değeri Supabase > Project Settings > API sayfasından kopyala.
   BOŞ BIRAKIRSAN site yedek içerikle (seed.js) çalışır.
   ANON KEY herkese açık bir anahtardır, buraya yazılması güvenlidir;
   asıl koruma Supabase'deki RLS kurallarıdır (supabase-kurulum.sql).
   ============================================================ */
window.SITE_CONFIG = {
  SUPABASE_URL: 'https://zdlsxqoaafydvprtjira.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_FL4j5fXwGDV-YNPREMBoBA_J7rXkZqa',
  // İletişim formu e-postası (FormSubmit.co üzerinden Gmail'ine düşer)
  CONTACT_EMAIL: 'kerem.aydn555@gmail.com',
}
