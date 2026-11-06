// Ölçer — anlık hız göstergesi (GPS hız ölçer + ivmeölçer).

import { bicimle, sayiOku, sureBicimle } from './birimler.js';
import { haversine, kerteriz, G0 } from './fizik.js';
import { el, ayarOku, ayarYaz, kayitDugmesi } from './ortak.js';
import { KeepAwake } from './yerel.js';

const BIRIMLER = [['km/sa', 3.6], ['m/s', 1], ['mph', 1 / 0.44704], ['kn', 3600 / 1852]];
const DURMA_ESIGI = 0.5;   // m/s — bunun altı GPS gürültüsü kabul edilip 0 gösterilir
const IZ_DOGRULUK = 25;    // m — mesafeye yalnızca bu doğruluktan iyi konumlar eklenir
const YONLER = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];

export const HIZ_OLCER = {
  id: 'hiz', ad: 'Hız göstergesi (anlık)', ikon: '🏎️', one: true,
  aciklama: 'GPS ile anlık hız, en yüksek ve ortalama hız, yol, rakım, ivme, G kuvveti, hız sınırı uyarısı ve 0–100 ölçümü.',
  ac(kok) {
    let birimNo = ayarOku('hizBirim', 0);
    let limit = ayarOku('hizLimit', null);            // m/s
    let hedef = ayarOku('hizHedef', 100 / 3.6);       // m/s, 0–100 ölçümü için
    let izleyici = null, kilit = null, ses = null;
    let son = null;                                    // {lat, lon, t, v}
    let v = 0, maks = 0, mesafe = 0, hareketSure = 0, baslangic = null, sonFix = 0;
    let gpsIvme = NaN, gKuvvet = NaN, gMaks = 0;
    let asimda = false;
    let yaris = { durum: 'kapali', t0: 0, sonuc: null };

    // ------------------------------------------------------------ görünüm
    const sayi = el('div', { sinif: 'hiz-sayi', 'aria-live': 'off' }, '0');
    const birimD = el('button', { sinif: 'hiz-birim', type: 'button', title: 'Birimi değiştir' });
    const durum = el('div', { sinif: 'hiz-durum' }, 'Başlatmak için "Başlat"a basın');
    const kutu = (ad) => { const d = el('strong', {}, '—'); return [el('div', { sinif: 'hiz-kutu' }, el('span', {}, ad), d), d]; };
    const [kMaks, dMaks] = kutu('En yüksek');
    const [kOrt, dOrt] = kutu('Ortalama');
    const [kYol, dYol] = kutu('Yol');
    const [kSure, dSure] = kutu('Süre');
    const [kRakim, dRakim] = kutu('Rakım');
    const [kYon, dYon] = kutu('Yön');
    const [kIvme, dIvme] = kutu('İvme (GPS)');
    const [kG, dG] = kutu('G kuvveti');
    const [kDog, dDog] = kutu('GPS doğruluğu');
    const yarisD = el('div', { sinif: 'hiz-yaris' });
    const ekran = el('div', { sinif: 'hiz-ekran' },
      sayi, birimD, durum,
      el('div', { sinif: 'hiz-izgara' }, kMaks, kOrt, kYol, kSure, kRakim, kYon, kIvme, kG, kDog),
      yarisD);

    const carpan = () => BIRIMLER[birimNo][1];
    const bHiz = ms => bicimle(ms * carpan(), ms * carpan() < 10 ? 2 : 3);
    const uzaklik = m => m < 1000 ? `${bicimle(m, 3)} m` : `${bicimle(m / 1000, 4)} km`;

    function ciz() {
      const goster = v < DURMA_ESIGI ? 0 : v * carpan();
      sayi.textContent = goster < 10 ? goster.toFixed(1).replace('.', ',') : String(Math.round(goster));
      birimD.textContent = BIRIMLER[birimNo][0];
      dMaks.textContent = `${bHiz(maks)} ${BIRIMLER[birimNo][0]}`;
      dOrt.textContent = hareketSure > 0 ? `${bHiz(mesafe / hareketSure)} ${BIRIMLER[birimNo][0]}` : '—';
      dYol.textContent = uzaklik(mesafe);
      dSure.textContent = baslangic ? sureBicimle(Math.round((Date.now() - baslangic) / 1000)) : '—';
      dIvme.textContent = Number.isFinite(gpsIvme) ? `${bicimle(gpsIvme, 2)} m/s²` : '—';
      dG.textContent = Number.isFinite(gKuvvet) ? `${bicimle(gKuvvet, 3)} g (en çok ${bicimle(gMaks, 3)})` : '—';
      ekran.classList.toggle('asim', asimda);
      if (yaris.durum === 'kapali') yarisD.textContent = '';
      else if (yaris.durum === 'hazir') yarisD.textContent = `0–${bHiz(hedef)} hazır: kalkışla birlikte süre başlar`;
      else if (yaris.durum === 'olcuyor') yarisD.textContent = `0–${bHiz(hedef)}: ${((performance.now() - yaris.t0) / 1000).toFixed(1).replace('.', ',')} s…`;
      else yarisD.textContent = `0–${bHiz(hedef)} ${BIRIMLER[birimNo][0]}: ${yaris.sonuc.toFixed(1).replace('.', ',')} s`;
    }

    // ------------------------------------------------------------ GPS
    function konum(p) {
      const c = p.coords, t = p.timestamp || Date.now();
      sonFix = Date.now();
      dDog.textContent = `±${bicimle(c.accuracy, 2)} m`;
      dRakim.textContent = c.altitude != null ? `${bicimle(c.altitude, 4)} m` : '—';
      const iyi = c.accuracy <= IZ_DOGRULUK;
      let yeniV = c.speed != null && c.speed >= 0 ? c.speed : null;
      let adim = 0;
      if (son) {
        const dt = (t - son.t) / 1000;
        if (dt > 0) {
          adim = haversine(son.lat, son.lon, c.latitude, c.longitude);
          // Cihaz hız vermiyorsa iki konum arasındaki yoldan hesapla.
          if (yeniV == null && iyi) yeniV = adim / dt;
          if (yeniV != null && dt < 5) gpsIvme = (yeniV - son.v) / dt;
          if (yeniV != null && yeniV >= DURMA_ESIGI) {
            hareketSure += dt;
            if (iyi) mesafe += adim;
          }
        }
      }
      if (yeniV == null) yeniV = 0;
      v = yeniV;
      if (iyi && v > maks) maks = v;
      const yon = c.heading != null && !Number.isNaN(c.heading) && v >= DURMA_ESIGI ? c.heading
        : (son && adim > c.accuracy ? kerteriz(son.lat, son.lon, c.latitude, c.longitude) : null);
      if (yon != null) dYon.textContent = `${Math.round(yon)}° ${YONLER[Math.round(yon / 45) % 8]}`;
      son = { lat: c.latitude, lon: c.longitude, t, v };

      durum.textContent = iyi ? 'GPS sinyali iyi' : `GPS sinyali zayıf (±${Math.round(c.accuracy)} m) — açık alana çıkın`;
      durum.classList.toggle('zayif', !iyi);

      // Hız sınırı uyarısı
      const yeniAsim = limit != null && v > limit;
      if (yeniAsim && !asimda) uyar();
      asimda = yeniAsim;

      // 0–hedef ölçümü
      if (yaris.durum === 'hazir' && v >= 0.8) { yaris.durum = 'olcuyor'; yaris.t0 = performance.now() - 500; }
      else if (yaris.durum === 'olcuyor') {
        if (v >= hedef) { yaris.durum = 'bitti'; yaris.sonuc = (performance.now() - yaris.t0) / 1000; navigator.vibrate?.(150); }
        else if (v < DURMA_ESIGI) yaris.durum = 'hazir';
      }
      ciz();
    }

    function hareket(e) {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      gKuvvet = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2) / G0;
      if (gKuvvet > gMaks) gMaks = gKuvvet;
    }

    function uyar() {
      navigator.vibrate?.([250, 120, 250]);
      try {
        ses ??= new (window.AudioContext || window.webkitAudioContext)();
        const o = ses.createOscillator(), g = ses.createGain();
        o.frequency.value = 880; g.gain.value = 0.25;
        o.connect(g).connect(ses.destination);
        o.start(); o.stop(ses.currentTime + 0.35);
      } catch { /* ses yok */ }
    }

    async function ekraniAcikTut() {
      try {
        const k = KeepAwake;
        if (k) { await k.keepAwake(); kilit = { release: () => k.allowSleep() }; return; }
        if ('wakeLock' in navigator) kilit = await navigator.wakeLock.request('screen');
      } catch { /* desteklenmiyor */ }
    }
    const gorunurluk = () => { if (document.visibilityState === 'visible' && izleyici != null) ekraniAcikTut(); };

    let saat = null;
    function baslat() {
      if (izleyici != null) return;
      if (!navigator.geolocation) { durum.textContent = 'Bu cihaz konum desteklemiyor.'; return; }
      durum.textContent = 'GPS sinyali bekleniyor…';
      baslangic ??= Date.now();
      izleyici = navigator.geolocation.watchPosition(konum, e => {
        durum.textContent = e.code === 1 ? 'Konum izni verilmedi. Ayarlardan Ölçer\'e konum izni verin.' : 'Konum alınamadı: ' + e.message;
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
      addEventListener('devicemotion', hareket);
      ekraniAcikTut();
      saat = setInterval(() => {
        if (sonFix && Date.now() - sonFix > 4000) { durum.textContent = 'GPS sinyali kesildi…'; durum.classList.add('zayif'); }
        ciz();
      }, 250);
      basDur.textContent = '⏸ Durdur';
      basDur.classList.remove('birincil');
    }
    function durdur() {
      if (izleyici != null) navigator.geolocation.clearWatch(izleyici);
      izleyici = null; son = null; v = 0;
      removeEventListener('devicemotion', hareket);
      clearInterval(saat);
      kilit?.release?.(); kilit = null;
      durum.textContent = 'Durduruldu';
      basDur.textContent = '▶ Başlat';
      basDur.classList.add('birincil');
      ciz();
    }

    // ------------------------------------------------------------ denetimler
    const basDur = el('button', { type: 'button', sinif: 'birincil', onclick: () => (izleyici == null ? baslat() : durdur()) }, '▶ Başlat');
    birimD.addEventListener('click', () => { birimNo = (birimNo + 1) % BIRIMLER.length; ayarYaz('hizBirim', birimNo); ciz(); limitGuncelle(); });

    const limitGir = el('input', { type: 'text', inputmode: 'decimal', placeholder: 'yok', 'aria-label': 'Hız sınırı' });
    const hedefGir = el('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Hedef hız' });
    const limitAd = el('span', {}), hedefAd = el('span', {});
    function limitGuncelle() {
      const b = BIRIMLER[birimNo][0];
      limitAd.textContent = `Hız sınırı uyarısı (${b})`;
      hedefAd.textContent = `Hızlanma ölçümü hedefi (${b})`;
      limitGir.value = limit == null ? '' : String(Math.round(limit * carpan()));
      hedefGir.value = String(Math.round(hedef * carpan()));
    }
    limitGir.addEventListener('change', () => {
      const x = sayiOku(limitGir.value);
      limit = Number.isFinite(x) && x > 0 ? x / carpan() : null;
      ayarYaz('hizLimit', limit);
    });
    hedefGir.addEventListener('change', () => {
      const x = sayiOku(hedefGir.value);
      if (Number.isFinite(x) && x > 0) { hedef = x / carpan(); ayarYaz('hizHedef', hedef); }
      ciz();
    });
    limitGuncelle();

    kok.append(
      ekran,
      el('div', { sinif: 'dugmeler' },
        basDur,
        el('button', { type: 'button', onclick: () => { maks = 0; mesafe = 0; hareketSure = 0; gMaks = 0; baslangic = izleyici != null ? Date.now() : null; ciz(); } }, '↺ Sıfırla'),
        el('button', { type: 'button', onclick: () => { yaris = { durum: yaris.durum === 'kapali' || yaris.durum === 'bitti' ? 'hazir' : 'kapali', t0: 0, sonuc: null }; baslat(); ciz(); } }, '⏱ 0–100 ölçümü'),
        el('button', { type: 'button', onclick: () => ekran.classList.toggle('hud') }, '🪞 HUD (cama yansıt)'),
        kayitDugmesi(() => baslangic ? [['En yüksek hız', dMaks.textContent], ['Ortalama hız', dOrt.textContent], ['Yol', dYol.textContent], ['Süre', dSure.textContent], ...(yaris.durum === 'bitti' ? [['Hızlanma', yarisD.textContent]] : [])] : [], 'Yolculuk (hız göstergesi)'),
        el('button', { type: 'button', onclick: () => { const d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else d.requestFullscreen?.().catch(() => {}); } }, '⛶ Tam ekran'),
      ),
      el('label', { sinif: 'girdi' }, limitAd, limitGir),
      el('label', { sinif: 'girdi' }, hedefAd, hedefGir),
      el('p', { sinif: 'uyari' },
        'GPS hızı açık havada tipik olarak ±0,5 km/sa doğrudur ve saniyede bir güncellenir; tünelde ve binaların arasında kesilebilir. ' +
        'Araç göstergeleri genellikle gerçek hızdan biraz fazlasını gösterir (yönetmelik eksik göstermeyi yasaklar). ' +
        'Ekran açık kaldıkça ölçüm sürer. Sürerken telefonla oynamayın; telefonu tutucuya yerleştirin.'),
    );
    ciz();
    document.addEventListener('visibilitychange', gorunurluk);
    return () => { durdur(); document.removeEventListener('visibilitychange', gorunurluk); ses?.close?.(); };
  },
};
