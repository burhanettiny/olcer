// Ölçer — fiziksel modeller ve jeodezik hesaplar. Tüm girdiler/çıktılar SI birimindedir.

export const G0 = 9.80665;          // standart yerçekimi, m/s²
export const R_HAVA = 287.05287;    // kuru hava özgül gaz sabiti, J/(kg·K)
export const WGS84 = { a: 6378137, f: 1 / 298.257223563 };
WGS84.b = WGS84.a * (1 - WGS84.f);
WGS84.e2 = WGS84.f * (2 - WGS84.f);

const rad = d => d * Math.PI / 180;
const der = r => r * 180 / Math.PI;

// ---------------------------------------------------------------- ISA atmosferi
// ICAO Standart Atmosferi (ISO 2533), jeopotansiyel yükseklik, 0–47 km.
const KATMANLAR = [
  { h: 0, T: 288.15, P: 101325, L: -0.0065 },
  { h: 11000, T: 216.65, P: 22632.06, L: 0 },
  { h: 20000, T: 216.65, P: 5474.889, L: 0.001 },
  { h: 32000, T: 228.65, P: 868.0187, L: 0.0028 },
  { h: 47000, T: 270.65, P: 110.9063, L: 0 },
];

export function isa(h) {
  if (h < -5000 || h > 51000) throw new Error('ISA modeli −5 km ile 51 km arasında geçerlidir.');
  let k = KATMANLAR[0];
  for (const katman of KATMANLAR) if (h >= katman.h) k = katman;
  const dh = h - k.h;
  const T = k.T + k.L * dh;
  const P = k.L === 0
    ? k.P * Math.exp(-G0 * dh / (R_HAVA * k.T))
    : k.P * Math.pow(k.T / T, G0 / (R_HAVA * k.L));
  return { T, P, rho: P / (R_HAVA * T), a: Math.sqrt(1.4 * R_HAVA * T) };
}

const US = R_HAVA * 0.0065 / G0; // ≈ 0,190263

/** Barometrik yükseklik (troposfer): ölçülen basınç, deniz seviyesi basıncı (QNH), deniz seviyesi sıcaklığı. */
export function barometrikYukseklik(P, P0 = 101325, T0 = 288.15) {
  return (T0 / 0.0065) * (1 - Math.pow(P / P0, US));
}

/** İstasyon basıncı ve rakımından deniz seviyesine indirgenmiş basınç (QNH, ISA sıcaklık gradyanı). */
export function qnh(P, h, T0 = 288.15) {
  return P / Math.pow(1 - 0.0065 * h / T0, 1 / US);
}

/** Suyun kaynama noktası (K), basınca (Pa) göre — Antoine denklemi. */
export function kaynamaNoktasi(P) {
  const mmHg = P / 133.322387415;
  const [A, B, C] = mmHg < 760 ? [8.07131, 1730.63, 233.426] : [8.14019, 1810.94, 244.485];
  return B / (A - Math.log10(mmHg)) - C + 273.15;
}

// ---------------------------------------------------------------- yerçekimi
/** WGS84 normal yerçekimi (Somigliana) + serbest hava düzeltmesi. φ derece, h metre. */
export function yerelG(enlemDerece, h = 0) {
  const s2 = Math.sin(rad(enlemDerece)) ** 2;
  const g = 9.7803253359 * (1 + 0.00193185265241 * s2) / Math.sqrt(1 - 0.00669437999013 * s2);
  return g - 3.086e-6 * h;
}

// ---------------------------------------------------------------- nem / sıcaklık
/** Çiy noktası (°C), Magnus formülü (Sonntag sabitleri). T °C, RH %. */
export function ciyNoktasi(T, RH) {
  const a = 17.62, b = 243.12;
  const g = Math.log(RH / 100) + a * T / (b + T);
  return b * g / (a - g);
}

/** Doymuş buhar basıncı (Pa), T °C (Magnus). */
export function doymusBuhar(T) {
  return 611.2 * Math.exp(17.62 * T / (243.12 + T));
}

/** Isı indeksi (°C), NOAA Rothfusz regresyonu. */
export function isiIndeksi(T, RH) {
  const F = T * 9 / 5 + 32;
  let HI = 0.5 * (F + 61 + (F - 68) * 1.2 + RH * 0.094);
  if ((HI + F) / 2 >= 80) {
    HI = -42.379 + 2.04901523 * F + 10.14333127 * RH - 0.22475541 * F * RH - 6.83783e-3 * F * F
      - 5.481717e-2 * RH * RH + 1.22874e-3 * F * F * RH + 8.5282e-4 * F * RH * RH - 1.99e-6 * F * F * RH * RH;
    if (RH < 13 && F >= 80 && F <= 112) HI -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(F - 95)) / 17);
    else if (RH > 85 && F >= 80 && F <= 87) HI += ((RH - 85) / 10) * ((87 - F) / 5);
  }
  return (HI - 32) * 5 / 9;
}

/** Rüzgâr soğuğu (°C), Kanada/ABD 2001 formülü. T °C, V km/sa. */
export function ruzgarSogugu(T, V) {
  const v = Math.pow(V, 0.16);
  return 13.12 + 0.6215 * T - 11.37 * v + 0.3965 * T * v;
}

// ---------------------------------------------------------------- jeodezi
/** Koordinat metnini ondalık dereceye çevirir: "39.92", "39,92", "39°55'12\"K", "32 51 30 D". */
export function koordinatOku(metin) {
  if (metin == null) return NaN;
  const s = String(metin).trim();
  if (!s) return NaN;
  const sayilar = s.match(/\d+(?:[.,]\d+)?/g);
  if (!sayilar || sayilar.length > 3) return NaN;
  if (sayilar.length > 1 && /[.,]/.test(sayilar[0])) return NaN; // "39.9, 32.8" gibi iki ayrı koordinat
  const [d, m = 0, sn = 0] = sayilar.map(x => Number(x.replace(',', '.')));
  if (m >= 60 || sn >= 60) return NaN;
  const negatif = /^[-−]/.test(s) || /[SWGB]\s*$/i.test(s) || /^[SWGB]/i.test(s);
  return (negatif ? -1 : 1) * (d + m / 60 + sn / 3600);
}

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371008.8; // ortalama Dünya yarıçapı (IUGG)
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Vincenty ters problemi (WGS84). Mesafe (m) ve başlangıç/bitiş azimutu (derece). */
export function vincenty(lat1, lon1, lat2, lon2) {
  const { a, b, f } = WGS84;
  const L = rad(lon2 - lon1);
  const U1 = Math.atan((1 - f) * Math.tan(rad(lat1)));
  const U2 = Math.atan((1 - f) * Math.tan(rad(lat2)));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1), sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  let lambda = L, onceki, sinSigma, cosSigma, sigma, sinAlpha, cos2Alpha, cos2SigmaM, sinL, cosL;
  let tekrar = 0;
  do {
    sinL = Math.sin(lambda); cosL = Math.cos(lambda);
    sinSigma = Math.sqrt((cosU2 * sinL) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosL) ** 2);
    if (sinSigma === 0) return { mesafe: 0, azimut1: 0, azimut2: 0, yontem: 'Vincenty' };
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosL;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = cosU1 * cosU2 * sinL / sinSigma;
    cos2Alpha = 1 - sinAlpha ** 2;
    cos2SigmaM = cos2Alpha !== 0 ? cosSigma - 2 * sinU1 * sinU2 / cos2Alpha : 0;
    const C = f / 16 * cos2Alpha * (4 + f * (4 - 3 * cos2Alpha));
    onceki = lambda;
    lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
  } while (Math.abs(lambda - onceki) > 1e-12 && ++tekrar < 200);

  if (tekrar >= 200) {
    // Neredeyse antipodal noktalarda yakınsamaz: küresel yaklaşıma dön.
    return { mesafe: haversine(lat1, lon1, lat2, lon2), azimut1: kerteriz(lat1, lon1, lat2, lon2), azimut2: NaN, yontem: 'Haversine (küre)' };
  }
  const u2 = cos2Alpha * (a * a - b * b) / (b * b);
  const A = 1 + u2 / 16384 * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
  const B = u2 / 1024 * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
  const dSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM ** 2)
    - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)));
  const mesafe = b * A * (sigma - dSigma);
  const az1 = Math.atan2(cosU2 * sinL, cosU1 * sinU2 - sinU1 * cosU2 * cosL);
  const az2 = Math.atan2(cosU1 * sinL, -sinU1 * cosU2 + cosU1 * sinU2 * cosL);
  return { mesafe, azimut1: (der(az1) + 360) % 360, azimut2: (der(az2) + 360) % 360, yontem: 'Vincenty (WGS84 elipsoidi)' };
}

export function kerteriz(lat1, lon1, lat2, lon2) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return (der(Math.atan2(y, x)) + 360) % 360;
}

/** Düzlemde çokgen alanı (shoelace) ve çevresi. noktalar: [[x,y],...] */
export function cokgen(noktalar) {
  let alan = 0, cevre = 0;
  for (let i = 0; i < noktalar.length; i++) {
    const [x1, y1] = noktalar[i];
    const [x2, y2] = noktalar[(i + 1) % noktalar.length];
    alan += x1 * y2 - x2 * y1;
    cevre += Math.hypot(x2 - x1, y2 - y1);
  }
  return { alan: Math.abs(alan) / 2, cevre };
}

/**
 * Coğrafi çokgen alanı: noktaları ağırlık merkezinde WGS84 elipsoidine teğet yerel düzleme
 * izdüşürür. Tarla/arsa ölçeğinde (birkaç km'ye kadar) hata binde birin çok altındadır.
 */
export function cografiCokgen(noktalar) {
  const { a, e2 } = WGS84;
  const lat0 = noktalar.reduce((t, p) => t + p[0], 0) / noktalar.length;
  const lon0 = noktalar.reduce((t, p) => t + p[1], 0) / noktalar.length;
  const s2 = Math.sin(rad(lat0)) ** 2;
  const M = a * (1 - e2) / Math.pow(1 - e2 * s2, 1.5);
  const N = a / Math.sqrt(1 - e2 * s2);
  const duzlem = noktalar.map(([lat, lon]) => [rad(lon - lon0) * N * Math.cos(rad(lat0)), rad(lat - lat0) * M]);
  return cokgen(duzlem);
}

// ---------------------------------------------------------------- istatistik
/** GUM Tablo G.2: %95,45 kapsam olasılığı için Student-t değerleri. */
const T9545 = [[1, 13.97], [2, 4.53], [3, 3.31], [4, 2.87], [5, 2.65], [6, 2.52], [7, 2.43], [8, 2.37], [9, 2.32],
  [10, 2.28], [11, 2.25], [12, 2.23], [13, 2.21], [14, 2.2], [15, 2.18], [16, 2.17], [17, 2.16], [18, 2.15],
  [19, 2.14], [20, 2.13], [25, 2.11], [30, 2.09], [35, 2.07], [40, 2.06], [45, 2.06], [50, 2.05], [100, 2.025]];

export function kapsamFaktoru(nu) {
  if (!Number.isFinite(nu) || nu > 100) return 2;
  if (nu <= 1) return T9545[0][1];
  for (let i = 1; i < T9545.length; i++) {
    const [n1, t1] = T9545[i - 1], [n2, t2] = T9545[i];
    if (nu <= n2) return t1 + (t2 - t1) * (nu - n1) / (n2 - n1);
  }
  return 2;
}

export function ortalamaStd(dizi) {
  const n = dizi.length;
  const ort = dizi.reduce((t, x) => t + x, 0) / n;
  const s = n > 1 ? Math.sqrt(dizi.reduce((t, x) => t + (x - ort) ** 2, 0) / (n - 1)) : NaN;
  return { n, ort, s, min: Math.min(...dizi), max: Math.max(...dizi) };
}

/** Metin içindeki sayıları okur. Ayırıcılar: satır sonu, boşluk, ";" ve "virgül+boşluk". Ondalık için "," veya ".". */
export function sayilariAyikla(metin) {
  return String(metin || '').split(/[;\t\n\r]+|,\s+|\s+/).filter(Boolean).map(x => {
    const s = x.replace(',', '.');
    return /^[-+−]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s) ? Number(s.replace('−', '-')) : NaN;
  });
}
