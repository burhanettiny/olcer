# Play Console form cevapları

Play Console → **Politika ve programlar → Uygulama içeriği** bölümündeki her beyanın Ölçer için cevabı.
Seçenek adları Play Console güncellendikçe biraz değişebilir; anlamı aynı olanı seçin.

## Gizlilik politikası
`https://burhanettiny.github.io/olcer/gizlilik.html`

## Uygulama erişimi
**Tüm işlevler özel erişim gerektirmeden kullanılabilir.** Hesap, giriş ya da abonelik yoktur.

## Reklamlar
**Hayır, uygulamamda reklam yok.**

## Reklam kimliği
**Hayır.** Uygulama reklam kimliğini kullanmaz; `AD_ID` izni yoktur.

## İçerik derecelendirmesi (IARC anketi)
- Kategori: **Yardımcı program, verimlilik, iletişim veya diğer** (Utility / Productivity / Other)
- Şiddet, cinsellik, küfür, uyuşturucu/alkol/tütün, kumar: **hepsine Hayır**
- Kullanıcılar birbiriyle etkileşime geçebiliyor veya içerik paylaşabiliyor mu? **Hayır** (Paylaş düğmesi yalnızca kullanıcının kendi sonucunu Android paylaşım menüsüne verir; uygulama içinde kullanıcılar arası iletişim yoktur.)
- Kullanıcının konumunu başka kullanıcılarla paylaşıyor mu? **Hayır**
- Dijital satın alma: **Hayır**
- Beklenen sonuç: **Herkes / 3+ (PEGI 3)**

## Hedef kitle ve içerik
- Hedef yaş grubu: **18 ve üzeri** (13 yaş altını seçmek Aile Politikası şartlarını getirir; gerek yok)
- Uygulama çocukların ilgisini çekebilir mi? **Hayır**

## Veri güvenliği
- Uygulamanız zorunlu kullanıcı veri türlerinden herhangi birini topluyor veya paylaşıyor mu? **Hayır**

Gerekçe: Google Play'in tanımına göre "toplama", verinin cihazdan dışarı gönderilmesidir. Ölçer konum, kamera, mikrofon ve sensör verilerini yalnızca cihazda işler; hiçbir sunucuya göndermez. Kayıt defteri ve ayarlar yalnızca cihazda saklanır. Uygulamada analiz, çökme raporlama veya reklam SDK'sı yoktur.

Bu cevapla Play, mağaza sayfasında "Veri toplanmıyor · Veri paylaşılmıyor" gösterir.

## Sağlık uygulamaları beyanı
Nabız ölçer bulunduğu için bu beyanı doldurun:
- Sağlıkla ilgili özellik var mı? **Evet**
- Tür: **Kalp atış hızı / nabız ölçümü** (genel sağlık ve zindelik amaçlı)
- Tıbbi cihaz mı? **Hayır.** Uygulamada ve mağaza açıklamasında "tıbbi cihaz değildir, teşhis için kullanmayın" uyarısı var.
- Sağlık verisi toplanıyor veya paylaşılıyor mu? **Hayır** (nabız değeri cihazdan çıkmaz)
- Health Connect kullanılıyor mu? **Hayır**

## Haber uygulaması / Devlet uygulaması / Finansal özellikler
**Hayır** (üçü için de)

## İzinler
Ön planda konum, kamera, mikrofon ve fiziksel etkinlik için ayrı bir beyan formu gerekmez. Ölçer:
- arka planda konum **istemez** (`ACCESS_BACKGROUND_LOCATION` yok),
- ön plan hizmeti **kullanmaz**,
- SMS, arama kaydı, tam ekran bildirim, erişilebilirlik gibi kısıtlı izinleri **istemez**.

İnceleme ekibi izinlerin gerekçesini sorarsa:

| İzin | Gerekçe |
|---|---|
| Konum | Hız göstergesi, GPS ile yol/arazi ölçümü, kıble yönü, yerel manyetik sapma ve yerçekimi hesabı |
| Kamera | Mesafe/yükseklik ölçer, nabız ölçer, renk ölçer, terazinin kamera çizgisi |
| Mikrofon | Ses seviyesi ve frekans/akort ölçümü (ses kaydedilmez) |
| Fiziksel etkinlik | Adım sayacı sensörünü okumak |
