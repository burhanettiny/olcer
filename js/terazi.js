// Ölçer — su terazisi: yüzey (telefon yatık), kenar (tablo, raf, kapı: telefon dik) ve kamera çizgisi modları.
// Yerçekimi yönü ivmeölçerden (accelerationIncludingGravity) alçak geçiren süzgeçle elde edilir.

import { bicimle, sayiOku } from './birimler.js';
import { el, ayarOku, ayarYaz, kameraAc, kayitDugmesi } from './ortak.js';

const der = r => r * 180 / Math.PI;
const IOS = /iPhone|iPad|iPod/.test(globalThis.navigator?.userAgent || '');
/** Açıyı 0,1° hassasiyetle yazar (sensör gürültüsünü göstermemek için). */
const a1 = v => { const r = Math.round(v * 10) / 10; return (r === 0 ? '0,0' : r.toFixed(1).replace('.', ',').replace('-', '−')); };
const y1 = v => a1(Math.tan(v * Math.PI / 180) * 100);

/** Ekran düzlemindeki açının en yakın 90° katından sapması (−45…45°). */
export function kenarSapmasi(gx, gy) {
  const fi = der(Math.atan2(gx, gy));
  const ref = Math.round(fi / 90) * 90;
  return { sapma: fi - ref, ref: ((ref % 360) + 360) % 360 };
}

export const TERAZI = {
  id: 'terazi', ad: 'Su terazisi (tablo, raf, yüzey)', ikon: '🫧', one: true,
  aciklama: 'Tablo asarken telefonun kenarını çerçeveye dayayın; masaya koyunca yüzey terazisi olur. Kamera çizgisi ve kalibrasyon.',
  ac(kok) {
    let ofset = ayarOku('terazi2', { kenar: 0, x: 0, y: 0 });
    let g = null;                    // süzülmüş yerçekimi vektörü
    let mod = 'oto', etkin = null;   // etkin: 'yuzey' | 'kenar'
    let kam = null, kamera = false, sonTitresim = 0, duzdu = false, tutulan = null;
    let kalibrasyon = null;          // { adim: 1 | 2, ilk }
    let genislik = ayarOku('tabloGenislik', 100); // cm

    // ------------------------------------------------------------ görünüm
    const aciD = el('div', { sinif: 'terazi-aci' }, '—');
    const yonerge = el('div', { sinif: 'terazi-yonerge' }, 'Başlatmak için "Başlat"a basın');
    const ekD = el('div', { sinif: 'kucuk terazi-ek' });

    const kabarcik = el('div', { sinif: 'kabarcik' });
    const yuzey = el('div', { sinif: 'kadran' }, el('div', { sinif: 'kadran-merkez' }), kabarcik);

    const tupKabarcik = el('div', { sinif: 'tup-kabarcik' });
    const tup = el('div', { sinif: 'tup' }, el('div', { sinif: 'tup-cizgi sol' }), el('div', { sinif: 'tup-cizgi sag' }), tupKabarcik);
    const ufuk = el('div', { sinif: 'ufuk' });
    const kenarAci = el('div', { sinif: 'kenar-aci' }), kenarYon = el('div', { sinif: 'kenar-yon' });
    const kenarIc = el('div', { sinif: 'kenar-ic' }, kenarAci, ufuk, tup, kenarYon);
    const kenarEkran = el('div', { sinif: 'kenar-ekran' }, kenarIc);

    const video = el('video', { sinif: 'vizor-video', autoplay: '', muted: '', playsinline: '' });
    const kamUfuk = el('div', { sinif: 'kamera-ufuk' }, el('div', { sinif: 'yatay' }), el('div', { sinif: 'dikey' }));
    const kameraEkran = el('div', { sinif: 'vizor terazi-kamera', hidden: true }, video, kamUfuk);

    const gosterge = el('div', { sinif: 'terazi-gosterge' }, yuzey, kenarEkran, kameraEkran);

    function okuma() {
      if (!g) return null;
      let [x, y, z] = g;
      if (IOS) { x = -x; y = -y; z = -z; } // iOS işaretleri ters raporlar
      const t = Math.hypot(x, y, z) || 1;
      const duzluk = Math.abs(z) / t;
      const secilen = mod === 'oto' ? (etkin === 'yuzey' ? (duzluk > 0.55 ? 'yuzey' : 'kenar') : (duzluk > 0.75 ? 'yuzey' : 'kenar')) : mod;
      if (secilen === 'yuzey') {
        const ax = der(Math.atan2(x, Math.abs(z))) - ofset.x, ay = der(Math.atan2(y, Math.abs(z))) - ofset.y;
        const toplam = der(Math.atan(Math.hypot(Math.tan(ax * Math.PI / 180), Math.tan(ay * Math.PI / 180))));
        return { tur: 'yuzey', ax, ay, toplam };
      }
      const k = kenarSapmasi(x, y);
      return { tur: 'kenar', sapma: k.sapma - ofset.kenar, ref: k.ref };
    }

    function ciz() {
      const o = okuma();
      if (!o) return;
      if (o.tur !== etkin) { etkin = o.tur; yuzey.hidden = etkin !== 'yuzey'; kenarEkran.hidden = etkin !== 'kenar' || kamera; kameraEkran.hidden = !(etkin === 'kenar' && kamera); }
      const goster = tutulan ?? o;
      let duz;
      if (goster.tur === 'yuzey') {
        duz = goster.toplam < 0.3;
        const R = (yuzey.clientWidth || 260) / 2 - 22, sinir = 10;
        const k = v => Math.max(-1, Math.min(1, v / sinir)) * R;
        kabarcik.style.transform = `translate(${k(goster.ax)}px, ${k(-goster.ay)}px)`;
        kabarcik.classList.toggle('duz', duz);
        aciD.textContent = `${a1(goster.toplam)}°`;
        yonerge.textContent = duz ? '✅ Yüzey düz' : 'Kabarcık yüksek tarafa gider';
        ekD.textContent = `Sol–sağ ${a1(goster.ax)}° (%${y1(goster.ax)}) · Ön–arka ${a1(goster.ay)}° (%${y1(goster.ay)})`;
      } else {
        const s = goster.sapma;
        duz = Math.abs(s) < 0.15;
        const W = (tup.clientWidth || 300) / 2 - 24;
        tupKabarcik.style.transform = `translateX(${Math.max(-1, Math.min(1, s / 5)) * W}px)`;
        tupKabarcik.classList.toggle('duz', duz);
        // Ekran döndürmesi kilitliyse arayüz telefonla birlikte yan durur: tüpü kullanıcıya göre düz göster
        const don = ((((goster.ref ?? 0) - (screen.orientation?.angle || 0)) % 360) + 540) % 360 - 180;
        kenarIc.style.transform = `rotate(${don}deg)`;
        ufuk.style.transform = `rotate(${s}deg)`;
        kamUfuk.style.transform = `rotate(${don + s}deg)`;
        kamUfuk.classList.toggle('duz', duz);
        aciD.textContent = `${a1(s)}°`;
        const mm = genislik * 10 * Math.tan(Math.abs(s) * Math.PI / 180);
        yonerge.textContent = duz ? '✅ Tam yatay / dik' : `${s > 0 ? 'Sol' : 'Sağ'} tarafı ${bicimle(mm, 2)} mm yükseltin`;
        ekD.textContent = `${bicimle(genislik, 4)} cm genişlikte uçlar arası fark: ${bicimle(mm, 3)} mm · eğim %${y1(Math.abs(s))}`;
        kenarAci.textContent = aciD.textContent;
        kenarYon.textContent = duz ? '✅ Düz' : `${s > 0 ? '◀ Sol' : 'Sağ ▶'} ${bicimle(mm, 2)} mm yukarı`;
      }
      gosterge.classList.toggle('duz', duz);
      if (duz && !duzdu && Date.now() - sonTitresim > 1200 && !tutulan) { navigator.vibrate?.(60); sonTitresim = Date.now(); }
      duzdu = duz;
    }

    const hareket = e => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      const yeni = [a.x, a.y, a.z];
      g = g ? g.map((v, i) => v + 0.12 * (yeni[i] - v)) : yeni;
    };
    let cerceve = null;
    const dongu = () => { ciz(); cerceve = requestAnimationFrame(dongu); };

    async function baslat() {
      for (const S of [window.DeviceMotionEvent, window.DeviceOrientationEvent]) {
        try { if (S && typeof S.requestPermission === 'function') await S.requestPermission(); } catch { /* yok */ }
      }
      removeEventListener('devicemotion', hareket);
      addEventListener('devicemotion', hareket);
      if (!cerceve) dongu();
      yonerge.textContent = 'Sensör bekleniyor…';
      setTimeout(() => { if (!g) yonerge.textContent = 'İvmeölçer verisi gelmiyor: bu cihazda sensör yok ya da izin verilmedi.'; }, 2500);
    }

    // ------------------------------------------------------------ denetimler
    const modlar = [['oto', 'Otomatik'], ['kenar', 'Tablo / raf (dik)'], ['yuzey', 'Yüzey (yatık)']];
    const modCip = el('div', { sinif: 'cipler' });
    const modCiz = () => {
      modCip.textContent = '';
      for (const [id, ad] of modlar) modCip.append(el('button', { type: 'button', sinif: 'cip', 'aria-pressed': String(mod === id), onclick: () => { mod = id; modCiz(); } }, ad));
    };
    modCiz();

    const kameraDugme = el('button', { type: 'button', onclick: async () => {
      kamera = !kamera;
      kameraDugme.textContent = kamera ? '📏 Tüp görünümü' : '📷 Kamera çizgisi';
      if (kamera && !kam) { try { kam = await kameraAc(video); } catch (e) { yonerge.textContent = 'Kamera açılamadı: ' + (e.message || e.name); kamera = false; } }
      if (!kamera && kam) { kam.kapat(); kam = null; }
      etkin = null;
    } }, '📷 Kamera çizgisi');

    const tutDugme = el('button', { type: 'button', onclick: () => { tutulan = tutulan ? null : okuma(); tutDugme.textContent = tutulan ? '▶ Bırak' : '⏸ Değeri tut'; } }, '⏸ Değeri tut');
    const kalibDugme = el('button', { type: 'button', onclick: () => {
      const o = okuma();
      if (!o) return;
      const ham = o.tur === 'yuzey' ? { x: o.ax + ofset.x, y: o.ay + ofset.y } : { kenar: o.sapma + ofset.kenar };
      if (!kalibrasyon) {
        kalibrasyon = { tur: o.tur, ilk: ham };
        kalibDugme.textContent = '② 180° çevirip aynı yere koyun → bas';
        yonerge.textContent = o.tur === 'kenar' ? 'Telefonu uçları yer değiştirecek şekilde ters çevirip aynı kenara dayayın, sonra tekrar basın.' : 'Telefonu aynı yerde 180° döndürün, sonra tekrar basın.';
        return;
      }
      if (kalibrasyon.tur !== o.tur) { kalibrasyon = null; kalibDugme.textContent = '🎯 Kalibre et'; return; }
      // Ters çevirince gerçek eğim işaret değiştirir, sensör hatası değişmez: hata = iki okumanın ortalaması
      if (o.tur === 'kenar') ofset.kenar = (kalibrasyon.ilk.kenar + ham.kenar) / 2;
      else { ofset.x = (kalibrasyon.ilk.x + ham.x) / 2; ofset.y = (kalibrasyon.ilk.y + ham.y) / 2; }
      ayarYaz('terazi2', ofset);
      kalibrasyon = null;
      kalibDugme.textContent = '🎯 Kalibre et';
      yonerge.textContent = 'Kalibrasyon kaydedildi.';
    } }, '🎯 Kalibre et');

    const genGir = el('input', { type: 'text', inputmode: 'decimal', value: String(genislik).replace('.', ','), 'aria-label': 'Tablo genişliği' });
    genGir.addEventListener('input', () => { const x = sayiOku(genGir.value); if (x > 0) { genislik = x; ayarYaz('tabloGenislik', x); } });

    kok.append(
      modCip, gosterge, aciD, yonerge, ekD,
      el('div', { sinif: 'dugmeler' },
        el('button', { type: 'button', sinif: 'birincil', onclick: baslat }, '▶ Başlat'),
        kameraDugme, tutDugme, kalibDugme,
        el('button', { type: 'button', onclick: () => { ofset = { kenar: 0, x: 0, y: 0 }; ayarYaz('terazi2', ofset); } }, 'Kalibrasyonu sil'),
        kayitDugmesi(() => { const o = tutulan ?? okuma(); return !o ? [] : o.tur === 'kenar' ? [['Sapma', aciD.textContent], ['Yönerge', yonerge.textContent], ['Ayrıntı', ekD.textContent]] : [['Toplam eğim', aciD.textContent], ['Ayrıntı', ekD.textContent]]; }, 'Terazi ölçümü')),
      el('label', { sinif: 'girdi' }, el('span', {}, 'Tablo / raf genişliği (cm) — kaç mm yükseltileceğini hesaplamak için'), genGir),
      el('h3', {}, 'Tablo asarken'),
      el('ol', { sinif: 'kucuk' },
        el('li', {}, 'Telefonu yan çevirin (yatay) ve uzun kenarını tablonun üst kenarına dayayın.'),
        el('li', {}, 'Tüpteki kabarcık ortaya gelene, ekran yeşile dönene kadar düşük tarafı yükseltin. Telefon titrediğinde tablo düzdür.'),
        el('li', {}, 'Dikey hizalama (kapı, dolap kenarı) için telefonu dik tutup yan kenarını dayayın.'),
        el('li', {}, 'Tablonuza dokunamıyorsanız "Kamera çizgisi"ni açın: ekrandaki kırmızı çizgi gerçek yataydır.')),
      el('p', { sinif: 'uyari' }, 'İlk kullanımda kalibre edin: telefonu düz bir kenara dayayıp "Kalibre et"e basın, uçları yer değiştirecek şekilde ters çevirip aynı yere dayayın ve tekrar basın. Kamera tümseği ve kılıf telefonu eğebilir; ölçümü kılıfsız ve kamera tümseği olmayan kenarla yapın. Telefon sensörleri kalibrasyondan sonra tipik olarak ±0,1–0,2° doğrudur.'),
    );
    yuzey.hidden = true; kameraEkran.hidden = true;
    return () => { cancelAnimationFrame(cerceve); removeEventListener('devicemotion', hareket); kam?.kapat(); };
  },
};
