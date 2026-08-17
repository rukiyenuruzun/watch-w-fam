# FamTime — Teknik Özet

Bu dosya **projede ne var ve nasıl çalışıyor** sorusunu cevaplar.
`docs/proje-plani.md` fikrin kendisini anlatır (ne yapmak istiyoruz);
buradaki metin ise kodun bugünkü hâlini anlatır (ne yaptık, neden böyle).

> Son güncelleme: 17.08.2026 · Taslak sürüm · TR/EN arayüz

---

## 1. Bir bakışta

**Soru:** "Bu filmi ailemle izlersem mahcup olur muyum?"
**Cevap:** Filmin altyazısı taranır, hassas sahneler zaman damgalarıyla
listelenir, hepsi tek bir yüzdeye ve espirili bir hükme dönüşür.

| | |
|---|---|
| Site | Next.js 16.3 (App Router, RSC) + React 19 + Tailwind 4 + TypeScript |
| Veritabanı & üyelik | Supabase (Postgres + Auth + Storage) |
| Analiz servisi | Python 3 (bağımlılıksız, yalnızca stdlib) + isteğe bağlı Ollama |
| Dış servisler | TMDB (katalog), OpenSubtitles (altyazı) |
| Arşiv | 123 analizli film, 3.502 tespit edilmiş olay |
| İçerik kategorisi | 6 tane (aşağıda) |
| Kod büyüklüğü | ~6.000 satır (site + analiz servisi) |
| Test/CI | Yok — doğrulama elle ve ölçümle yapılıyor |

Arşivdeki 3.502 olayın dağılımı, sistemin neyi iyi gördüğünü de gösteriyor:

```
profanity                2852   ← altyazının en iyi gördüğü şey: konuşma
sexual_dialogue           526
sexual_implication         96
short_kiss                 15   ← yalnızca SDH altyazılarda "(KISSES)" varsa
explicit_sexual_content    13   ← yalnızca "(MOANING)" gibi ses notu varsa
```

Buradaki asimetri projenin **en önemli teknik gerçeği**: altyazı konuşmayı
görür, sahneyi görmez. Bunun etrafında kurulmuş üç ayrı telafi mekanizması
var (yaş sınırı tabanı, elle işaretleme, topluluk katkısı) — bkz. §6.

---

## 2. Mimari

Üç ayrı parça var ve birbirlerine **yalnızca Supabase üzerinden** bakıyorlar.
Site Python'u, Python da siteyi tanımaz; ortak dil veritabanı.

```
   ┌──────────────┐        ┌──────────────┐        ┌──────────────────┐
   │   TMDB API   │        │ OpenSubtitles│        │      Ollama      │
   │ katalog/afiş │        │   .srt indir │        │ (isteğe bağlı,   │
   │ yaş sınırı   │        │              │        │  yerelde çalışır)│
   └──────┬───────┘        └──────┬───────┘        └────────┬─────────┘
          │                       │                         │
          │ 1 saat önbellek       │                         │
          ▼                       ▼                         ▼
   ┌─────────────────┐     ┌──────────────────────────────────────────┐
   │  Next.js sitesi │     │        analyzer/  (Python işçi)          │
   │  (RSC, sunucu)  │     │  worker.py → main.py → detectors.py      │
   └────────┬────────┘     └───────────────────┬──────────────────────┘
            │  service_role                    │  service_role (REST)
            ▼                                  ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │                            Supabase                                │
   │  analyses · analysis_requests · comments · watchlists              │
   │  sensitivity_profiles · scene_contributions · scene_votes          │
   │  profiles · friendships     +  Auth (Google/e-posta) + Storage     │
   └───────────────────────────────────────────────────────────────────┘
```

**Neden bu ayrım:** analiz işi dakikalar sürebiliyor ve dış servis kotasına
takılabiliyor. Siteyi bekletmemek için tamamı kuyruğa alınmış durumda —
kullanıcı "analiz et" der, sayfa hemen döner, sonuç birkaç dakika sonra
kendiliğinden düşer.

### Klasör haritası

```
src/app/          sayfalar ve route handler'lar (App Router)
src/components/   arayüz bileşenleri ("use client" olanlar burada)
src/lib/          iş mantığı — puanlama, TMDB, Supabase erişimi, i18n
src/proxy.ts      her istekte Supabase oturumunu tazeler (Next 16'da
                  middleware.ts'in yeni adı)
analyzer/         Python analiz servisi
supabase/         schema.sql — tüm tablolar
data/             altyazılar + analiz JSON yedekleri (git'e GİRMEZ)
docs/             bu dosya + özgün proje planı
```

---

## 3. İçerik modeli

Altı kategori var ve bilerek dar tutuldu (`src/lib/types.ts:2`):

| Kategori | Ne demek |
|---|---|
| `short_kiss` | Kısa öpüşme |
| `long_kiss` | Uzun öpüşme |
| `sexual_dialogue` | Cinsellikten söz eden konuşma |
| `sexual_implication` | Cinsel ima |
| `explicit_sexual_content` | Sahnenin kendisi (çıplaklık/seks) |
| `profanity` | Küfür / argo |

Her tespit bir **olay** (`ContentEvent`): kategori + başlangıç/bitiş saniyesi +
şiddet (1 hafif, 2 orta, 3 yoğun) + güven + iki dilli açıklama + kaynak.

Kaynak dört değerden biri: `subtitle_auto` (otomatik), `user_contribution`
(kullanıcı ekledi), `community_verified` (oylandı), `moderator_verified`.
Arayüzde her sahnenin yanında kaynağı yazar — "bunu makine mi buldu, insan mı"
sorusu hep açıkta.

### Veritabanı tabloları (`supabase/schema.sql`)

| Tablo | İşi | Not |
|---|---|---|
| `analyses` | `tmdb_id → jsonb` analiz sonucu | Şema esnek kalsın diye JSON |
| `analysis_requests` | Analiz kuyruğu | Durum makinesi burada (§5) |
| `comments` | Yorum + "yüzde doğru mu?" oyu | `owner_token` sahiplik |
| `watchlists` | `(token, tmdb_id)` | Anonim de çalışır |
| `sensitivity_profiles` | Kimlik → kategori ağırlıkları | §7 |
| `scene_contributions` | Kullanıcının eklediği sahneler | §8 |
| `scene_votes` | `(katkı, kimlik) → ±1` | Kimlik başına tek oy |
| `profiles` | `auth.users`'ın herkese açık aynası | §10 |
| `friendships` | Tek satır iki yönü tutar | §10 |

**Güvenlik kuralı:** her tabloda RLS **açık, politika yok**. Yani `anon`
anahtarıyla hiçbir tabloya erişilemiyor; tüm okuma/yazma sunucudan ya da
işçiden `service_role` ile yapılıyor (`src/lib/supabase.ts`). Bu modül
kesinlikle `"use client"` bileşenlerine import edilmemeli.

---

## 4. Analiz hattı (altyazı → olaylar)

```
 .srt dosyası
     │
     ▼  srt_parser.py     → Cue(start, end, text) listesi
     │
     ▼  detectors.py      → 95 regex kalıbı (25 küfür + 61 cinsel konuşma
     │                       + 9 ima) + parantez içi ses notları
     │                     her vuruş = Hit(kategori, şiddet, güven)
     ▼  merge_hits()      → aynı kategoride 20 sn'den yakın vuruşlar tek
     │                       olayda birleşir, şiddet = en yükseği
     ▼  (opsiyonel) Ollama → yalnızca konuşma/ima olaylarını yeniden yargılar
     │
     ▼  main.py           → data/analyses/<id>.json + Supabase upsert
```

### Kalıpların şiddet kademesi neden var

Erken sürümde "make love" ile "blowjob" aynı ağırlıktaydı ve **her aşk filmi
"izlenmez" çıkıyordu**. Şimdi cinsel konuşma üçe ayrılıyor
(`analyzer/detectors.py:58`):

- **1** — romantik/örtmeceli (`make love`, `naked`, `seduce`)
- **2** — açıkça seksten söz etme (`have sex`, `condom`, `slept with`)
- **3** — kaba/müstehcen (`blowjob`, `horny`, `porn`)

### Yanlış alarmlara karşı yazılmış özel kurallar

Bunların hepsi arşiv üzerinde ölçülüp eklendi, tahmine dayanmıyor:

- `\bsex\b` kalıbı `own/fair/male/same/opposite...` öneklerini eler — dönem
  filmlerinde "sex" **cinsiyet** demek ("the fair sex").
- `hard-on` tireli hâli şart: "I'm hard on you" cinsel değil.
- `cum` kalıbı `cum laude`'yi dışlar.
- `naked` kalıbı `naked eye`'ı (çıplak göz) dışlar.
- Yalın `touch me` **listede yok**: arşivde 78 kez geçiyor ve neredeyse
  tamamı şiddet/itiraz sahnesi ("Don't touch me!"). Yerine yalnızca
  `never/ever been touched` var.
- `slept with` (geçmiş zaman) sayılır ama `sleep with me` sayılmaz — ikincisi
  çoğunlukla "yanımda yatar mısın" diyen bir çocuk.
- `groans/gasps/grunts` ses notları **asla** cinsel sayılmaz; arşivde en çok
  Zootopia 2'de geçiyorlar. Yalnız `moan` zayıf kanıt sayılır ve ima olur;
  "moaning + grunting" gibi bileşimler güçlü kanıt sayılıp sahne olur.

### Ses notları — altyazının sahneyi ele verdiği tek yer

SDH altyazılarındaki `(MOANING)`, `(KISSES)` gibi parantez içi notlar
`_sound_hit()` ile ayrı işlenir ve konuşmadan **önce** değerlendirilir:
sahnenin kendisine dair kanıt, konuşmadan güçlüdür. Arşivde bunlardan yalnızca
28 tane çıkmış olması (15 öpüşme + 13 sahne), SDH altyazının ne kadar nadir
olduğunu gösteriyor.

### Ollama katmanı (opsiyonel)

`--use-ollama` ile çalıştırılırsa kalıp tabanlı cinsel konuşma/ima olayları
`llama3.2:3b`'ye sorulur. İki önemli ayrıntı (`analyzer/main.py:36`):

1. Modele olayın **etiketi değil gerçek replik** gönderilir. Aksi hâlde model
   kendi ürettiği "Sexually explicit dialogue" yazısını okuyup her olayı en
   yüksek şiddetle onaylıyordu.
2. Model her şeye 3 verme eğiliminde, o yüzden sezgisel şiddetten **en fazla
   bir kademe** sapmasına izin var: `min(3, model, sezgisel + 1)`.
3. Modelin istem şablonunu papağan gibi tekrarladığı durumlar için bir
   `PLACEHOLDER_DESCRIPTIONS` süzgeci var — yoksa sitede açıklama olarak
   "kısa tarafsız Türkçe açıklama" yazısı görünüyordu.

---

## 5. Analiz kuyruğu ve işçi

Kullanıcı film sayfasında "Analiz talep et" der → `analysis_requests`'e satır
düşer. `analyzer/worker.py` bunu görür ve durum makinesini yürütür:

```
requested → searching_subtitle → analyzing → completed
                 │                    │
                 ├─ quota_exceeded ───┤   (1 saat sonra otomatik yeniden dener)
                 ├─ worker_error ─────┤   (10 dk sonra, en fazla 8 kez)
                 └─ subtitle_not_found     (kalıcı; sitede "tekrar dene" var)
```

Site bu durumları film sayfasında ve `/durum` sayfasında gösterir.

**İşçinin öğrendiği dersler (koda gömülü):**

- OpenSubtitles arama parametreleri **alfabetik sıralı** olmalı; değilse API
  301 yönlendirmesi yapıyor ve Python yönlendirmede `Api-Key` başlığını
  düşürüyor.
- Kota dolunca API **406** döndürüyor — bunu "altyazı yok" sanmamak lazım.
- Ağ kesintisi de "altyazı yok" değildir: 06.08 gecesi bir kesinti 10 talebi
  kalıcı olarak düşürmüştü, o yüzden geçici/kalıcı hata ayrımı var.
- İndirmeden **önce** eleme yapılıyor (`plausible_result`): dizi bölümü kalıbı
  (`S01E05`), yıl farkı > 1, başlık benzerliği < 0.5 olanlar atılıyor. Kota
  günlük ve sınırlı, boşa indirme lüksü yok — en fazla 2 aday deneniyor.
- İndirdikten sonra da süre kontrolü var: altyazının son satırı film süresinin
  0.5–1.8 katı aralığında değilse aday reddediliyor.

Çalıştırma:

```bash
python3 analyzer/worker.py --loop 60           # sürekli, 60 sn'de bir bakar
python3 analyzer/worker.py --use-ollama        # dil modeliyle rötuş
python3 analyzer/main.py --tmdb-id 550 --srt film.srt   # tek dosya, elle
```

---

## 6. Puanlama ve hüküm

Bu projenin kalbi `src/lib/score.ts`. **İki ayrı hesap** var ve karıştırılmamalı:

### (a) Kategori barları — tarafsız yoğunluk

```
yük      = Σ şiddet            (her olay 1–3 puan)
yoğunluk = yük / süre(saat)    (uzun film cezalanmasın)
yüzde    = min(100, 100 × yoğunluk / doyma_noktası)
```

Doyma noktaları (`score.ts:18`) kategoriye göre çok farklı, çünkü saatte bir
küfürle saatte bir seks sahnesi aynı şey değil:

| Kategori | Doyma (puan/saat) | Anlamı |
|---|---|---|
| `explicit_sexual_content` | 2.5 | Saatte tek orta sahne bile barı %80'e çıkarır |
| `long_kiss` | 4 | |
| `short_kiss` | 6 | |
| `sexual_implication` | 12 | |
| `sexual_dialogue` | 20 | Aşk filmleri 1–3 p/sa, seks komedileri 25–50 p/sa |
| `profanity` | 30 | Ancak gerçekten yoğunsa yükselir |

### (b) Toplu risk — ağırlıklı ve kişisel

Kategoriler **bağımsız utanç kaynakları** gibi birleşir (olasılıksal VEYA):

```
toplam = 1 − Π (1 − min(1, ağırlık × kişisel_çarpan × yüzde/100))
```

Ortalama alınmıyor, çünkü tek bir seks sahnesini beş masum kategori
sulandırmamalı. Ağırlıklar (`score.ts:36`): `explicit_sexual_content` 2.2,
`sexual_dialogue` 1.0, `long_kiss` 0.8, `sexual_implication` 0.6,
`short_kiss` 0.5, `profanity` 0.4.

Yani "seksten söz edildi" ile "seks sahnesi var" aynı kefeye konmuyor.

### (c) Hüküm — üç katmanlı

Yüzde bir kademeye çevrilir, sonra **iki taban** uygulanır:

```
1) Yüzdeden kademe:   <50 ok · 50–69 risky · 70–89 nope · ≥90 never

2) Yaş tabanı:        film ROMANTİK ve en katı ülke sınırı ≥16 ise
                      "ok" olamaz, en az "risky" olur

3) Elle işaretleme:   known-titles.ts'teki hüküm hesaplanandan AĞIRSA
                      onu ezer (hafifse dokunmaz — taban, tavan değil)
```

**Yaş tabanı neden yalnızca romantik türde?** Kullanıcının kendi ifadesiyle:
*"+18 olup romantik olmayana risky deme, ailem kanlı film izleyebilir."*
Bu site aile yanında **utanma** riskini ölçüyor, kan ölçmüyor. Romantik türde
yüksek yaş sınırı neredeyse her zaman cinsel sahne demek ve o sahnelerde
konuşma olmadığı için altyazı analizi onları göremiyor — After (2019) tam
olarak böyle: konuşmada 4 gönderme var, Fransa'da 16+ ile gösteriliyor.

**Hangi yaş kullanılıyor?** İkisi de, ama farklı yerlerde — ve bu bilinçli:

- **Hüküm tabanı** → ülkeler arasındaki **en katı** sınır (`strictestAge`).
  Görsel içerik çoğu zaman yalnızca katı ülkenin sınırına yansıyor.
- **"Görsel sahne kaçmış olabilir" uyarısı** → **ana ülkenin** sınırı
  (`minAge`). Almanya Yüzüklerin Efendisi'ne 16 veriyor ama gerekçe şiddet;
  o filmde "cinsel sahne kaçmış olabilir" uyarısı çıkarsa uyarı değerini
  yitirir.

### Elle işaretlenen yapımlar (`src/lib/known-titles.ts`)

Bazı yapımlarda içerik zaten herkesçe biliniyor ve altyazı neredeyse hiç
konuşma bırakmıyor. Bunlar altyazıdan bağımsız bir alt sınır alır:

- **After** serisi (5 film) → `nope`
- **Fifty Shades** serisi (3 film) → `nope`
- **365 Gün** serisi (3 film) → `never`
- **Culpa/Fault** serisi — İspanyol aslı (3) + İngiliz uyarlaması (3) → `nope`
- **Gaspar Noé** — yönetmen kuralı + 28 filmlik künye → `never`

Yönetmen için **iki kanal birden** var, çünkü TMDB'nin katalog uç noktaları
ekip bilgisi döndürmüyor: isim kuralı film sayfasında çalışır, filmografi
listesi ise katalog/arama rozetlerini çalıştırır.

Bu filmler analizi olmasa bile risk filtrelerinde ve "sadece analizli"
görünümünde çıkar (`src/app/page.tsx:68`) — hükümleri biliniyor çünkü.

---

## 7. Kişiselleştirme

Her kimlik (girişli kullanıcı ya da anonim çerez) kategori başına bir çarpan
seçebiliyor: **0 önemsemem · 1 normal · 1.5 hassas · 2 çok hassas.** Bu çarpan
doğrudan risk formülüne giriyor, yani **sitenin her yerindeki yüzdeler ve
rozetler kişiye göre yeniden hesaplanıyor** — katalog kartları, raflar,
"rastgele güvenli film" çekilişi dahil.

Küfüre aldırmayan biriyle küfre çok hassas biri aynı filmde farklı hüküm görür.
Tüm çarpanlar 0 ise risk 0 çıkar; "hiçbiri umurumda değil" tam da bu demek.

Ayar `/ayarlar` sayfasında. Profil sayfası herkese açık olduğu için hassasiyet
bilgisi bilerek oraya konmadı — "neye ne kadar duyarlıyım" kişisel bir bilgi.

---

## 8. Topluluk katkıları

Altyazının göremediği sahneleri kullanıcılar ekler, diğerleri 👍/👎 ile oylar
(`src/lib/contributions.ts`):

```
net = 👍 − 👎
net ≥  1  → doğrulanmış sayılır, RİSK HESABINA KATILIR
net ≤ −3  → listeden tamamen düşer
arkadaşının eklediği → oy beklemeden güvenilir sayılır
```

Aynı oya tekrar basmak oyu geri çeker. Silme yetkisi yalnızca ekleyende.
Doğrulanmış katkılar `toVerifiedEvents()` ile normal olay biçimine çevrilip
otomatik analizin olaylarıyla birleştirilir — film sayfası, katalog rozetleri
ve rastgele seçimi hep aynı birleşimi kullanır, yani hiçbir yerde çelişmez.

> Planlanan değişiklik: oy eşiği yerine ileride site sahibine onay isteği
> düşecek (moderatör modeli).

---

## 9. Kimlik ve üyelik

Site **üyeliksiz de tam çalışır**. Kimlik modeli tek bir `token` değerine
indirgenmiş (`src/lib/auth.ts:55`):

```
girişliyse   → token = user.id
değilse      → token = httpOnly anonim çerez (5 yıl, ilk yazma anında üretilir)
```

Yorum sahipliği, izleme listesi, hassasiyet profili ve sahne oyları hep bu tek
değere bağlı. Giriş yapılınca `mergeAnonData()` anonim verileri hesaba taşır
(yorumların sahibi güncellenir, liste `upsert` ile birleştirilir, hassasiyet
profili hesapta yoksa taşınır) ve anonim çerez silinir. **Hiçbir veri
kaybolmaz.**

Giriş Google OAuth ya da e-posta ile; dönüş `src/app/auth/callback/route.ts`.
Oturum tazeleme `src/proxy.ts`'te yapılmak zorunda çünkü Server Component'lar
çerez yazamıyor.

---

## 10. Profiller ve arkadaşlık

Supabase kullanıcı bilgisini `auth.users`'ta tutuyor ve oraya yalnızca
`service_role` erişebiliyor. Arkadaşının adını/fotoğrafını gösterebilmek için
küçük bir ayna tablo var (`profiles`); her girişte ve profil düzenlemede
`syncProfile()` ile tazeleniyor.

Arkadaşlık tek satırda iki yönü birden tutuyor (`friendships`), çift kayıt yok:

```
(requester_id, addressee_id, status)     status: pending | accepted
arkadaşlarım = accepted olan ve iki taraftan biri ben olan satırlar
```

**Davet linki** (`/davet/<kimlik>`) ile ekleniyor — benzersiz kullanıcı adı
zorunluluğu doğmasın diye. Karşı taraf zaten bana istek göndermişse link
tıklandığında **doğrudan arkadaş** oluyoruz (iki taraf da niyetini belli etti).

Arkadaşlığın iki somut karşılığı var:
1. Arkadaşının eklediği sahne oy beklemeden hesaba katılır.
2. Film sayfasında arkadaşların yorumları en üstte görünür.

Herkese açık profil `/kisi/<id>`: ad, fotoğraf, izleme listesi, yorumlar.
Listedeki rozetler **bakanın kendi hassasiyetiyle** hesaplanır.

---

## 11. Katalog katmanı (TMDB)

`src/lib/tmdb.ts` — burada üç tane ölçümle çözülmüş sorun var:

**1. Sayfalama tutarlılığı.** "Daha fazla göster" 1..N sayfalarını **baştan**
çeker. Her sayfanın önbellek süresi kendi ilk çekimiyle başladığı için
1. sayfa tazelenirken 2. sayfa eskide kalabiliyor ve liste kendi içinde
çelişiyordu. Çözüm: saatlik bir "kova" değeri (`_snapshot`) tüm sayfalara aynı
anda yeni önbellek anahtarı verir — liste ya tamamen eski ya tamamen yenidir.
TMDB bilinmeyen parametreyi yok sayar.

**2. Tavan.** `MAX_PAGES = 25` (500 film). Eskiden 10'du ve çok erken
bitiyordu — TMDB'de tek başına komedi türünde 12.800 film var. Maliyet gösterilen
film sayısıyla doğrusal artıyor (ölçüm: 20 film ≈ 0,09 sn render), 25 sayfa
sonunda ~2,5 sn'ye çıkıyor ama bunu yalnızca düğmeye 24 kez basan görür.

**3. Yerel sıralama.** Birleşmiş liste kendi sıralama anahtarına göre yeniden
diziliyor. `popularity.desc` bilerek **yok**: TMDB'nin döndürdüğü popularity
değeri kendi sıralamasıyla uyuşmuyor (ölçüm: 60 filmde 28 konum), yerelde
dizmek listeyi düzeltmek yerine TMDB'ye ters düşürürdü.

Yaş sınırı `release_dates`'ten çıkarılıyor: TR → US → GB → DE → ES → FR
sırasıyla rozet için ilki, hüküm için en katısı seçiliyor. Harf kodları sayıya
çevriliyor (`PG-13` → 13, `R` → 17).

**TMDB anahtarı yoksa** site demo katalogla çalışır, hiçbir sayfa boş kalmaz.

---

## 12. Sayfa haritası

| Yol | Ne yapar |
|---|---|
| `/` | Hero + küratörlü raflar + arama/filtre + katalog ızgarası |
| `/film/[id]` | Künye, backdrop, analiz paneli, sahne listesi, yorumlar |
| `/listem` | İzleme listesi (risksizden riskliye sıralanabilir) |
| `/profil` | Kendi profilim, arkadaşlar, davet linki, yorumlarım, çıkış |
| `/kisi/[id]` | Başkasının herkese açık profili |
| `/ayarlar` | Dil, tema, durum sayfası bağlantısı, hassasiyet profili |
| `/durum` | Analiz kuyruğu ve kota durumu |
| `/giris` | Google / e-posta ile giriş |
| `/rastgele` | Route handler — kişiye göre güvenli bir film seçip yönlendirir |
| `/davet/[id]` | Route handler — arkadaşlık isteği oluşturur |

Üst bar: giriş yapılmışsa **Listem · Ayarlar · Profil** (fotoğraflı),
yapılmamışsa **Ayarlar · Kayıt ol/Giriş yap**.

---

## 13. Arayüz notları

- **Sunucu/istemci ayrımı:** fonksiyonlar bu sınırı geçemiyor, o yüzden i18n
  etiket fonksiyonları sunucuda önceden metne çevrilip client bileşene öyle
  veriliyor.
- **i18n:** tek dosyada iki sözlük (`src/lib/i18n.ts`, ~870 satır), çerezle
  seçiliyor. Yeni metin eklerken TR ve EN bloklarının **ikisine de** eklemek
  gerekiyor — aynı çapa metni iki blokta da geçtiği için `.replace(..., 1)`
  ile eklemeye çalışmak iki kez yanlış bloka yazdı.
- **Tema:** açık/koyu, çerezle, `data-theme` özniteliğiyle.
- **Raf okları** (`ShelfScroller`) gidecek yer yoksa gizleniyor. Not: Chrome
  arka plan sekmelerinde `scroll` olaylarını kısıtlıyor ve `behavior:"smooth"`
  çalışmıyor — otomasyonla test ederken bileşen bozuk görünüyor, değil.
- **Doğrulama tuzağı:** Next, HTML'in sonuna serileştirilmiş bir RSC yükü
  gömüyor. `curl | grep` ile arayüz doğrulamak bu yüzden iki kez yanlış sonuç
  verdi — aranan metin ekranda değil o yükün içinde bulunuyordu.

---

## 14. Kurulum ve çalıştırma

```bash
# 1. Site
npm install
cp .env.example .env.local     # TMDB, OpenSubtitles, Supabase anahtarları
npm run dev

# 2. Veritabanı
#    supabase/schema.sql dosyasını Supabase panelindeki SQL Editor'e yapıştır

# 3. Analiz işçisi
python3 analyzer/worker.py --loop 60

# 4. (opsiyonel) Yerel dil modeli
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:3b
python3 analyzer/worker.py --loop 60 --use-ollama
```

Gereken anahtarlar: `TMDB_API_KEY` **veya** `TMDB_ACCESS_TOKEN`;
`OPENSUBTITLES_API_KEY` + kullanıcı adı/şifre (indirme için üyelik girişi API
kuralı); `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.

Yerel ağdan (telefon vb.) test için `next.config.ts` içinde `allowedDevOrigins`
tanımlı — Next 16 varsayılan olarak localhost dışı origin'leri engelliyor.

**Git'e girmeyenler:** `.env*`, `data/` (altyazılar ve analiz yedekleri).

---

## 15. Bilinen sınırlar

1. **Altyazı sahneyi görmez.** En büyük sınır bu ve gizlenmiyor: arayüzde
   "görsel sahneler kaçmış olabilir" uyarısı çıkıyor. Üç telafi var (yaş
   tabanı, elle liste, topluluk katkısı) ama hiçbiri tam çözüm değil.
2. **Kalıp tabanlı tespit bağlam bilmez.** Ollama katmanı bunu kısmen
   çözüyor ama isteğe bağlı ve yerelde çalışıyor.
3. **Yalnızca İngilizce altyazı** taranıyor.
4. **Sürüm sorunu:** analiz belirli bir altyazı sürümüne göre yapılıyor;
   zaman damgaları başka bir kurguda kayabilir. Hangi sürüm olduğu analizle
   birlikte saklanıyor.
5. **Formül taslak.** Doyma noktaları ve ağırlıklar gerçek veriyle
   ayarlanmaya devam ediyor. Sonuçlar kesin doğru olarak sunulmuyor.
6. **Otomatik test yok.** Doğrulama 123 filmlik arşiv üzerinde elle ölçümle
   yapılıyor — her kalıp değişikliği önce arşivde sayılıyor, sonra ekleniyor.

## 16. Sırada ne var

- `FORCED_TIERS`'ı alt sınır yerine tam ezme yapabilmek (şu an `"ok"`
  yazılamıyor, çünkü hesaplanan hüküm her zaman kazanır).
- `FORCED_DIRECTORS` + filmografi listesini tek yapıya toplamak (kademe şu an
  iki yerde yazılı).
- Moderatör onay akışı (topluluk oyu yerine).
- Kullanılmayan `siteTagline` i18n anahtarını temizlemek, favicon eklemek.
