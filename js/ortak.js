// Ölçer — ortak DOM ve kayıt yardımcıları.

export const el = (etiket, ozellik = {}, ...cocuklar) => {
  const e = document.createElement(etiket);
  for (const [k, v] of Object.entries(ozellik)) {
    if (k === 'sinif') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v);
  }
  for (const c of cocuklar.flat()) if (c != null) e.append(c);
  return e;
};

export function ayarOku(anahtar, varsayilan) {
  try { const v = localStorage.getItem('olcer.' + anahtar); return v === null ? varsayilan : JSON.parse(v); } catch { return varsayilan; }
}
export function ayarYaz(anahtar, deger) {
  try { localStorage.setItem('olcer.' + anahtar, JSON.stringify(deger)); } catch { /* özel pencere vb. */ }
}

/** Ekranın altında kısa süreli bilgi mesajı gösterir. */
export function bildir(metin) {
  let kutu = document.getElementById('bildirim');
  if (!kutu) { kutu = el('div', { id: 'bildirim', role: 'status' }); document.body.append(kutu); }
  kutu.textContent = metin;
  kutu.classList.add('gorunur');
  clearTimeout(bildir.zaman);
  bildir.zaman = setTimeout(() => kutu.classList.remove('gorunur'), 2200);
}

// ---------------------------------------------------------------- kayıt defteri
export function kayitlar() { return ayarOku('kayitlar', []); }

/** Bir ölçüm/hesap sonucunu kayıt defterine ekler. satirlar: [[ad, değer], ...] */
export function kaydaEkle(baslik, satirlar, not = '') {
  const liste = kayitlar();
  liste.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), zaman: Date.now(), baslik, satirlar, not });
  ayarYaz('kayitlar', liste.slice(0, 500));
  bildir('💾 Kayıt defterine eklendi');
}

export function kayitSil(id) { ayarYaz('kayitlar', kayitlar().filter(k => k.id !== id)); }

export const kayitDugmesi = (topla, baslik) => el('button', { type: 'button', onclick: () => {
  const satirlar = topla();
  if (!satirlar || !satirlar.length) { bildir('Kaydedilecek sonuç yok'); return; }
  const not = prompt('Not ekleyin (isteğe bağlı):', '') ?? '';
  kaydaEkle(typeof baslik === 'function' ? baslik() : baslik, satirlar, not);
} }, '💾 Kaydet');

/** Metni paylaşır; paylaşım yoksa panoya kopyalar. */
export async function paylas(baslik, metin) {
  try {
    const S = (await import('./yerel.js')).Share;
    if (S) { await S.share({ title: baslik, text: metin, dialogTitle: baslik }); return; }
    if (navigator.share) { await navigator.share({ title: baslik, text: metin }); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(metin); bildir('📋 Panoya kopyalandı'); }
  catch { bildir('Kopyalanamadı'); }
}

/** Arka kamerayı açar. torch: flaşı yak. */
export async function kameraAc(video, { torch = false } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Bu cihazda kamera erişimi yok.');
  const akis = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
  video.srcObject = akis;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play();
  const iz = akis.getVideoTracks()[0];
  let flas = false;
  if (torch) {
    try { await iz.applyConstraints({ advanced: [{ torch: true }] }); flas = true; } catch { /* flaş yok */ }
  }
  return { akis, iz, flas, kapat: () => akis.getTracks().forEach(t => t.stop()) };
}
