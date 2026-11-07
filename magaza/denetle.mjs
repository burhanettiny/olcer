// Mağaza metinlerinin Google Play karakter sınırlarını denetler: node magaza/denetle.mjs
import { readFileSync } from 'node:fs';
const metin = readFileSync(new URL('./metinler.md', import.meta.url), 'utf8');
const al = ad => (metin.match(new RegExp(`<!-- ${ad} -->\\n([\\s\\S]*?)\\n<!-- /${ad} -->`)) || [])[1]?.trim() ?? '';
const sinirlar = { ad: 30, kisa: 80, uzun: 4000 };
let hata = false;
for (const [ad, sinir] of Object.entries(sinirlar)) {
  const n = [...al(ad)].length;
  const tamam = n > 0 && n <= sinir;
  if (!tamam) hata = true;
  console.log(`${tamam ? '✓' : '✗'} ${ad}: ${n} / ${sinir}`);
}
process.exit(hata ? 1 : 0);
