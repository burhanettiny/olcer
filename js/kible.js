// Ölçer — kıble pusulası.
// Kıble yönü: bulunduğunuz yerden Kâbe'ye büyük daire (en kısa yol) başlangıç azimutu.
// Telefon pusulası manyetik kuzeyi verir; WMM2025 ile o konumdaki manyetik sapma eklenerek gerçek kuzeye çevrilir.

import { bicimle, sayiOku } from './birimler.js';
import { kerteriz, vincenty, gunesKonumu, koordinatOku } from './fizik.js';
import { manyetikAlan } from './wmm.js';
import { el, ayarOku, ayarYaz, kayitDugmesi, bildir } from './ortak.js';
import { OlcerSensor } from './yerel.js';

export const KABE = { enlem: 21.422487, boylam: 39.826206 };

/** Kıble azimutu (gerçek kuzeyden, derece) ve Kâbe'ye uzaklık (m). */
export function kibleYonu(enlem, boylam) {
  return { azimut: kerteriz(enlem, boylam, KABE.enlem, KABE.boylam), uzaklik: vincenty(enlem, boylam, KABE.enlem, KABE.boylam).mesafe };
}

/** Güneşin bugün kıble yönünde olduğu an (yerel saat). Güneş ufkun altındaysa null. */
export function kibleSaati(enlem, boylam, gun = new Date(), kible = kibleYonu(enlem, boylam).azimut) {
  const bas = new Date(gun); bas.setHours(0, 0, 0, 0);
  let enIyi = null, enFark = Infinity;
  for (let dk = 0; dk < 1440; dk++) {
    const t = new Date(bas.getTime() + dk * 60000);
    const g = gunesKonumu(t, enlem, boylam);
    if (g.yukseklik < 3) continue;
    const fark = Math.abs(((g.azimut - kible + 540) % 360) - 180);
    if (fark < enFark) { enFark = fark; enIyi = { zaman: t, yukseklik: g.yukseklik }; }
  }
  return enIyi && enFark < 1 ? enIyi : null;
}

const fark180 = d => ((d % 360) + 540) % 360 - 180;
const YONLER = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GGD', 'G', 'GGB', 'GB', 'BGB', 'B', 'BKB', 'KB', 'KKB'];

export const KIBLE = {
  id: 'kible', ad: 'Kıble pusulası', ikon: '🕋', one: true,
  aciklama: 'Bulunduğunuz yerden Kâbe yönü; manyetik sapma otomatik düzeltilir, metal parazitini uyarır, güneşle kıble saati.',
  ac(kok) {
    let konum = ayarOku('kibleKonum', null); // {enlem, boylam, kaynak}
    let baslik = null, egik = false, sonTitresim = 0, hizali = false, izleyici = null, yonOlay = null, tutucu = null;
    let D = 0, kible = null, olculenB = null, beklenenB = null;

    const gul = el('div', { sinif: 'kible-gul' },
      el('span', { sinif: 'kuzey' }, 'K'), el('span', { sinif: 'dogu' }, 'D'), el('span', { sinif: 'guney' }, 'G'), el('span', { sinif: 'bati' }, 'B'),
      el('div', { sinif: 'kible-kabe' }, '🕋'));
    const ok = el('div', { sinif: 'kible-ok' });
    const kadran = el('div', { sinif: 'kible-kadran' }, gul, ok, el('div', { sinif: 'kible-merkez' }));
    const buyuk = el('div', { sinif: 'kible-yonerge' }, 'Konum ve pusula bekleniyor…');
    const satir = (ad) => { const d = el('span', { sinif: 'cikti-deger' }, '—'); return [el('div', { sinif: 'cikti' }, el('span', { sinif: 'cikti-ad' }, ad), d), d]; };
    const [sK, dK] = satir('Kıble açısı (gerçek kuzeyden)');
    const [sM, dM] = satir('Kıble açısı (manyetik kuzeyden, pusula için)');
    const [sS, dS] = satir('Manyetik sapma (WMM2025)');
    const [sU, dU] = satir('Kâbe\'ye uzaklık');
    const [sP, dP] = satir('Telefonun yönü (gerçek)');
    const [sKo, dKo] = satir('Konum');
    const [sG, dG] = satir('Güneş kıble yönünde (bugün)');
    const parazit = el('p', { sinif: 'uyari', hidden: true });
    const bilgi = el('p', { sinif: 'kucuk' });

    function konumUygula(k, kaydet = true) {
      konum = k;
      if (kaydet) ayarYaz('kibleKonum', k);
      const r = kibleYonu(k.enlem, k.boylam);
      kible = r.azimut;
      const alan = manyetikAlan(k.enlem, k.boylam, (k.rakim || 0) / 1000);
      D = alan.D;
      beklenenB = alan.F / 1000; // nT → µT
      dK.textContent = `${bicimle(kible, 4)}° (${YONLER[Math.round(kible / 22.5) % 16]})`;
      dM.textContent = `${bicimle((kible - D + 360) % 360, 4)}°`;
      dS.textContent = `${D >= 0 ? '+' : ''}${bicimle(D, 3)}° ${D >= 0 ? 'doğu' : 'batı'}`;
      dU.textContent = `${bicimle(r.uzaklik / 1000, 5)} km`;
      dKo.textContent = `${k.enlem.toFixed(4)}, ${k.boylam.toFixed(4)} (${k.kaynak})`;
      gul.querySelector('.kible-kabe').style.transform = `rotate(${kible}deg) translateY(calc(min(150px, 41vw) * -0.62)) rotate(${-kible}deg)`;
      const s = kibleSaati(k.enlem, k.boylam, new Date(), kible);
      dG.textContent = s ? `${s.zaman.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} — o an güneşe dönün` : 'bugün yok (güneş kıble yönüne gelmiyor)';
      if (r.uzaklik < 50) dK.textContent = 'Kâbe\'desiniz';
      ciz();
    }

    function ciz() {
      if (kible == null) { buyuk.textContent = 'Konumunuzu belirleyin.'; return; }
      if (baslik == null) {
        buyuk.textContent = `Kıble: kuzeyden ${Math.round(kible)}° saat yönünde`;
        ok.style.transform = `rotate(${kible}deg)`;
        gul.style.transform = 'rotate(0deg)';
        return;
      }
      const gercek = (baslik + D + 360) % 360;
      dP.textContent = `${Math.round(gercek)}°`;
      gul.style.transform = `rotate(${-gercek}deg)`;
      const fark = fark180(kible - gercek);
      ok.style.transform = `rotate(${fark}deg)`;
      const yeniHizali = Math.abs(fark) < 3;
      kadran.classList.toggle('hizali', yeniHizali);
      if (egik) buyuk.textContent = '📱 Telefonu yere paralel (yatay) tutun';
      else if (yeniHizali) buyuk.textContent = '✅ Kıbleye dönüksünüz';
      else buyuk.textContent = `${fark > 0 ? 'Sağa' : 'Sola'} ${Math.round(Math.abs(fark))}° dönün`;
      if (yeniHizali && !hizali && Date.now() - sonTitresim > 1500) { navigator.vibrate?.(80); sonTitresim = Date.now(); }
      hizali = yeniHizali;
    }

    const yonDinle = e => {
      let b = null;
      if (typeof e.webkitCompassHeading === 'number') b = e.webkitCompassHeading; // iOS: manyetik kuzey
      else if (e.absolute && e.alpha != null) b = (360 - e.alpha) % 360;           // Android: manyetik kuzey
      if (b == null) return;
      b = (b + (screen.orientation?.angle || 0) + 360) % 360;
      baslik = b;
      egik = Math.abs(e.beta ?? 0) > 35 || Math.abs(e.gamma ?? 0) > 35;
      ciz();
    };

    async function baslat() {
      for (const S of [window.DeviceOrientationEvent]) {
        try { if (S && typeof S.requestPermission === 'function') await S.requestPermission(); } catch { /* yok */ }
      }
      if (!yonOlay) {
        yonOlay = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
        addEventListener(yonOlay, yonDinle);
        setTimeout(() => { if (baslik == null) bilgi.textContent = 'Pusula verisi gelmiyor. Cihazda pusula yoksa kıble açısını ve güneş yöntemini kullanın.'; }, 3000);
      }
      if (navigator.geolocation && izleyici == null) {
        bilgi.textContent = 'Konum alınıyor…';
        izleyici = navigator.geolocation.watchPosition(p => {
          const c = p.coords;
          if (!konum || konum.kaynak !== 'GPS' || haversineKaba(konum, c) > 200) konumUygula({ enlem: c.latitude, boylam: c.longitude, rakim: c.altitude || 0, kaynak: 'GPS' });
          bilgi.textContent = `Konum doğruluğu ±${Math.round(c.accuracy)} m. Telefonu yatay tutun; metal eşyalardan, hoparlörden, mıknatıslı kılıflardan uzak durun.`;
        }, e => { bilgi.textContent = e.code === 1 ? 'Konum izni verilmedi. Aşağıdan konumu elle girebilirsiniz.' : 'Konum alınamadı. Aşağıdan elle girin.'; }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 });
      }
      // Manyetik parazit denetimi: ölçülen alan şiddetini modelin beklediği değerle karşılaştır
      if (OlcerSensor && !tutucu) {
        try {
          tutucu = await OlcerSensor.addListener('veri', e => {
            if (e.tur !== 'manyetik') return;
            const [x, y, z] = e.degerler.map(Number);
            olculenB = Math.hypot(x, y, z);
            if (beklenenB) {
              const oran = olculenB / beklenenB;
              parazit.hidden = oran > 0.8 && oran < 1.2;
              parazit.textContent = `⚠️ Manyetik parazit: ölçülen alan ${bicimle(olculenB, 3)} µT, bu konumda beklenen ${bicimle(beklenenB, 3)} µT. Yakında metal, mıknatıs ya da elektronik cihaz var; pusula sapabilir. Uzaklaşın veya telefonla havada 8 çizerek kalibre edin.`;
            }
          });
          await OlcerSensor.baslat({ tur: 'manyetik' });
        } catch { /* sensör yok */ }
      }
    }

    // Elle konum
    const enGir = el('input', { type: 'text', placeholder: 'enlem, ör. 39.9334', 'aria-label': 'Enlem' });
    const boyGir = el('input', { type: 'text', placeholder: 'boylam, ör. 32.8597', 'aria-label': 'Boylam' });
    const elleUygula = () => {
      const la = koordinatOku(enGir.value), lo = koordinatOku(boyGir.value);
      if (!(Math.abs(la) <= 90 && Math.abs(lo) <= 180)) { bildir('Geçerli enlem/boylam girin'); return; }
      konumUygula({ enlem: la, boylam: lo, kaynak: 'elle' });
    };

    kok.append(
      kadran, buyuk,
      el('div', { sinif: 'dugmeler' },
        el('button', { type: 'button', sinif: 'birincil', onclick: baslat }, '▶ Başlat'),
        kayitDugmesi(() => kible == null ? [] : [['Konum', dKo.textContent], ['Kıble açısı (gerçek kuzey)', dK.textContent], ['Manyetik kuzeyden', dM.textContent], ['Manyetik sapma', dS.textContent], ['Uzaklık', dU.textContent], ['Güneş kıblede', dG.textContent]], 'Kıble')),
      parazit, bilgi,
      el('div', { sinif: 'ciktilar' }, sK, sM, sS, sU, sP, sKo, sG),
      el('h3', {}, 'Konumu elle gir'),
      el('div', { sinif: 'birimli' }, enGir, boyGir, el('button', { type: 'button', onclick: elleUygula }, 'Uygula')),
      el('h3', {}, 'Doğru ölçüm için'),
      el('ol', { sinif: 'kucuk' },
        el('li', {}, 'Telefonu yere paralel tutun, kılıfında mıknatıs varsa çıkarın.'),
        el('li', {}, 'Metal masa, araç içi, buzdolabı, hoparlör ve prizlerden en az 50 cm uzak durun.'),
        el('li', {}, 'İlk kullanımda telefonla havada birkaç kez 8 çizerek pusulayı kalibre edin.'),
        el('li', {}, 'Emin olmak için "güneş kıble yönünde" saatinde güneşe dönerek karşılaştırın; bu yöntem pusuladan bağımsızdır.')),
      el('p', { sinif: 'not' }, 'Kıble yönü, bulunduğunuz yerden Kâbe\'ye (21,4225° K, 39,8262° D) en kısa yolun (büyük daire) başlangıç yönüdür. Telefon pusulası manyetik kuzeyi gösterdiği için, NOAA/BGS Dünya Manyetik Modeli (WMM2025) ile hesaplanan yerel manyetik sapma eklenir. Türkiye\'de bu sapma yaklaşık +5° ile +7° arasındadır; düzeltilmezse kıble bu kadar şaşar.'),
    );
    if (konum) konumUygula(konum, false); else ciz();
    return () => {
      if (yonOlay) removeEventListener(yonOlay, yonDinle);
      if (izleyici != null) navigator.geolocation.clearWatch(izleyici);
      if (tutucu) { tutucu.remove(); OlcerSensor?.durdur({ tur: 'manyetik' }); }
    };
  },
};

function haversineKaba(a, c) {
  const dy = (a.enlem - c.latitude) * 111320, dx = (a.boylam - c.longitude) * 111320 * Math.cos(c.latitude * Math.PI / 180);
  return Math.hypot(dx, dy);
}
