// Ölçer — oto ekspertiz: boya kalınlığı ölçümlerini parça parça değerlendirme.

import { bicimle, sayiOku } from './birimler.js';
import { sayilariAyikla } from './fizik.js';
import { el, ayarOku, ayarYaz, kaydaEkle, paylas } from './ortak.js';

export const PARCALAR = [
  ['onTampon', 'Ön tampon'], ['solOnCamurluk', 'Sol ön çamurluk'], ['kaput', 'Kaput'], ['sagOnCamurluk', 'Sağ ön çamurluk'],
  ['solOnKapi', 'Sol ön kapı'], ['tavan', 'Tavan'], ['sagOnKapi', 'Sağ ön kapı'],
  ['solArkaKapi', 'Sol arka kapı'], ['sagArkaKapi', 'Sağ arka kapı'],
  ['solArkaCamurluk', 'Sol arka çamurluk'], ['bagaj', 'Bagaj kapağı'], ['sagArkaCamurluk', 'Sağ arka çamurluk'],
  ['solMarspiyel', 'Sol marşpiyel'], ['sagMarspiyel', 'Sağ marşpiyel'], ['arkaTampon', 'Arka tampon'],
];

const VARSAYILAN_SINIR = { ince: 70, orijinal: 160, boyali: 300 };

/** Bir parçanın okumalarını sınıflandırır. Sınıflandırmada en yüksek okuma esas alınır. */
export function siniflandir(okumalar, sinir = VARSAYILAN_SINIR) {
  if (!okumalar.length) return null;
  const maks = Math.max(...okumalar), ort = okumalar.reduce((t, x) => t + x, 0) / okumalar.length;
  let sinif, ad;
  if (maks > sinir.boyali) { sinif = 'macun'; ad = 'Kalın boya / macun'; }
  else if (maks > sinir.orijinal) { sinif = 'boyali'; ad = 'Boyalı'; }
  else if (maks < sinir.ince) { sinif = 'ince'; ad = 'İnce (pasta/zımpara?)'; }
  else { sinif = 'orijinal'; ad = 'Orijinal'; }
  return { sinif, ad, maks, ort };
}

export const EKSPERTIZ = {
  id: 'ekspertiz', ad: 'Ekspertiz: boya kalınlığı', ikon: '🚗',
  aciklama: 'Boya kalınlık ölçerden okuduğunuz değerleri parça parça girin; orijinal, boyalı, macunlu ayrımı ve rapor.',
  ac(kok) {
    const kayit = ayarOku('ekspertiz', { arac: '', degerler: {}, sinir: VARSAYILAN_SINIR });
    kayit.sinir = { ...VARSAYILAN_SINIR, ...kayit.sinir };
    const hucreler = {};
    const ozet = el('div', { sinif: 'ciktilar' });
    const aracGir = el('input', { type: 'text', value: kayit.arac, placeholder: 'örn. 34 ABC 123 — 2018 Corolla', 'aria-label': 'Araç' });
    aracGir.addEventListener('input', () => { kayit.arac = aracGir.value; kaydet(); });
    const kaydet = () => ayarYaz('ekspertiz', kayit);

    const sema = el('div', { sinif: 'arac-sema' });
    for (const [id, ad] of PARCALAR) {
      const gir = el('input', { type: 'text', inputmode: 'decimal', value: kayit.degerler[id] || '', placeholder: 'µm', 'aria-label': ad });
      const etiket = el('small', { sinif: 'parca-sonuc' });
      const hucre = el('label', { sinif: 'parca', style: `grid-area:${id}` }, el('span', {}, ad), gir, etiket);
      gir.addEventListener('input', () => { kayit.degerler[id] = gir.value; kaydet(); guncelle(); });
      hucreler[id] = { hucre, gir, etiket };
      sema.append(hucre);
    }

    let raporSatirlari = [];
    function guncelle() {
      const sayac = { orijinal: 0, boyali: 0, macun: 0, ince: 0 };
      const tumu = [];
      raporSatirlari = [];
      for (const [id, ad] of PARCALAR) {
        const { hucre, gir, etiket } = hucreler[id];
        const okuma = sayilariAyikla(gir.value).filter(Number.isFinite);
        const s = siniflandir(okuma, kayit.sinir);
        hucre.className = 'parca' + (s ? ' ' + s.sinif : '');
        etiket.textContent = s ? `${s.ad}${okuma.length > 1 ? ` · ort ${Math.round(s.ort)}` : ''}` : '';
        if (s) { sayac[s.sinif]++; tumu.push(...okuma); raporSatirlari.push([ad, `${okuma.map(Math.round).join(' / ')} µm → ${s.ad}`]); }
      }
      ozet.textContent = '';
      if (!tumu.length) { ozet.append(el('p', { sinif: 'bekliyor' }, 'Değerleri girdikçe parçalar renklenir.')); return; }
      const ortanca = [...tumu].sort((a, b) => a - b)[Math.floor(tumu.length / 2)];
      const satir = (a, b, v) => el('div', { sinif: 'cikti' + (v ? ' vurgu' : '') }, el('span', { sinif: 'cikti-ad' }, a), el('span', { sinif: 'cikti-deger' }, b));
      const genel = sayac.macun ? `${sayac.macun} parçada kalın boya/macun` : sayac.boyali ? `${sayac.boyali} parça boyalı` : 'Ölçülen parçalar orijinal görünüyor';
      ozet.append(
        satir('Sonuç', genel, true),
        satir('Orijinal', String(sayac.orijinal)), satir('Boyalı', String(sayac.boyali)), satir('Kalın boya / macun', String(sayac.macun)),
        satir('İnce (pasta/zımpara olabilir)', String(sayac.ince)),
        satir('Aracın ortanca boya kalınlığı', `${Math.round(ortanca)} µm`),
      );
      raporSatirlari.unshift(['Sonuç', genel], ['Ortanca kalınlık', `${Math.round(ortanca)} µm`]);
    }

    const sinirGir = (anahtar, ad) => {
      const g = el('input', { type: 'text', inputmode: 'decimal', value: String(kayit.sinir[anahtar]), 'aria-label': ad });
      g.addEventListener('input', () => { const x = sayiOku(g.value); if (x > 0) { kayit.sinir[anahtar] = x; kaydet(); guncelle(); } });
      return el('label', { sinif: 'girdi' }, el('span', {}, ad), g);
    };
    const baslik = () => `Ekspertiz${kayit.arac ? ' — ' + kayit.arac : ''}`;
    const metin = () => [baslik(), new Date().toLocaleString('tr-TR'), '', ...raporSatirlari.map(([a, b]) => `${a}: ${b}`)].join('\n');

    kok.append(
      el('label', { sinif: 'girdi' }, el('span', {}, 'Araç (plaka / model)'), aracGir),
      el('p', { sinif: 'kucuk' }, 'Her parçada birkaç noktadan ölçüp değerleri boşlukla ayırarak yazın (örn. "112 118 125"). Sınıflandırmada en yüksek değer esas alınır.'),
      el('div', { sinif: 'arac-kasa' }, el('div', { sinif: 'arac-on' }, '▲ ÖN'), sema),
      el('div', { sinif: 'renk-aciklama' },
        el('span', { sinif: 'orijinal' }, 'Orijinal'), el('span', { sinif: 'boyali' }, 'Boyalı'), el('span', { sinif: 'macun' }, 'Kalın / macun'), el('span', { sinif: 'ince' }, 'İnce')),
      el('h2', {}, 'Değerlendirme'), ozet,
      el('div', { sinif: 'dugmeler' },
        el('button', { type: 'button', sinif: 'birincil', onclick: () => { if (raporSatirlari.length) kaydaEkle(baslik(), raporSatirlari); } }, '💾 Rapora kaydet'),
        el('button', { type: 'button', onclick: () => paylas(baslik(), metin()) }, '📤 Paylaş'),
        el('button', { type: 'button', onclick: () => { if (confirm('Tüm değerler silinsin mi?')) { kayit.degerler = {}; kayit.arac = ''; aracGir.value = ''; Object.values(hucreler).forEach(h => { h.gir.value = ''; }); kaydet(); guncelle(); } } }, '🗑 Yeni araç')),
      el('h2', {}, 'Sınır değerleri (µm)'),
      el('p', { sinif: 'kucuk' }, 'Fabrika boyası markaya göre değişir (çoğu araçta 80–160 µm; bazı Japon ve Kore araçlarında 70–110 µm). Aracın kendi orijinal parçalarından (ör. tavan, B direği) ölçüp sınırları ona göre ayarlamak en doğrusudur.'),
      sinirGir('ince', 'Bunun altı "ince" sayılır'), sinirGir('orijinal', 'Orijinal boya üst sınırı'), sinirGir('boyali', 'Boyalı üst sınırı (üstü macun / kalın boya)'),
      el('p', { sinif: 'uyari' }, 'Telefonun kendisi boya kalınlığı ölçemez; bu araç bir boya kalınlık ölçerin (manyetik/girdap akımlı, Fe/NFe) değerlerini değerlendirir. Alüminyum parçalar için cihazın NFe modunu kullanın; plastik tamponlarda bu cihazlar ölçüm yapamaz. Kesin sonuç için yetkili ekspertiz raporu esastır.'),
    );
    guncelle();
  },
};
