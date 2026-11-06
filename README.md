# Ölçer

Ölçümle ilgili her ihtiyaç için tek uygulama: birim çevirici, geometrik ve fiziksel hesaplayıcılar ve telefonun sensörleriyle doğrudan ölçüm. Türkçe arayüzlüdür, internet gerektirmez (PWA, çevrimdışı çalışır), hiçbir veri göndermez.

## Neler var

**Cihazla ölç (sensörler)**
- Ekran cetveli: kredi/kimlik kartıyla (ISO/IEC 7810 ID-1, 85,60 mm) kalibre edilir
- Su terazisi / eğim ölçer: sıfır kalibrasyonlu
- Pusula: manyetik sapma girilerek gerçek kuzey
- GPS: konum, rakım, hız, yürüyerek yol ölçümü, köşelerde durarak arazi alanı (m², dönüm)
- Ses seviyesi: dBFS, referans cihazla kalibre edilince dB
- Kronometre: tur kaydı

**Birim çevirici (18 boyut, ~190 birim):** uzunluk, alan (dönüm, ar, hektar…), hacim, kütle, zaman, hız, ivme, basınç, kuvvet, tork, enerji, güç, sıcaklık, açı, yoğunluk, debi, frekans, yakıt tüketimi, veri.

**Hesaplayıcılar (40+)**

| Kategori | Hesaplar |
|---|---|
| Alan | dikdörtgen, üçgen (3 yöntem), daire, yamuk, elips, daire dilimi, düzgün çokgen, koordinatlardan arsa/tarla alanı |
| Hacim & Tank | kutu/havuz, silindir (dikey tank doluluğu), yatay tank doluluğu, küre, koni/kesik koni, piramit |
| Kütle & Malzeme | hacimden kütle (45 malzemelik yoğunluk tablosu), yoğunluk bulma, sac/levha, boru/profil/mil ağırlığı |
| Kargo | desi ve ücrete esas ağırlık (bölen 3000/4000/5000/6000 veya firmaya özel) |
| Mesafe & Konum | iki koordinat arası (Vincenty, WGS84), adımla mesafe |
| Hız & Zaman | hız–mesafe–süre (tempo), ses hızı ve Mach, ivme (0–100) |
| Basınç & Rakım | basınçtan rakım (QNH ile), QNH, standart atmosfer (ISA), sıvı basıncı, kuvvet/alan |
| Kuvvet | F = m·a, konuma göre yerel g ve ağırlık, yay, tork |
| Sıcaklık & Nem | çiy noktası ve mutlak nem, hissedilen sıcaklık |
| Eğim & Ölçek | eğim (% / derece / oran), harita–çizim ölçeği, ölçek bulma |
| Elektrik & Enerji | Ohm yasası, elektrik tüketimi ve fatura, yakıt maliyeti |
| Metroloji | GUM ölçüm belirsizliği (A/B tipi, νeff, k), tolerans uygunluk kararı (basit kabul / ILAC-G8 koruma bandı), bağıl hata |

Bir standart ya da yerel değer gereken yerlerde uygulama bunu kullanıcıdan ister: desi böleni, QNH, manyetik sapma, enlem/rakım (yerel g), karar kuralı, kWh fiyatı, cetvel ve ses kalibrasyonu gibi.

## Dayanaklar

- Birim tanımları: SI Broşürü (BIPM, 9. baskı), NIST SP 811
- Atmosfer: ICAO Standart Atmosferi (ISO 2533)
- Jeodezi: WGS84, Vincenty ters çözümü
- Yerçekimi: WGS84 Somigliana formülü + serbest hava düzeltmesi
- Belirsizlik: JCGM 100:2008 (GUM), kapsam faktörü için GUM Tablo G.2
- Nem: Magnus formülü; ısı indeksi: NOAA Rothfusz; rüzgâr soğuğu: Kanada/ABD 2001

Sonuçlar bilgilendirme amaçlıdır; yasal metrolojik işlemlerde (ticari tartım, tapu, kalibrasyon sertifikası) yetkili kuruluşların ölçümleri esastır.

## Çalıştırma

Derleme adımı yoktur; düz HTML + JavaScript modülleridir.

```bash
python3 -m http.server 8000
```

Ardından `http://localhost:8000` adresini açın. Sensörler (konum, hareket, mikrofon) yalnızca `https` veya `localhost` üzerinde çalışır.

**GitHub Pages ile yayın:** Settings → Pages → Build and deployment → kaynak olarak `main` dalı ve `/ (root)`. Site `https://<kullanıcı-adı>.github.io/olcer/` adresinde açılır; telefonda "Ana ekrana ekle" ile uygulama gibi kurulur.

## Testler

```bash
npm test
```

## Yapı

| Dosya | İçerik |
|---|---|
| `js/birimler.js` | birim tanımları, çeviri, Türkçe sayı okuma/biçimleme |
| `js/fizik.js` | ISA, barometrik formül, jeodezi, yerçekimi, nem, istatistik |
| `js/hesaplar.js` | hesaplayıcı tanımları (girdi/çıktı bildirimsel) |
| `js/araclar.js` | sensör araçları |
| `js/app.js` | arayüz ve yönlendirme |
| `sw.js` | çevrimdışı önbellek (dosyalar değişince `SURUM`'ü artırın) |

Yeni bir hesaplayıcı eklemek için `js/hesaplar.js` içindeki `HESAPLAR` dizisine bir nesne eklemek yeterlidir: girdiler SI birimine çevrilmiş olarak gelir, çıktıların birimini arayüz seçtirir.
