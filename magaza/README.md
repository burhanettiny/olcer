# Ölçer'i Google Play'e yükleme rehberi

Bu klasörde mağaza için gereken her şey hazır:

| Dosya | Ne işe yarar |
|---|---|
| `metinler.md` | Uygulama adı, kısa ve tam açıklama, kategori (sınırlar `node magaza/denetle.mjs` ile denetlenir) |
| `formlar.md` | Play Console'daki zorunlu beyanların cevapları (veri güvenliği, içerik derecelendirmesi, sağlık beyanı…) |
| `ikon-512.png` | Uygulama simgesi, 512 × 512 |
| `tanitim-1024x500.png` | Öne çıkan grafik, 1024 × 500 |
| `ekran/*.png` | 8 telefon ekran görüntüsü, 1080 × 1920 |
| `../gizlilik.html` | Gizlilik politikası → https://burhanettiny.github.io/olcer/gizlilik.html |

Uygulama tarafında hazır olanlar: hedef API 36 (Play'in istediği en düşük sürümün üzerinde), her derlemede artan sürüm numarası, yayın (release) derlemesi, imzalı AAB üretimi ve tüm izinlerin gerekçesi.

Sizin yapmanız gerekenler 5 adım. Hepsi telefondan, tarayıcıyla yapılabilir.

---

## 1. Google Play geliştirici hesabı açın

1. https://play.google.com/console adresine gidin, Google hesabınızla giriş yapın.
2. **Kişisel hesap** seçin, **25 $** tek seferlik kayıt ücretini ödeyin.
3. Kimlik doğrulamasını tamamlayın (kimlik kartı fotoğrafı; birkaç gün sürebilir).
4. Bir **iletişim e-postası** girmeniz istenir; bu adres mağaza sayfasında herkese açık görünür.

> **Önemli:** Yeni kişisel hesaplarda Google, uygulamayı herkese açmadan önce **en az 12 kişinin 14 gün boyunca kapalı testte** uygulamayı denemesini şart koşuyor. Bu süreyi 4. adımda başlatacaksınız; şimdiden 12 tanıdığınızın Gmail adresini toplayın.

## 2. Yükleme anahtarını oluşturun (bir kez)

Google Play'e gönderilen paket gizli bir **yükleme anahtarıyla** imzalanmalı. Bu anahtar depoda durmaz; GitHub'ın gizli değişkenlerinde saklanır. Aşağıdaki adımlar bilgisayar gerektirmez.

**a) Geçici bir erişim belirteci oluşturun**
1. https://github.com/settings/personal-access-tokens/new adresine gidin.
2. **Token name:** `olcer-anahtar` · **Expiration:** 7 gün.
3. **Repository access:** *Only select repositories* → `burhanettiny/olcer`.
4. **Permissions → Repository permissions → Secrets:** *Read and write*.
5. **Generate token**'a basın ve çıkan belirteci kopyalayın (bir daha gösterilmez).

**b) Belirteci depoya ekleyin**
1. https://github.com/burhanettiny/olcer/settings/secrets/actions/new adresine gidin.
2. **Name:** `ANAHTAR_TOKEN` · **Secret:** kopyaladığınız belirteç → **Add secret**.

**c) Anahtarı oluşturun**
1. https://github.com/burhanettiny/olcer/actions/workflows/yukleme-anahtari.yml adresine gidin.
2. **Run workflow** → **Run workflow**'a basın. Bir dakika içinde yeşil tik görünür.
3. Anahtar ve şifresi `ANAHTAR_DOSYASI` ve `ANAHTAR_SIFRE` adıyla gizli değişkenlere kaydedilir; hiçbir yerde görünmez.

**d) Belirteci silin** (artık gerekmiyor)
- https://github.com/settings/personal-access-tokens adresinden `olcer-anahtar`'ı silin.
- https://github.com/burhanettiny/olcer/settings/secrets/actions adresinden `ANAHTAR_TOKEN`'ı silin.

Bundan sonra her derlemede Sürümler sayfasında `olcer.apk`'nın yanında **`olcer.aab`** de çıkar. Hemen bir derleme başlatmak için: https://github.com/burhanettiny/olcer/actions/workflows/android.yml → **Run workflow**.

> Anahtarı kaybetme derdi yok: Google Play asıl imza anahtarını kendisi saklar (Play Uygulama İmzalama). Yükleme anahtarı bir gün silinirse Play Console → *Kurulum → Uygulama imzalama* bölümünden yenisini talep edebilirsiniz.

## 3. Uygulamayı Play Console'da oluşturun

1. Play Console → **Uygulama oluştur**.
2. Ad: `Ölçer: Ölçüm Araçları` · Varsayılan dil: **Türkçe – tr-TR** · **Uygulama** · **Ücretsiz**.
3. Beyanları onaylayıp **Uygulama oluştur**.
4. **Politika ve programlar → Uygulama içeriği** bölümündeki her maddeyi `formlar.md`'deki cevaplarla doldurun.
5. **Mağazada bulunma → Ana mağaza girişi**: `metinler.md`'deki ad, kısa ve tam açıklamayı yapıştırın; simge, öne çıkan grafik ve ekran görüntülerini yükleyin (dosyaları telefonunuza indirmek için GitHub'da dosyayı açıp **Download raw file**'a basın).
6. Kategori: **Araçlar**.

## 4. Kapalı teste yükleyin (12 kişi, 14 gün)

1. Sürümler sayfasından son `olcer.aab`'yi indirin: https://github.com/burhanettiny/olcer/releases/latest
2. Play Console → **Test → Kapalı test → Kanal oluştur** → **Yeni sürüm oluştur**.
3. **Play Uygulama İmzalama**'yı kabul edin (önerilen, varsayılan).
4. `olcer.aab`'yi yükleyin. Sürüm notu örneği: *"İlk sürüm: canlı ölçüm, hız göstergesi, kıble, terazi ve 44 hesaplayıcı."*
5. **Test kullanıcıları** sekmesinde bir e-posta listesi oluşturup 12 kişinin Gmail adresini ekleyin.
6. Sürümü incelemeye gönderin. Onaylanınca test bağlantısını bu kişilerle paylaşın; her biri bağlantıdan teste katılıp uygulamayı kursun.
7. **14 gün** boyunca en az 12 kişi testte kalmalı. İsterseniz bu sürede yeni AAB'ler yükleyebilirsiniz.

## 5. Herkese açık yayına başvurun

14 gün dolunca Play Console → **Kontrol paneli → Üretim erişimi için başvur**. Test süreciyle ilgili birkaç soruyu cevaplayın. Onaylanınca **Üretim → Yeni sürüm oluştur** ile son AAB'yi yükleyip yayınlayın. İlk inceleme genellikle 1–7 gün sürer.

---

## Güncellemeler

Kodda yapılan her değişiklikten sonra GitHub Actions yeni bir `olcer.aab` üretir; sürüm numarası kendiliğinden artar. Play Console → **Üretim → Yeni sürüm oluştur** ile yükleyin.

## Bilinmesi gerekenler

- **GitHub'dan kurulan APK ile Play sürümü farklı anahtarlarla imzalıdır.** Telefonunuzda GitHub'dan kurduğunuz Ölçer varsa, Play'den kurmadan önce onu kaldırın (kayıtlarınızı önce Kayıt defteri → Paylaş ile dışarı alın).
- Paket adı `io.github.burhanettiny.olcer`'dir ve Play'e ilk yüklemeden sonra değiştirilemez.
- Nabız ölçer nedeniyle sağlık beyanı gerekir; uygulama tıbbi cihaz olmadığını açıkça belirtir (`formlar.md`).
