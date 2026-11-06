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
