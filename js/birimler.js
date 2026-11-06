// Ölçer — birim tanımları ve çeviri.
// Her boyut bir SI (temel) birime göre tanımlanır. Doğrusal birimler `f` çarpanıyla,
// doğrusal olmayanlar (sıcaklık, yakıt tüketimi) `to`/`from` fonksiyonlarıyla verilir.
// Çarpanlar tanım gereği kesin olanlardır (ör. 1 in = 0,0254 m, 1 lb = 0,45359237 kg).

const b = (k, ad, f, ek = {}) => ({ k, ad, f, ...ek });
const onekli = (temel, adTemel, onekler) =>
  onekler.map(([o, adO, carpan]) => b(o + temel, adO + adTemel, carpan));

const g0 = 9.80665; // standart yerçekimi ivmesi (CGPM 1901), m/s²

export const BOYUTLAR = {
  uzunluk: {
    ad: 'Uzunluk / Mesafe', ikon: '📏',
    birimler: [
      b('nm', 'nanometre', 1e-9), b('µm', 'mikrometre', 1e-6), b('mm', 'milimetre', 1e-3),
      b('cm', 'santimetre', 1e-2), b('dm', 'desimetre', 0.1), b('m', 'metre', 1), b('km', 'kilometre', 1e3),
      b('thou', 'mil (thou, 0,001 in)', 2.54e-5), b('in', 'inç', 0.0254), b('ft', 'fit', 0.3048),
      b('yd', 'yarda', 0.9144), b('mi', 'mil (kara)', 1609.344), b('nmi', 'deniz mili', 1852),
      b('au', 'astronomik birim', 149597870700), b('ly', 'ışık yılı', 9460730472580800),
      b('pc', 'parsek', 3.0856775814913673e16),
    ],
  },
  alan: {
    ad: 'Alan', ikon: '⬛',
    birimler: [
      b('mm²', 'milimetrekare', 1e-6), b('cm²', 'santimetrekare', 1e-4), b('m²', 'metrekare', 1),
      b('a', 'ar', 100), b('dönüm', 'dönüm (dekar)', 1000, { not: 'Türkiye\'de yasal dönüm 1000 m²\'dir.' }),
      b('ha', 'hektar', 1e4), b('km²', 'kilometrekare', 1e6),
      b('eski dönüm', 'eski (Osmanlı) dönüm', 919.3), b('in²', 'inç kare', 0.00064516),
      b('ft²', 'fit kare', 0.09290304), b('yd²', 'yarda kare', 0.83612736),
      b('acre', 'akre', 4046.8564224), b('mi²', 'mil kare', 2589988.110336),
    ],
  },
  hacim: {
    ad: 'Hacim', ikon: '🧊',
    birimler: [
      b('mm³', 'milimetreküp', 1e-9), b('mL', 'mililitre (cm³)', 1e-6), b('cL', 'santilitre', 1e-5),
      b('dL', 'desilitre', 1e-4), b('L', 'litre (dm³)', 1e-3), b('hL', 'hektolitre', 0.1), b('m³', 'metreküp', 1),
      b('tsp', 'çay kaşığı (ABD)', 4.92892159375e-6), b('tbsp', 'yemek kaşığı (ABD)', 1.478676478125e-5),
      b('fl oz', 'sıvı ons (ABD)', 2.95735295625e-5), b('fl oz (UK)', 'sıvı ons (İng.)', 2.84130625e-5),
      b('cup', 'su bardağı (ABD)', 2.365882365e-4), b('pt', 'pint (ABD)', 4.73176473e-4),
      b('qt', 'quart (ABD)', 9.46352946e-4), b('gal', 'galon (ABD)', 3.785411784e-3),
      b('gal (UK)', 'galon (İng.)', 4.54609e-3), b('in³', 'inç küp', 1.6387064e-5),
      b('ft³', 'fit küp', 0.028316846592), b('yd³', 'yarda küp', 0.764554857984),
      b('bbl', 'varil (petrol)', 0.158987294928),
    ],
  },
  kutle: {
    ad: 'Kütle / Ağırlık', ikon: '⚖️',
    birimler: [
      b('µg', 'mikrogram', 1e-9), b('mg', 'miligram', 1e-6), b('ct', 'karat (metrik)', 2e-4),
      b('g', 'gram', 1e-3), b('kg', 'kilogram', 1), b('t', 'ton (metrik)', 1000),
      b('gr', 'grain', 6.479891e-5), b('oz', 'ons', 0.028349523125), b('ozt', 'troy ons', 0.0311034768),
      b('lb', 'libre (pound)', 0.45359237), b('st', 'stone', 6.35029318),
      b('sh tn', 'kısa ton (ABD)', 907.18474), b('l tn', 'uzun ton (İng.)', 1016.0469088),
    ],
  },
  zaman: {
    ad: 'Zaman', ikon: '⏱️',
    birimler: [
      b('ns', 'nanosaniye', 1e-9), b('µs', 'mikrosaniye', 1e-6), b('ms', 'milisaniye', 1e-3),
      b('s', 'saniye', 1), b('dk', 'dakika', 60), b('sa', 'saat', 3600), b('gün', 'gün', 86400),
      b('hafta', 'hafta', 604800), b('ay', 'ay (ort. 30,4375 gün)', 2629800), b('yıl', 'yıl (Jülyen, 365,25 gün)', 31557600),
    ],
  },
  hiz: {
    ad: 'Hız', ikon: '🏎️',
    birimler: [
      b('m/s', 'metre/saniye', 1), b('km/sa', 'kilometre/saat', 1 / 3.6), b('m/dk', 'metre/dakika', 1 / 60),
      b('mph', 'mil/saat', 0.44704), b('kn', 'knot (deniz mili/saat)', 1852 / 3600), b('ft/s', 'fit/saniye', 0.3048),
      b('Mach', 'Mach (ISA deniz seviyesi, 15 °C)', 340.294, { not: 'Ses hızı sıcaklığa bağlıdır; 15 °C kuru hava varsayılır.' }),
      b('c', 'ışık hızı', 299792458),
    ],
  },
  ivme: {
    ad: 'İvme', ikon: '🚀',
    birimler: [
      b('m/s²', 'metre/saniye²', 1), b('g', 'standart yerçekimi (g₀)', g0), b('ft/s²', 'fit/saniye²', 0.3048),
      b('Gal', 'gal (cm/s²)', 0.01),
    ],
  },
  basinc: {
    ad: 'Basınç', ikon: '⏲️',
    birimler: [
      b('Pa', 'paskal', 1), b('hPa', 'hektopaskal', 100), b('mbar', 'milibar', 100), b('kPa', 'kilopaskal', 1e3),
      b('bar', 'bar', 1e5), b('MPa', 'megapaskal', 1e6), b('atm', 'atmosfer (standart)', 101325),
      b('at', 'teknik atmosfer (kgf/cm²)', 98066.5), b('psi', 'psi (lbf/in²)', 6894.757293168361),
      b('mmHg', 'milimetre cıva', 133.322387415), b('Torr', 'torr', 101325 / 760), b('inHg', 'inç cıva', 3386.389),
      b('mmH₂O', 'milimetre su', 9.80665), b('mH₂O', 'metre su', 9806.65), b('N/mm²', 'N/mm²', 1e6),
    ],
  },
  kuvvet: {
    ad: 'Kuvvet', ikon: '💪',
    birimler: [
      b('mN', 'milinewton', 1e-3), b('N', 'newton', 1), b('kN', 'kilonewton', 1e3), b('MN', 'meganewton', 1e6),
      b('dyn', 'din', 1e-5), b('gf', 'gram-kuvvet', g0 / 1000), b('kgf', 'kilogram-kuvvet', g0),
      b('tf', 'ton-kuvvet', g0 * 1000), b('lbf', 'libre-kuvvet', 4.4482216152605), b('kip', 'kip', 4448.2216152605),
    ],
  },
  tork: {
    ad: 'Tork / Moment', ikon: '🔧',
    birimler: [
      b('N·m', 'newton·metre', 1), b('kN·m', 'kilonewton·metre', 1e3), b('N·cm', 'newton·santimetre', 0.01),
      b('kgf·m', 'kilogram-kuvvet·metre', g0), b('kgf·cm', 'kilogram-kuvvet·santimetre', g0 / 100),
      b('lbf·ft', 'libre-kuvvet·fit', 1.3558179483314004), b('lbf·in', 'libre-kuvvet·inç', 0.1129848290276167),
    ],
  },
  enerji: {
    ad: 'Enerji / İş', ikon: '🔋',
    birimler: [
      b('eV', 'elektronvolt', 1.602176634e-19), b('erg', 'erg', 1e-7), b('J', 'jul', 1), b('kJ', 'kilojul', 1e3),
      b('MJ', 'megajul', 1e6), b('cal', 'kalori (termokimyasal)', 4.184), b('kcal', 'kilokalori', 4184),
      b('Wh', 'vatsaat', 3600), b('kWh', 'kilovatsaat', 3.6e6), b('BTU', 'BTU (IT)', 1055.05585262),
      b('ft·lbf', 'fit·libre-kuvvet', 1.3558179483314004),
    ],
  },
  guc: {
    ad: 'Güç', ikon: '⚡',
    birimler: [
      b('mW', 'milivat', 1e-3), b('W', 'vat', 1), b('kW', 'kilovat', 1e3), b('MW', 'megavat', 1e6),
      b('BG', 'beygir gücü (metrik, PS)', 735.49875), b('hp', 'beygir gücü (mekanik, ABD/İng.)', 745.69987158227022),
      b('kcal/sa', 'kilokalori/saat', 4184 / 3600), b('BTU/sa', 'BTU/saat', 1055.05585262 / 3600),
      b('TR', 'soğutma tonu', 3516.8528420667),
    ],
  },
  sicaklik: {
    ad: 'Sıcaklık', ikon: '🌡',
    birimler: [
      b('°C', 'santigrat (Celsius)', null, { to: x => x + 273.15, from: k => k - 273.15 }),
      b('K', 'kelvin', 1),
      b('°F', 'fahrenhayt', null, { to: x => (x - 32) * 5 / 9 + 273.15, from: k => (k - 273.15) * 9 / 5 + 32 }),
      b('°R', 'rankine', 5 / 9),
    ],
  },
  aci: {
    ad: 'Açı', ikon: '📐',
    birimler: [
      b('°', 'derece', Math.PI / 180), b('′', 'açı dakikası', Math.PI / 10800), b('″', 'açı saniyesi', Math.PI / 648000),
      b('rad', 'radyan', 1), b('mrad', 'miliradyan', 1e-3), b('grad', 'grad (gon)', Math.PI / 200),
      b('mil', 'mil (NATO, 6400)', (2 * Math.PI) / 6400), b('tur', 'tam tur', 2 * Math.PI),
    ],
  },
  yogunluk: {
    ad: 'Yoğunluk', ikon: '🧱',
    birimler: [
      b('kg/m³', 'kg/m³', 1), b('g/cm³', 'g/cm³', 1000), b('g/L', 'g/L', 1), b('kg/L', 'kg/L', 1000),
      b('t/m³', 't/m³', 1000), b('lb/ft³', 'lb/ft³', 16.018463373960138), b('lb/in³', 'lb/in³', 27679.904710203125),
    ],
  },
  debi: {
    ad: 'Debi (Hacimsel akış)', ikon: '🚰',
    birimler: [
      b('mL/dk', 'mililitre/dakika', 1e-6 / 60), b('L/dk', 'litre/dakika', 1e-3 / 60), b('L/s', 'litre/saniye', 1e-3),
      b('L/sa', 'litre/saat', 1e-3 / 3600), b('m³/sa', 'metreküp/saat', 1 / 3600), b('m³/s', 'metreküp/saniye', 1),
      b('gpm', 'galon/dakika (ABD)', 3.785411784e-3 / 60), b('cfm', 'fit küp/dakika', 0.028316846592 / 60),
    ],
  },
  frekans: {
    ad: 'Frekans / Devir', ikon: '〰️',
    birimler: [
      b('Hz', 'hertz', 1), b('kHz', 'kilohertz', 1e3), b('MHz', 'megahertz', 1e6), b('GHz', 'gigahertz', 1e9),
      b('d/dk', 'devir/dakika (rpm)', 1 / 60), b('rad/s', 'radyan/saniye', 1 / (2 * Math.PI)),
    ],
  },
  yakit: {
    ad: 'Yakıt tüketimi', ikon: '⛽',
    birimler: [
      b('L/100km', 'litre/100 km', 1),
      b('km/L', 'kilometre/litre', null, { to: x => 100 / x, from: s => 100 / s }),
      b('mpg', 'mil/galon (ABD)', null, { to: x => 235.214583 / x, from: s => 235.214583 / s }),
      b('mpg (UK)', 'mil/galon (İng.)', null, { to: x => 282.480936 / x, from: s => 282.480936 / s }),
    ],
  },
  veri: {
    ad: 'Veri boyutu', ikon: '💾',
    birimler: [
      b('bit', 'bit', 1 / 8), b('B', 'bayt', 1), b('kB', 'kilobayt', 1e3), b('MB', 'megabayt', 1e6),
      b('GB', 'gigabayt', 1e9), b('TB', 'terabayt', 1e12), b('KiB', 'kibibayt', 1024), b('MiB', 'mebibayt', 1024 ** 2),
      b('GiB', 'gibibayt', 1024 ** 3), b('TiB', 'tebibayt', 1024 ** 4),
    ],
  },
  gerilim: {
    ad: 'Elektrik gerilimi', ikon: '🔌', gizli: true,
    birimler: onekli('V', 'volt', [['m', 'mili', 1e-3], ['', '', 1], ['k', 'kilo', 1e3]]),
  },
  akim: {
    ad: 'Elektrik akımı', ikon: '🔌', gizli: true,
    birimler: onekli('A', 'amper', [['µ', 'mikro', 1e-6], ['m', 'mili', 1e-3], ['', '', 1], ['k', 'kilo', 1e3]]),
  },
  direnc: {
    ad: 'Direnç', ikon: '🔌', gizli: true,
    birimler: onekli('Ω', 'ohm', [['m', 'mili', 1e-3], ['', '', 1], ['k', 'kilo', 1e3], ['M', 'mega', 1e6]]),
  },
  yay: {
    ad: 'Yay sabiti', ikon: '🌀', gizli: true,
    birimler: [b('N/m', 'N/m', 1), b('N/mm', 'N/mm', 1000), b('kN/m', 'kN/m', 1000), b('kgf/cm', 'kgf/cm', g0 * 100), b('lbf/in', 'lbf/in', 175.12683524647636)],
  },
};

for (const [id, boyut] of Object.entries(BOYUTLAR)) {
  boyut.id = id;
  for (const birim of boyut.birimler) {
    if (birim.f === undefined) throw new Error(`${id}/${birim.k} çarpanı eksik`);
  }
}

export function birimBul(boyut, k) {
  const tanim = BOYUTLAR[boyut];
  if (!tanim) throw new Error(`Bilinmeyen boyut: ${boyut}`);
  const birim = tanim.birimler.find(x => x.k === k);
  if (!birim) throw new Error(`Bilinmeyen birim: ${boyut}/${k}`);
  return birim;
}

/** Bir değeri verilen birimden SI temel birime çevirir. */
export function siye(deger, boyut, k) {
  const birim = birimBul(boyut, k);
  return birim.to ? birim.to(deger) : deger * birim.f;
}

/** SI temel birimdeki değeri verilen birime çevirir. */
export function sidan(si, boyut, k) {
  const birim = birimBul(boyut, k);
  return birim.from ? birim.from(si) : si / birim.f;
}

export function cevir(deger, boyut, kaynak, hedef) {
  return sidan(siye(deger, boyut, kaynak), boyut, hedef);
}

/**
 * Kullanıcı girdisini sayıya çevirir. Türkçe ondalık virgülü ve binlik ayırıcıları
 * kabul eder: "1.234,5" → 1234.5, "1,5" → 1.5, "1.5" → 1.5, "2e3" → 2000.
 */
export function sayiOku(metin) {
  if (typeof metin === 'number') return metin;
  if (metin == null) return NaN;
  let s = String(metin).trim().replace(/\s+/g, '').replace(/−/g, '-').replace(/×10\^?/i, 'e');
  if (!s) return NaN;
  const sonVirgul = s.lastIndexOf(',');
  const sonNokta = s.lastIndexOf('.');
  if (sonVirgul >= 0 && sonNokta >= 0) {
    if (sonVirgul > sonNokta) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (sonVirgul >= 0) {
    s = (s.match(/,/g).length > 1) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
  return Number(s);
}

/** "1:30:15" (sa:dk:sn) veya "4:30" (dk:sn) biçimindeki süreyi saniyeye çevirir. */
export function sureOku(metin) {
  const parcalar = String(metin).trim().split(':');
  if (parcalar.length < 2 || parcalar.length > 3) return NaN;
  const sayilar = parcalar.map(sayiOku);
  if (sayilar.some(x => !Number.isFinite(x) || x < 0)) return NaN;
  return sayilar.reduce((top, x) => top * 60 + x, 0);
}

const UST = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

/** Sayıyı Türkçe biçimde, verilen anlamlı basamakla yazar. */
export function bicimle(x, basamak = 6) {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  if (x === Infinity) return '∞';
  if (x === -Infinity) return '−∞';
  if (x === 0) return '0';
  const mutlak = Math.abs(x);
  if (mutlak >= 1e15 || mutlak < 1e-6) {
    const [mantis, us] = x.toExponential(basamak - 1).split('e');
    const m = mantis.replace(/\.?0+$/, '').replace('.', ',').replace('-', '−');
    const u = String(Number(us)).split('').map(c => UST[c]).join('');
    return `${m} × 10${u}`;
  }
  return new Intl.NumberFormat('tr-TR', { maximumSignificantDigits: basamak }).format(x).replace('-', '−');
}

/** Panoya kopyalanacak sade biçim (binlik ayırıcı yok, ondalık virgül). */
export function sadeBicim(x, basamak = 6) {
  if (!Number.isFinite(x)) return '';
  const s = Number(x.toPrecision(basamak)).toString();
  return s.replace('.', ',');
}

/** Saniyeyi "1 sa 05 dk 03 sn" biçimine çevirir. */
export function sureBicimle(saniye) {
  if (!Number.isFinite(saniye)) return '—';
  const isaret = saniye < 0 ? '−' : '';
  let s = Math.abs(saniye);
  const gun = Math.floor(s / 86400); s -= gun * 86400;
  const sa = Math.floor(s / 3600); s -= sa * 3600;
  const dk = Math.floor(s / 60); s -= dk * 60;
  const sn = s.toFixed(s % 1 ? 1 : 0).padStart(2, '0').replace('.', ',');
  const parcalar = [];
  if (gun) parcalar.push(`${gun} gün`);
  if (gun || sa) parcalar.push(`${sa} sa`);
  parcalar.push(`${String(dk).padStart(2, '0')} dk`, `${sn} sn`);
  return isaret + parcalar.join(' ');
}
