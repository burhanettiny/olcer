import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOYUTLAR, cevir, sayiOku, sureOku, bicimle } from '../js/birimler.js';
import * as F from '../js/fizik.js';
import { HESAPLAR } from '../js/hesaplar.js';

const yakin = (a, b, bagil = 1e-9) => assert.ok(Math.abs(a - b) <= bagil * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test('bilinen dönüşümler', () => {
  yakin(cevir(1, 'uzunluk', 'in', 'mm'), 25.4);
  yakin(cevir(1, 'uzunluk', 'mi', 'km'), 1.609344);
  yakin(cevir(1, 'alan', 'dönüm', 'm²'), 1000);
  yakin(cevir(1, 'alan', 'ha', 'dönüm'), 10);
  yakin(cevir(1, 'hacim', 'gal', 'L'), 3.785411784);
  yakin(cevir(1, 'kutle', 'lb', 'g'), 453.59237);
  yakin(cevir(100, 'hiz', 'km/sa', 'm/s'), 27.7777777778);
  yakin(cevir(1, 'basinc', 'bar', 'psi'), 14.503773773, 1e-9);
  yakin(cevir(1, 'basinc', 'atm', 'mmHg'), 760, 1e-6);
  yakin(cevir(1, 'kuvvet', 'kgf', 'N'), 9.80665);
  yakin(cevir(1, 'enerji', 'kWh', 'MJ'), 3.6);
  yakin(cevir(1, 'guc', 'BG', 'W'), 735.49875);
  yakin(cevir(180, 'aci', '°', 'rad'), Math.PI);
  yakin(cevir(1, 'veri', 'GiB', 'MB'), 1073.741824);
});

test('sıcaklık', () => {
  yakin(cevir(100, 'sicaklik', '°C', '°F'), 212);
  yakin(cevir(-40, 'sicaklik', '°F', '°C'), -40);
  yakin(cevir(0, 'sicaklik', '°C', 'K'), 273.15);
  yakin(cevir(491.67, 'sicaklik', '°R', '°C'), 0, 1e-9);
});

test('yakıt tüketimi', () => {
  yakin(cevir(5, 'yakit', 'L/100km', 'km/L'), 20);
  yakin(cevir(10, 'yakit', 'L/100km', 'mpg'), 23.5214583, 1e-6);
});

test('her birim gidiş-dönüş tutarlı', () => {
  for (const [id, b] of Object.entries(BOYUTLAR)) for (const x of b.birimler) for (const y of b.birimler) {
    yakin(cevir(cevir(3.7, id, x.k, y.k), id, y.k, x.k), 3.7, 1e-9);
  }
});

test('sayı okuma', () => {
  assert.equal(sayiOku('1,5'), 1.5);
  assert.equal(sayiOku('1.5'), 1.5);
  assert.equal(sayiOku('1.234,5'), 1234.5);
  assert.equal(sayiOku('1,234.5'), 1234.5);
  assert.equal(sayiOku('1.234.567'), 1234567);
  assert.equal(sayiOku('-2e3'), -2000);
  assert.equal(sayiOku(' 12 '), 12);
  assert.ok(Number.isNaN(sayiOku('abc')));
  assert.ok(Number.isNaN(sayiOku('')));
  assert.equal(sureOku('1:30:00'), 5400);
  assert.equal(sureOku('4:30'), 270);
});

test('biçimleme', () => {
  assert.equal(bicimle(1234.5678, 6), '1.234,57');
  assert.equal(bicimle(0.5), '0,5');
  assert.equal(bicimle(-2.5), '−2,5');
  assert.equal(bicimle(1.5e-9, 3), '1,5 × 10⁻⁹');
});

test('ISA ve rakım', () => {
  const s = F.isa(11000);
  yakin(s.T, 216.65, 1e-9);
  yakin(s.P, 22632, 1e-4);
  yakin(F.isa(0).rho, 1.225, 1e-3);
  yakin(F.barometrikYukseklik(89874.6), 1000, 1e-3);
  yakin(F.qnh(89874.6, 1000), 101325, 1e-4);
  assert.ok(Math.abs(F.kaynamaNoktasi(101325) - 373.15) < 0.05);
});

test('jeodezi', () => {
  // Vincenty'nin klasik test noktası: Flinders Peak → Buninyong, 54 972,271 m
  const r = F.vincenty(-(37 + 57 / 60 + 3.72030 / 3600), 144 + 25 / 60 + 29.52440 / 3600, -(37 + 39 / 60 + 10.15610 / 3600), 143 + 55 / 60 + 35.38390 / 3600);
  yakin(r.mesafe, 54972.271, 1e-6);
  yakin(F.koordinatOku('39°55\'12"K'), 39.92, 1e-9);
  yakin(F.koordinatOku('32 51 30 B'), -(32 + 51 / 60 + 30 / 3600), 1e-12);
  assert.ok(Number.isNaN(F.koordinatOku('39.9, 32.8')));
  // 100 m × 100 m kare ≈ 10 000 m² (ekvatorda)
  const d = 100 / 111319.49;
  const a = F.cografiCokgen([[0, 0], [0, d], [d * 1.00675, d], [d * 1.00675, 0]]);
  yakin(a.alan, 10000, 2e-3);
});

test('yerçekimi', () => {
  yakin(F.yerelG(0), 9.7803253359, 1e-9);
  yakin(F.yerelG(90), 9.8321849379, 1e-8);
});

test('kapsam faktörü', () => {
  assert.equal(F.kapsamFaktoru(Infinity), 2);
  assert.equal(F.kapsamFaktoru(4), 2.87);
  yakin(F.kapsamFaktoru(22.5), 2.12, 1e-9);
});

const hesap = id => HESAPLAR.find(h => h.id === id).hesapla;

test('desi', () => {
  const r = hesap('desi')({ en: 0.4, boy: 0.3, yuk: 0.25, kg: 3, adet: 1, bolen: '3000', yuvarla: '1' });
  assert.equal(r[0].metin, '10');
  assert.match(r.at(-1).metin, /desi geçerli/);
});

test('yatay tank yarı dolu', () => {
  const r = hesap('yatay-tank')({ d: 1, L: 2, h: 0.5 });
  yakin(r[0].d, Math.PI / 4, 1e-12);
});

test('belirsizlik', () => {
  const r = hesap('belirsizlik')({ okumalar: '10\n10,2\n9,8\n10,1\n9,9', coz: NaN, Ukal: NaN, ek: NaN, kmod: '2' });
  assert.match(r[0].metin, /^10,0+ ± 0,1/);
});

test('ohm', () => {
  const r = hesap('ohm')({ V: 230, I: NaN, R: NaN, P: 2300 });
  yakin(r[1].d, 10); yakin(r[2].d, 23);
});

test('perde tespiti (akort)', async () => {
  const { perdeBul, notaBilgisi } = await import('../js/frekans.js');
  for (const f of [41.2, 82.41, 110, 196.0, 440, 1760]) {
    const sr = 48000, buf = new Float32Array(3600);
    for (let i = 0; i < buf.length; i++) buf[i] = 0.3 * Math.sin(2 * Math.PI * f * i / sr) + 0.15 * Math.sin(4 * Math.PI * f * i / sr);
    yakin(perdeBul(buf, sr), f, 5e-4);
  }
  const la = notaBilgisi(440);
  assert.equal(la.ad, 'La'); assert.equal(la.oktav, 4); yakin(la.sent, 0, 1e-9);
  assert.equal(notaBilgisi(261.63).uluslararasi, 'C');
  assert.equal(perdeBul(new Float32Array(3600), 48000), null);
});

test('ekspertiz sınıflandırma', async () => {
  const { siniflandir } = await import('../js/ekspertiz.js');
  assert.equal(siniflandir([110, 120]).sinif, 'orijinal');
  assert.equal(siniflandir([120, 210]).sinif, 'boyali');
  assert.equal(siniflandir([450]).sinif, 'macun');
  assert.equal(siniflandir([50]).sinif, 'ince');
  assert.equal(siniflandir([]), null);
});

test('renk dönüşümleri', async () => {
  const { rgbLab, enYakinRenk } = await import('../js/kamera.js');
  const [L, a, b] = rgbLab(255, 255, 255);
  yakin(L, 100, 1e-3); assert.ok(Math.abs(a) < 0.01 && Math.abs(b) < 0.01);
  const kirmizi = rgbLab(255, 0, 0);
  yakin(kirmizi[0], 53.24, 1e-3); yakin(kirmizi[1], 80.09, 1e-3);
  assert.equal(enYakinRenk(20, 30, 95).ad, 'Lacivert');
});
