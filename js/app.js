// Ölçer — arayüz: yönlendirme, birim çevirici ve hesaplayıcı sayfaları.

import { BOYUTLAR, siye, sidan, sayiOku, sureOku, bicimle, sadeBicim } from './birimler.js';
import { HESAPLAR, KATEGORILER, MALZEMELER } from './hesaplar.js';
import { koordinatOku } from './fizik.js';
import { ARACLAR, ayarOku, ayarYaz } from './araclar.js';

const ana = document.getElementById('ana');
const ekle = (...dugumler) => ana.append(...dugumler.filter(Boolean));
const basamak = () => ayarOku('basamak', 6);
let temizle = null;

const el = (etiket, ozellik = {}, ...cocuklar) => {
  const e = document.createElement(etiket);
  for (const [k, v] of Object.entries(ozellik)) {
    if (k === 'sinif') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v);
  }
  for (const c of cocuklar.flat()) if (c != null) e.append(c);
  return e;
};

function birimSecici(boyut, secili, degisti) {
  const s = el('select', { 'aria-label': 'Birim' });
  for (const b of BOYUTLAR[boyut].birimler) s.append(el('option', { value: b.k, selected: b.k === secili }, b.k));
  s.title = BOYUTLAR[boyut].birimler.find(b => b.k === secili)?.ad || '';
  s.addEventListener('change', () => { s.title = BOYUTLAR[boyut].birimler.find(b => b.k === s.value).ad; degisti(s.value); });
  return s;
}

function kopyala(metin, hedef) {
  navigator.clipboard?.writeText(metin).then(() => {
    hedef.classList.add('kopyalandi');
    setTimeout(() => hedef.classList.remove('kopyalandi'), 900);
  }).catch(() => {});
}

const normal = s => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

// ================================================================ ANA SAYFA
function anaSayfa() {
  document.title = 'Ölçer';
  const arama = el('input', { type: 'search', placeholder: 'Ara: desi, dönüm, psi, rakım, çiy noktası…', 'aria-label': 'Ara', sinif: 'arama' });
  const sonuc = el('div', { sinif: 'arama-sonuc' });
  const icerik = el('div');

  const kart = (href, ikon, ad, alt) => el('a', { href, sinif: 'kart' }, el('span', { sinif: 'kart-ikon', 'aria-hidden': 'true' }, ikon), el('span', { sinif: 'kart-metin' }, el('strong', {}, ad), alt ? el('small', {}, alt) : null));

  const cevirici = el('section', {}, el('h2', {}, 'Birim çevirici'),
    el('div', { sinif: 'izgara kucuk-izgara' }, Object.entries(BOYUTLAR).filter(([, b]) => !b.gizli).map(([id, b]) => kart(`#/cevir/${id}`, b.ikon, b.ad))));
  const araclar = el('section', {}, el('h2', {}, 'Cihazla ölç'),
    el('div', { sinif: 'izgara' }, ARACLAR.map(a => kart(`#/arac/${a.id}`, a.ikon, a.ad, a.aciklama))));
  const hesaplar = el('section', {}, el('h2', {}, 'Hesaplayıcılar'),
    KATEGORILER.map(k => el('div', { sinif: 'kategori' },
      el('h3', {}, `${k.ikon} ${k.ad}`),
      el('div', { sinif: 'izgara' }, HESAPLAR.filter(h => h.kat === k.id).map(h => kart(`#/hesap/${h.id}`, '', h.ad))))));
  icerik.append(araclar, cevirici, hesaplar);

  arama.addEventListener('input', () => {
    const q = normal(arama.value.trim());
    sonuc.textContent = '';
    icerik.hidden = !!q;
    if (!q) return;
    const bulunan = [];
    for (const h of HESAPLAR) if (normal(`${h.ad} ${h.etiket || ''} ${KATEGORILER.find(k => k.id === h.kat).ad}`).includes(q)) bulunan.push(kart(`#/hesap/${h.id}`, '🧮', h.ad));
    for (const a of ARACLAR) if (normal(`${a.ad} ${a.aciklama}`).includes(q)) bulunan.push(kart(`#/arac/${a.id}`, a.ikon, a.ad));
    for (const [id, b] of Object.entries(BOYUTLAR)) {
      if (b.gizli) continue;
      const birim = b.birimler.find(x => normal(`${x.k} ${x.ad}`).includes(q));
      if (normal(b.ad).includes(q) || birim) bulunan.push(kart(`#/cevir/${id}${birim ? '?b=' + encodeURIComponent(birim.k) : ''}`, b.ikon, `${b.ad} çevirici`, birim ? `${birim.ad} (${birim.k})` : ''));
    }
    sonuc.append(bulunan.length ? el('div', { sinif: 'izgara' }, bulunan) : el('p', {}, 'Sonuç yok.'));
  });

  ekle(arama, sonuc, icerik);
  arama.focus({ preventScroll: true });
}

// ================================================================ BİRİM ÇEVİRİCİ
function ceviriciSayfasi(boyutId, sorgu) {
  const boyut = BOYUTLAR[boyutId];
  if (!boyut) return bulunamadi();
  document.title = `${boyut.ad} — Ölçer`;
  const kayit = ayarOku(`cevir.${boyutId}`, { deger: '1', birim: boyut.birimler.find(b => b.f === 1)?.k || boyut.birimler[0].k });
  if (sorgu.get('b') && boyut.birimler.some(b => b.k === sorgu.get('b'))) kayit.birim = sorgu.get('b');

  const giris = el('input', { type: 'text', inputmode: 'decimal', value: kayit.deger, 'aria-label': 'Değer', sinif: 'buyuk-giris' });
  const secici = birimSecici(boyutId, kayit.birim, k => { kayit.birim = k; guncelle(); });
  const liste = el('div', { sinif: 'cevir-liste' });
  const notlar = el('div');

  const guncelle = () => {
    kayit.deger = giris.value;
    ayarYaz(`cevir.${boyutId}`, kayit);
    const x = sayiOku(giris.value);
    liste.textContent = '';
    notlar.textContent = '';
    const si = Number.isFinite(x) ? siye(x, boyutId, kayit.birim) : NaN;
    if (boyutId === 'sicaklik' && si < 0) liste.append(el('p', { sinif: 'hata' }, 'Mutlak sıfırın (−273,15 °C) altında sıcaklık olamaz.'));
    for (const b of boyut.birimler) {
      const y = sidan(si, boyutId, b.k);
      const satir = el('button', { sinif: 'cevir-satir' + (b.k === kayit.birim ? ' secili' : ''), type: 'button', title: 'Kopyala' },
        el('span', { sinif: 'cevir-deger' }, bicimle(y, basamak())),
        el('span', { sinif: 'cevir-birim' }, el('strong', {}, b.k), ' ', el('small', {}, b.ad)));
      satir.addEventListener('click', () => kopyala(sadeBicim(y, basamak()), satir));
      liste.append(satir);
      if (b.not) notlar.append(el('p', { sinif: 'kucuk' }, `${b.k}: ${b.not}`));
    }
  };
  giris.addEventListener('input', guncelle);
  guncelle();

  ekle(
    el('nav', { sinif: 'geri' }, el('a', { href: '#/' }, '← Ana sayfa')),
    el('h1', {}, `${boyut.ikon} ${boyut.ad}`),
    el('div', { sinif: 'cevir-giris' }, giris, secici),
    el('p', { sinif: 'kucuk' }, 'Bir sonuca dokunarak kopyalayabilirsiniz.'),
    liste, notlar,
  );
}

// ================================================================ HESAPLAYICI
function hesapSayfasi(id) {
  const h = HESAPLAR.find(x => x.id === id);
  if (!h) return bulunamadi();
  document.title = `${h.ad} — Ölçer`;
  const kayit = ayarOku(`hesap.${id}`, {});
  kayit.girdi ??= {}; kayit.birim ??= {}; kayit.cikti ??= {};
  const alanlar = {};

  const form = el('div', { sinif: 'form' });
  const ciktilar = el('div', { sinif: 'ciktilar', 'aria-live': 'polite' });

  for (const g of h.girdiler) {
    const satir = el('label', { sinif: 'girdi' }, el('span', {}, g.ad + (g.opsiyonel ? ' (isteğe bağlı)' : '')));
    const deger = kayit.girdi[g.id] ?? g.deger ?? '';
    let kontrol, birimSec = null, malzemeSec = null;
    if (g.tip === 'secim') {
      kontrol = el('select', {}, g.secenekler.map(([d, ad]) => el('option', { value: d, selected: d === deger }, ad)));
    } else if (g.tip === 'cokmetin') {
      kontrol = el('textarea', { rows: '5', spellcheck: 'false' });
      kontrol.value = deger;
    } else {
      kontrol = el('input', { type: 'text', inputmode: g.tip === 'koord' || g.negatif ? 'text' : 'decimal', value: deger, autocomplete: 'off' });
    }
    if (g.boyut) {
      const birim = kayit.birim[g.id] || g.birim;
      birimSec = birimSecici(g.boyut, birim, yeni => {
        // Birim değişince değeri de çevir ki aynı fiziksel büyüklük korunsun.
        const x = sayiOku(kontrol.value);
        if (Number.isFinite(x) && !g.sure) kontrol.value = sadeBicim(sidan(siye(x, g.boyut, kayit.birim[g.id] || g.birim), g.boyut, yeni), 8);
        kayit.birim[g.id] = yeni; hesapla();
      });
    }
    if (g.tip === 'yogunluk') {
      malzemeSec = el('select', { 'aria-label': 'Malzeme' }, el('option', { value: '' }, 'Malzeme seçin…'), MALZEMELER.map(([ad, rho]) => el('option', { value: String(rho) }, `${ad} — ${bicimle(rho, 5)} kg/m³`)));
      malzemeSec.addEventListener('change', () => {
        if (!malzemeSec.value) return;
        kontrol.value = sadeBicim(sidan(Number(malzemeSec.value), 'yogunluk', kayit.birim[g.id] || g.birim), 6);
        hesapla();
      });
      kontrol.addEventListener('input', () => { malzemeSec.value = ''; });
    }
    kontrol.addEventListener('input', hesapla);
    kontrol.addEventListener('change', hesapla);
    if (malzemeSec) satir.append(malzemeSec);
    satir.append(birimSec ? el('div', { sinif: 'birimli' }, kontrol, birimSec) : kontrol);
    if (g.ipucu) satir.append(el('small', { sinif: 'ipucu' }, g.ipucu));
    alanlar[g.id] = { g, satir, kontrol };
    form.append(satir);
  }

  function degerler() {
    const v = {}, hamlar = {};
    for (const { g, kontrol } of Object.values(alanlar)) {
      hamlar[g.id] = kontrol.value;
      if (g.tip === 'secim' || g.tip === 'cokmetin' || g.tip === 'metin') v[g.id] = kontrol.value;
      else if (g.tip === 'koord') v[g.id] = koordinatOku(kontrol.value);
      else {
        let x = g.sure && kontrol.value.includes(':') ? sureOku(kontrol.value) : sayiOku(kontrol.value);
        if (g.boyut && Number.isFinite(x) && !(g.sure && kontrol.value.includes(':'))) x = siye(x, g.boyut, kayit.birim[g.id] || g.birim);
        v[g.id] = x;
      }
    }
    return { v, hamlar };
  }

  function hesapla() {
    const { v, hamlar } = degerler();
    kayit.girdi = hamlar;
    ayarYaz(`hesap.${id}`, kayit);
    ciktilar.textContent = '';
    const eksik = [], hatali = [];
    for (const { g, satir, kontrol } of Object.values(alanlar)) {
      const gorunur = !g.goster || g.goster(v);
      satir.hidden = !gorunur;
      satir.classList.remove('gecersiz');
      if (!gorunur) { v[g.id] = undefined; continue; }
      if (g.tip === 'secim' || g.tip === 'cokmetin' || g.tip === 'metin') continue;
      const bos = kontrol.value.trim() === '';
      if (bos) { v[g.id] = NaN; if (!g.opsiyonel) eksik.push(g.ad); continue; }
      if (Number.isNaN(v[g.id])) { satir.classList.add('gecersiz'); hatali.push(`${g.ad}: sayı okunamadı`); continue; }
      const ham = g.boyut === 'sicaklik' ? v[g.id] : (g.tip === 'koord' ? 0 : sayiOku(kontrol.value));
      if (!g.negatif && g.tip !== 'koord' && ham < 0) { satir.classList.add('gecersiz'); hatali.push(`${g.ad} negatif olamaz`); }
    }
    if (hatali.length) { ciktilar.append(el('p', { sinif: 'hata' }, hatali.join(' · '))); return; }
    if (eksik.length) { ciktilar.append(el('p', { sinif: 'bekliyor' }, 'Sonuç için girin: ' + eksik.join(', '))); return; }
    let sonuc;
    try { sonuc = h.hesapla(v); }
    catch (e) { ciktilar.append(el('p', { sinif: 'hata' }, e.message)); return; }
    sonuc.forEach((c, i) => {
      const anahtar = `${i}:${c.ad}`;
      const satir = el('div', { sinif: 'cikti' + (c.vurgu ? ' vurgu' : '') }, el('span', { sinif: 'cikti-ad' }, c.ad));
      if (c.metin !== undefined) {
        const d = el('button', { type: 'button', sinif: 'cikti-deger', title: 'Kopyala' }, c.metin);
        d.addEventListener('click', () => kopyala(c.metin, d));
        satir.append(d);
      } else {
        let birim = kayit.cikti[anahtar] || c.birim;
        const d = el('button', { type: 'button', sinif: 'cikti-deger', title: 'Kopyala' });
        const yaz = () => { d.textContent = bicimle(sidan(c.d, c.boyut, birim), basamak()); };
        d.addEventListener('click', () => kopyala(sadeBicim(sidan(c.d, c.boyut, birim), basamak()), d));
        yaz();
        satir.append(el('span', { sinif: 'birimli' }, d, birimSecici(c.boyut, birim, yeni => { birim = yeni; kayit.cikti[anahtar] = yeni; ayarYaz(`hesap.${id}`, kayit); yaz(); })));
      }
      ciktilar.append(satir);
    });
  }

  const eylemler = h.eylemler ? el('div', { sinif: 'dugmeler' }, h.eylemler.map(e => {
    const d = el('button', { type: 'button' }, e.ad);
    d.addEventListener('click', async () => {
      d.disabled = true;
      try { await e.calis((id, deger) => { alanlar[id].kontrol.value = deger; }); hesapla(); }
      catch (err) { ciktilar.prepend(el('p', { sinif: 'hata' }, err.message)); }
      finally { d.disabled = false; }
    });
    return d;
  })) : null;

  const kat = KATEGORILER.find(k => k.id === h.kat);
  ekle(
    el('nav', { sinif: 'geri' }, el('a', { href: '#/' }, '← Ana sayfa'), el('span', {}, ` · ${kat.ikon} ${kat.ad}`)),
    el('h1', {}, h.ad),
    eylemler, form,
    el('h2', { sinif: 'sonuc-baslik' }, 'Sonuç'),
    ciktilar,
    h.not ? el('p', { sinif: 'not' }, h.not) : null,
    el('div', { sinif: 'dugmeler' }, el('button', { type: 'button', onclick: () => { ayarYaz(`hesap.${id}`, {}); yonlendir(); } }, 'Varsayılanlara dön')),
  );
  hesapla();
}

// ================================================================ ARAÇ
function aracSayfasi(id) {
  const a = ARACLAR.find(x => x.id === id);
  if (!a) return bulunamadi();
  document.title = `${a.ad} — Ölçer`;
  const kok = el('div', { sinif: 'arac' });
  ekle(el('nav', { sinif: 'geri' }, el('a', { href: '#/' }, '← Ana sayfa')), el('h1', {}, `${a.ikon} ${a.ad}`), el('p', {}, a.aciklama), kok);
  if (!window.isSecureContext) kok.append(el('p', { sinif: 'hata' }, 'Sensörler yalnızca güvenli (https) bağlantıda çalışır.'));
  temizle = a.ac(kok);
}

// ================================================================ AYARLAR
function ayarlarSayfasi() {
  document.title = 'Ayarlar — Ölçer';
  const bas = el('select', {}, [3, 4, 5, 6, 8, 10, 12].map(n => el('option', { value: n, selected: n === basamak() }, `${n} anlamlı basamak`)));
  bas.addEventListener('change', () => ayarYaz('basamak', Number(bas.value)));
  ekle(
    el('nav', { sinif: 'geri' }, el('a', { href: '#/' }, '← Ana sayfa')),
    el('h1', {}, 'Ayarlar'),
    el('label', { sinif: 'girdi' }, el('span', {}, 'Sonuç hassasiyeti'), bas),
    el('div', { sinif: 'dugmeler' }, el('button', { type: 'button', onclick: () => {
      if (!confirm('Kaydedilen tüm girdiler ve kalibrasyonlar (cetvel, terazi, ses) silinsin mi?')) return;
      try { Object.keys(localStorage).filter(k => k.startsWith('olcer.')).forEach(k => localStorage.removeItem(k)); } catch { /* yok */ }
      location.hash = '#/';
    } }, 'Tüm kayıtlı verileri sil')),
    el('h2', {}, 'Hakkında'),
    el('p', {}, 'Ölçer; birim çevirme, geometrik ve fiziksel hesaplar ile telefon sensörleriyle ölçüm yapan, internet bağlantısı gerektirmeyen bir uygulamadır. Tüm hesaplar cihazınızda yapılır; hiçbir veri gönderilmez.'),
    el('p', { sinif: 'kucuk' }, 'Birim tanımları SI Broşürü (BIPM, 9. baskı) ve NIST SP 811 değerlerine dayanır. Sonuçlar bilgilendirme amaçlıdır; yasal metrolojik işlemlerde (ticari tartım, tapu, kalibrasyon sertifikası) yetkili kuruluşların ölçümleri esastır.'),
  );
}

function bulunamadi() {
  ekle(el('h1', {}, 'Sayfa bulunamadı'), el('p', {}, el('a', { href: '#/' }, 'Ana sayfaya dön')));
}

// ================================================================ YÖNLENDİRME
function yonlendir() {
  if (temizle) { try { temizle(); } catch { /* yok */ } temizle = null; }
  ana.textContent = '';
  const [yol, sorguMetni = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [tur, id] = yol.split('/').map(decodeURIComponent);
  const sorgu = new URLSearchParams(sorguMetni);
  if (tur === 'cevir') ceviriciSayfasi(id, sorgu);
  else if (tur === 'hesap') hesapSayfasi(id);
  else if (tur === 'arac') aracSayfasi(id);
  else if (tur === 'ayarlar') ayarlarSayfasi();
  else anaSayfa();
  scrollTo(0, 0);
}

addEventListener('hashchange', yonlendir);
yonlendir();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
