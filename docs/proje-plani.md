# Proje Özeti: Yetişkinler İçin Film İçerik Analiz Platformu

> Kaynak: `aileyle-ne-izlenir.docx` (5 Ağustos 2026). Bu dosya projenin
> kuruluş planıdır; docx'ten metin olarak aktarılmıştır.

## Projenin amacı

Bu projenin amacı, yetişkinlerin aileleriyle veya yakın çevreleriyle izleyecekleri filmleri seçerken özellikle rahatsız olabilecekleri içerikleri önceden görebilmelerini sağlamaktır.

Platform klasik anlamda "çocuklara uygun film" veya "aile filmi" değerlendirmesi yapmayacaktır. Korku, aksiyon, kavga veya filmin genel türü ana değerlendirme konusu olmayacaktır.

Asıl odak şu içeriklerdir:

- Öpüşme sahneleri
- Cinsel içerikli sahneler
- Cinsel imalar
- Cinsellik içeren konuşmalar
- Küfür ve argo kullanımı
- Kullanıcıların sonradan ekleyebileceği diğer hassas içerikler

Kullanıcı bir filme tıkladığında yalnızca genel bir puan değil, hangi tür içeriklerin ne kadar bulunduğunu ve mümkün olduğunda hangi zaman aralıklarında geçtiğini görecektir.

## Temel kullanıcı ihtiyacı

Bugün IMDb, Letterboxd ve TMDB gibi platformlar filmin türünü, oyuncularını, açıklamasını ve puanını gösterir. Ancak bir filmi yetişkin aile üyeleriyle izlemek isteyen kişilerin ihtiyaç duyduğu ayrıntılı sahne bilgilerini çoğunlukla vermez.

Bu proje şu soruya cevap vermeyi hedefler:

> Bu film genel olarak iyi veya kötü mü değil; bizim birlikte izlerken rahatsız olabileceğimiz hangi içerikleri barındırıyor?

## Platform nasıl görünecek?

Site, Letterboxd veya IMDb benzeri bir film kataloğu şeklinde çalışacaktır.

Kullanıcılar:

- Film arayabilecek
- Film afişlerini ve temel bilgileri görebilecek
- Bir filmin detay sayfasına girebilecek
- Film türü, açıklaması, süresi ve oyuncularını görebilecek
- Özel içerik analizlerini inceleyebilecek
- Analiz bulunmayan filmler için analiz talep edebilecek
- Yanlış veya eksik sonuçlara katkıda bulunabilecek

Film sayfaları tek tek manuel olarak oluşturulmayacaktır. Film adı, afiş, açıklama, tür, yıl ve oyuncu bilgileri TMDB üzerinden otomatik alınacaktır.

Örnek film sayfası:

    Film adı: Örnek Film
    Tür: Dram, Romantik
    Süre: 124 dakika

    Öpüşme: 3 sahne
    Cinsel ima: 2 konuşma
    Açık cinsel içerik: Yok
    Küfür: 18 kullanım

    00:24:12–00:24:20 — Kısa öpüşme
    00:51:30–00:51:46 — Cinsel ima içeren konuşma
    01:16:05–01:16:28 — Uzun öpüşme

## Puanlama sistemi

İlk aşamada tek bir "aileye uygunluk yüzdesi" oluşturmak zorunlu değildir. Bunun yerine içerikler ayrı ayrı gösterilecektir.

Örneğin:

- Öpüşme: 3/10
- Cinsel konuşmalar: 2/10
- Cinsel imalar: 4/10
- Küfür: 6/10

Bunun yanında gerçek adetler de gösterilebilir:

- 4 kısa öpüşme
- 1 uzun öpüşme
- 3 cinsel ima içeren konuşma
- 27 küfür kullanımı

İlerleyen aşamada kullanıcılar kendi hassasiyetlerini seçebilir. Böylece aynı film farklı kullanıcılara farklı bir uygunluk puanı verebilir.

Örneğin bir kullanıcı öpüşmeye daha fazla, başka bir kullanıcı küfre daha fazla ağırlık verebilir.

## Veriler nereden gelecek?

Platform dört temel veri kaynağını kullanacaktır.

### 1. TMDB

TMDB film kataloğu için kullanılacaktır.

Buradan şu bilgiler alınacaktır: film adı, orijinal adı, afiş, açıklama, tür, yayın yılı, süre, oyuncular, yönetmen, fragman, IMDb kimliği.

TMDB film dosyası veya sahne analizi sağlamaz. Yalnızca katalog ve temel film bilgileri için kullanılacaktır.

### 2. Altyazı kaynakları

OpenSubtitles veya benzeri altyazı servisleri kullanılarak filmlerin SRT/VTT altyazıları bulunacaktır.

Altyazılar şu içeriklerin analizinde kullanılacaktır: küfür, argo, açık cinsel ifadeler, cinsellik içeren konuşmalar, cinsel imalar ve bu konuşmaların zamanları.

Altyazı zaten zaman damgaları içerdiği için tespit edilen konuşmaların yaklaşık film zamanı doğrudan çıkarılabilir.

### 3. Otomatik metin analizi

Küfürler basit kelime listeleri ve kurallarla tespit edilebilir.

Cinsel ima ve bağlam gerektiren konuşmalar ise bir dil modeliyle analiz edilebilir. İlk aşamada bu model ücretli bir API olmak zorunda değildir. Ollama üzerinden bilgisayarda çalışan açık kaynak bir model kullanılabilir.

Modelden serbest metin yerine yapılandırılmış sonuç alınacaktır:

    {
      "category": "sexual_implication",
      "startSeconds": 2532,
      "endSeconds": 2548,
      "severity": 2,
      "confidence": 0.81,
      "description": "Birlikte gece geçirmeye yönelik cinsel ima bulunuyor."
    }

### 4. Topluluk katkıları

Öpüşme veya sessiz gerçekleşen görsel sahneler altyazıdan her zaman bulunamaz. Bu nedenle ilk sürümde görsel sahneler kullanıcı katkısıyla oluşturulabilir.

Kullanıcı şu bilgileri ekleyebilir: içeriğin kategorisi, başlangıç zamanı, bitiş zamanı, yoğunluk seviyesi, kısa açıklama, izlediği sürüm veya platform.

Diğer kullanıcılar bu bilgiyi doğrulayabilir veya yanlış olarak işaretleyebilir.

Örneğin:

    00:42:12–00:42:25 — Uzun öpüşme
    8 kullanıcı tarafından doğrulandı.

## "Analiz talep et" sistemi

Bir film katalogda bulunabilir ancak henüz analiz edilmemiş olabilir. Bu durumda kullanıcıya şu seçenek gösterilir:

    Bu film için henüz içerik analizi bulunmuyor.
    Analiz talep et.

Kullanıcının film veya altyazı dosyası yüklemesi zorunlu değildir.

Butona basıldığında sistem:

1. Filmin TMDB ve IMDb kimliklerini bulur.
2. Desteklenen altyazı kaynaklarında uygun altyazıyı arar.
3. Altyazı bulunursa analiz işi oluşturur.
4. Küfür ve cinsel konuşma analizi yapılır.
5. Sonuçlar veritabanına kaydedilir.
6. Aynı filmi ziyaret eden diğer kullanıcılar hazır sonucu görür.

Bir film yalnızca bir kere analiz edilir. Her kullanıcı için yeniden işlem yapılmaz.

Altyazı otomatik bulunamazsa isteğe bağlı olarak kullanıcıya SRT veya VTT yükleme seçeneği sunulabilir.

## İlk aşama: MVP

İlk aşamanın amacı, bütün sistemi aynı anda kurmak değil, fikrin kullanıcılar için gerçekten değerli olup olmadığını mümkün olan en basit şekilde test etmektir.

### İlk sürümde bulunacak özellikler

**Film kataloğu**: TMDB üzerinden film arama, film afişleri, film detay sayfası, tür/yıl/süre/açıklama, dinamik film bağlantıları (örnek: `/film/603`, `/film/550`, `/film/238`).

**Hazır analizlerin gösterilmesi**: Film için analiz varsa kullanıcı şu bilgileri görecektir: küfür sayısı, cinsel konuşma sayısı, cinsel ima sayısı, içerik yoğunluğu, zaman damgaları, kısa ve tarafsız açıklamalar, analizin kaynağı, analizin güven durumu.

**Analiz talebi**: Analizi bulunmayan film için kullanıcı talep bırakabilecektir. Durumlar: Analiz bulunmuyor, Analiz talep edildi, Uygun altyazı aranıyor, Analiz yapılıyor, Analiz tamamlandı, Altyazı bulunamadı.

**Altyazı tabanlı analiz**: İlk sürümde otomatik analiz yalnızca metin tarafında yapılacaktır: küfür tespiti, açık cinsel ifade tespiti, cinsel konuşma tespiti, cinsel ima tespiti, zaman damgalarının çıkarılması.

**Basit kullanıcı katkısı**: Kullanıcılar eksik bir görsel sahneyi ekleyebilecektir. İlk sürümde karmaşık bir sosyal sistem yerine şu alanlar yeterlidir: kategori, başlangıç zamanı, bitiş zamanı, şiddet seviyesi, açıklama, doğru/yanlış oyu.

> Uygulanan hâli (Ağustos 2026): Katkılar ayrı "Topluluk sahneleri" bölümünde
> listelenir; net oy +1'e ulaşınca risk hesabına katılır, net −3'te gizlenir.
> Planlanan sıradaki adım: oyla doğrulama yerine/üzerine **moderatör onayı** —
> belirli oy sayısını geçen katkılar site sahibine "onay isteği" olarak düşer,
> hesaba ancak onaydan sonra katılır (kaynak: moderator_verified). Trol
> hesapların kendi katkısını 👍'lamasına karşı asıl güvence bu olacak.

### İlk sürümde olmayacak özellikler

Filmlerin tamamını yapay zekâya izletmek, otomatik öpüşme tespiti, kendi görüntü modelini eğitmek, her film için genel uygunluk yüzdesi, gelişmiş kişisel aile profilleri, mobil uygulama, büyük sosyal ağ özellikleri, film dosyası barındırma, film veya sahne yayınlama.

Bunlar sistem kullanılmaya başladıktan sonra eklenebilir.

## İlk aşamanın teknik yapısı

**Ön yüz**: Next.js, TypeScript, Tailwind CSS, Vercel. Next.js şu işlemleri yönetecektir: film arama, film detay sayfaları, analiz sonuçlarını gösterme, analiz talebi oluşturma, kullanıcı katkı formları, yönetim ekranı.

**Film verisi**: TMDB API.

**Veritabanı ve kullanıcı sistemi**: Supabase, PostgreSQL, Supabase Auth. Supabase üzerinde şu veriler tutulabilir: film önbelleği, analiz işleri, içerik olayları, kullanıcı katkıları, oylar, analiz talepleri.

**Analiz programı**: Başlangıçta ayrı bir Python uygulaması olabilir. Görevleri: bekleyen analiz taleplerini almak, altyazı aramak, altyazıyı indirmek, SRT zamanlarını ayrıştırmak, küfürleri bulmak, metin bloklarını dil modeliyle sınıflandırmak, benzer sonuçları birleştirmek, sonuçları Supabase'e yazmak. Başlangıçta bu program geliştiricinin kendi bilgisayarında çalışabilir; böylece ek sunucu maliyeti oluşmaz.

**Yerel yapay zekâ**: Ollama, küçük bir açık kaynak dil modeli, yapılandırılmış JSON çıktısı. Bu yöntemle metin analizi ücretsiz şekilde yerel bilgisayarda yapılabilir.

## Örnek veritabanı yapısı

**Movies**: tmdb_id, title, original_title, release_year, runtime, poster_path, overview

**Analysis jobs**: id, tmdb_id, status, requested_at, started_at, completed_at, error_message

**Content events**: id, tmdb_id, category, start_seconds, end_seconds, severity, confidence, description, source, verification_count

**Contributions**: id, tmdb_id, user_id, category, start_seconds, end_seconds, description, status

## İçerik kategorileri

İlk sürümde kategoriler sınırlı tutulmalıdır:

- short_kiss
- long_kiss
- sexual_dialogue
- sexual_implication
- explicit_sexual_content
- profanity

Daha sonra yeni kategoriler eklenebilir.

## Güvenilirlik sistemi

Otomatik analiz sonuçları kesin gerçek olarak gösterilmemelidir. Her sonuç için kaynak ve güven durumu bulunmalıdır: otomatik altyazı analizi, kullanıcı katkısı, topluluk tarafından doğrulandı, moderatör tarafından doğrulandı.

Örnek:

    00:51:08–00:51:21 — Cinsel ima içeren konuşma
    Otomatik altyazı analizi — Güven: %78

veya:

    00:42:12–00:42:25 — Uzun öpüşme
    Topluluk katkısı — 12 kişi doğruladı

## Film sürümleriyle ilgili sorun

Filmlerin Netflix, Blu-ray, WEB-DL, extended cut ve sinema sürümleri farklı uzunluklarda olabilir. Bu nedenle zaman damgaları her sürümde tam olarak aynı olmayabilir.

İlk sürümde analiz sonucunun yanında şu bilgiler gösterilebilir: analiz edilen altyazının sürümü, altyazının dili, referans film süresi, zamanların sürüme göre değişebileceği uyarısı.

Örneğin: "Analiz İngilizce WEB-DL altyazısı üzerinden oluşturuldu. Farklı film sürümlerinde zamanlar birkaç saniye değişebilir."

## İçerik dili

Küfür ve diyalog analizleri dile göre ayrı tutulmalıdır. Örneğin: orijinal İngilizce diyalog, Türkçe altyazı, Türkçe dublaj. Çünkü çeviri sırasında küfürler, imalar ve konuşmanın yoğunluğu değişebilir.

İlk aşamada tek bir dil seçilmelidir. En geniş film kapsamı için İngilizce altyazılarla başlamak teknik olarak daha kolaydır. Türkçe kullanıcı deneyimi için sonuç açıklamaları Türkçe üretilebilir.

## Görsel sahne analizi

Öpüşme gibi görsel sahnelerin otomatik tespiti ilerleyen aşamada eklenebilir.

Muhtemel yöntem: filmden belirli aralıklarla kare çıkarmak, görüntü modelinin olası öpüşme sahnelerini işaretlemesi, şüpheli zaman aralıklarını daha sık analiz etmek, sahne başlangıç ve bitişini tahmin etmek, sonucu insan veya topluluk doğrulamasına göndermek.

Ancak bunun yapılabilmesi için sistemin film görüntüsüne yasal şekilde erişmesi gerekir. Bu nedenle ilk MVP'de görsel analiz topluluk katkısıyla yürütülecektir.

## Film dosyalarıyla ilgili yaklaşım

Platform film barındırmayacak, yayınlamayacak veya kullanıcılara film dosyası sağlamayacaktır.

Sitede yalnızca film kataloğu bilgileri, içerik kategorileri, sayılar, yoğunluklar, zaman damgaları ve kısa sahne açıklamaları bulunacaktır.

Bu yaklaşım hem teknik maliyeti azaltır hem de film yayınlama ve depolama sorunlarını önler.

## Ücretsiz başlangıç modeli

İlk MVP şu şartlarla neredeyse ücretsiz çalıştırılabilir: Next.js sitesi Vercel Hobby üzerinde, veritabanı Supabase ücretsiz katmanında, film verileri TMDB üzerinden, analiz programı geliştiricinin bilgisayarında, yapay zekâ Ollama üzerinden yerel olarak, sonuçlar veritabanında saklanarak tekrar analiz engellenir.

Altyazı servislerinin indirme kotaları olabileceği için analizler sıraya alınacaktır. Aynı film için birden fazla talep gelse bile yalnızca bir analiz işi oluşturulacaktır.

## Ürünün büyüme modeli

Platform ilk başta bütün filmleri analiz etmek zorunda değildir.

Büyüme şu şekilde gerçekleşebilir: bütün filmler katalogda görünür → analiz edilmeyen filmler talep toplayabilir → en çok talep edilen filmler önce analiz edilir → otomatik metin analizleri veritabanını büyütür → kullanıcılar görsel sahne bilgileri ekler → topluluk yanlış verileri düzeltir → zamanla güvenilir ve kapsamlı bir içerik veritabanı oluşur.

Ana sayfada şu bölümler bulunabilir: en çok talep edilen filmler, yeni analiz edilenler, topluluk tarafından tamamlananlar, popüler filmler, yüksek küfür yoğunluğuna sahip filmler, düşük romantik içerikli filmler.

## Uzun vadeli özellikler

MVP başarılı olursa: kişisel hassasiyet profili, kullanıcıya özel uygunluk puanı, gelişmiş görsel sahne analizi, otomatik öpüşme tespiti, film sürümlerini eşleştirme, streaming platformu bilgileri, takip listeleri, film listeleri, arkadaşlarla ortak izleme profili, "bu akşam ne izleyelim?" önerileri, tarayıcı eklentisi, mobil uygulama, moderatör sistemi, katkı yapan kullanıcıların güven puanı.

## İlk geliştirme sırası

1. Next.js projesini oluşturmak ve TMDB film aramasını çalıştırmak.
2. Dinamik film detay sayfası oluşturmak.
3. Supabase veritabanını kurmak.
4. Film sayfasına analiz durumu ve "Analiz talep et" butonu eklemek.
5. Python ile SRT ayrıştırıcı geliştirmek.
6. Küfür tespit sistemini eklemek.
7. Ollama ile cinsel konuşma ve ima sınıflandırması yapmak.
8. Analiz sonuçlarını Supabase'e kaydetmek ve film sayfasında göstermek.
9. Kullanıcıların zaman damgalı görsel sahne katkısı yapabileceği formu eklemek.
10. Oy ve doğrulama sistemini eklemek.

## İlk aşamanın başarı ölçütü

MVP'nin başarılı sayılması için bütün filmlerin analiz edilmesi gerekmez.

İlk hedef: çalışan film arama sistemi, 50–100 film için analiz, zaman damgalı içerik sonuçları, kullanıcıların film analizlerini yararlı bulması, analiz talebi özelliğinin kullanılması, kullanıcıların eksik sahne katkısı yapması, otomatik sonuçların kabul edilebilir doğrulukta olması.

Bu aşamada kullanıcıların en çok hangi bilgiyi önemsediği görülebilir: toplam sayı mı, zaman damgaları mı, kısa açıklamalar mı, 10 üzerinden yoğunluk mu, tek bir genel puan mı, kullanıcı yorumları mı?

Ürünün sonraki özellikleri bu verilere göre belirlenebilir.

## Projenin temel fikri

Platformun temel değeri film puanlamak değil, insanların birlikte film seçerken yaşayabileceği rahatsızlığı azaltmaktır.

Son ürün şu deneyimi sunmalıdır: Kullanıcı filmi arar, film sayfasına girer ve birkaç saniye içinde filmin kendisi için hassas olan içerikleri ne kadar barındırdığını görür.

İlk aşamada katalog TMDB'den otomatik oluşturulur, diyaloglar altyazı üzerinden analiz edilir ve görsel sahneler topluluk katkılarıyla tamamlanır. Sistem büyüdükçe otomatik analiz kapsamı ve doğruluğu artırılır.
