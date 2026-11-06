// Ölçer — kamera ile ölçüm araçları: mesafe/yükseklik, nabız, renk.

import { bicimle, sayiOku } from './birimler.js';
import { el, ayarOku, ayarYaz, kameraAc, kayitDugmesi } from './ortak.js';

const der = r => r * 180 / Math.PI, rad = d => d * Math.PI / 180;

/** iOS ve yeni tarayıcılarda hareket sensörü izni ister. Reddedilse de dinlemeye devam edilir: çoğu Android cihazda izin gerekmez. */
async function hareketIzni() {
  for (const S of [window.DeviceOrientationEvent, window.DeviceMotionEvent]) {
    try { if (S && typeof S.requestPermission === 'function') await S.requestPermission(); } catch { /* yok */ }
  }
}

function kameraHatasi(e) {
  if (e?.name === 'NotAllowedError') return 'Kamera izni verilmedi. Telefon ayarlarından Ölçer\'e kamera izni verin.';
  if (e?.name === 'NotFoundError') return 'Kamera bulunamadı.';
  return 'Kamera açılamadı: ' + (e?.message || e);
}

// ================================================================ MESAFE & YÜKSEKLİK
export const MESAFE_YUKSEKLIK = {
  id: 'yukseklik', ad: 'Mesafe ve yükseklik ölçer (kamera)', ikon: '🏢',
  aciklama: 'Binanın, ağacın, direğin yüksekliğini ve uzaklığını kamerayla nişan alarak ölçün.',
  ac(kok) {
    let h = ayarOku('kameraYuksekligi', 1.5);
    let bilinenD = null, aciTaban = null, aciTepe = null, kam = null;
    const tampon = [];
    let aci = NaN, yan = NaN;

    const video = el('video', { sinif: 'vizor-video', autoplay: '', muted: '', playsinline: '' });
    const aciD = el('div', { sinif: 'vizor-aci' }, '—');
    const vizor = el('div', { sinif: 'vizor' }, video, el('div', { sinif: 'arti' }), aciD);
    const sonuc = el('div', { sinif: 'ciktilar' });
    const bilgi = el('p', { sinif: 'kucuk' }, 'Başlatın, telefonu dik tutun ve arti işaretini hedefe getirin.');
    const hGir = el('input', { type: 'text', inputmode: 'decimal', value: String(h).replace('.', ','), 'aria-label': 'Kamera yüksekliği' });
    const dGir = el('input', { type: 'text', inputmode: 'decimal', placeholder: 'bilinmiyor', 'aria-label': 'Bilinen mesafe' });
    hGir.addEventListener('input', () => { const x = sayiOku(hGir.value); if (x > 0) { h = x; ayarYaz('kameraYuksekligi', x); hesapla(); } });
    dGir.addEventListener('input', () => { const x = sayiOku(dGir.value); bilinenD = x > 0 ? x : null; hesapla(); });

    const yon = e => {
      if (e.beta == null) return;
      // Telefon dik (portre) tutulduğunda beta = 90°: kamera ekseni yatay. Yukarı bakınca beta > 90.
      tampon.push(e.beta - 90);
      if (tampon.length > 12) tampon.shift();
      aci = tampon.reduce((t, x) => t + x, 0) / tampon.length;
      yan = e.gamma;
      aciD.textContent = `${aci >= 0 ? '▲' : '▼'} ${bicimle(Math.abs(aci), 3)}°`;
      aciD.classList.toggle('egri', Math.abs(yan) > 6);
    };

    function satir(ad, deger, vurgu) { return el('div', { sinif: 'cikti' + (vurgu ? ' vurgu' : '') }, el('span', { sinif: 'cikti-ad' }, ad), el('span', { sinif: 'cikti-deger' }, deger)); }
    let sonSatirlar = [];
    function hesapla() {
      sonuc.textContent = '';
      sonSatirlar = [];
      let D = bilinenD;
      if (aciTaban != null) {
        if (aciTaban >= -0.5) { sonuc.append(el('p', { sinif: 'hata' }, 'Taban, kameranın altında olmalı: telefonu aşağı eğerek tabana nişan alın.')); return; }
        const Dt = h / Math.tan(rad(-aciTaban));
        if (D == null) D = Dt;
        sonSatirlar.push(['Yatay mesafe', `${bicimle(Dt, 4)} m`]);
      }
      if (aciTepe != null && D != null) {
        const H = h + D * Math.tan(rad(aciTepe));
        sonSatirlar.push(['Yükseklik', `${bicimle(H, 4)} m`]);
        sonSatirlar.push(['Tepeye eğik mesafe', `${bicimle(Math.hypot(D, H - h), 4)} m`]);
      }
      if (aciTaban != null) sonSatirlar.push(['Taban açısı', `${bicimle(aciTaban, 3)}°`]);
      if (aciTepe != null) sonSatirlar.push(['Tepe açısı', `${bicimle(aciTepe, 3)}°`]);
      for (const [a, b] of sonSatirlar) sonuc.append(satir(a, b, a === 'Yükseklik' || a === 'Yatay mesafe'));
      if (aciTepe != null && D == null) sonuc.append(el('p', { sinif: 'bekliyor' }, 'Yükseklik için önce tabana nişan alın ya da mesafeyi girin.'));
    }

    const kaydetTaban = () => { if (!Number.isFinite(aci)) return; aciTaban = aci; hesapla(); };
    const kaydetTepe = () => { if (!Number.isFinite(aci)) return; aciTepe = aci; hesapla(); };

    async function baslat() {
      try {
        await hareketIzni();
        addEventListener('deviceorientation', yon);
        bilgi.textContent = 'Telefonu dik tutun. Önce cismin dibine (yere değdiği yere), sonra tepesine nişan alın.';
        setTimeout(() => { if (!Number.isFinite(aci)) bilgi.textContent = 'Eğim sensöründen veri gelmiyor: hareket sensörü izni verilmemiş ya da cihazda sensör yok.'; }, 2500);
      } catch (e) { bilgi.textContent = e.message; }
      try { kam = await kameraAc(video); } catch (e) { bilgi.textContent = kameraHatasi(e) + ' Açı ölçümü kamera olmadan da çalışır.'; }
    }

    kok.append(
      vizor,
      el('div', { sinif: 'dugmeler' },
        el('button', { type: 'button', sinif: 'birincil', onclick: baslat }, '▶ Başlat'),
        el('button', { type: 'button', onclick: kaydetTaban }, '① Tabana nişan → kaydet'),
        el('button', { type: 'button', onclick: kaydetTepe }, '② Tepeye nişan → kaydet'),
        el('button', { type: 'button', onclick: () => { aciTaban = aciTepe = null; hesapla(); } }, '↺ Sıfırla'),
        kayitDugmesi(() => sonSatirlar, 'Mesafe / yükseklik ölçümü'),
      ),
      bilgi, sonuc,
      el('label', { sinif: 'girdi' }, el('span', {}, 'Telefonun yerden yüksekliği (m) — göz hizası ≈ boyunuz − 0,1 m'), hGir),
      el('label', { sinif: 'girdi' }, el('span', {}, 'Mesafeyi biliyorsanız (m) — tabanı göremiyorsanız'), dGir),
      el('p', { sinif: 'uyari' }, 'Yöntem: mesafe = h ÷ tan(taban açısı), yükseklik = h + mesafe × tan(tepe açısı). Zemin düz olmalı. Açıdaki 1° hata, 20 m mesafede yaklaşık 0,35 m hata yapar; ölçümü 2–3 kez tekrarlayıp ortalamasını alın. Cisimden, yüksekliği kadar uzakta durmak en iyi sonucu verir.'),
    );
    return () => { removeEventListener('deviceorientation', yon); kam?.kapat(); };
  },
};

// ================================================================ NABIZ
/** Eşit aralıklı olmayan örnekleri doğrusal aradeğerlemeyle fs (Hz) aralıklı diziye çevirir. */
function yenidenOrnekle(ornek, kanal, fs) {
  const t0 = ornek[0][0], t1 = ornek[ornek.length - 1][0];
  const n = Math.floor((t1 - t0) / 1000 * fs);
  const y = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * 1000 / fs;
    while (j < ornek.length - 2 && ornek[j + 1][0] < t) j++;
    const a = ornek[j], b = ornek[j + 1];
    y[i] = a[kanal] + (b[kanal] - a[kanal]) * (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
  }
  return y;
}
const kayanOrtalama = (y, w) => {
  const z = new Float64Array(y.length);
  let top = 0;
  for (let i = 0, k = 0; i < y.length; i++) {
    top += y[i];
    if (i - k + 1 > w) top -= y[k++];
    z[i] = top / (i - k + 1);
  }
  // Gecikmeyi gidermek için merkeze kaydır
  const yarim = Math.floor(w / 2);
  return z.map((_, i) => z[Math.min(y.length - 1, i + yarim)]);
};

/** PPG sinyalinden nabız: yavaş eğilimi çıkar, yumuşat, otokorelasyonla periyodu bul. */
export function nabizHesapla(y, fs) {
  const n = y.length;
  const egilim = kayanOrtalama(y, Math.round(fs * 1.5));
  const z = kayanOrtalama(y.map((v, i) => v - egilim[i]), Math.max(1, Math.round(fs * 0.15)));
  let enerji = 0;
  for (const v of z) enerji += v * v;
  if (!enerji) return null;
  const r = lag => { let t = 0; for (let i = 0; i + lag < n; i++) t += z[i] * z[i + lag]; return t / enerji * n / (n - lag); };
  const lMin = Math.round(fs * 60 / 200), lMax = Math.min(n - 2, Math.round(fs * 60 / 40));
  const ac = [];
  for (let l = lMin - 1; l <= lMax + 1; l++) ac[l] = r(l);
  // Yerel tepeler arasından en yükseğinin %85'ine ulaşan ilk tepe (yarım periyot hatasını önler)
  const tepeler = [];
  for (let l = lMin; l <= lMax; l++) if (ac[l] > 0 && ac[l] >= ac[l - 1] && ac[l] >= ac[l + 1]) tepeler.push(l);
  if (!tepeler.length) return null;
  const enYuksek = Math.max(...tepeler.map(l => ac[l]));
  const l = tepeler.find(x => ac[x] >= 0.85 * enYuksek);
  const kayma = (ac[l - 1] - ac[l + 1]) / (2 * (ac[l - 1] - 2 * ac[l] + ac[l + 1])) || 0;
  return { bpm: 60 * fs / (l + kayma), kalite: ac[l], z };
}

export const NABIZ = {
  id: 'nabiz', ad: 'Nabız ölçer (kamera)', ikon: '❤️',
  aciklama: 'Parmağınızı arka kamera ve flaşın üzerine koyun; kalp atışınızı ölçsün.',
  ac(kok) {
    let kam = null, calisiyor = false, flasAcik = false;
    const ornek = [];          // [zaman ms, kırmızı, yeşil]
    let parmakVar = false, gorulen = 0, kayip = 0, baslangic = 0, sonHesap = 0;
    const tahminler = [];      // son geçerli tahminler
    let sonBpm = null, sonKalite = 0;

    const video = el('video', { sinif: 'gizli-video', autoplay: '', muted: '', playsinline: '' });
    const tuval = document.createElement('canvas'); tuval.width = 32; tuval.height = 32;
    const g = tuval.getContext('2d', { willReadFrequently: true });
    const kalp = el('div', { sinif: 'kalp' }, '❤');
    const bpmD = el('div', { sinif: 'buyuk-okuma nabiz-bpm' }, '—');
    const durum = el('p', { sinif: 'kucuk nabiz-durum' }, 'Başlatmak için düğmeye basın.');
    const ilerleme = el('div', { sinif: 'nabiz-ilerleme' }, el('div'));
    const dalga = el('canvas', { sinif: 'nabiz-dalga', height: '90' });
    const sinyalD = el('p', { sinif: 'kucuk' });

    const ilerlet = oran => { ilerleme.firstChild.style.width = `${Math.max(0, Math.min(1, oran)) * 100}%`; };

    function dalgaCiz(z, fs) {
      const dpr = devicePixelRatio || 1, w = dalga.clientWidth, h = 90;
      if (!w) return;
      dalga.width = w * dpr; dalga.height = h * dpr;
      const c = dalga.getContext('2d'); c.scale(dpr, dpr);
      const son = Array.from(z.slice(-Math.round(fs * 5))).map(v => -v); // kan artınca görüntü kararır: ters çevir
      const mx = Math.max(...son.map(Math.abs)) || 1;
      c.strokeStyle = '#ef4444'; c.lineWidth = 2; c.beginPath();
      son.forEach((v, i) => { const x = i / (son.length - 1) * w, y = h / 2 - (v / mx) * (h / 2 - 4); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.stroke();
    }

    function hesapla(simdi) {
      const sure = (simdi - baslangic) / 1000;
      ilerlet(sure / 8);
      if (sure < 5) { durum.textContent = `Ölçülüyor… kıpırdamadan bekleyin (${Math.ceil(5 - sure)} s)`; return; }
      const pencere = ornek.filter(x => simdi - x[0] <= 10000);
      const fs = 30;
      // Kırmızı kanal flaş altında tavana dayanabilir: iki kanaldan sinyali güçlü olanı seç
      const sonuclar = [1, 2].map(k => nabizHesapla(yenidenOrnekle(pencere, k, fs), fs)).filter(Boolean);
      if (!sonuclar.length) return;
      const en = sonuclar.reduce((a, b) => (b.kalite > a.kalite ? b : a));
      dalgaCiz(en.z, fs);
      sinyalD.textContent = `Sinyal kalitesi: %${Math.round(Math.max(0, en.kalite) * 100)}`;
      if (en.kalite < 0.3) { durum.textContent = 'Sinyal zayıf: parmağınızı bastırmadan, hafifçe koyun ve kıpırdamayın.'; return; }
      tahminler.push(en.bpm);
      if (tahminler.length > 6) tahminler.shift();
      const sirali = [...tahminler].sort((a, b) => a - b);
      const ortanca = sirali[Math.floor(sirali.length / 2)];
      const tutarli = tahminler.filter(x => Math.abs(x - ortanca) / ortanca < 0.08).length;
      if (tutarli >= 3) {
        sonBpm = ortanca; sonKalite = en.kalite;
        bpmD.textContent = `${Math.round(ortanca)}`;
        kalp.style.animationDuration = `${60 / ortanca}s`;
        kalp.classList.add('atiyor');
        durum.textContent = sure > 20 ? '✅ Ölçüm kararlı. Kaydedebilirsiniz.' : 'Ölçülüyor… daha kararlı sonuç için birkaç saniye daha bekleyin.';
      } else durum.textContent = 'Sonuç oturuyor… kıpırdamayın.';
    }

    function kare(simdi) {
      if (!calisiyor) return;
      if (video.readyState >= 2 && video.videoWidth) {
        const w = video.videoWidth, h = video.videoHeight;
        g.drawImage(video, w * 0.25, h * 0.25, w * 0.5, h * 0.5, 0, 0, 32, 32);
        const d = g.getImageData(0, 0, 32, 32).data;
        let r = 0, gr = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
        const px = d.length / 4; r /= px; gr /= px; b /= px;
        const kirmiziOrani = r / (r + gr + b + 1e-6);
        const algilandi = r > 40 && kirmiziOrani > 0.42;
        if (algilandi) { gorulen++; kayip = 0; } else { kayip++; gorulen = 0; }
        if (!parmakVar && gorulen >= 5) { parmakVar = true; baslangic = simdi; ornek.length = 0; tahminler.length = 0; }
        if (parmakVar && kayip >= 20) {
          parmakVar = false; kalp.classList.remove('atiyor'); ilerlet(0);
          if (!sonBpm) bpmD.textContent = '—';
        }
        if (!parmakVar) durum.textContent = 'Parmak ucunuzu arka kameranın ve flaşın üzerine tamamen kapatacak şekilde, bastırmadan koyun.';
        else {
          // Parmağın kaydığı tek tük kareleri atla: sinyalde büyük sıçrama yaratır
          if (algilandi) ornek.push([simdi, r, gr]);
          while (ornek.length && simdi - ornek[0][0] > 12000) ornek.shift();
          if (simdi - sonHesap > 500) { sonHesap = simdi; hesapla(simdi); }
        }
      }
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(t => kare(t));
      else requestAnimationFrame(kare);
    }

    async function flas(ac) {
      if (!kam) return false;
      try { await kam.iz.applyConstraints({ advanced: [{ torch: ac }] }); flasAcik = ac; return true; } catch { return false; }
    }

    async function baslat() {
      if (calisiyor) return;
      try {
        kam = await kameraAc(video, { torch: true });
        calisiyor = true;
        flasAcik = kam.flas;
        if (!flasAcik) setTimeout(async () => { if (!(await flas(true))) durum.textContent = 'Flaş açılamadı. Aydınlık bir ortamda parmağınızı ışığa karşı tutun ya da "Flaş" düğmesini deneyin.'; }, 700);
        kare(performance.now());
      } catch (e) { durum.textContent = kameraHatasi(e); }
    }
    function durdur() { calisiyor = false; kam?.kapat(); kam = null; parmakVar = false; kalp.classList.remove('atiyor'); }

    kok.append(
      el('div', { sinif: 'nabiz-kutu' }, kalp, el('div', {}, bpmD, el('div', { sinif: 'kucuk', style: 'text-align:center' }, 'atım/dk'))),
      ilerleme, durum, dalga, sinyalD, video,
      el('div', { sinif: 'dugmeler' },
        el('button', { type: 'button', sinif: 'birincil', onclick: baslat }, '▶ Başlat'),
        el('button', { type: 'button', onclick: durdur }, '⏸ Durdur'),
        el('button', { type: 'button', onclick: () => flas(!flasAcik) }, '🔦 Flaş'),
        kayitDugmesi(() => sonBpm ? [['Nabız', `${Math.round(sonBpm)} atım/dk`], ['Sinyal kalitesi', `%${Math.round(sonKalite * 100)}`]] : [], 'Nabız ölçümü'),
      ),
      el('h3', {}, 'Nasıl ölçülür?'),
      el('ol', { sinif: 'kucuk' },
        el('li', {}, 'Oturun, kolunuzu bir yere dayayın, 1 dakika dinlenin.'),
        el('li', {}, 'İşaret parmağınızın ucunu arka kameraya ve flaşa birlikte kapatın. Bastırmayın; bastırınca kan akışı azalır ve sinyal kaybolur.'),
        el('li', {}, 'Ekran kırmızıya döner ve ilerleme çubuğu dolar. 15–20 saniye kıpırdamadan bekleyin.'),
        el('li', {}, 'Birden çok kameralı telefonlarda flaşa en yakın kamerayı kapatın. Soğuk parmakta sinyal zayıftır; parmağı ısıtın.')),
      el('p', { sinif: 'uyari' }, 'Fotopletismografi (PPG) yöntemi: her kalp atışında parmaktaki kan miktarı değişir ve kameranın gördüğü renk hafifçe değişir. Tıbbi cihaz değildir; teşhis için kullanmayın. Flaş ısınabilir, ölçümü 1 dakikadan uzun tutmayın.'),
    );
    return durdur;
  },
};

// ================================================================ RENK
const RENK_ADLARI = [
  ['Beyaz', 255, 255, 255], ['Siyah', 0, 0, 0], ['Gri', 128, 128, 128], ['Açık gri', 200, 200, 200], ['Koyu gri', 64, 64, 64],
  ['Kırmızı', 220, 20, 30], ['Bordo', 128, 0, 32], ['Pembe', 255, 160, 190], ['Fuşya', 230, 0, 126], ['Turuncu', 255, 140, 0],
  ['Somon', 250, 128, 114], ['Sarı', 255, 220, 0], ['Hardal', 205, 160, 30], ['Krem', 255, 245, 210], ['Bej', 225, 200, 160],
  ['Kahverengi', 120, 70, 30], ['Ten rengi', 225, 180, 150], ['Haki', 140, 140, 80], ['Yeşil', 30, 160, 60], ['Açık yeşil', 150, 220, 110],
  ['Koyu yeşil', 0, 90, 40], ['Zeytin yeşili', 110, 110, 30], ['Turkuaz', 30, 200, 200], ['Camgöbeği', 0, 180, 220], ['Mavi', 20, 80, 210],
  ['Açık mavi', 140, 190, 240], ['Lacivert', 20, 30, 90], ['Mor', 120, 40, 160], ['Lila', 200, 160, 220], ['Altın', 212, 175, 55], ['Gümüş', 192, 192, 192],
];

function srgbDogrusal(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
export function rgbLab(r, g, b) {
  const R = srgbDogrusal(r), G = srgbDogrusal(g), B = srgbDogrusal(b);
  // sRGB → XYZ (IEC 61966-2-1, D65) → CIELAB
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.0721750 * B;
  const Z = (0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / 1.08883;
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
function rgbHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l * 100];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
export function enYakinRenk(r, g, b) {
  const L = rgbLab(r, g, b);
  let en = null, enD = Infinity;
  for (const [ad, ...c] of RENK_ADLARI) {
    const M = rgbLab(...c);
    const d = Math.hypot(L[0] - M[0], L[1] - M[1], L[2] - M[2]);
    if (d < enD) { enD = d; en = ad; }
  }
  return { ad: en, fark: enD };
}

export const RENK = {
  id: 'renk', ad: 'Renk ölçer (kamera)', ikon: '🎨',
  aciklama: 'Kameranın gördüğü rengin RGB, HEX, HSL, CIELAB değerleri ve adı; iki rengi karşılaştırma (ΔE).',
  ac(kok) {
    let kam = null, cerceve = null, donuk = false, referans = null, son = null;
    const video = el('video', { sinif: 'vizor-video', autoplay: '', muted: '', playsinline: '' });
    const tuval = document.createElement('canvas');
    const g = tuval.getContext('2d', { willReadFrequently: true });
    const ornekKutu = el('div', { sinif: 'renk-ornek' });
    const vizor = el('div', { sinif: 'vizor' }, video, el('div', { sinif: 'renk-hedef' }));
    const degerler = el('div', { sinif: 'ciktilar' });
    const bilgi = el('p', { sinif: 'kucuk' }, 'Başlatın ve ortadaki kareyi ölçmek istediğiniz renge getirin.');

    const yaz = (r, gg, b) => {
      const hex = '#' + [r, gg, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
      const [h, s, l] = rgbHsl(r, gg, b);
      const lab = rgbLab(r, gg, b);
      const ad = enYakinRenk(r, gg, b);
      son = [['Renk', `${ad.ad}${ad.fark > 25 ? ' (yaklaşık)' : ''}`], ['HEX', hex], ['RGB', `${Math.round(r)}, ${Math.round(gg)}, ${Math.round(b)}`],
        ['HSL', `${Math.round(h)}°, %${Math.round(s)}, %${Math.round(l)}`], ['CIELAB (D65)', `L ${bicimle(lab[0], 3)}  a ${bicimle(lab[1], 3)}  b ${bicimle(lab[2], 3)}`]];
      if (referans) {
        const dE = Math.hypot(lab[0] - referans.lab[0], lab[1] - referans.lab[1], lab[2] - referans.lab[2]);
        son.push(['Referansa fark (ΔE*ab)', `${bicimle(dE, 3)} — ${dE < 1 ? 'fark edilmez' : dE < 2.3 ? 'zor fark edilir' : dE < 5 ? 'belirgin' : 'çok farklı'}`]);
      }
      ornekKutu.style.background = hex;
      degerler.textContent = '';
      for (const [a, v] of son) {
        const d = el('button', { type: 'button', sinif: 'cikti-deger' }, v);
        d.addEventListener('click', () => navigator.clipboard?.writeText(v));
        degerler.append(el('div', { sinif: 'cikti' + (a === 'Renk' ? ' vurgu' : '') }, el('span', { sinif: 'cikti-ad' }, a), d));
      }
      return { lab, hex };
    };
    let sonRgb = null, sonCizim = 0;
    function dongu() {
      if (!donuk && video.readyState >= 2 && performance.now() - sonCizim > 150) {
        sonCizim = performance.now();
        const w = video.videoWidth, h = video.videoHeight, k = Math.max(6, Math.round(Math.min(w, h) * 0.04));
        tuval.width = k; tuval.height = k;
        g.drawImage(video, (w - k) / 2, (h - k) / 2, k, k, 0, 0, k, k);
        const d = g.getImageData(0, 0, k, k).data;
        let r = 0, gg = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4;
        sonRgb = [r / n, gg / n, b / n];
        yaz(...sonRgb);
      }
      cerceve = requestAnimationFrame(dongu);
    }
    async function baslat() {
      if (kam) return;
      try { kam = await kameraAc(video); dongu(); } catch (e) { bilgi.textContent = kameraHatasi(e); }
    }
    const dondur = el('button', { type: 'button', onclick: () => { donuk = !donuk; dondur.textContent = donuk ? '▶ Devam' : '⏸ Dondur'; } }, '⏸ Dondur');
    kok.append(
      vizor, el('div', { sinif: 'renk-satir' }, ornekKutu, degerler), bilgi,
      el('div', { sinif: 'dugmeler' },
        el('button', { type: 'button', sinif: 'birincil', onclick: baslat }, '▶ Başlat'), dondur,
        el('button', { type: 'button', onclick: () => { if (sonRgb) { referans = { lab: rgbLab(...sonRgb) }; bilgi.textContent = 'Referans renk alındı; şimdi karşılaştırmak istediğiniz renge nişan alın.'; } } }, '🎯 Referans al'),
        kayitDugmesi(() => son, 'Renk ölçümü'),
      ),
      el('p', { sinif: 'uyari' }, 'Kamera, ortam ışığına göre beyaz dengesini ve pozlamayı otomatik ayarlar; aynı renk farklı ışıkta farklı ölçülür. Karşılaştırmaları aynı ışıkta, aynı açıdan yapın. Boya/kumaş eşleştirmesi için yaklaşık sonuç verir; renk ölçüm cihazının (spektrofotometre) yerini tutmaz.'),
    );
    return () => { cancelAnimationFrame(cerceve); kam?.kapat(); };
  },
};
