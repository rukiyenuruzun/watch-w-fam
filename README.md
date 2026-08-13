# 🎬 FamTime — what to watch with family

**"Bu film aileyle izlenir mi?"** sorusunu, film daha açılmadan cevaplayan site.
Bir filmin öpüşme, cinsel içerik, ima ve küfür gibi hassas sahnelerini **zaman
damgalarıyla** önceden gösterir — koltukta mahcup olmayın diye.

> Taslak sürüm · Türkçe & İngilizce

## Ne yapar?

- **Sahneleri önceden söyler.** Her analizli filmde hassas sahnelerin listesi
  vardır: hangi dakikada başlıyor, ne kadar sürüyor, ne kadar yoğun
  (hafif / orta / yoğun) ve kısaca ne oluyor.
- **Tek bakışta hüküm verir.** Sahne yoğunluğu kategori ağırlıklarıyla
  birleşip bir "toplu risk" yüzdesine ve esprili bir hükme dönüşür:
  *Aileyle izlenir 👌 · Riskli — kumanda yakında dursun 😬 · Yoook, izlenmez 🚨 ·
  HAYATTA izlenmez ☠️*
- **Hüküm kişiseldir.** Hassasiyet profilinde her kategori için
  "Önemsemem / Normal / Hassas / Çok hassas" seçilir; yüzdeler ve hükümler
  sitenin her yerinde ona göre yeniden hesaplanır. Küfüre aldırmayan biriyle
  küfüre çok hassas biri aynı filme farklı hüküm görür.
- **Topluluk kör noktayı kapatır.** Otomatik analiz altyazıdan yapıldığı için
  konuşmasız (görsel) sahneleri kaçırabilir. Kullanıcılar eksik sahneyi
  ekler; topluluk 👍/👎 ile doğrular. Doğrulanan sahneler hesaba katılır,
  yanlışlananlar elenir.
- **Katalog ve keşif.** TMDB tabanlı arama (oyuncu/yönetmen dahil), tür / yıl /
  süre / puan / dil / **risk** filtreleri, "Ailece izlenebilir komediler" ve
  "Temiz klasikler" gibi otomatik dolan raflar ve tek tıkla
  **rastgele güvenli film** çekilişi.
- **Kişisel köşe.** İzleme listesi (risksizden riskliye sıralanabilir),
  yorumlar ve "yüzde doğru muydu?" oyları, isteğe bağlı üyelik (Google ya da
  e-posta) ve profil sayfası. Üyeliksiz kullanım da tam çalışır; giriş
  yapılınca anonim veriler hesaba taşınır.
- **Analiz talebi kuyruğu.** Analizi olmayan film tek tıkla kuyruğa girer;
  arka planda altyazısı bulunur, birkaç dakika içinde analiz sayfaya düşer.
  Durum sayfasından kuyruk ve günlük kota izlenir.

## Nasıl çalışır? (kuş bakışı)

1. Film için uygun bir altyazı bulunur (OpenSubtitles).
2. Arka plandaki analiz servisi altyazıyı tarar; hassas sahneleri
   kategorilere ayırıp zaman damgalarıyla kaydeder.
3. Site bu veriden kategori yoğunluklarını, toplu risk yüzdesini ve hükmü
   hesaplar — ziyaretçinin hassasiyet profili ve topluluğun doğruladığı
   sahneler de hesaba katılır.

**Dürüstlük notu:** Sonuçlar taslak bir formülün ve yalnızca altyazı
analizinin ürünüdür; kesin doğru olarak sunulmaz. Her sahnenin yanında
kaynağı yazar (otomatik analiz / kullanıcı katkısı / topluluk doğruladı) ve
görsel sahnelerin kaçabileceği açıkça belirtilir.

## Çalıştırma (kısaca)

Next.js sitesi için `npm install && npm run dev`; gereken anahtarlar
`.env.example` dosyasında listelidir (TMDB, OpenSubtitles, Supabase).
Veritabanı şeması `supabase/schema.sql` ile kurulur; altyazı analiz servisi
`analyzer/` klasöründeki Python işçisidir.

# Rötuş istersen üstüne: curl -fsSL https://ollama.com/install.sh | sh + ollama pull llama3.2:3b, sonra işçiyi --use-ollama ile çalıştırırsın.