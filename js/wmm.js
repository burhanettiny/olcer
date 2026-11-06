// Ölçer — Dünya Manyetik Modeli (WMM2025): konuma göre manyetik sapma (deklinasyon).
// Katsayılar: NOAA NCEI / BGS, World Magnetic Model 2025 (geçerlilik 2025.0–2030.0), kamu malı.
// Dizin: n(n+1)/2 + m. Birimler: nT ve nT/yıl.

const EPOK = 2025;
const N = 12;
const G = [0,-29351.8,-1410.8,-2556.6,2951.1,1649.3,1361,-2404.1,1243.8,453.6,895,799.5,55.7,-281.1,12.1,-233.2,368.9,187.2,-138.7,-142,20.9,64.4,63.8,76.9,-115.7,-40.9,14.9,-60.7,79.5,-77,-8.8,59.3,15.8,2.5,-11.1,14.2,23.2,10.8,-17.5,2,-21.7,16.9,15,-16.8,0.9,4.6,7.8,3,-0.2,-2.5,-13.1,2.4,8.6,-8.7,-12.9,-1.3,-6.4,0.2,2,-1,-0.6,-0.9,1.5,0.9,-2.7,-3.9,2.9,-1.5,-2.5,2.4,-0.6,-0.1,-0.6,-0.1,1.1,-1,-0.2,2.6,-2,-0.2,0.3,1.2,-1.3,0.6,0.6,0.5,-0.1,-0.4,-0.2,-1.3,-0.7];
const H = [0,0,4545.4,0,-3133.6,-815.1,0,-56.6,237.5,-549.5,0,278.6,-133.9,212,-375.6,0,45.4,220.2,-122.9,43,106.1,0,-18.4,16.8,48.8,-59.8,10.9,72.7,0,-48.9,-14.4,-1,23.4,-7.4,-25.1,-2.3,0,7.1,-12.6,11.4,-9.7,12.7,0.7,-5.2,3.9,0,-24.8,12.2,8.3,-3.3,-5.2,7.2,-0.6,0.8,10,0,3.3,0,2.4,5.3,-9.1,0.4,-4.2,-3.8,0.9,-9.1,0,0,2.9,-0.6,0.2,0.5,-0.3,-1.2,-1.7,-2.9,-1.8,-2.3,0,-1.3,0.7,1,-1.4,0,0.6,-0.1,0.8,0.1,-1,0.1,0.2];
const GD = [0,12,9.7,-11.6,-5.2,-8,-1.3,-4.2,0.4,-15.6,-1.6,-2.4,-6,5.6,-7,0.6,1.4,0,0.6,2.2,0.9,-0.2,-0.4,0.9,1.2,-0.9,0.3,0.9,0,-0.1,-0.1,0.5,-0.1,-0.8,-0.8,0.8,-0.1,0.2,0,0.5,-0.1,0.3,0.2,0,0.2,0,-0.1,0.1,0.3,-0.3,0,0.3,-0.1,0.1,-0.1,0.1,0,0.1,0.1,0,-0.3,0,-0.1,-0.1,0,0,0,0,0,0,0,-0.1,0,0,-0.1,-0.1,-0.1,-0.1,0,0,0,0,0,0,0.1,0,0,0,-0.1,0,-0.1];
const HD = [0,0,-21.5,0,-27.7,-12.1,0,4,-0.3,-4.1,0,-1.1,4.1,1.6,-4.4,0,-0.5,2.2,0.4,1.7,1.9,0,0.3,-1.6,-0.4,0.9,0.7,0.9,0,0.6,0.5,-0.8,0,-1,0.6,-0.2,0,-0.2,0.5,-0.4,0.4,-0.5,-0.6,0.3,0.2,0,-0.3,0.3,-0.3,0.3,0.2,-0.1,-0.2,0.4,0.1,0,0,0,-0.2,0.1,-0.1,0.1,0,-0.1,0.2,0,0,0,0.1,0,0.1,0,0,0.1,0,0,0,0,0,0,0,-0.1,0.1,0,0,0,0,0,0,0,-0.1];

/** Ondalık yıl (ör. 2026.85). */
export function ondalikYil(tarih = new Date()) {
  const y = tarih.getUTCFullYear();
  const bas = Date.UTC(y, 0, 1), son = Date.UTC(y + 1, 0, 1);
  return y + (tarih.getTime() - bas) / (son - bas);
}

/**
 * Manyetik alan bileşenleri. enlem/boylam derece (jeodezik, WGS84), yükseklik km, yıl ondalık.
 * Dönüş: X (kuzey), Y (doğu), Z (aşağı) nT; D sapma ve I eğim derece.
 */
export function manyetikAlan(enlem, boylam, yukseklikKm = 0, yil = ondalikYil()) {
  const dt = yil - EPOK;
  const rad = Math.PI / 180;
  const a = 6378.137, b = 6356.7523142, re = 6371.2;
  const a2 = a * a, b2 = b * b;
  const slat = Math.sin(enlem * rad), clat = Math.cos(enlem * rad);
  const srlon = [0, Math.sin(boylam * rad)], crlon = [1, Math.cos(boylam * rad)];
  for (let m = 2; m <= N; m++) {
    srlon[m] = srlon[m - 1] * crlon[1] + crlon[m - 1] * srlon[1];
    crlon[m] = crlon[m - 1] * crlon[1] - srlon[m - 1] * srlon[1];
  }
  // Jeodezikten jeosentrik küresel koordinatlara
  const q = Math.sqrt(a2 - (a2 - b2) * slat * slat);
  const q1 = yukseklikKm * q, q2 = ((q1 + a2) / (q1 + b2)) ** 2;
  const ct = slat / Math.sqrt(q2 * clat * clat + slat * slat);
  const st = Math.sqrt(1 - ct * ct);
  const r2 = yukseklikKm * yukseklikKm + 2 * q1 + (a2 * a2 - (a2 * a2 - b2 * b2) * slat * slat) / (q * q);
  const r = Math.sqrt(r2);
  const d = Math.sqrt(a2 * clat * clat + b2 * slat * slat);
  const ca = (yukseklikKm + d) / r, sa = (a2 - b2) * clat * slat / (r * d);

  // Schmidt yarı-normalleştirilmiş ilişkili Legendre fonksiyonları ve θ'ya göre türevleri
  const P = [], dP = [];
  for (let n = 0; n <= N; n++) { P[n] = new Float64Array(N + 1); dP[n] = new Float64Array(N + 1); }
  P[0][0] = 1;
  for (let n = 1; n <= N; n++) {
    for (let m = 0; m <= n; m++) {
      if (n === m) {
        P[n][m] = st * P[n - 1][m - 1];
        dP[n][m] = st * dP[n - 1][m - 1] + ct * P[n - 1][m - 1];
      } else if (n === 1) {
        P[n][m] = ct * P[n - 1][m];
        dP[n][m] = ct * dP[n - 1][m] - st * P[n - 1][m];
      } else {
        const k = ((n - 1) ** 2 - m * m) / ((2 * n - 1) * (2 * n - 3));
        P[n][m] = ct * P[n - 1][m] - k * (m <= n - 2 ? P[n - 2][m] : 0);
        dP[n][m] = ct * dP[n - 1][m] - st * P[n - 1][m] - k * (m <= n - 2 ? dP[n - 2][m] : 0);
      }
    }
  }
  // Schmidt ölçek çarpanları
  const S = [];
  for (let n = 0; n <= N; n++) S[n] = new Float64Array(N + 1);
  S[0][0] = 1;
  for (let n = 1; n <= N; n++) {
    S[n][0] = S[n - 1][0] * (2 * n - 1) / n;
    for (let m = 1; m <= n; m++) S[n][m] = S[n][m - 1] * Math.sqrt((n - m + 1) * (m === 1 ? 2 : 1) / (n + m));
  }

  let br = 0, bt = 0, bp = 0;
  let oran = (re / r) ** 2;
  for (let n = 1; n <= N; n++) {
    oran *= re / r;
    for (let m = 0; m <= n; m++) {
      const i = n * (n + 1) / 2 + m;
      const g = (G[i] + dt * GD[i]) * S[n][m];
      const h = (H[i] + dt * HD[i]) * S[n][m];
      const t1 = g * crlon[m] + h * srlon[m];
      const t2 = g * srlon[m] - h * crlon[m];
      br += oran * (n + 1) * t1 * P[n][m];
      bt -= oran * t1 * dP[n][m];
      bp += oran * m * t2 * P[n][m];
    }
  }
  // Kutuplarda bp tanımsızdır; WMM'deki gibi çok küçük st ile sınırla
  bp = st > 1e-8 ? bp / st : bp;
  const X = -bt * ca - br * sa, Y = bp, Z = bt * sa - br * ca;
  const Hyatay = Math.hypot(X, Y);
  return { X, Y, Z, H: Hyatay, F: Math.hypot(Hyatay, Z), D: Math.atan2(Y, X) / rad, I: Math.atan2(Z, Hyatay) / rad };
}

/** Manyetik sapma (derece, doğu +). Gerçek yön = manyetik yön + sapma. */
export const manyetikSapma = (enlem, boylam, yukseklikKm = 0, yil) => manyetikAlan(enlem, boylam, yukseklikKm, yil).D;
