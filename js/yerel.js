// Ölçer — Android uygulamasındaki yerel (native) eklentiler.
// Capacitor'ın JS çekirdeği, eklentileri ancak registerPlugin ile çağrıldıklarında web tarafına bağlar.
// Tarayıcıda (GitHub Pages) bu değerler null olur ve uygulama web API'lerine döner.

import { Capacitor, registerPlugin } from './vendor/capacitor-core.js';

export const yerelUygulama = Capacitor.isNativePlatform();
const eklenti = ad => (yerelUygulama && Capacitor.isPluginAvailable(ad) ? registerPlugin(ad) : null);

export const OlcerSensor = eklenti('OlcerSensor');
export const KeepAwake = eklenti('KeepAwake');
export const Share = eklenti('Share');
