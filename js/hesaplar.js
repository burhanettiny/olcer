// Ölçer — hesaplayıcı tanımları.
// Her hesaplayıcı girdileri (SI birimine çevrilmiş olarak) alır, çıktıları SI biriminde döndürür.
// Arayüz, birim seçimini ve biçimlendirmeyi kendisi yapar.

import { BOYUTLAR, sureBicimle, bicimle } from './birimler.js';
import * as F from './fizik.js';

const PI = Math.PI;
const hata = mesaj => { throw new Error(mesaj); };

// ---------------------------------------------------------------- girdi kısayolları
const uz = (id, ad, birim = 'cm', ek = {}) => ({ id, ad, boyut: 'uzunluk', birim, ...ek });
const sayi = (id, ad, ek = {}) => ({ id, ad, ...ek });
const secim = (id, ad, secenekler, ek = {}) => ({ id, ad, tip: 'secim', secenekler, deger: secenekler[0][0], ...ek });
const yogunluk = (id = 'rho', ad = 'Malzeme / yoğunluk', ek = {}) => ({ id, ad, tip: 'yogunluk', boyut: 'yogunluk', birim: 'kg/m³', ...ek });

// ---------------------------------------------------------------- çıktı kısayolları
const c = (ad, d, boyut, birim, ek = {}) => ({ ad, d, boyut, birim, ...ek });
const m = (ad, metin, ek = {}) => ({ ad, metin, ...ek });

/** Yaygın malzemelerin tipik yoğunlukları (kg/m³, ~20 °C). Gerçek değer alaşıma/neme göre değişir. */
export const MALZEMELER = [
  ['Su (4 °C)', 1000], ['Su (20 °C)', 998.2], ['Deniz suyu', 1025], ['Buz', 917],
  ['Yapı çeliği (St37/S235)', 7850], ['Paslanmaz çelik (304)', 7930], ['Dökme demir', 7200],
  ['Alüminyum', 2700], ['Bakır', 8960], ['Pirinç', 8500], ['Bronz', 8800], ['Kurşun', 11340],
  ['Çinko', 7140], ['Titanyum', 4506], ['Altın', 19320], ['Gümüş', 10490],
  ['Beton (donatısız)', 2400], ['Betonarme', 2500], ['Çimento (dökme)', 1440], ['Tuğla (dolu)', 1900],
  ['Gaz beton', 600], ['Mermer', 2700], ['Granit', 2700], ['Cam', 2500],
  ['Kum (kuru)', 1600], ['Kum (ıslak)', 1900], ['Çakıl', 1700], ['Toprak (kuru)', 1300], ['Toprak (ıslak)', 1800],
  ['Çam', 500], ['Meşe', 700], ['Kayın', 720], ['MDF', 750], ['Kontrplak', 600],
  ['PVC (sert)', 1400], ['Polietilen (HDPE)', 950], ['Polipropilen', 905], ['Akrilik (PMMA)', 1180], ['Kauçuk', 1100],
  ['Benzin', 745], ['Motorin', 832], ['Zeytinyağı', 915], ['Süt', 1030], ['Bal', 1420],
  ['Hava (15 °C, deniz sev.)', 1.225],
];

// ---------------------------------------------------------------- kategoriler
export const KATEGORILER = [
  { id: 'alan', ad: 'Alan', ikon: '⬛' },
  { id: 'hacim', ad: 'Hacim & Tank', ikon: '🧊' },
  { id: 'kutle', ad: 'Kütle & Malzeme', ikon: '⚖️' },
  { id: 'kargo', ad: 'Kargo & Desi', ikon: '📦' },
  { id: 'mesafe', ad: 'Mesafe & Konum', ikon: '🗺️' },
  { id: 'hiz', ad: 'Hız & Zaman', ikon: '🏎️' },
  { id: 'basinc', ad: 'Basınç & Rakım', ikon: '⛰️' },
  { id: 'kuvvet', ad: 'Kuvvet & Ağırlık', ikon: '💪' },
  { id: 'sicaklik', ad: 'Sıcaklık & Nem', ikon: '🌡️' },
  { id: 'egim', ad: 'Eğim, Açı & Ölçek', ikon: '📐' },
  { id: 'elektrik', ad: 'Elektrik & Enerji', ikon: '⚡' },
  { id: 'metroloji', ad: 'Metroloji', ikon: '🎯' },
];

export const HESAPLAR = [
  // ============================================================ ALAN
  {
    id: 'dikdortgen', kat: 'alan', ad: 'Dikdörtgen / kare alanı', etiket: 'oda zemin arsa',
    girdiler: [uz('a', 'Uzunluk', 'm'), uz('b', 'Genişlik', 'm')],
    hesapla: ({ a, b }) => [
      c('Alan', a * b, 'alan', 'm²', { vurgu: true }),
      c('Çevre', 2 * (a + b), 'uzunluk', 'm'),
      c('Köşegen', Math.hypot(a, b), 'uzunluk', 'm'),
    ],
  },
  {
    id: 'ucgen', kat: 'alan', ad: 'Üçgen alanı',
    girdiler: [
      secim('yontem', 'Bilinenler', [['th', 'Taban ve yükseklik'], ['kenar', 'Üç kenar (Heron)'], ['kak', 'İki kenar ve aradaki açı']]),
      uz('taban', 'Taban', 'm', { goster: v => v.yontem === 'th' }),
      uz('h', 'Yükseklik', 'm', { goster: v => v.yontem === 'th' }),
      uz('a', 'a kenarı', 'm', { goster: v => v.yontem !== 'th' }),
      uz('b', 'b kenarı', 'm', { goster: v => v.yontem !== 'th' }),
      uz('k', 'c kenarı', 'm', { goster: v => v.yontem === 'kenar' }),
      { id: 'aci', ad: 'Aradaki açı (γ)', boyut: 'aci', birim: '°', goster: v => v.yontem === 'kak' },
    ],
    hesapla: v => {
      if (v.yontem === 'th') return [c('Alan', v.taban * v.h / 2, 'alan', 'm²', { vurgu: true })];
      if (v.yontem === 'kak') {
        const kenar3 = Math.sqrt(v.a ** 2 + v.b ** 2 - 2 * v.a * v.b * Math.cos(v.aci));
        return [
          c('Alan', v.a * v.b * Math.sin(v.aci) / 2, 'alan', 'm²', { vurgu: true }),
          c('Üçüncü kenar (c)', kenar3, 'uzunluk', 'm'),
          c('Çevre', v.a + v.b + kenar3, 'uzunluk', 'm'),
        ];
      }
      const { a, b, k } = v;
      if (a + b <= k || a + k <= b || b + k <= a) hata('Bu kenarlarla üçgen oluşmaz (üçgen eşitsizliği).');
      const s = (a + b + k) / 2;
      return [
        c('Alan', Math.sqrt(s * (s - a) * (s - b) * (s - k)), 'alan', 'm²', { vurgu: true }),
        c('Çevre', 2 * s, 'uzunluk', 'm'),
        c('c karşısındaki açı', Math.acos((a * a + b * b - k * k) / (2 * a * b)), 'aci', '°'),
      ];
    },
  },
  {
    id: 'daire', kat: 'alan', ad: 'Daire alanı ve çevresi',
    girdiler: [
      secim('olcu', 'Bilinen ölçü', [['cap', 'Çap'], ['r', 'Yarıçap'], ['cevre', 'Çevre']]),
      uz('x', 'Değer', 'cm'),
    ],
    hesapla: ({ olcu, x }) => {
      const r = olcu === 'cap' ? x / 2 : olcu === 'r' ? x : x / (2 * PI);
      return [
        c('Alan', PI * r * r, 'alan', 'cm²', { vurgu: true }),
        c('Çap', 2 * r, 'uzunluk', 'cm'),
        c('Çevre', 2 * PI * r, 'uzunluk', 'cm'),
      ];
    },
  },
  {
    id: 'yamuk', kat: 'alan', ad: 'Yamuk alanı',
    girdiler: [uz('a', 'Alt taban', 'm'), uz('b', 'Üst taban', 'm'), uz('h', 'Yükseklik', 'm')],
    hesapla: ({ a, b, h }) => [c('Alan', (a + b) * h / 2, 'alan', 'm²', { vurgu: true })],
  },
  {
    id: 'elips', kat: 'alan', ad: 'Elips alanı ve çevresi',
    girdiler: [uz('a', 'Büyük yarı eksen (a)', 'cm'), uz('b', 'Küçük yarı eksen (b)', 'cm')],
    not: 'Çevre, Ramanujan\'ın ikinci yaklaşımıyla hesaplanır (bağıl hata < 10⁻⁹ tipik).',
    hesapla: ({ a, b }) => {
      const h = ((a - b) / (a + b)) ** 2;
      return [
        c('Alan', PI * a * b, 'alan', 'cm²', { vurgu: true }),
        c('Çevre', PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h))), 'uzunluk', 'cm'),
      ];
    },
  },
  {
    id: 'dilim', kat: 'alan', ad: 'Daire dilimi ve yayı',
    girdiler: [uz('r', 'Yarıçap', 'cm'), { id: 't', ad: 'Merkez açı', boyut: 'aci', birim: '°' }],
    hesapla: ({ r, t }) => [
      c('Dilim alanı', t * r * r / 2, 'alan', 'cm²', { vurgu: true }),
      c('Yay uzunluğu', r * t, 'uzunluk', 'cm'),
      c('Kiriş uzunluğu', 2 * r * Math.sin(t / 2), 'uzunluk', 'cm'),
      c('Daire parçası alanı', r * r * (t - Math.sin(t)) / 2, 'alan', 'cm²'),
    ],
  },
  {
    id: 'duzgun-cokgen', kat: 'alan', ad: 'Düzgün çokgen (altıgen, sekizgen…)',
    girdiler: [sayi('n', 'Kenar sayısı', { deger: '6' }), uz('a', 'Kenar uzunluğu', 'cm')],
    hesapla: ({ n, a }) => {
      if (!Number.isInteger(n) || n < 3) hata('Kenar sayısı 3 veya daha büyük bir tam sayı olmalı.');
      return [
        c('Alan', n * a * a / (4 * Math.tan(PI / n)), 'alan', 'cm²', { vurgu: true }),
        c('Çevre', n * a, 'uzunluk', 'cm'),
        c('İç açı', PI * (n - 2) / n, 'aci', '°'),
        c('Çevrel çember yarıçapı', a / (2 * Math.sin(PI / n)), 'uzunluk', 'cm'),
        c('İç teğet çember yarıçapı (apotem)', a / (2 * Math.tan(PI / n)), 'uzunluk', 'cm'),
      ];
    },
  },
  {
    id: 'koordinat-alan', kat: 'alan', ad: 'Köşe koordinatlarından alan (arsa, tarla)', etiket: 'gps parsel shoelace',
    girdiler: [
      secim('tur', 'Koordinat türü', [['cografi', 'Enlem, boylam (GPS / harita)'], ['duzlem', 'Düzlem x, y (ölçüm, çizim)']]),
      secim('birim', 'x, y birimi', BOYUTLAR.uzunluk.birimler.filter(x => ['mm', 'cm', 'm', 'km', 'ft'].includes(x.k)).map(x => [x.k, x.ad]), { deger: 'm', goster: v => v.tur === 'duzlem' }),
      { id: 'noktalar', ad: 'Köşeler (her satıra bir nokta, sırayla)', tip: 'cokmetin', deger: '39.925533, 32.866287\n39.925900, 32.867400\n39.925100, 32.867800\n39.924800, 32.866700', ipucu: 'Google Haritalar\'dan kopyalanan "39.925533, 32.866287" biçimi doğrudan çalışır.' },
    ],
    not: 'Coğrafi koordinatlar WGS84 elipsoidine teğet yerel düzleme izdüşürülür; tarla/arsa ölçeğinde hata ihmal edilebilir. Tapu alanıyla karşılaştırırken GPS konum hatasının (telefonlarda ±3–10 m) alanı belirgin etkileyebileceğini unutmayın.',
    hesapla: v => {
      const satirlar = v.noktalar.split(/\n+/).map(s => s.trim()).filter(Boolean);
      const noktalar = satirlar.map((s, i) => {
        const p = s.split(/[;\t]|,\s+|\s+/).filter(Boolean).map(x => Number(x.replace(',', '.')));
        if (p.length !== 2 || p.some(x => !Number.isFinite(x))) hata(`${i + 1}. satır okunamadı: "${s}"`);
        return p;
      });
      if (noktalar.length < 3) hata('En az 3 köşe gerekli.');
      let sonuc;
      if (v.tur === 'cografi') {
        if (noktalar.some(([la, lo]) => Math.abs(la) > 90 || Math.abs(lo) > 180)) hata('Enlem ±90, boylam ±180 aralığında olmalı.');
        sonuc = F.cografiCokgen(noktalar);
      } else {
        const f = BOYUTLAR.uzunluk.birimler.find(x => x.k === v.birim).f;
        sonuc = F.cokgen(noktalar.map(([x, y]) => [x * f, y * f]));
      }
      return [
        c('Alan', sonuc.alan, 'alan', 'm²', { vurgu: true }),
        c('Alan', sonuc.alan, 'alan', 'dönüm'),
        c('Çevre', sonuc.cevre, 'uzunluk', 'm'),
        m('Köşe sayısı', String(noktalar.length)),
      ];
    },
  },

  // ============================================================ HACİM
  {
    id: 'kutu', kat: 'hacim', ad: 'Dikdörtgen prizma (kutu, oda, havuz)', etiket: 'küp',
    girdiler: [uz('a', 'Uzunluk', 'm'), uz('b', 'Genişlik', 'm'), uz('h', 'Yükseklik / derinlik', 'm')],
    hesapla: ({ a, b, h }) => [
      c('Hacim', a * b * h, 'hacim', 'm³', { vurgu: true }),
      c('Hacim', a * b * h, 'hacim', 'L'),
      c('Yüzey alanı', 2 * (a * b + a * h + b * h), 'alan', 'm²'),
      c('Taban alanı', a * b, 'alan', 'm²'),
    ],
  },
  {
    id: 'silindir', kat: 'hacim', ad: 'Silindir (dikey tank, boru, kuyu)',
    girdiler: [uz('d', 'Çap', 'cm'), uz('h', 'Yükseklik / uzunluk', 'cm'), uz('dolu', 'Sıvı yüksekliği', 'cm', { opsiyonel: true, ipucu: 'Dikey tankta ne kadar sıvı olduğunu bulmak için.' })],
    hesapla: ({ d, h, dolu }) => {
      const A = PI * d * d / 4;
      const r = [c('Hacim', A * h, 'hacim', 'L', { vurgu: true }), c('Yanal yüzey', PI * d * h, 'alan', 'm²'), c('Taban alanı', A, 'alan', 'cm²')];
      if (Number.isFinite(dolu)) {
        if (dolu > h) hata('Sıvı yüksekliği tank yüksekliğinden büyük olamaz.');
        r.push(c('Sıvı hacmi', A * dolu, 'hacim', 'L', { vurgu: true }), m('Doluluk', `%${bicimle(100 * dolu / h, 4)}`));
      }
      return r;
    },
  },
  {
    id: 'yatay-tank', kat: 'hacim', ad: 'Yatay silindirik tank doluluğu', etiket: 'mazot yakıt depo',
    girdiler: [uz('d', 'Tank iç çapı', 'cm'), uz('L', 'Tank uzunluğu', 'cm'), uz('h', 'Sıvı yüksekliği (çubukla ölçülen)', 'cm')],
    not: 'Düz başlıklı tank varsayılır. Bombeli başlıklarda gerçek hacim biraz daha fazladır.',
    hesapla: ({ d, L, h }) => {
      const r = d / 2;
      if (h > d) hata('Sıvı yüksekliği çaptan büyük olamaz.');
      const kesit = r * r * Math.acos((r - h) / r) - (r - h) * Math.sqrt(2 * r * h - h * h);
      const toplam = PI * r * r * L;
      return [
        c('Sıvı hacmi', kesit * L, 'hacim', 'L', { vurgu: true }),
        c('Toplam kapasite', toplam, 'hacim', 'L'),
        c('Boş hacim', toplam - kesit * L, 'hacim', 'L'),
        m('Doluluk', `%${bicimle(100 * kesit * L / toplam, 4)}`),
      ];
    },
  },
  {
    id: 'kure', kat: 'hacim', ad: 'Küre',
    girdiler: [uz('d', 'Çap', 'cm')],
    hesapla: ({ d }) => [c('Hacim', PI * d ** 3 / 6, 'hacim', 'L', { vurgu: true }), c('Yüzey alanı', PI * d * d, 'alan', 'cm²')],
  },
  {
    id: 'koni', kat: 'hacim', ad: 'Koni ve kesik koni (kova, huni, yığın)',
    girdiler: [uz('D', 'Taban çapı', 'cm'), uz('d', 'Üst çap (sivri koni için 0)', 'cm', { deger: '0' }), uz('h', 'Yükseklik', 'cm')],
    hesapla: ({ D, d, h }) => {
      const R = D / 2, r = d / 2;
      const s = Math.hypot(h, R - r);
      return [
        c('Hacim', PI * h * (R * R + R * r + r * r) / 3, 'hacim', 'L', { vurgu: true }),
        c('Yanal yüzey', PI * (R + r) * s, 'alan', 'cm²'),
        c('Ana doğru', s, 'uzunluk', 'cm'),
      ];
    },
  },
  {
    id: 'piramit', kat: 'hacim', ad: 'Dikdörtgen tabanlı piramit',
    girdiler: [uz('a', 'Taban uzunluğu', 'm'), uz('b', 'Taban genişliği', 'm'), uz('h', 'Yükseklik', 'm')],
    hesapla: ({ a, b, h }) => [c('Hacim', a * b * h / 3, 'hacim', 'm³', { vurgu: true })],
  },

  // ============================================================ KÜTLE
  {
    id: 'malzeme-kutle', kat: 'kutle', ad: 'Hacimden kütle (malzeme ağırlığı)', etiket: 'yoğunluk beton kum',
    girdiler: [{ id: 'V', ad: 'Hacim', boyut: 'hacim', birim: 'm³' }, yogunluk()],
    hesapla: ({ V, rho }) => [c('Kütle', V * rho, 'kutle', 'kg', { vurgu: true }), c('Ağırlık (g₀ ile)', V * rho * F.G0, 'kuvvet', 'N')],
  },
  {
    id: 'yogunluk-bul', kat: 'kutle', ad: 'Yoğunluk hesapla (kütle ÷ hacim)',
    girdiler: [{ id: 'mk', ad: 'Kütle', boyut: 'kutle', birim: 'g' }, { id: 'V', ad: 'Hacim', boyut: 'hacim', birim: 'mL' }],
    hesapla: ({ mk, V }) => {
      const rho = mk / V;
      const yakin = MALZEMELER.reduce((e, x) => Math.abs(x[1] - rho) < Math.abs(e[1] - rho) ? x : e);
      return [c('Yoğunluk', rho, 'yogunluk', 'g/cm³', { vurgu: true }), m('En yakın malzeme', `${yakin[0]} (${bicimle(yakin[1] / 1000, 4)} g/cm³)`)];
    },
  },
  {
    id: 'levha', kat: 'kutle', ad: 'Sac / levha / plaka ağırlığı',
    girdiler: [uz('a', 'Uzunluk', 'mm', { deger: '2000' }), uz('b', 'Genişlik', 'mm', { deger: '1000' }), uz('t', 'Kalınlık', 'mm'), yogunluk('rho', 'Malzeme', { deger: '7850' }), sayi('adet', 'Adet', { deger: '1' })],
    hesapla: ({ a, b, t, rho, adet }) => [
      c('Toplam kütle', a * b * t * rho * adet, 'kutle', 'kg', { vurgu: true }),
      c('Tek parça', a * b * t * rho, 'kutle', 'kg'),
      m('Birim alan kütlesi', `${bicimle(t * rho, 5)} kg/m²`),
    ],
  },
  {
    id: 'boru', kat: 'kutle', ad: 'Boru / profil ağırlığı',
    girdiler: [
      secim('kesit', 'Kesit', [['yuvarlak', 'Yuvarlak boru'], ['kare', 'Kare/dikdörtgen kutu profil'], ['dolu', 'Dolu yuvarlak çubuk (mil)'], ['lama', 'Lama / dolu dikdörtgen']]),
      uz('D', 'Dış çap', 'mm', { goster: v => v.kesit === 'yuvarlak' || v.kesit === 'dolu' }),
      uz('a', 'Dış genişlik', 'mm', { goster: v => v.kesit === 'kare' || v.kesit === 'lama' }),
      uz('b', 'Dış yükseklik', 'mm', { goster: v => v.kesit === 'kare' || v.kesit === 'lama' }),
      uz('t', 'Et kalınlığı', 'mm', { goster: v => v.kesit === 'yuvarlak' || v.kesit === 'kare' }),
      uz('L', 'Uzunluk', 'm', { deger: '6' }),
      yogunluk('rho', 'Malzeme', { deger: '7850' }),
    ],
    not: 'Kutu profilde köşe radyüsleri ihmal edilir; gerçek ağırlık birkaç yüzde daha az olabilir.',
    hesapla: v => {
      let A;
      if (v.kesit === 'yuvarlak') { if (2 * v.t >= v.D) hata('Et kalınlığı çapın yarısından küçük olmalı.'); A = PI / 4 * (v.D ** 2 - (v.D - 2 * v.t) ** 2); }
      else if (v.kesit === 'dolu') A = PI / 4 * v.D ** 2;
      else if (v.kesit === 'lama') A = v.a * v.b;
      else { if (2 * v.t >= Math.min(v.a, v.b)) hata('Et kalınlığı çok büyük.'); A = v.a * v.b - (v.a - 2 * v.t) * (v.b - 2 * v.t); }
      return [
        c('Toplam kütle', A * v.L * v.rho, 'kutle', 'kg', { vurgu: true }),
        m('Metre ağırlığı', `${bicimle(A * v.rho, 5)} kg/m`),
        c('Kesit alanı', A, 'alan', 'mm²'),
      ];
    },
  },

  // ============================================================ KARGO
  {
    id: 'desi', kat: 'kargo', ad: 'Desi ve hacimsel ağırlık', etiket: 'kargo koli paket gönderi',
    girdiler: [
      uz('en', 'En', 'cm'), uz('boy', 'Boy', 'cm'), uz('yuk', 'Yükseklik', 'cm'),
      { id: 'kg', ad: 'Gerçek ağırlık (tartı)', boyut: 'kutle', birim: 'kg', opsiyonel: true },
      sayi('adet', 'Koli adedi', { deger: '1' }),
      secim('bolen', 'Hesaplama standardı (bölen)', [
        ['3000', '3000 — Türkiye yurt içi kargo (desi)'],
        ['4000', '4000 — bazı yurt içi/karayolu firmaları'],
        ['5000', '5000 — uluslararası ekspres (DHL, UPS, FedEx…)'],
        ['6000', '6000 — IATA hava kargo'],
        ['ozel', 'Firmanın bildirdiği başka bir bölen…'],
      ], { ipucu: 'Gönderdiğiniz firma hangi bölenle hesaplıyorsa onu seçin; sözleşmenizde yazar.' }),
      sayi('ozelBolen', 'Özel bölen', { goster: v => v.bolen === 'ozel' }),
      secim('yuvarla', 'Yuvarlama', [['1', 'Yukarı, tam sayıya (yaygın)'], ['0.5', 'Yukarı, 0,5\'e'], ['0', 'Yuvarlama yok']]),
    ],
    not: 'Desi = En × Boy × Yükseklik (cm) ÷ bölen. Ücrete esas ağırlık, desi ile gerçek ağırlıktan büyük olanıdır. Ölçüler kolinin en dış (şişkin) noktalarından alınmalıdır.',
    hesapla: v => {
      const bolen = v.bolen === 'ozel' ? v.ozelBolen : Number(v.bolen);
      if (!(bolen > 0)) hata('Geçerli bir bölen girin.');
      const adet = Number.isFinite(v.adet) && v.adet > 0 ? Math.round(v.adet) : 1;
      const cm3 = (v.en * 100) * (v.boy * 100) * (v.yuk * 100);
      const ham = cm3 / bolen;
      const adim = Number(v.yuvarla);
      const tek = adim ? Math.ceil(ham / adim - 1e-9) * adim : ham;
      const toplamDesi = tek * adet;
      const r = [
        m('Desi (koli başı)', bicimle(tek, 6), { vurgu: true }),
        m('Toplam desi', bicimle(toplamDesi, 6)),
        m('Yuvarlanmamış desi', bicimle(ham, 6)),
        c('Toplam hacim', cm3 * 1e-6 * adet, 'hacim', 'm³'),
      ];
      if (Number.isFinite(v.kg)) {
        const gercek = v.kg * adet;
        const esas = Math.max(toplamDesi, gercek);
        r.push(m('Ücrete esas ağırlık', `${bicimle(esas, 6)} kg/desi ${toplamDesi >= gercek ? '(desi geçerli)' : '(gerçek ağırlık geçerli)'}`, { vurgu: true }));
      }
      return r;
    },
  },

  // ============================================================ MESAFE
  {
    id: 'koordinat-mesafe', kat: 'mesafe', ad: 'İki koordinat arası mesafe', etiket: 'gps kuş uçuşu azimut harita',
    girdiler: [
      { id: 'lat1', ad: '1. nokta enlem', tip: 'koord', deger: '41.0082', ipucu: 'Ondalık (41.0082) veya derece-dakika-saniye (41°00\'29"K)' },
      { id: 'lon1', ad: '1. nokta boylam', tip: 'koord', deger: '28.9784' },
      { id: 'lat2', ad: '2. nokta enlem', tip: 'koord', deger: '39.9334' },
      { id: 'lon2', ad: '2. nokta boylam', tip: 'koord', deger: '32.8597' },
    ],
    eylemler: [
      { ad: '📍 1. noktaya konumum', calis: async ayarla => { const p = await konumAl(); ayarla('lat1', p.latitude.toFixed(6)); ayarla('lon1', p.longitude.toFixed(6)); } },
      { ad: '📍 2. noktaya konumum', calis: async ayarla => { const p = await konumAl(); ayarla('lat2', p.latitude.toFixed(6)); ayarla('lon2', p.longitude.toFixed(6)); } },
    ],
    not: 'Kuş uçuşu (jeodezik) mesafedir; yol mesafesi değildir. Güney enlemleri ve batı boylamları eksi (−) ya da G/B harfiyle yazılır.',
    hesapla: v => {
      for (const k of ['lat1', 'lat2']) if (Math.abs(v[k]) > 90) hata('Enlem −90 ile 90 arasında olmalı.');
      for (const k of ['lon1', 'lon2']) if (Math.abs(v[k]) > 180) hata('Boylam −180 ile 180 arasında olmalı.');
      const r = F.vincenty(v.lat1, v.lon1, v.lat2, v.lon2);
      return [
        c('Mesafe', r.mesafe, 'uzunluk', 'km', { vurgu: true }),
        c('Mesafe', r.mesafe, 'uzunluk', 'nmi'),
        m('Başlangıç azimutu (kuzeyden)', `${bicimle(r.azimut1, 5)}° (${yon(r.azimut1)})`),
        m('Yöntem', r.yontem),
      ];
    },
  },
  {
    id: 'adim', kat: 'mesafe', ad: 'Adımla mesafe ölçme', etiket: 'yürüyüş adımsayar',
    girdiler: [
      sayi('n', 'Adım sayısı'),
      uz('adim', 'Adım uzunluğunuz', 'cm', { opsiyonel: true, ipucu: 'Bilmiyorsanız boş bırakıp boyunuzu girin. En iyisi: 10 m\'yi kaç adımda yürüdüğünüzü sayın.' }),
      uz('boy', 'Boyunuz (adım bilinmiyorsa)', 'cm', { opsiyonel: true }),
    ],
    hesapla: ({ n, adim, boy }) => {
      let l = adim, kaynak = 'girdiğiniz adım uzunluğu';
      if (!Number.isFinite(l)) {
        if (!Number.isFinite(boy)) hata('Adım uzunluğunu ya da boyunuzu girin.');
        l = boy * 0.415; kaynak = 'boy × 0,415 tahmini (±%10)';
      }
      return [c('Mesafe', n * l, 'uzunluk', 'm', { vurgu: true }), c('Adım uzunluğu', l, 'uzunluk', 'cm'), m('Dayanak', kaynak)];
    },
  },

  // ============================================================ HIZ
  {
    id: 'hmz', kat: 'hiz', ad: 'Hız – mesafe – süre', etiket: 'tempo pace koşu yolculuk',
    girdiler: [
      { id: 'x', ad: 'Mesafe', boyut: 'uzunluk', birim: 'km', opsiyonel: true },
      { id: 't', ad: 'Süre', boyut: 'zaman', birim: 'sa', opsiyonel: true, sure: true, ipucu: '"1:25:30" (sa:dk:sn) biçiminde de yazabilirsiniz.' },
      { id: 'v', ad: 'Hız', boyut: 'hiz', birim: 'km/sa', opsiyonel: true },
    ],
    not: 'Üç değerden herhangi ikisini girin, üçüncüsü hesaplanır.',
    hesapla: ({ x, t, v }) => {
      const var_ = [x, t, v].filter(Number.isFinite).length;
      if (var_ < 2) hata('Üç değerden ikisini girin.');
      if (!Number.isFinite(x)) x = v * t;
      else if (!Number.isFinite(t)) t = x / v;
      else v = x / t;
      const r = [c('Mesafe', x, 'uzunluk', 'km'), m('Süre', sureBicimle(t)), c('Hız', v, 'hiz', 'km/sa')];
      if (v > 0) r.push(m('Tempo', `${tempo(1000 / v)} /km`), m('Tempo', `${tempo(1609.344 / v)} /mil`));
      if (var_ === 3) r.unshift(m('Not', 'Üç değer de girildi; hız, mesafe ve süreden yeniden hesaplandı.'));
      return r;
    },
  },
  {
    id: 'mach', kat: 'hiz', ad: 'Ses hızı ve Mach sayısı',
    girdiler: [{ id: 'T', ad: 'Hava sıcaklığı', boyut: 'sicaklik', birim: '°C', deger: '15', negatif: true }, { id: 'v', ad: 'Hız', boyut: 'hiz', birim: 'km/sa', opsiyonel: true }],
    hesapla: ({ T, v }) => {
      if (T <= 0) hata('Sıcaklık mutlak sıfırın üzerinde olmalı.');
      const a = Math.sqrt(1.4 * F.R_HAVA * T);
      const r = [c('Ses hızı (kuru hava)', a, 'hiz', 'm/s', { vurgu: true })];
      if (Number.isFinite(v)) r.push(m('Mach sayısı', bicimle(v / a, 4)));
      return r;
    },
  },
  {
    id: 'ivme', kat: 'hiz', ad: 'İvme (0–100 süresi)',
    girdiler: [{ id: 'v0', ad: 'İlk hız', boyut: 'hiz', birim: 'km/sa', deger: '0' }, { id: 'v1', ad: 'Son hız', boyut: 'hiz', birim: 'km/sa', deger: '100' }, { id: 't', ad: 'Süre', boyut: 'zaman', birim: 's' }],
    hesapla: ({ v0, v1, t }) => [
      c('Ortalama ivme', (v1 - v0) / t, 'ivme', 'm/s²', { vurgu: true }),
      c('İvme', (v1 - v0) / t, 'ivme', 'g'),
      c('Alınan yol', (v0 + v1) / 2 * t, 'uzunluk', 'm'),
    ],
  },

  // ============================================================ BASINÇ & RAKIM
  {
    id: 'barometrik-rakim', kat: 'basinc', ad: 'Basınçtan rakım (altimetre)', etiket: 'yükseklik barometre qnh',
    girdiler: [
      { id: 'P', ad: 'Ölçülen hava basıncı', boyut: 'basinc', birim: 'hPa' },
      { id: 'P0', ad: 'Deniz seviyesi basıncı (QNH)', boyut: 'basinc', birim: 'hPa', deger: '1013,25', ipucu: 'Doğru sonuç için bugünkü yerel QNH değerini girin (en yakın havalimanı METAR\'ı veya MGM). 1013,25 hPa standart atmosferdir.' },
      { id: 'T0', ad: 'Deniz seviyesi sıcaklığı', boyut: 'sicaklik', birim: '°C', deger: '15', negatif: true },
    ],
    not: 'ICAO Standart Atmosferi troposfer formülü: h = (T₀/L)·[1 − (P/P₀)^(R·L/g₀)], L = 0,0065 K/m. QNH bilinmezse sonuç hava durumuna göre ±100–300 m sapabilir.',
    hesapla: ({ P, P0, T0 }) => {
      const h = F.barometrikYukseklik(P, P0, T0);
      return [c('Rakım', h, 'uzunluk', 'm', { vurgu: true }), c('Rakım', h, 'uzunluk', 'ft'), c('Suyun kaynama noktası', F.kaynamaNoktasi(P), 'sicaklik', '°C')];
    },
  },
  {
    id: 'qnh', kat: 'basinc', ad: 'Deniz seviyesine indirgenmiş basınç (QNH)',
    girdiler: [{ id: 'P', ad: 'İstasyon basıncı', boyut: 'basinc', birim: 'hPa' }, { id: 'h', ad: 'İstasyon rakımı', boyut: 'uzunluk', birim: 'm', negatif: true }],
    hesapla: ({ P, h }) => [c('QNH', F.qnh(P, h), 'basinc', 'hPa', { vurgu: true }), c('QNH', F.qnh(P, h), 'basinc', 'inHg')],
  },
  {
    id: 'isa', kat: 'basinc', ad: 'Rakımda standart atmosfer (ISA)', etiket: 'kaynama noktası hava yoğunluğu irtifa',
    girdiler: [{ id: 'h', ad: 'Rakım', boyut: 'uzunluk', birim: 'm', negatif: true }],
    not: 'ICAO Standart Atmosferi (ISO 2533). Gerçek hava koşulları farklılık gösterir.',
    hesapla: ({ h }) => {
      const s = F.isa(h);
      return [
        c('Basınç', s.P, 'basinc', 'hPa', { vurgu: true }),
        c('Sıcaklık', s.T, 'sicaklik', '°C'),
        c('Hava yoğunluğu', s.rho, 'yogunluk', 'kg/m³'),
        c('Ses hızı', s.a, 'hiz', 'km/sa'),
        c('Suyun kaynama noktası', F.kaynamaNoktasi(s.P), 'sicaklik', '°C'),
        m('Deniz seviyesine göre oksijen', `%${bicimle(100 * s.rho / 1.225, 3)}`),
      ];
    },
  },
  {
    id: 'hidrostatik', kat: 'basinc', ad: 'Sıvı basıncı (derinlikte basınç)', etiket: 'dalış su sütunu hidrostatik',
    girdiler: [
      { id: 'h', ad: 'Derinlik / sıvı yüksekliği', boyut: 'uzunluk', birim: 'm' },
      yogunluk('rho', 'Sıvı', { deger: '1000' }),
      { id: 'Pa', ad: 'Yüzeydeki basınç', boyut: 'basinc', birim: 'hPa', deger: '1013,25' },
      { id: 'g', ad: 'Yerçekimi ivmesi', boyut: 'ivme', birim: 'm/s²', deger: '9,80665' },
    ],
    not: 'P = ρ·g·h. Gösterge (manometre) basıncı yüzey basıncını içermez; mutlak basınç içerir.',
    hesapla: ({ h, rho, Pa, g }) => [
      c('Gösterge basıncı', rho * g * h, 'basinc', 'bar', { vurgu: true }),
      c('Mutlak basınç', rho * g * h + Pa, 'basinc', 'bar'),
    ],
  },
  {
    id: 'kuvvet-alan', kat: 'basinc', ad: 'Kuvvet ve alandan basınç',
    girdiler: [
      secim('bul', 'Hesaplanacak', [['P', 'Basınç'], ['F', 'Kuvvet'], ['A', 'Alan']]),
      { id: 'F', ad: 'Kuvvet', boyut: 'kuvvet', birim: 'N', goster: v => v.bul !== 'F' },
      { id: 'A', ad: 'Alan', boyut: 'alan', birim: 'cm²', goster: v => v.bul !== 'A' },
      { id: 'P', ad: 'Basınç', boyut: 'basinc', birim: 'bar', goster: v => v.bul !== 'P' },
    ],
    hesapla: v => {
      if (v.bul === 'P') return [c('Basınç', v.F / v.A, 'basinc', 'bar', { vurgu: true })];
      if (v.bul === 'F') return [c('Kuvvet', v.P * v.A, 'kuvvet', 'N', { vurgu: true }), c('Kuvvet', v.P * v.A, 'kuvvet', 'kgf')];
      return [c('Alan', v.F / v.P, 'alan', 'cm²', { vurgu: true })];
    },
  },

  // ============================================================ KUVVET
  {
    id: 'fma', kat: 'kuvvet', ad: 'Newton\'un 2. yasası (F = m·a)',
    girdiler: [{ id: 'mk', ad: 'Kütle', boyut: 'kutle', birim: 'kg' }, { id: 'a', ad: 'İvme', boyut: 'ivme', birim: 'm/s²', negatif: true }],
    hesapla: ({ mk, a }) => [c('Kuvvet', mk * a, 'kuvvet', 'N', { vurgu: true }), c('Kuvvet', mk * a, 'kuvvet', 'kgf')],
  },
  {
    id: 'yerel-agirlik', kat: 'kuvvet', ad: 'Bulunduğunuz yerde ağırlık (yerel g)', etiket: 'yerçekimi terazi kalibrasyon',
    girdiler: [
      { id: 'mk', ad: 'Kütle', boyut: 'kutle', birim: 'kg' },
      { id: 'lat', ad: 'Enlem', tip: 'koord', deger: '39.9' },
      { id: 'h', ad: 'Rakım', boyut: 'uzunluk', birim: 'm', deger: '0', negatif: true },
    ],
    eylemler: [{ ad: '📍 Konumumu kullan', calis: async ayarla => { const p = await konumAl(); ayarla('lat', p.latitude.toFixed(4)); if (p.altitude != null) ayarla('h', p.altitude.toFixed(0)); } }],
    not: 'WGS84 normal yerçekimi (Somigliana formülü) ve serbest hava düzeltmesi (−0,3086 mGal/m). Yerel jeolojik anomaliler (±0,01 %) hesaba katılmaz. Hassas teraziler kurulum yerinde bu nedenle kalibre edilir.',
    hesapla: ({ mk, lat, h }) => {
      if (Math.abs(lat) > 90) hata('Enlem −90 ile 90 arasında olmalı.');
      const g = F.yerelG(lat, h);
      return [
        c('Ağırlık', mk * g, 'kuvvet', 'N', { vurgu: true }),
        c('Yerel g', g, 'ivme', 'm/s²'),
        m('Standart g₀\'a göre fark', `%${bicimle(100 * (g - F.G0) / F.G0, 3)}`),
        m('Yay terazisi göstergesi', `${bicimle(mk * g / F.G0, 7)} kg (g₀ ile ayarlıysa)`),
      ];
    },
  },
  {
    id: 'yay', kat: 'kuvvet', ad: 'Yay kuvveti (Hooke yasası)',
    girdiler: [{ id: 'k', ad: 'Yay sabiti', boyut: 'yay', birim: 'N/mm' }, uz('x', 'Uzama / sıkışma', 'mm')],
    hesapla: ({ k, x }) => [c('Kuvvet', k * x, 'kuvvet', 'N', { vurgu: true }), c('Depolanan enerji', k * x * x / 2, 'enerji', 'J')],
  },
  {
    id: 'tork', kat: 'kuvvet', ad: 'Tork / moment',
    girdiler: [{ id: 'Fk', ad: 'Kuvvet', boyut: 'kuvvet', birim: 'N' }, uz('r', 'Kol uzunluğu', 'cm'), { id: 'aci', ad: 'Kuvvet ile kol arasındaki açı', boyut: 'aci', birim: '°', deger: '90' }],
    hesapla: ({ Fk, r, aci }) => [c('Tork', Fk * r * Math.sin(aci), 'tork', 'N·m', { vurgu: true }), c('Tork', Fk * r * Math.sin(aci), 'tork', 'kgf·m')],
  },

  // ============================================================ SICAKLIK
  {
    id: 'ciy', kat: 'sicaklik', ad: 'Çiy noktası ve mutlak nem', etiket: 'yoğuşma küf bağıl nem',
    girdiler: [{ id: 'T', ad: 'Hava sıcaklığı', boyut: 'sicaklik', birim: '°C', negatif: true }, sayi('RH', 'Bağıl nem (%)')],
    not: 'Magnus formülü (a = 17,62, b = 243,12 °C), −45…+60 °C aralığında ±0,35 °C.',
    hesapla: ({ T, RH }) => {
      if (!(RH > 0 && RH <= 100)) hata('Bağıl nem 0–100 arasında olmalı.');
      const t = T - 273.15;
      const e = F.doymusBuhar(t) * RH / 100;
      return [
        c('Çiy noktası', F.ciyNoktasi(t, RH) + 273.15, 'sicaklik', '°C', { vurgu: true }),
        m('Mutlak nem', `${bicimle(1000 * e / (461.5 * T), 4)} g/m³`),
        c('Su buharı kısmi basıncı', e, 'basinc', 'hPa'),
      ];
    },
  },
  {
    id: 'hissedilen', kat: 'sicaklik', ad: 'Hissedilen sıcaklık', etiket: 'ısı indeksi rüzgar soğuğu',
    girdiler: [{ id: 'T', ad: 'Hava sıcaklığı', boyut: 'sicaklik', birim: '°C', negatif: true }, sayi('RH', 'Bağıl nem (%)', { deger: '50' }), { id: 'V', ad: 'Rüzgâr hızı', boyut: 'hiz', birim: 'km/sa', deger: '0' }],
    not: 'Sıcakta NOAA ısı indeksi (≥ 27 °C), soğukta rüzgâr soğuğu indeksi (≤ 10 °C, rüzgâr > 4,8 km/sa) kullanılır.',
    hesapla: ({ T, RH, V }) => {
      const t = T - 273.15, kmh = V * 3.6;
      if (t >= 27) return [c('Hissedilen (ısı indeksi)', F.isiIndeksi(t, RH) + 273.15, 'sicaklik', '°C', { vurgu: true })];
      if (t <= 10 && kmh > 4.8) return [c('Hissedilen (rüzgâr soğuğu)', F.ruzgarSogugu(t, kmh) + 273.15, 'sicaklik', '°C', { vurgu: true })];
      return [c('Hissedilen', T, 'sicaklik', '°C', { vurgu: true }), m('Not', 'Bu koşullarda hissedilen sıcaklık hava sıcaklığına eşit kabul edilir.')];
    },
  },

  // ============================================================ EĞİM, AÇI, ÖLÇEK
  {
    id: 'egim', kat: 'egim', ad: 'Eğim (yüzde, derece, oran)', etiket: 'rampa çatı yol meyil',
    girdiler: [
      secim('bilinen', 'Bilinen', [['hx', 'Yükseklik farkı ve yatay mesafe'], ['yuzde', 'Eğim yüzdesi'], ['derece', 'Eğim açısı']]),
      uz('dh', 'Yükseklik farkı', 'cm', { goster: v => v.bilinen === 'hx' }),
      uz('dx', 'Yatay mesafe', 'cm', { goster: v => v.bilinen === 'hx' }),
      sayi('yuzde', 'Eğim (%)', { goster: v => v.bilinen === 'yuzde' }),
      { id: 'aci', ad: 'Açı', boyut: 'aci', birim: '°', goster: v => v.bilinen === 'derece' },
      uz('L', 'Yatay mesafe (yükseklik farkı için, isteğe bağlı)', 'm', { opsiyonel: true, goster: v => v.bilinen !== 'hx' }),
    ],
    not: 'Engelli rampası için TS 9111: en fazla %8 (uzun rampalarda %5–6).',
    hesapla: v => {
      const oran = v.bilinen === 'hx' ? v.dh / v.dx : v.bilinen === 'yuzde' ? v.yuzde / 100 : Math.tan(v.aci);
      const r = [
        m('Eğim', `%${bicimle(oran * 100, 5)}`, { vurgu: true }),
        c('Açı', Math.atan(oran), 'aci', '°'),
        m('Oran', oran > 0 ? `1 : ${bicimle(1 / oran, 4)}` : '—'),
        m('Binde', `‰${bicimle(oran * 1000, 5)}`),
      ];
      if (v.bilinen === 'hx') r.push(c('Eğik uzunluk', Math.hypot(v.dh, v.dx), 'uzunluk', 'cm'));
      if (Number.isFinite(v.L)) r.push(c('Yükseklik farkı', v.L * oran, 'uzunluk', 'cm'), c('Eğik uzunluk', v.L * Math.sqrt(1 + oran * oran), 'uzunluk', 'm'));
      return r;
    },
  },
  {
    id: 'olcek', kat: 'egim', ad: 'Harita / çizim / maket ölçeği', etiket: 'pafta plan 1:1000',
    girdiler: [
      sayi('n', 'Ölçek paydası (1 : n)', { deger: '1000', ipucu: 'Örn. 1:25 000 harita için 25000.' }),
      secim('yon', 'Dönüşüm', [['gercek', 'Haritadan / çizimden → gerçeğe'], ['harita', 'Gerçekten → haritaya / çizime']]),
      uz('x', 'Uzunluk', 'cm'),
    ],
    hesapla: ({ n, yon, x }) => {
      if (!(n > 0)) hata('Ölçek paydası pozitif olmalı.');
      return yon === 'gercek'
        ? [c('Gerçek uzunluk', x * n, 'uzunluk', 'm', { vurgu: true }), m('Alan ölçeği', `haritadaki 1 cm² = gerçekte ${bicimle(n * n / 1e4, 6)} m²`)]
        : [c('Haritadaki uzunluk', x / n, 'uzunluk', 'mm', { vurgu: true })];
    },
  },
  {
    id: 'olcek-bul', kat: 'egim', ad: 'Ölçeği bul (iki uzunluktan)',
    girdiler: [uz('h', 'Haritadaki / çizimdeki uzunluk', 'cm'), uz('g', 'Gerçek uzunluk', 'm')],
    hesapla: ({ h, g }) => [m('Ölçek', `1 : ${bicimle(g / h, 6)}`, { vurgu: true })],
  },

  // ============================================================ ELEKTRİK
  {
    id: 'ohm', kat: 'elektrik', ad: 'Ohm yasası ve elektrik gücü', etiket: 'volt amper watt direnç',
    girdiler: [
      { id: 'V', ad: 'Gerilim', boyut: 'gerilim', birim: 'V', opsiyonel: true, negatif: true },
      { id: 'I', ad: 'Akım', boyut: 'akim', birim: 'A', opsiyonel: true, negatif: true },
      { id: 'R', ad: 'Direnç', boyut: 'direnc', birim: 'Ω', opsiyonel: true },
      { id: 'P', ad: 'Güç', boyut: 'guc', birim: 'W', opsiyonel: true },
    ],
    not: 'Herhangi iki değeri girin. Doğru akım veya rezistif (cos φ = 1) yük için geçerlidir.',
    hesapla: ({ V, I, R, P }) => {
      const bilinen = { V, I, R, P };
      const sayisi = Object.values(bilinen).filter(Number.isFinite).length;
      if (sayisi < 2) hata('Dört değerden ikisini girin.');
      if (sayisi > 2) hata('Yalnızca iki değer girin; diğerlerini boş bırakın.');
      const f = Number.isFinite;
      if (f(V) && f(I)) { R = V / I; P = V * I; }
      else if (f(V) && f(R)) { I = V / R; P = V * V / R; }
      else if (f(V) && f(P)) { I = P / V; R = V * V / P; }
      else if (f(I) && f(R)) { V = I * R; P = I * I * R; }
      else if (f(I) && f(P)) { V = P / I; R = P / (I * I); }
      else { I = Math.sqrt(P / R); V = I * R; }
      return [c('Gerilim', V, 'gerilim', 'V'), c('Akım', I, 'akim', 'A'), c('Direnç', R, 'direnc', 'Ω'), c('Güç', P, 'guc', 'W')];
    },
  },
  {
    id: 'tuketim', kat: 'elektrik', ad: 'Elektrik tüketimi ve fatura', etiket: 'kwh cihaz maliyet',
    girdiler: [
      { id: 'P', ad: 'Cihaz gücü', boyut: 'guc', birim: 'W' },
      sayi('saat', 'Günlük kullanım (saat)', { deger: '1' }),
      sayi('gun', 'Gün sayısı', { deger: '30' }),
      sayi('fiyat', 'Birim fiyat (TL/kWh)', { opsiyonel: true, ipucu: 'Faturanızdaki vergiler dahil kWh fiyatını girin.' }),
    ],
    hesapla: ({ P, saat, gun, fiyat }) => {
      const E = P * saat * 3600 * gun;
      const kwh = E / 3.6e6;
      const r = [c('Tüketim', E, 'enerji', 'kWh', { vurgu: true })];
      if (Number.isFinite(fiyat)) r.push(m('Maliyet', `${bicimle(kwh * fiyat, 6)} TL`, { vurgu: true }), m('Günlük maliyet', `${bicimle(kwh * fiyat / gun, 4)} TL`));
      return r;
    },
  },
  {
    id: 'yakit-maliyet', kat: 'elektrik', ad: 'Yolculuk yakıt maliyeti', etiket: 'benzin motorin araba',
    girdiler: [
      { id: 'x', ad: 'Mesafe', boyut: 'uzunluk', birim: 'km' },
      { id: 'q', ad: 'Ortalama tüketim', boyut: 'yakit', birim: 'L/100km', deger: '6,5' },
      sayi('fiyat', 'Yakıt fiyatı (TL/L)', { opsiyonel: true }),
    ],
    hesapla: ({ x, q, fiyat }) => {
      const L = x / 1000 * q / 100;
      const r = [c('Yakıt', L * 1e-3, 'hacim', 'L', { vurgu: true })];
      if (Number.isFinite(fiyat)) r.push(m('Maliyet', `${bicimle(L * fiyat, 6)} TL`, { vurgu: true }));
      return r;
    },
  },

  // ============================================================ METROLOJİ
  {
    id: 'belirsizlik', kat: 'metroloji', ad: 'Ölçüm belirsizliği (GUM)', etiket: 'tekrarlı ölçüm standart sapma kalibrasyon',
    girdiler: [
      { id: 'okumalar', ad: 'Tekrarlı ölçüm sonuçları', tip: 'cokmetin', deger: '10,02\n10,05\n10,03\n10,04\n10,02', ipucu: 'Her satıra bir okuma; hepsi aynı birimde.' },
      sayi('coz', 'Cihaz çözünürlüğü (en küçük basamak)', { opsiyonel: true, ipucu: 'Örn. 0,01. Dikdörtgen dağılım: u = çözünürlük / √12.' }),
      sayi('Ukal', 'Kalibrasyon sertifikasındaki genişletilmiş belirsizlik (U)', { opsiyonel: true }),
      sayi('kkal', 'Sertifikadaki kapsam faktörü (k)', { deger: '2', goster: v => Number.isFinite(v.Ukal) }),
      sayi('ek', 'Diğer B tipi standart belirsizlik (u)', { opsiyonel: true, ipucu: 'Sıcaklık etkisi vb. — standart belirsizlik olarak, aynı birimde.' }),
      secim('kmod', 'Kapsam faktörü', [['oto', 'Otomatik — νeff ve Student-t (%95,45)'], ['2', 'k = 2 (yaklaşık %95)'], ['ozel', 'Başka bir k…']]),
      sayi('k', 'k', { goster: v => v.kmod === 'ozel' }),
    ],
    not: 'JCGM 100:2008 (GUM). A tipi: s/√n. Etkin serbestlik derecesi Welch–Satterthwaite ile, B tipi bileşenler sonsuz serbestlik dereceli kabul edilerek hesaplanır.',
    hesapla: v => {
      const x = F.sayilariAyikla(v.okumalar);
      if (x.some(Number.isNaN)) hata('Okumalardan biri sayı değil.');
      if (x.length < 2) hata('En az 2 okuma gerekli.');
      const { n, ort, s, min, max } = F.ortalamaStd(x);
      const uA = s / Math.sqrt(n);
      const uRes = Number.isFinite(v.coz) ? v.coz / Math.sqrt(12) : 0;
      const uCal = Number.isFinite(v.Ukal) ? v.Ukal / (v.kkal || 2) : 0;
      const uEk = Number.isFinite(v.ek) ? v.ek : 0;
      const uc = Math.sqrt(uA ** 2 + uRes ** 2 + uCal ** 2 + uEk ** 2);
      const nuEff = uA > 0 ? uc ** 4 / (uA ** 4 / (n - 1)) : Infinity;
      const k = v.kmod === 'oto' ? F.kapsamFaktoru(nuEff) : v.kmod === '2' ? 2 : v.k;
      if (!(k > 0)) hata('Geçerli bir k girin.');
      const U = k * uc;
      const b = bas(U);
      return [
        m('Sonuç', `${yuvarla(ort, b)} ± ${yuvarla(U, b)}`, { vurgu: true }),
        m('Ortalama', bicimle(ort, 10)),
        m('Standart sapma (s)', bicimle(s, 4)),
        m('A tipi belirsizlik (s/√n)', bicimle(uA, 4)),
        m('Çözünürlük katkısı', bicimle(uRes, 4)),
        m('Kalibrasyon katkısı', bicimle(uCal, 4)),
        m('Birleşik standart belirsizlik (uc)', bicimle(uc, 4)),
        m('Etkin serbestlik derecesi (νeff)', Number.isFinite(nuEff) ? bicimle(nuEff, 3) : '∞'),
        m('Kapsam faktörü (k)', bicimle(k, 4)),
        m('Genişletilmiş belirsizlik (U)', bicimle(U, 3)),
        m('Bağıl genişletilmiş belirsizlik', `%${bicimle(100 * U / Math.abs(ort), 3)}`),
        m('n / en küçük / en büyük', `${n} / ${bicimle(min, 8)} / ${bicimle(max, 8)}`),
      ];
    },
  },
  {
    id: 'uygunluk', kat: 'metroloji', ad: 'Tolerans uygunluk kararı', etiket: 'karar kuralı ilac g8 koruma bandı',
    girdiler: [
      sayi('nom', 'Nominal (hedef) değer', { negatif: true }),
      sayi('alt', 'Alt tolerans (−)', { ipucu: 'Örn. ±0,05 için 0,05' }),
      sayi('ust', 'Üst tolerans (+)'),
      sayi('olc', 'Ölçülen değer', { negatif: true }),
      sayi('U', 'Ölçüm belirsizliği (U)', { opsiyonel: true }),
      secim('kural', 'Karar kuralı', [['basit', 'Basit kabul (paylaşılan risk)'], ['koruma', 'Koruma bandı w = U (ILAC-G8)']], { ipucu: 'Müşterinizle veya ilgili standartla anlaştığınız kuralı seçin.' }),
    ],
    hesapla: v => {
      const alt = v.nom - v.alt, ust = v.nom + v.ust;
      const U = Number.isFinite(v.U) ? v.U : 0;
      const sapma = v.olc - v.nom;
      let karar;
      if (v.kural === 'basit') karar = v.olc >= alt && v.olc <= ust ? '✅ UYGUN' : '❌ UYGUN DEĞİL';
      else if (v.olc >= alt + U && v.olc <= ust - U) karar = '✅ UYGUN';
      else if (v.olc < alt - U || v.olc > ust + U) karar = '❌ UYGUN DEĞİL';
      else karar = '⚠️ KARAR VERİLEMEZ (belirsizlik bölgesi)';
      const r = [
        m('Karar', karar, { vurgu: true }),
        m('Tolerans aralığı', `${bicimle(alt, 10)} … ${bicimle(ust, 10)}`),
        m('Sapma', bicimle(sapma, 6)),
        m('Toleransın kullanılan kısmı', `%${bicimle(100 * Math.abs(sapma) / (sapma >= 0 ? v.ust : v.alt), 4)}`),
      ];
      if (U > 0) r.push(m('TUR (tolerans/belirsizlik oranı)', `${bicimle((v.alt + v.ust) / (2 * U), 3)} : 1`));
      if (v.kural === 'koruma') r.push(m('Kabul aralığı', `${bicimle(alt + U, 10)} … ${bicimle(ust - U, 10)}`));
      return r;
    },
  },
  {
    id: 'bagil-hata', kat: 'metroloji', ad: 'Mutlak ve bağıl hata',
    girdiler: [sayi('ref', 'Referans (doğru kabul edilen) değer', { negatif: true }), sayi('olc', 'Ölçülen / gösterilen değer', { negatif: true })],
    hesapla: ({ ref, olc }) => [
      m('Mutlak hata (gösterilen − referans)', bicimle(olc - ref, 6), { vurgu: true }),
      m('Bağıl hata', `%${bicimle(100 * (olc - ref) / ref, 5)}`),
      m('Düzeltme', bicimle(ref - olc, 6)),
    ],
  },
];

// ---------------------------------------------------------------- yardımcılar
function tempo(saniye) {
  const dk = Math.floor(saniye / 60);
  const sn = Math.round(saniye - dk * 60);
  return sn === 60 ? `${dk + 1}:00` : `${dk}:${String(sn).padStart(2, '0')}`;
}

function yon(az) {
  const adlar = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GGD', 'G', 'GGB', 'GB', 'BGB', 'B', 'BKB', 'KB', 'KKB'];
  return adlar[Math.round(az / 22.5) % 16];
}

/** GUM'a göre belirsizlik 2 anlamlı basamağa; sonuç aynı ondalık basamağa yuvarlanır. */
function bas(U) {
  if (!(U > 0)) return 6;
  return Math.max(0, 1 - Math.floor(Math.log10(U)));
}
function yuvarla(x, ondalik) {
  return x.toFixed(Math.min(ondalik, 15)).replace('.', ',');
}

export function konumAl() {
  return new Promise((coz, reddet) => {
    if (!navigator.geolocation) return reddet(new Error('Bu cihaz konum desteklemiyor.'));
    navigator.geolocation.getCurrentPosition(p => coz(p.coords), e => reddet(new Error(e.code === 1 ? 'Konum izni verilmedi.' : 'Konum alınamadı.')), { enableHighAccuracy: true, timeout: 20000 });
  });
}

const kimlikler = new Set();
for (const h of HESAPLAR) {
  if (kimlikler.has(h.id)) throw new Error(`Yinelenen hesap kimliği: ${h.id}`);
  kimlikler.add(h.id);
  if (!KATEGORILER.some(k => k.id === h.kat)) throw new Error(`${h.id}: bilinmeyen kategori ${h.kat}`);
}
