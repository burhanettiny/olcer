// Web dosyalarını Android uygulamasına gömülecek www/ klasörüne kopyalar.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
const DOSYALAR = ['index.html', 'gizlilik.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'ikon'];
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const d of DOSYALAR) cpSync(d, `www/${d}`, { recursive: true });
console.log('www/ hazır');
