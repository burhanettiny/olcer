// Ölçer — canlı ölçüm paneli: telefonun ölçebildiği tüm büyüklükler tek ekranda.
// Android uygulamasında yerel "OlcerSensor" eklentisi (basınç, ışık, manyetik alan, sıcaklık, nem,
// yakınlık, adım, pil) kullanılır; tarayıcıda yalnızca web API'lerinin izin verdiği sensörler çalışır.

import { bicimle, sayiOku } from './birimler.js';
import { G0, barometrikYukseklik, ciyNoktasi, haversine } from './fizik.js';
import { el, ayarOku, ayarYaz, kayitDugmesi, paylas } from './ortak.js';

import { OlcerSensor, KeepAwake } from './yerel.js';

const yerel = () => OlcerSensor;
const GECMIS = 150;

function kart(ikon, ad, birim) {
  const kapat = el('button', { type: 'button', sinif: 'canli-kapat', 'aria-label': 'Küçült' }, '✕');
  const deger = el('span', { sinif: 'canli-deger' }, '—');
  const birimEl = el('span', { sinif: 'canli-birim' }, birim);
  const detay = el('div', { sinif: 'canli-detay' });
  const tuval = el('canvas', { sinif: 'canli-grafik', height: '48' });
  const durum = el('div', { sinif: 'canli-durum' }, 'bekleniyor…');
  const kok = el('section', { sinif: 'canli-kart bos' },
    el('header', {}, el('span', { 'aria-hidden': 'true' }, ikon), ' ', ad, kapat), el('div', { sinif: 'canli-ana' }, deger, ' ', birimEl), detay, tuval, durum);
  kok.tabIndex = 0;
  kok.title = 'Büyütmek için dokunun';
  const odakla = ac => { kok.classList.toggle('odak', ac); document.body.classList.toggle('odakta', ac); degisti = true; };
  kok.addEventListener('click', e => { if (e.target === kapat) { e.stopPropagation(); odakla(false); } else if (!kok.classList.contains('odak')) odakla(true); });
  kok.addEventListener('keydown', e => { if (e.key === 'Escape') odakla(false); if (e.key === 'Enter') odakla(true); });
  const seri = [];
  let degisti = false;
  return {
    kok, ekler: null,
    ozet() { return kok.hidden || kok.classList.contains('bos') || kok.classList.contains('yok') ? null : [ad, `${deger.textContent} ${birimEl.textContent}`]; },
    yaz(metin, satirlar = []) {
      kok.classList.remove('bos', 'yok');
      durum.textContent = '';
      deger.textContent = metin;
      detay.textContent = '';
      for (const [a, b] of satirlar) detay.append(el('div', {}, el('span', {}, a), el('strong', {}, b)));
    },
    birim(b) { birimEl.textContent = b; },
    nokta(x) { if (Number.isFinite(x)) { seri.push(x); if (seri.length > GECMIS) seri.shift(); degisti = true; } },
    yok(metin) { kok.classList.add('yok'); kok.classList.remove('bos'); durum.textContent = metin; },
    bilgi(metin) { durum.textContent = metin; },
    ciz() {
      if (!degisti || !kok.isConnected) return;
      degisti = false;
      const dpr = devicePixelRatio || 1, w = tuval.clientWidth, h = tuval.clientHeight || 48;
      if (!w) return;
      tuval.width = w * dpr; tuval.height = h * dpr;
      const g = tuval.getContext('2d'); g.scale(dpr, dpr);
      let min = Math.min(...seri), max = Math.max(...seri);
      if (max - min < 1e-9) { min -= 1; max += 1; }
      g.strokeStyle = getComputedStyle(document.body).getPropertyValue('--vurgu'); g.lineWidth = 1.5;
      g.beginPath();
      seri.forEach((y, i) => {
        const px = (i / (GECMIS - 1)) * w, py = h - 3 - ((y - min) / (max - min)) * (h - 6);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      });
      g.stroke();
    },
  };
}

/** Eşit aralıklı olmayan örneklerde baskın frekansı (Hz) ayrık Fourier dönüşümüyle bulur. */
function baskinFrekans(ornek) {
  const n = ornek.length;
  if (n < 32) return NaN;
  const sure = (ornek[n - 1][0] - ornek[0][0]) / 1000;
  if (sure <= 0) return NaN;
  const fs = (n - 1) / sure;
  const ort = ornek.reduce((t, x) => t + x[1], 0) / n;
  let enIyi = 0, enK = 0;
  for (let k = 1; k < n / 2; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) { const a = 2 * Math.PI * k * i / n; re += (ornek[i][1] - ort) * Math.cos(a); im -= (ornek[i][1] - ort) * Math.sin(a); }
    const g = re * re + im * im;
    if (g > enIyi) { enIyi = g; enK = k; }
  }
  return enK * fs / n;
}

export const CANLI = {
  id: 'canli', ad: 'Canlı ölçüm paneli', ikon: '📡', one: true,
  aciklama: 'İstediğiniz büyüklükleri seçin: hız, basınç, rakım, ışık, manyetik alan, ivme, titreşim, dönüş, eğim, adım, ses, pil… anlık.',
  ac(kok) {
    const temizlik = [], temizlikSabit = [];
    const k = {
      gps: kart('🛰️', 'Hız ve konum (GPS)', 'km/sa'),
      basinc: kart('⏲️', 'Hava basıncı ve rakım', 'hPa'),
      isik: kart('💡', 'Işık şiddeti', 'lx'),
      manyetik: kart('🧲', 'Manyetik alan', 'µT'),
      ivme: kart('📳', 'İvme ve titreşim', 'm/s²'),
      donus: kart('🔄', 'Dönüş hızı (jiroskop)', '°/s'),
      egim: kart('📐', 'Eğim ve yön', '°'),
      adim: kart('👣', 'Adım sayısı', 'adım'),
      ses: kart('🔊', 'Ses seviyesi', 'dBFS'),
      sicaklik: kart('🌡️', 'Ortam sıcaklığı ve nem', '°C'),
      yakinlik: kart('✋', 'Yakınlık', 'cm'),
      pil: kart('🔋', 'Pil', '%'),
    };
    const KISA = { gps: '🛰️ Hız/konum', basinc: '⏲️ Basınç/rakım', isik: '💡 Işık', manyetik: '🧲 Manyetik', ivme: '📳 İvme/titreşim', donus: '🔄 Dönüş', egim: '📐 Eğim/yön', adim: '👣 Adım', ses: '🔊 Ses', sicaklik: '🌡️ Sıcaklık/nem', yakinlik: '✋ Yakınlık', pil: '🔋 Pil' };
    const secim = new Set(ayarOku('canliSecim', Object.keys(k)).filter(x => k[x]));
    const secili = id => secim.has(id);
    const izgara = el('div', { sinif: 'canli-izgara' }, Object.values(k).map(x => x.kok));
    const cipler = el('div', { sinif: 'cipler', role: 'group', 'aria-label': 'Gösterilecek ölçümler' });
    function secimUygula() {
      for (const [id, x] of Object.entries(k)) x.kok.hidden = !secili(id);
      sesDugme.hidden = !secili('ses');
      cipler.textContent = '';
      for (const id of Object.keys(k)) {
        cipler.append(el('button', { type: 'button', sinif: 'cip', 'aria-pressed': String(secili(id)), onclick: () => {
          secili(id) ? secim.delete(id) : secim.add(id);
          ayarYaz('canliSecim', [...secim]);
          secimUygula();
          if (calisiyor) { hepsiniDurdur(); hepsiniBaslat(); }
        } }, KISA[id]));
      }
    }
    const bilgi = el('p', { sinif: 'kucuk' });
    let calisiyor = false;

    // -------------------------------------------------------- GPS
    let gpsId = null, gpsSon = null, yol = 0, gpsMaks = 0;
    function gpsBaslat() {
      if (!navigator.geolocation) return k.gps.yok('Konum desteklenmiyor.');
      if (!secili('gps')) return;
      gpsId = navigator.geolocation.watchPosition(p => {
        say('GPS konumu');
        const c = p.coords;
        let v = c.speed;
        if (gpsSon && (v == null || v < 0)) { const dt = (p.timestamp - gpsSon.t) / 1000; v = dt > 0 ? haversine(gpsSon.lat, gpsSon.lon, c.latitude, c.longitude) / dt : 0; }
        v = v ?? 0;
        if (gpsSon && c.accuracy <= 25 && v >= 0.5) yol += haversine(gpsSon.lat, gpsSon.lon, c.latitude, c.longitude);
        if (c.accuracy <= 25) gpsMaks = Math.max(gpsMaks, v);
        gpsSon = { lat: c.latitude, lon: c.longitude, t: p.timestamp };
        const kmh = v < 0.5 ? 0 : v * 3.6;
        k.gps.yaz(bicimle(kmh, kmh < 10 ? 2 : 3), [
          ['En yüksek', `${bicimle(gpsMaks * 3.6, 3)} km/sa`], ['Yol', yol < 1000 ? `${bicimle(yol, 3)} m` : `${bicimle(yol / 1000, 4)} km`],
          ['Rakım (GPS)', c.altitude != null ? `${bicimle(c.altitude, 4)} m` : '—'], ['Doğruluk', `±${bicimle(c.accuracy, 2)} m`],
          ['Konum', `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`],
        ]);
        k.gps.nokta(kmh);
      }, e => k.gps.yok(e.code === 1 ? 'Konum izni verilmedi.' : 'Konum alınamadı.'), { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
      temizlik.push(() => navigator.geolocation.clearWatch(gpsId));
    }

    // -------------------------------------------------------- ivme, dönüş, eğim (web API'leri)
    const titresim = [];
    let gMaks = 0, tepeIvme = 0, sonFrekans = NaN, frekansZamani = 0;
    function hareket(e) {
      say('Hareket (ivme/jiroskop)');
      const a = e.acceleration, ag = e.accelerationIncludingGravity, r = e.rotationRate;
      const simdi = performance.now();
      if (ag && ag.x != null) {
        const g = Math.hypot(ag.x, ag.y, ag.z) / G0;
        gMaks = Math.max(gMaks, g);
        let dogrusal = a && a.x != null ? Math.hypot(a.x, a.y, a.z) : Math.abs(Math.hypot(ag.x, ag.y, ag.z) - G0);
        tepeIvme = Math.max(tepeIvme, dogrusal);
        titresim.push([simdi, dogrusal]);
        while (titresim.length > 256) titresim.shift();
        if (simdi - frekansZamani > 1000) { sonFrekans = baskinFrekans(titresim); frekansZamani = simdi; }
        const son = titresim.filter(x => simdi - x[0] < 1000);
        const rms = Math.sqrt(son.reduce((t, x) => t + x[1] ** 2, 0) / Math.max(1, son.length));
        k.ivme.yaz(bicimle(dogrusal, 3), [
          ['x / y / z', a && a.x != null ? `${bicimle(a.x, 2)} / ${bicimle(a.y, 2)} / ${bicimle(a.z, 2)}` : '—'],
          ['G kuvveti', `${bicimle(g, 3)} g (en çok ${bicimle(gMaks, 3)})`],
          ['Titreşim (RMS, 1 s)', `${bicimle(rms, 3)} m/s²`], ['Tepe', `${bicimle(tepeIvme, 3)} m/s²`],
          ['Baskın frekans', Number.isFinite(sonFrekans) && rms > 0.05 ? `${bicimle(sonFrekans, 3)} Hz` : '—'],
        ]);
        k.ivme.nokta(dogrusal);
      }
      if (r && r.alpha != null) {
        const toplam = Math.hypot(r.alpha, r.beta, r.gamma);
        k.donus.yaz(bicimle(toplam, 3), [['x / y / z', `${bicimle(r.beta, 3)} / ${bicimle(r.gamma, 3)} / ${bicimle(r.alpha, 3)}`], ['Devir', `${bicimle(toplam / 6, 3)} d/dk`]]);
        k.donus.nokta(toplam);
      }
    }
    let baslik = null;
    function mutlakYon(e) { if (e.absolute && e.alpha != null) baslik = (360 - e.alpha) % 360; }
    function yon(e) {
      say('Yön (eğim)');
      if (e.beta == null) return;
      if (typeof e.webkitCompassHeading === 'number') baslik = e.webkitCompassHeading;
      else if (e.absolute && e.alpha != null) baslik = (360 - e.alpha) % 360;
      const egim = Math.atan(Math.hypot(Math.tan(e.beta * Math.PI / 180), Math.tan(e.gamma * Math.PI / 180))) * 180 / Math.PI;
      k.egim.yaz(bicimle(egim, 3), [['Ön–arka', `${bicimle(e.beta, 3)}°`], ['Sol–sağ', `${bicimle(e.gamma, 3)}°`], ['Pusula (manyetik)', baslik == null ? '—' : `${Math.round(baslik)}°`]]);
      k.egim.nokta(egim);
    }

    // -------------------------------------------------------- yerel sensörler
    let qnh = ayarOku('qnh', 1013.25), basincRef = null, sonBasinc = NaN;
    const basincGecmis = [];
    let adimIlk = null, isikMaks = 0, nemSon = NaN, sicaklikSon = NaN;
    const isleyici = {
      basinc([p]) {
        sonBasinc = p;
        const simdi = Date.now();
        basincGecmis.push([simdi, p]);
        while (basincGecmis.length && simdi - basincGecmis[0][0] > 3 * 3600e3) basincGecmis.shift();
        const eski = basincGecmis.find(x => simdi - x[0] < 3600e3);
        const egilim = eski && simdi - eski[0] > 600e3 ? (p - eski[1]) / ((simdi - eski[0]) / 3600e3) : NaN;
        basincRef ??= p;
        k.basinc.yaz(bicimle(p, 6), [
          ['Barometrik rakım', `${bicimle(barometrikYukseklik(p * 100, qnh * 100), 4)} m (QNH ${bicimle(qnh, 6)})`],
          ['Göreli yükseklik farkı', `${bicimle(barometrikYukseklik(p * 100, basincRef * 100), 3)} m`],
          ['Eğilim', Number.isFinite(egilim) ? `${bicimle(egilim, 2)} hPa/sa` : 'ölçülüyor…'],
        ]);
        k.basinc.nokta(p);
      },
      isik([lx]) { isikMaks = Math.max(isikMaks, lx); k.isik.yaz(bicimle(lx, 4), [['En yüksek', `${bicimle(isikMaks, 4)} lx`], ['Yorum', isikYorum(lx)]]); k.isik.nokta(lx); },
      manyetik([x, y, z]) {
        const b = Math.hypot(x, y, z);
        k.manyetik.yaz(bicimle(b, 4), [['x / y / z', `${bicimle(x, 3)} / ${bicimle(y, 3)} / ${bicimle(z, 3)} µT`], ['Yorum', b > 80 ? 'Yakında metal veya mıknatıs var' : b < 20 ? 'Kalibrasyon gerekebilir (8 çizin)' : 'Dünya manyetik alanı aralığında (25–65 µT)']]);
        k.manyetik.nokta(b);
      },
      sicaklik([t]) { sicaklikSon = t; sicaklikNemYaz(); },
      nem([rh]) { nemSon = rh; sicaklikNemYaz(); },
      yakinlik([cm]) { k.yakinlik.yaz(bicimle(cm, 3), [['Not', 'Çoğu telefon yalnızca "yakın / uzak" bildirir']]); k.yakinlik.nokta(cm); },
      adim([toplam]) { adimIlk ??= toplam; const n = toplam - adimIlk; k.adim.yaz(String(Math.round(n)), [['Tahmini yol (adım 0,72 m)', `${bicimle(n * 0.72, 4)} m`], ['Açılıştan beri sayaç', String(Math.round(toplam))]]); k.adim.nokta(n); },
    };
    function sicaklikNemYaz() {
      const satir = [];
      if (Number.isFinite(nemSon)) satir.push(['Bağıl nem', `%${bicimle(nemSon, 3)}`]);
      if (Number.isFinite(nemSon) && Number.isFinite(sicaklikSon)) satir.push(['Çiy noktası', `${bicimle(ciyNoktasi(sicaklikSon, nemSon), 3)} °C`]);
      k.sicaklik.yaz(Number.isFinite(sicaklikSon) ? bicimle(sicaklikSon, 3) : '—', satir);
    }

    async function yerelBaslat() {
      const P = yerel();
      if (!P) {
        webSensorleri();
        for (const tur of ['basinc', 'manyetik', 'sicaklik', 'yakinlik', 'adim', 'isik']) {
          if (!k[tur].kok.classList.contains('bos')) continue;
          k[tur].yok('Tarayıcı bu sensöre erişemiyor. Android uygulamasında çalışır.');
        }
        return;
      }
      const tutucu = await P.addListener('veri', e => { say('Yerel: ' + e.tur); isleyici[e.tur]?.(e.degerler.map(Number)); });
      temizlik.push(() => { tutucu.remove(); P.hepsiniDurdur(); });
      const { sensorler } = await P.liste();
      sensorListesi = sensorler;
      const yok = new Set(sensorler.filter(s => !s.var).map(s => s.tur));
      if (yok.has('sicaklik') && yok.has('nem')) k.sicaklik.yok('Bu telefonda ortam sıcaklığı/nem sensörü yok (çoğu telefonda bulunmaz). Pil sıcaklığı aşağıda.');
      const kartAdi = t => (t === 'nem' ? 'sicaklik' : t);
      for (const s of sensorler) {
        if (!secili(kartAdi(s.tur))) continue;
        if (!s.var) { if (s.tur !== 'sicaklik' && s.tur !== 'nem') k[s.tur].yok('Bu telefonda bu sensör yok.'); continue; }
        try { await P.baslat({ tur: s.tur }); } catch (e) { (k[s.tur] || k.sicaklik).yok(e.message); }
      }
    }

    function webSensorleri() {
      const dene = (Sinif, ayar, okuma, kartAd) => {
        if (!(Sinif in window)) return;
        try {
          const s = new window[Sinif](ayar);
          s.addEventListener('reading', () => okuma(s));
          s.addEventListener('error', e => k[kartAd].yok(e.error?.message || 'Sensör hatası'));
          s.start();
          temizlik.push(() => s.stop());
        } catch (e) { k[kartAd].yok(e.message); }
      };
      dene('AmbientLightSensor', { frequency: 5 }, s => isleyici.isik([s.illuminance]), 'isik');
      dene('Magnetometer', { frequency: 10 }, s => isleyici.manyetik([s.x, s.y, s.z]), 'manyetik');
    }

    // -------------------------------------------------------- pil
    async function pilOku() {
      const P = yerel();
      try {
        if (P) {
          const p = await P.pil();
          const satir = [['Gerilim', `${bicimle(p.gerilim, 4)} V`], ['Pil sıcaklığı', `${bicimle(p.sicaklik, 3)} °C`], ['Durum', p.sarj ? 'Şarj oluyor' : 'Pilde']];
          if (p.akim != null) satir.push(['Akım', `${bicimle(p.akim, 4)} mA`]);
          k.pil.yaz(bicimle(p.yuzde, 3), satir);
          k.pil.nokta(p.sicaklik);
        } else if (navigator.getBattery) {
          const b = await navigator.getBattery();
          k.pil.yaz(bicimle(b.level * 100, 3), [['Durum', b.charging ? 'Şarj oluyor' : 'Pilde']]);
        } else k.pil.yok('Pil bilgisi alınamıyor.');
      } catch (e) { k.pil.yok(e.message); }
    }

    // -------------------------------------------------------- ses
    let sesAkis = null, sesBaglam = null, sesCerceve = null;
    const sesOfset = ayarOku('sesOfset', null);
    async function sesBaslat() {
      try {
        sesAkis = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        sesBaglam = new (window.AudioContext || window.webkitAudioContext)();
        const an = sesBaglam.createAnalyser(); an.fftSize = 2048;
        sesBaglam.createMediaStreamSource(sesAkis).connect(an);
        const veri = new Float32Array(an.fftSize);
        let maks = -Infinity, son = 0;
        if (sesOfset != null) k.ses.birim('dB');
        const adim = () => {
          an.getFloatTimeDomainData(veri);
          let t = 0; for (const x of veri) t += x * x;
          const db = 20 * Math.log10(Math.max(Math.sqrt(t / veri.length), 1e-10)) + (sesOfset ?? 0);
          maks = Math.max(maks, db);
          if (performance.now() - son > 200) {
            son = performance.now();
            k.ses.yaz(bicimle(db, 3), [['En yüksek', bicimle(maks, 3)], ['Kalibrasyon', sesOfset == null ? 'yok (Ses seviyesi aracından yapılır)' : 'var']]);
            k.ses.nokta(db);
          }
          sesCerceve = requestAnimationFrame(adim);
        };
        adim();
        temizlik.push(() => { cancelAnimationFrame(sesCerceve); sesAkis.getTracks().forEach(x => x.stop()); sesBaglam.close(); });
      } catch (e) { k.ses.yok('Mikrofona erişilemedi: ' + (e.message || e.name)); }
    }

    // -------------------------------------------------------- genel
    async function hepsiniBaslat() {
      if (calisiyor) return;
      calisiyor = true;
      basla.textContent = 'Ölçüm sürüyor';
      basla.disabled = true;
      durdurDugme.hidden = false;
      bilgi.textContent = '';
      try {
        const D = window.DeviceMotionEvent;
        if (D && typeof D.requestPermission === 'function') await D.requestPermission();
        const O = window.DeviceOrientationEvent;
        if (O && typeof O.requestPermission === 'function') await O.requestPermission();
      } catch { /* iOS izni reddedildi */ }
      addEventListener('devicemotion', hareket);
      addEventListener('deviceorientation', yon);
      addEventListener('deviceorientationabsolute', mutlakYon);
      temizlik.push(() => { removeEventListener('devicemotion', hareket); removeEventListener('deviceorientation', yon); removeEventListener('deviceorientationabsolute', mutlakYon); });
      setTimeout(() => {
        if (!calisiyor) return;
        if (k.ivme.kok.classList.contains('bos')) k.ivme.yok('İvmeölçer verisi gelmiyor.');
        if (k.donus.kok.classList.contains('bos')) k.donus.yok('Jiroskop verisi gelmiyor.');
        if (k.egim.kok.classList.contains('bos')) k.egim.yok('Yön sensörü verisi gelmiyor.');
      }, 2500);
      gpsBaslat();
      if (secili('pil')) pilOku();
      const pilSaat = setInterval(() => secili('pil') && pilOku(), 5000);
      temizlik.push(() => clearInterval(pilSaat));
      await yerelBaslat();
      try {
        const KA = KeepAwake;
        if (KA) { await KA.keepAwake(); temizlik.push(() => KA.allowSleep()); }
        else if ('wakeLock' in navigator) { const w = await navigator.wakeLock.request('screen'); temizlik.push(() => w.release()); }
      } catch { /* yok */ }
    }

    function hepsiniDurdur() {
      temizlik.splice(0).forEach(f => { try { f(); } catch { /* yok */ } });
      calisiyor = false;
      basla.disabled = false;
      basla.textContent = '▶ Seçili sensörleri başlat';
      sesDugme.disabled = false;
      durdurDugme.hidden = true;
    }

    const cizSaat = setInterval(() => Object.values(k).forEach(x => x.ciz()), 250);
    const basla = el('button', { sinif: 'birincil', type: 'button', onclick: hepsiniBaslat }, '▶ Seçili sensörleri başlat');
    const durdurDugme = el('button', { type: 'button', hidden: true, onclick: hepsiniDurdur }, '⏸ Durdur');
    const sesDugme = el('button', { type: 'button', onclick: () => { sesDugme.disabled = true; sesBaslat(); } }, '🎤 Ses ölçümünü aç');
    const qnhGir = el('input', { type: 'text', inputmode: 'decimal', value: String(qnh).replace('.', ','), 'aria-label': 'QNH' });
    qnhGir.addEventListener('change', () => { const x = sayiOku(qnhGir.value); if (x > 800 && x < 1100) { qnh = x; ayarYaz('qnh', x); if (Number.isFinite(sonBasinc)) isleyici.basinc([sonBasinc]); } });
    k.ses.bilgi('Mikrofon izni için "Ses ölçümünü aç"a basın.');

    // -------------------------------------------------------- tanılama
    const sayaclar = {};
    let sensorListesi = null;
    function say(ad) { sayaclar[ad] = (sayaclar[ad] || 0) + 1; }
    const tanilamaKutu = el('pre', { sinif: 'tanilama', hidden: true });
    async function tanilamaYaz() {
      const satir = [];
      satir.push(`Ortam: ${OlcerSensor ? 'Android uygulaması (yerel eklenti bağlı)' : window.Capacitor?.isNativePlatform?.() ? 'Android uygulaması — YEREL EKLENTİ BAĞLI DEĞİL' : 'Tarayıcı'}`);
      satir.push(`Ölçüm: ${calisiyor ? 'sürüyor' : 'başlatılmadı'}`);
      for (const ad of ['geolocation', 'camera', 'microphone', 'accelerometer', 'gyroscope', 'magnetometer']) {
        try { const d = await navigator.permissions.query({ name: ad }); satir.push(`İzin ${ad}: ${d.state}`); } catch { /* sorgulanamıyor */ }
      }
      if (sensorListesi) {
        satir.push('', 'Telefondaki sensörler:');
        for (const x of sensorListesi) satir.push(`  ${x.tur}: ${x.var ? `var (${x.ad})` : 'yok'}`);
      }
      satir.push('', 'Gelen veri sayısı:');
      const adlar = Object.keys(sayaclar);
      if (!adlar.length) satir.push('  henüz veri yok');
      for (const ad of adlar) satir.push(`  ${ad}: ${sayaclar[ad]}`);
      satir.push('', `Tarayıcı: ${navigator.userAgent}`);
      tanilamaKutu.textContent = satir.join('\n');
    }
    const tanilamaSaat = setInterval(() => { if (!tanilamaKutu.hidden) tanilamaYaz(); }, 1000);
    temizlikSabit.push(() => clearInterval(tanilamaSaat));

    kok.append(
      el('p', { sinif: 'kucuk' }, 'Görmek istediğiniz ölçümleri seçin. Bir karta dokunursanız tam ekran büyür.'),
      cipler,
      el('div', { sinif: 'dugmeler' }, basla, durdurDugme, sesDugme,
        kayitDugmesi(() => Object.values(k).map(x => x.ozet()).filter(Boolean), 'Canlı ölçüm anlık görüntüsü'),
        el('button', { type: 'button', onclick: () => { yol = 0; gpsMaks = 0; gMaks = 0; tepeIvme = 0; isikMaks = 0; basincRef = Number.isFinite(sonBasinc) ? sonBasinc : null; adimIlk = null; } }, '↺ Sıfırla')),
      bilgi,
      izgara,
      el('label', { sinif: 'girdi' }, el('span', {}, 'Bugünkü deniz seviyesi basıncı QNH (hPa) — barometrik rakım için'), qnhGir),
      el('p', { sinif: 'kucuk' }, 'QNH değerini en yakın havalimanının METAR raporundan ya da meteorolojiden alın. "Göreli yükseklik farkı" ise QNH gerektirmez: Sıfırla\'ya bastığınız yere göre kaç metre çıktığınızı/indiğinizi gösterir (kat farkını bile ayırt eder).'),
      el('p', { sinif: 'uyari' }, 'Telefon sensörleri kalibre ölçüm cihazı değildir; değerler bilgilendirme amaçlıdır. Hangi sensörlerin bulunduğu telefona göre değişir.'),
      el('div', { sinif: 'dugmeler' },
        el('button', { type: 'button', onclick: () => { tanilamaKutu.hidden = !tanilamaKutu.hidden; tanilamaYaz(); } }, '🔧 Tanılama'),
        el('button', { type: 'button', onclick: () => { tanilamaYaz().then(() => paylas('Ölçer tanılama', tanilamaKutu.textContent)); } }, '📤 Tanılamayı paylaş')),
      tanilamaKutu,
    );
    secimUygula();
    if (!yerel()) bilgi.textContent = 'Tarayıcıda çalışıyorsunuz: basınç, adım, yakınlık gibi sensörler yalnızca Android uygulamasında görünür.';
    return () => { clearInterval(cizSaat); temizlikSabit.forEach(f => f()); hepsiniDurdur(); document.body.classList.remove('odakta'); };
  },
};

function isikYorum(lx) {
  if (lx < 1) return 'Karanlık';
  if (lx < 50) return 'Loş';
  if (lx < 300) return 'İç mekân, zayıf';
  if (lx < 750) return 'Ofis aydınlatması (TS EN 12464-1: 500 lx)';
  if (lx < 10000) return 'Çok aydınlık / bulutlu dış mekân';
  return 'Gün ışığı';
}
