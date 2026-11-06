// Ölçer — frekans ölçer: akort cihazı (perde tespiti) ve spektrum analizörü.

import { bicimle, sayiOku } from './birimler.js';
import { el, ayarOku, ayarYaz, kayitDugmesi } from './ortak.js';

const NOTALAR = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const ULUSLARARASI = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/**
 * Temel frekans (Hz), McLeod "normalleştirilmiş kare farkı" (NSDF) yöntemiyle.
 * Oktav hatasını önlemek için en yüksek tepenin %90'ına ulaşan ilk tepe seçilir. Sessizlik/gürültüde null.
 */
export function perdeBul(buf, sr) {
  const n = buf.length;
  let rms = 0;
  for (const x of buf) rms += x * x;
  if (Math.sqrt(rms / n) < 0.008) return null;
  const enBuyukLag = Math.min(Math.floor(n / 2), Math.ceil(sr / 40));
  const nsdf = new Float64Array(enBuyukLag + 1);
  for (let tau = 0; tau <= enBuyukLag; tau++) {
    let r = 0, m = 0;
    for (let i = 0; i + tau < n; i++) { const a = buf[i], b = buf[i + tau]; r += a * b; m += a * a + b * b; }
    nsdf[tau] = m > 0 ? 2 * r / m : 0;
  }
  // Pozitif bölgelerdeki tepeler
  const tepeler = [];
  let tau = 1;
  while (tau < enBuyukLag && nsdf[tau] > 0) tau++;          // ilk sıfır geçişine kadar atla
  while (tau < enBuyukLag) {
    while (tau < enBuyukLag && nsdf[tau] <= 0) tau++;
    let enIyi = tau;
    while (tau < enBuyukLag && nsdf[tau] > 0) { if (nsdf[tau] > nsdf[enIyi]) enIyi = tau; tau++; }
    if (enIyi < enBuyukLag && nsdf[enIyi] > 0) tepeler.push(enIyi);
  }
  if (!tepeler.length) return null;
  const enYuksek = Math.max(...tepeler.map(t => nsdf[t]));
  if (enYuksek < 0.6) return null;
  const secilen = tepeler.find(t => nsdf[t] >= 0.9 * enYuksek);
  const [a, b, g] = [nsdf[secilen - 1], nsdf[secilen], nsdf[secilen + 1]];
  const kayma = (a - g) / (2 * (a - 2 * b + g)) || 0;
  const f = sr / (secilen + kayma);
  return f >= 40 && f <= 2000 ? f : null;
}

export function notaBilgisi(f, a4 = 440) {
  const n = 12 * Math.log2(f / a4) + 69;
  const yakin = Math.round(n);
  return { ad: NOTALAR[((yakin % 12) + 12) % 12], uluslararasi: ULUSLARARASI[((yakin % 12) + 12) % 12], oktav: Math.floor(yakin / 12) - 1, sent: (n - yakin) * 100, hedef: a4 * 2 ** ((yakin - 69) / 12) };
}

export const FREKANS = {
  id: 'frekans', ad: 'Frekans ölçer ve akort cihazı', ikon: '🎵',
  aciklama: 'Sesin frekansı (Hz), notası ve sent sapması; spektrum analizörü. Enstrüman akordu, uğultu/titreşim kaynağı bulma.',
  ac(kok) {
    let a4 = ayarOku('a4', 440);
    let akis = null, baglam = null, analiz = null, cerceve = null, mod = 'akort';
    let son = null;
    const tepeler = [];

    const fD = el('div', { sinif: 'buyuk-okuma' }, '— Hz');
    const notaD = el('div', { sinif: 'akort-nota' }, '—');
    const ibre = el('div', { sinif: 'akort-ibre' });
    const gosterge = el('div', { sinif: 'akort-gosterge' }, el('span', {}, '−50'), el('span', {}, '0'), el('span', {}, '+50'), ibre);
    const sentD = el('div', { sinif: 'kucuk akort-sent' });
    const akortKutu = el('div', { sinif: 'akort' }, notaD, gosterge, sentD);
    const tuval = el('canvas', { sinif: 'spektrum', height: '180', hidden: true });
    const tepeD = el('div', { sinif: 'kucuk' });
    const bilgi = el('p', { sinif: 'kucuk' }, 'Mikrofon izni için "Başlat"a basın.');
    const a4Gir = el('input', { type: 'text', inputmode: 'decimal', value: String(a4).replace('.', ','), 'aria-label': 'La4 referansı' });
    a4Gir.addEventListener('input', () => { const x = sayiOku(a4Gir.value); if (x > 400 && x < 480) { a4 = x; ayarYaz('a4', x); } });

    function akortCiz(buf) {
      const f = perdeBul(buf, baglam.sampleRate);
      if (!f) return;
      // Ani sıçramaları yumuşat: son 5 ölçümün ortancası
      tepeler.push(f); if (tepeler.length > 5) tepeler.shift();
      const ort = [...tepeler].sort((x, y) => x - y)[Math.floor(tepeler.length / 2)];
      const nb = notaBilgisi(ort, a4);
      son = [['Frekans', `${bicimle(ort, 5)} Hz`], ['Nota', `${nb.ad}${nb.oktav} (${nb.uluslararasi}${nb.oktav})`], ['Sapma', `${nb.sent >= 0 ? '+' : ''}${bicimle(nb.sent, 2)} sent`], ['Referans', `La4 = ${bicimle(a4, 4)} Hz`]];
      fD.textContent = `${bicimle(ort, 5)} Hz`;
      notaD.textContent = `${nb.ad}${nb.oktav}`;
      notaD.title = `${nb.uluslararasi}${nb.oktav}`;
      ibre.style.left = `${50 + Math.max(-50, Math.min(50, nb.sent))}%`;
      const tam = Math.abs(nb.sent) < 5;
      akortKutu.classList.toggle('tam', tam);
      sentD.textContent = `${nb.uluslararasi}${nb.oktav} · hedef ${bicimle(nb.hedef, 5)} Hz · ${tam ? 'akortlu ✓' : nb.sent < 0 ? 'pes (gerdirin)' : 'tiz (gevşetin)'}`;
    }

    function spektrumCiz() {
      const veri = new Float32Array(analiz.frequencyBinCount);
      analiz.getFloatFrequencyData(veri);
      const sr = baglam.sampleRate, binHz = sr / analiz.fftSize;
      const dpr = devicePixelRatio || 1, w = tuval.clientWidth, h = 180;
      tuval.width = w * dpr; tuval.height = h * dpr;
      const c = tuval.getContext('2d'); c.scale(dpr, dpr);
      const fMin = 20, fMax = Math.min(20000, sr / 2);
      const x = f => Math.log(f / fMin) / Math.log(fMax / fMin) * w;
      const renk = getComputedStyle(document.body);
      c.fillStyle = renk.getPropertyValue('--soluk'); c.font = '10px system-ui';
      for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 10000]) { c.fillRect(x(f), 0, 1, h - 12); c.fillText(f >= 1000 ? `${f / 1000}k` : String(f), x(f) + 2, h - 2); }
      c.fillStyle = renk.getPropertyValue('--vurgu');
      let enB = 0;
      for (let i = 1; i < veri.length; i++) {
        const f = i * binHz;
        if (f < fMin || f > fMax) continue;
        if (veri[i] > veri[enB] || !enB) enB = i;
        const y = Math.max(0, Math.min(1, (veri[i] + 100) / 80)) * (h - 14);
        c.fillRect(x(f), h - 14 - y, Math.max(1, x(f + binHz) - x(f)), y);
      }
      if (enB > 0 && veri[enB] > -75) {
        const [a, b, g] = [veri[enB - 1], veri[enB], veri[enB + 1]];
        const fTepe = (enB + ((a - g) / (2 * (a - 2 * b + g)) || 0)) * binHz;
        tepeD.textContent = `Baskın frekans: ${bicimle(fTepe, 5)} Hz (${bicimle(b, 3)} dBFS) · çözünürlük ≈ ${bicimle(binHz, 2)} Hz`;
        fD.textContent = `${bicimle(fTepe, 5)} Hz`;
        son = [['Baskın frekans', `${bicimle(fTepe, 5)} Hz`], ['Seviye', `${bicimle(b, 3)} dBFS`]];
      }
    }

    function dongu() {
      const buf = new Float32Array(analiz.fftSize);
      let sonAnaliz = 0;
      const adim = () => {
        const simdi = performance.now();
        // Perde tespiti ağır bir işlem: saniyede ~12 kez ve 3600 örnekle (40 Hz'de üç periyot) yeterli.
        if (mod === 'akort') { if (simdi - sonAnaliz > 80) { sonAnaliz = simdi; analiz.getFloatTimeDomainData(buf); akortCiz(buf.subarray(buf.length - 3600)); } }
        else spektrumCiz();
        cerceve = requestAnimationFrame(adim);
      };
      adim();
    }

    async function baslat() {
      if (akis) return;
      try {
        akis = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        baglam = new (window.AudioContext || window.webkitAudioContext)();
        analiz = baglam.createAnalyser();
        analiz.fftSize = 8192; analiz.smoothingTimeConstant = 0.6;
        baglam.createMediaStreamSource(akis).connect(analiz);
        bilgi.textContent = '';
        dongu();
      } catch (e) { bilgi.textContent = 'Mikrofona erişilemedi: ' + (e.message || e.name); akis = null; }
    }
    function durdur() { cancelAnimationFrame(cerceve); akis?.getTracks().forEach(t => t.stop()); baglam?.close(); akis = null; }

    const modDugme = el('button', { type: 'button', onclick: () => {
      mod = mod === 'akort' ? 'spektrum' : 'akort';
      akortKutu.hidden = mod !== 'akort'; tuval.hidden = mod === 'akort'; tepeD.hidden = mod === 'akort';
      modDugme.textContent = mod === 'akort' ? '📊 Spektrum' : '🎵 Akort';
    } }, '📊 Spektrum');

    kok.append(
      fD, akortKutu, tuval, tepeD, bilgi,
      el('div', { sinif: 'dugmeler' },
        el('button', { type: 'button', sinif: 'birincil', onclick: baslat }, '▶ Başlat'),
        el('button', { type: 'button', onclick: durdur }, '⏸ Durdur'), modDugme,
        kayitDugmesi(() => son, 'Frekans ölçümü')),
      el('label', { sinif: 'girdi' }, el('span', {}, 'Referans La4 (A4) frekansı (Hz) — standart 440 (ISO 16)'), a4Gir),
      el('p', { sinif: 'uyari' }, 'Akort modu tek bir sesin temel frekansını 40–2000 Hz aralığında bulur. Spektrum modu tüm frekansları gösterir: buzdolabı/trafo uğultusu (50 Hz şebeke ve katları), fan, motor ve titreşim kaynaklarını ayırt etmeye yarar. Telefon mikrofonları çok düşük (< 50 Hz) ve çok yüksek frekansları zayıf algılar.'),
    );
    tepeD.hidden = true;
    return durdur;
  },
};
