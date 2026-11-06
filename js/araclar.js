// Ölçer — cihaz sensörleriyle çalışan ölçüm araçları.
// Her araç `ac(kok, ortak)` ile kurulur ve kapanırken çağrılacak temizlik fonksiyonunu döndürür.

import { bicimle, sayiOku } from './birimler.js';
import * as F from './fizik.js';

const KART_MM = 85.6; // ISO/IEC 7810 ID-1 (kredi kartı) genişliği
const el = (etiket, ozellik = {}, ...cocuklar) => {
  const e = document.createElement(etiket);
  for (const [k, v] of Object.entries(ozellik)) {
    if (k === 'sinif') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v);
  }
  for (const c of cocuklar.flat()) if (c != null) e.append(c);
  return e;
};

export function ayarOku(anahtar, varsayilan) {
  try { const v = localStorage.getItem('olcer.' + anahtar); return v === null ? varsayilan : JSON.parse(v); } catch { return varsayilan; }
}
export function ayarYaz(anahtar, deger) {
  try { localStorage.setItem('olcer.' + anahtar, JSON.stringify(deger)); } catch { /* özel pencere vb. */ }
}

const satir = (ad, degerEl) => el('div', { sinif: 'cikti' }, el('span', { sinif: 'cikti-ad' }, ad), degerEl);
const deger = () => el('span', { sinif: 'cikti-deger' }, '—');
const uyari = metin => el('p', { sinif: 'uyari' }, metin);

async function yonIzni() {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') {
    const sonuc = await D.requestPermission();
    if (sonuc !== 'granted') throw new Error('Hareket sensörü izni verilmedi.');
  }
}

export const ARACLAR = [
  // ------------------------------------------------------------ CETVEL
  {
    id: 'cetvel', ad: 'Ekran cetveli', ikon: '📏', aciklama: 'Ekranı cetvel olarak kullanın (kredi kartıyla kalibre edilir).',
    ac(kok) {
      let pxmm = ayarOku('pxmm', null);
      let birim = ayarOku('cetvelBirim', 'mm');
      let isaret = null;
      const tuval = el('canvas', { sinif: 'cetvel', 'aria-label': 'Cetvel' });
      const okuma = el('p', { sinif: 'buyuk-okuma' }, '— mm');
      const durum = el('p', { sinif: 'kucuk' });
      const kalibrasyon = el('div', { sinif: 'kart-kalib', hidden: true });

      const ciz = () => {
        const genislik = tuval.clientWidth, yukseklik = 140, dpr = devicePixelRatio || 1;
        tuval.width = genislik * dpr; tuval.height = yukseklik * dpr;
        const g = tuval.getContext('2d');
        g.scale(dpr, dpr);
        const renk = getComputedStyle(document.body).getPropertyValue('--yazi');
        const vurgu = getComputedStyle(document.body).getPropertyValue('--vurgu');
        g.strokeStyle = g.fillStyle = renk; g.font = '12px system-ui'; g.lineWidth = 1;
        const p = pxmm || (96 / 25.4);
        if (birim === 'mm') {
          for (let mm = 0; mm * p <= genislik; mm++) {
            const x = Math.round(mm * p) + 0.5;
            const boy = mm % 10 === 0 ? 40 : mm % 5 === 0 ? 28 : 16;
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, boy); g.stroke();
            if (mm % 10 === 0) g.fillText(String(mm / 10), x + 3, 54);
          }
          g.fillText('cm', 4, yukseklik - 8);
        } else {
          const pin = p * 25.4;
          for (let i = 0; i * pin / 16 <= genislik; i++) {
            const x = Math.round(i * pin / 16) + 0.5;
            const boy = i % 16 === 0 ? 40 : i % 8 === 0 ? 32 : i % 4 === 0 ? 24 : i % 2 === 0 ? 18 : 12;
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, boy); g.stroke();
            if (i % 16 === 0) g.fillText(String(i / 16), x + 3, 54);
          }
          g.fillText('inç', 4, yukseklik - 8);
        }
        if (isaret != null) {
          g.strokeStyle = vurgu; g.lineWidth = 2;
          g.beginPath(); g.moveTo(isaret, 0); g.lineTo(isaret, yukseklik); g.stroke();
          const mm = isaret / p;
          okuma.textContent = birim === 'mm' ? `${bicimle(mm, 4)} mm` : `${bicimle(mm / 25.4, 4)} inç`;
        }
        durum.textContent = pxmm
          ? `Kalibre edildi (${bicimle(pxmm, 4)} piksel/mm).`
          : 'Henüz kalibre edilmedi: ölçüler cihazınıza göre yanlış olabilir. Aşağıdan kredi kartı ile kalibre edin.';
      };
      tuval.addEventListener('pointerdown', e => { isaret = e.offsetX; ciz(); });
      tuval.addEventListener('pointermove', e => { if (e.buttons) { isaret = e.offsetX; ciz(); } });

      // Kalibrasyon: ekrandaki dikdörtgeni kartın genişliğine eşitleyin.
      let kartPx = (pxmm || 96 / 25.4) * KART_MM;
      const kart = el('div', { sinif: 'kart-sablon' }, 'Kartı buraya yaslayın');
      const kaydirici = el('input', { type: 'range', min: '150', max: String(Math.max(600, innerWidth)), step: '0.5', value: String(kartPx), 'aria-label': 'Kart genişliği' });
      const guncelleKart = () => { kart.style.width = kartPx + 'px'; kart.style.height = (kartPx * 53.98 / KART_MM) + 'px'; kaydirici.value = kartPx; };
      kaydirici.addEventListener('input', () => { kartPx = Number(kaydirici.value); guncelleKart(); });
      kalibrasyon.append(
        el('p', {}, 'Bir banka/kimlik kartını (ISO/IEC 7810 ID-1, 85,60 × 53,98 mm) ekrana yaslayın. Kaydırıcı ve düğmelerle dikdörtgeni kartla tam aynı genişliğe getirin.'),
        kart, kaydirici,
        el('div', { sinif: 'dugmeler' },
          el('button', { onclick: () => { kartPx -= 0.5; guncelleKart(); } }, '−'),
          el('button', { onclick: () => { kartPx += 0.5; guncelleKart(); } }, '+'),
          el('button', { sinif: 'birincil', onclick: () => { pxmm = kartPx / KART_MM; ayarYaz('pxmm', pxmm); kalibrasyon.hidden = true; ciz(); } }, 'Kaydet'),
        ),
      );
      guncelleKart();

      kok.append(
        okuma, el('p', { sinif: 'kucuk' }, 'Ölçmek istediğiniz noktaya dokunun veya sürükleyin; değer sol kenardan (0) itibarendir.'), tuval, durum,
        el('div', { sinif: 'dugmeler' },
          el('button', { onclick: () => { birim = birim === 'mm' ? 'in' : 'mm'; ayarYaz('cetvelBirim', birim); ciz(); } }, 'cm ↔ inç'),
          el('button', { onclick: () => { kalibrasyon.hidden = !kalibrasyon.hidden; } }, 'Kalibre et'),
        ),
        kalibrasyon,
        uyari('İpucu: cetvel ekranın sol kenarından başlar. Telefonu yatay çevirirseniz daha uzun ölçebilirsiniz.'),
      );
      const yeniden = () => ciz();
      addEventListener('resize', yeniden);
      requestAnimationFrame(ciz);
      return () => removeEventListener('resize', yeniden);
    },
  },

  // ------------------------------------------------------------ SU TERAZİSİ
  {
    id: 'terazi', ad: 'Su terazisi / eğim ölçer', ikon: '🫧', aciklama: 'Telefonu bir yüzeye koyarak yataylığı ve eğimi ölçün.',
    ac(kok) {
      let ofset = ayarOku('teraziOfset', { b: 0, g: 0 });
      let son = null;
      const kabarcik = el('div', { sinif: 'kabarcik' });
      const kadran = el('div', { sinif: 'kadran' }, el('div', { sinif: 'kadran-merkez' }), kabarcik);
      const dx = deger(), dy = deger(), toplam = deger();
      const bilgi = el('p', { sinif: 'kucuk' }, 'Başlatmak için düğmeye basın.');
      const dinle = e => {
        if (e.beta == null) return;
        son = { b: e.beta, g: e.gamma };
        const b = e.beta - ofset.b, g = e.gamma - ofset.g;
        const egim = Math.atan(Math.sqrt(Math.tan(b * Math.PI / 180) ** 2 + Math.tan(g * Math.PI / 180) ** 2)) * 180 / Math.PI;
        dx.textContent = `${bicimle(g, 3)}°  (%${bicimle(Math.tan(g * Math.PI / 180) * 100, 3)})`;
        dy.textContent = `${bicimle(b, 3)}°  (%${bicimle(Math.tan(b * Math.PI / 180) * 100, 3)})`;
        toplam.textContent = `${bicimle(egim, 3)}°`;
        const sinir = 20, R = kadran.clientWidth / 2 - 22;
        kabarcik.style.transform = `translate(${Math.max(-1, Math.min(1, -g / sinir)) * R}px, ${Math.max(-1, Math.min(1, -b / sinir)) * R}px)`;
        kabarcik.classList.toggle('duz', egim < 0.3);
        bilgi.textContent = '';
      };
      const baslat = async () => {
        try { await yonIzni(); addEventListener('deviceorientation', dinle); bilgi.textContent = 'Sensör bekleniyor…'; setTimeout(() => { if (!son) bilgi.textContent = 'Sensör verisi gelmiyor: bu cihazda/tarayıcıda hareket sensörü yok olabilir.'; }, 2000); }
        catch (e) { bilgi.textContent = e.message; }
      };
      kok.append(
        kadran,
        satir('Sol–sağ (x)', dx), satir('Ön–arka (y)', dy), satir('Toplam eğim', toplam), bilgi,
        el('div', { sinif: 'dugmeler' },
          el('button', { sinif: 'birincil', onclick: baslat }, 'Başlat'),
          el('button', { onclick: () => { if (son) { ofset = { ...son }; ayarYaz('teraziOfset', ofset); } } }, 'Sıfırla (kalibre et)'),
          el('button', { onclick: () => { ofset = { b: 0, g: 0 }; ayarYaz('teraziOfset', ofset); } }, 'Kalibrasyonu sil'),
        ),
        uyari('Kalibrasyon: telefonu düz bir yüzeye koyup "Sıfırla"ya basın, sonra 180° döndürüp okumayı kontrol edin. İki okuma eşit değilse yüzey eğiktir; ortalamaları alın. Telefon sensörleri tipik olarak ±0,1–0,5° hassastır.'),
      );
      return () => removeEventListener('deviceorientation', dinle);
    },
  },

  // ------------------------------------------------------------ PUSULA
  {
    id: 'pusula', ad: 'Pusula', ikon: '🧭', aciklama: 'Manyetik ve gerçek kuzeye göre yön.',
    ac(kok) {
      let sapma = ayarOku('manyetikSapma', 6);
      const ok = el('div', { sinif: 'pusula-gul' }, el('span', { sinif: 'kuzey' }, 'K'), el('span', { sinif: 'dogu' }, 'D'), el('span', { sinif: 'guney' }, 'G'), el('span', { sinif: 'bati' }, 'B'));
      const kadran = el('div', { sinif: 'pusula' }, ok, el('div', { sinif: 'pusula-isaret' }));
      const manyetik = deger(), gercek = deger();
      const bilgi = el('p', { sinif: 'kucuk' }, 'Başlatmak için düğmeye basın.');
      const sapmaGir = el('input', { type: 'text', inputmode: 'decimal', value: String(sapma).replace('.', ','), 'aria-label': 'Manyetik sapma' });
      sapmaGir.addEventListener('input', () => { const x = sayiOku(sapmaGir.value); if (Number.isFinite(x)) { sapma = x; ayarYaz('manyetikSapma', x); } });
      const dinle = e => {
        let baslik = null;
        if (typeof e.webkitCompassHeading === 'number') baslik = e.webkitCompassHeading;
        else if (e.absolute && e.alpha != null) baslik = (360 - e.alpha) % 360;
        if (baslik == null) return;
        bilgi.textContent = '';
        ok.style.transform = `rotate(${-baslik}deg)`;
        manyetik.textContent = `${bicimle(baslik, 3)}°`;
        gercek.textContent = `${bicimle((baslik + sapma + 360) % 360, 3)}°`;
      };
      const olay = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
      const baslat = async () => {
        try { await yonIzni(); addEventListener(olay, dinle); bilgi.textContent = 'Telefonu yere paralel tutun; gerekirse 8 çizerek sensörü kalibre edin.'; }
        catch (e) { bilgi.textContent = e.message; }
      };
      kok.append(
        kadran, satir('Manyetik yön', manyetik), satir('Gerçek (coğrafi) yön', gercek),
        el('label', { sinif: 'girdi' }, el('span', {}, 'Manyetik sapma (doğu +, derece)'), sapmaGir),
        bilgi,
        el('div', { sinif: 'dugmeler' }, el('button', { sinif: 'birincil', onclick: baslat }, 'Başlat')),
        uyari('Manyetik sapma konuma ve yıla göre değişir (Türkiye\'de 2026 için yaklaşık +5° ile +7° doğu). Kesin değeri NOAA/BGS manyetik model hesaplayıcılarından alın. Metal ve mıknatıslar okumayı bozar.'),
      );
      return () => removeEventListener(olay, dinle);
    },
  },

  // ------------------------------------------------------------ GPS
  {
    id: 'gps', ad: 'GPS: konum, rakım, yol ve arazi ölçümü', ikon: '🛰️', aciklama: 'Yürüyerek mesafe ölçün ya da köşelerde durarak arazi alanını bulun.',
    ac(kok) {
      let izleyici = null, son = null, iz = [], yolMesafe = 0, olcuyor = false;
      const koseler = [];
      let esik = ayarOku('gpsEsik', 15);
      const k = { konum: deger(), dogruluk: deger(), rakim: deger(), hiz: deger(), yol: deger(), alan: deger(), cevre: deger(), kose: deger() };
      const bilgi = el('p', { sinif: 'kucuk' });
      const esikGir = el('input', { type: 'text', inputmode: 'decimal', value: String(esik), 'aria-label': 'Doğruluk eşiği' });
      esikGir.addEventListener('input', () => { const x = sayiOku(esikGir.value); if (x > 0) { esik = x; ayarYaz('gpsEsik', x); } });
      const kosePano = el('textarea', { readonly: true, rows: '3', sinif: 'kose-liste', 'aria-label': 'Köşe koordinatları' });

      const alanGuncelle = () => {
        k.kose.textContent = String(koseler.length);
        kosePano.value = koseler.map(([a, b]) => `${a.toFixed(7)}, ${b.toFixed(7)}`).join('\n');
        if (koseler.length >= 3) {
          const r = F.cografiCokgen(koseler);
          k.alan.textContent = `${bicimle(r.alan, 5)} m²  (${bicimle(r.alan / 1000, 4)} dönüm)`;
          k.cevre.textContent = `${bicimle(r.cevre, 5)} m`;
        } else { k.alan.textContent = '—'; k.cevre.textContent = '—'; }
      };
      const konumGeldi = p => {
        const c = p.coords;
        son = c;
        k.konum.textContent = `${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`;
        k.dogruluk.textContent = `±${bicimle(c.accuracy, 3)} m`;
        k.rakim.textContent = c.altitude != null ? `${bicimle(c.altitude, 4)} m (±${bicimle(c.altitudeAccuracy ?? NaN, 2)} m)` : 'cihaz vermiyor';
        k.hiz.textContent = c.speed != null ? `${bicimle(c.speed * 3.6, 3)} km/sa` : '—';
        if (olcuyor && c.accuracy <= esik) {
          const onceki = iz[iz.length - 1];
          if (!onceki) iz.push([c.latitude, c.longitude]);
          else {
            const d = F.haversine(onceki[0], onceki[1], c.latitude, c.longitude);
            // Yerinde dururken GPS gürültüsünü yol olarak saymamak için doğruluktan küçük adımları atla.
            if (d >= Math.max(3, c.accuracy * 0.8)) { iz.push([c.latitude, c.longitude]); yolMesafe += d; }
          }
          k.yol.textContent = `${bicimle(yolMesafe, 5)} m`;
        }
        bilgi.textContent = c.accuracy > esik ? `Doğruluk eşiğin (${esik} m) üzerinde; açık alanda biraz bekleyin.` : '';
      };
      const baslat = () => {
        if (!navigator.geolocation) { bilgi.textContent = 'Bu cihaz konum desteklemiyor.'; return; }
        if (izleyici != null) return;
        bilgi.textContent = 'Konum bekleniyor…';
        izleyici = navigator.geolocation.watchPosition(konumGeldi, e => { bilgi.textContent = e.code === 1 ? 'Konum izni verilmedi.' : 'Konum alınamadı: ' + e.message; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
      };
      const yolDugme = el('button', { onclick: () => { baslat(); olcuyor = !olcuyor; yolDugme.textContent = olcuyor ? '⏸ Yol ölçümünü durdur' : '▶ Yol ölçümünü başlat'; } }, '▶ Yol ölçümünü başlat');
      kok.append(
        el('div', { sinif: 'dugmeler' }, el('button', { sinif: 'birincil', onclick: baslat }, 'Konumu başlat')),
        satir('Konum', k.konum), satir('Yatay doğruluk', k.dogruluk), satir('Rakım (GPS)', k.rakim), satir('Anlık hız', k.hiz),
        el('h3', {}, 'Yol / mesafe ölçümü'),
        satir('Yürünen mesafe', k.yol),
        el('div', { sinif: 'dugmeler' }, yolDugme, el('button', { onclick: () => { iz = []; yolMesafe = 0; k.yol.textContent = '0 m'; } }, 'Sıfırla')),
        el('h3', {}, 'Arazi alanı ölçümü'),
        el('p', { sinif: 'kucuk' }, 'Arazinin her köşesinde durup "Köşe ekle"ye basın. Sırayla (saat yönünde ya da tersine) dolaşın.'),
        satir('Köşe sayısı', k.kose), satir('Alan', k.alan), satir('Çevre', k.cevre),
        el('div', { sinif: 'dugmeler' },
          el('button', { sinif: 'birincil', onclick: () => { baslat(); if (!son) { bilgi.textContent = 'Önce konum gelmesini bekleyin.'; return; } if (son.accuracy > esik) { bilgi.textContent = `Doğruluk (±${Math.round(son.accuracy)} m) eşiğin üzerinde; biraz bekleyin.`; return; } koseler.push([son.latitude, son.longitude]); alanGuncelle(); } }, '➕ Köşe ekle'),
          el('button', { onclick: () => { koseler.pop(); alanGuncelle(); } }, 'Son köşeyi sil'),
          el('button', { onclick: () => { koseler.length = 0; alanGuncelle(); } }, 'Temizle'),
        ),
        kosePano,
        el('label', { sinif: 'girdi' }, el('span', {}, 'Kabul edilen en kötü doğruluk (m)'), esikGir),
        bilgi,
        uyari('Telefon GPS\'i açık alanda tipik olarak ±3–5 m doğrudur; binaların ve ağaçların yanında hata artar. GPS rakımı, yatay konumdan 1,5–3 kat daha az doğrudur. Tapu/kadastro işleri için lisanslı harita mühendisi ölçümü gerekir.'),
      );
      return () => { if (izleyici != null) navigator.geolocation.clearWatch(izleyici); };
    },
  },

  // ------------------------------------------------------------ SES SEVİYESİ
  {
    id: 'ses', ad: 'Ses seviyesi (desibel)', ikon: '🔊', aciklama: 'Mikrofonla ortam gürültüsünü ölçün.',
    ac(kok) {
      let ofset = ayarOku('sesOfset', null);
      let akis = null, baglam = null, cerceve = null, maks = -Infinity, enerjiTop = 0, ornek = 0;
      const anlik = el('p', { sinif: 'buyuk-okuma' }, '— dB');
      const cubuk = el('div', { sinif: 'ses-cubuk' }, el('div', { sinif: 'ses-dolgu' }));
      const maksD = deger(), leqD = deger();
      const bilgi = el('p', { sinif: 'kucuk' });
      const refGir = el('input', { type: 'text', inputmode: 'decimal', placeholder: 'örn. 60', 'aria-label': 'Referans ses seviyesi' });
      const birimAd = () => ofset == null ? 'dBFS (göreli)' : 'dB (kalibre)';
      let sonDbfs = null;
      const dongu = analiz => {
        const veri = new Float32Array(analiz.fftSize);
        const adim = () => {
          analiz.getFloatTimeDomainData(veri);
          let top = 0; for (const x of veri) top += x * x;
          const rms = Math.sqrt(top / veri.length);
          const dbfs = 20 * Math.log10(Math.max(rms, 1e-10));
          sonDbfs = dbfs;
          const db = dbfs + (ofset ?? 0);
          maks = Math.max(maks, db);
          enerjiTop += 10 ** (db / 10); ornek++;
          anlik.textContent = `${bicimle(db, 3)} ${birimAd()}`;
          maksD.textContent = `${bicimle(maks, 3)}`;
          leqD.textContent = `${bicimle(10 * Math.log10(enerjiTop / ornek), 3)}`;
          const oran = ofset == null ? (dbfs + 90) / 90 : db / 120;
          cubuk.firstChild.style.width = `${Math.max(0, Math.min(1, oran)) * 100}%`;
          cerceve = requestAnimationFrame(adim);
        };
        adim();
      };
      const baslat = async () => {
        if (akis) return;
        try {
          akis = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
          baglam = new (window.AudioContext || window.webkitAudioContext)();
          const analiz = baglam.createAnalyser(); analiz.fftSize = 2048;
          baglam.createMediaStreamSource(akis).connect(analiz);
          bilgi.textContent = '';
          dongu(analiz);
        } catch (e) { bilgi.textContent = 'Mikrofona erişilemedi: ' + (e.message || e.name); akis = null; }
      };
      const durdur = () => {
        if (cerceve) cancelAnimationFrame(cerceve);
        akis?.getTracks().forEach(t => t.stop()); baglam?.close();
        akis = null; baglam = null;
      };
      kok.append(
        anlik, cubuk, satir('En yüksek', maksD), satir('Ortalama (Leq)', leqD), bilgi,
        el('div', { sinif: 'dugmeler' },
          el('button', { sinif: 'birincil', onclick: baslat }, 'Başlat'),
          el('button', { onclick: durdur }, 'Durdur'),
          el('button', { onclick: () => { maks = -Infinity; enerjiTop = 0; ornek = 0; } }, 'Sıfırla'),
        ),
        el('h3', {}, 'Kalibrasyon'),
        el('p', { sinif: 'kucuk' }, 'Telefon mikrofonları kalibre değildir. Kalibre bir ses seviye ölçerle aynı anda ölçüp onun gösterdiği değeri girin:'),
        el('label', { sinif: 'girdi' }, el('span', {}, 'Referans cihazın gösterdiği dB'), refGir),
        el('div', { sinif: 'dugmeler' },
          el('button', { onclick: () => { const r = sayiOku(refGir.value); if (Number.isFinite(r) && sonDbfs != null) { ofset = r - sonDbfs; ayarYaz('sesOfset', ofset); bilgi.textContent = 'Kalibrasyon kaydedildi.'; } else bilgi.textContent = 'Önce ölçümü başlatın ve bir değer girin.'; } }, 'Kalibre et'),
          el('button', { onclick: () => { ofset = null; ayarYaz('sesOfset', null); } }, 'Kalibrasyonu sil'),
        ),
        uyari('Frekans ağırlığı (A/C) uygulanmaz ve telefon mikrofonları yüksek seslerde doyar. Sonuçlar bilgilendirme amaçlıdır; iş sağlığı ölçümleri için IEC 61672 uyumlu cihaz gerekir.'),
      );
      return durdur;
    },
  },

  // ------------------------------------------------------------ KRONOMETRE
  {
    id: 'kronometre', ad: 'Kronometre', ikon: '⏱️', aciklama: 'Süre ölçün, tur kaydedin.',
    ac(kok) {
      let baslangic = 0, gecen = 0, calisiyor = false, cerceve = null, sonTur = 0;
      const ekran = el('p', { sinif: 'buyuk-okuma kronometre' }, '00:00,00');
      const turlar = el('ol', { sinif: 'turlar', reversed: true });
      const bicim = ms => {
        const t = Math.floor(ms / 10);
        const cs = t % 100, s = Math.floor(t / 100) % 60, dk = Math.floor(t / 6000) % 60, sa = Math.floor(t / 360000);
        const p = n => String(n).padStart(2, '0');
        return (sa ? sa + ':' : '') + `${p(dk)}:${p(s)},${p(cs)}`;
      };
      const simdi = () => gecen + (calisiyor ? performance.now() - baslangic : 0);
      const ciz = () => { ekran.textContent = bicim(simdi()); if (calisiyor) cerceve = requestAnimationFrame(ciz); };
      const basDur = el('button', { sinif: 'birincil', onclick: () => {
        if (calisiyor) { gecen += performance.now() - baslangic; calisiyor = false; basDur.textContent = 'Devam'; }
        else { baslangic = performance.now(); calisiyor = true; basDur.textContent = 'Durdur'; ciz(); }
      } }, 'Başlat');
      kok.append(ekran,
        el('div', { sinif: 'dugmeler' }, basDur,
          el('button', { onclick: () => { const t = simdi(); turlar.prepend(el('li', {}, `${bicim(t - sonTur)}  (toplam ${bicim(t)})`)); sonTur = t; } }, 'Tur'),
          el('button', { onclick: () => { calisiyor = false; gecen = 0; sonTur = 0; turlar.textContent = ''; basDur.textContent = 'Başlat'; ciz(); } }, 'Sıfırla')),
        turlar);
      return () => cancelAnimationFrame(cerceve);
    },
  },
];
