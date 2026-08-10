import { runSelfTests } from './selftest.js';
import { buildSlotGrid } from './editor/slotGrid.js';
import { buildDefaultTypePicker } from './editor/defaultTypePicker.js';
import { warmUpFaceDetection } from './face/faceDetect.js';
import { warmUpSaliencyDetection } from './face/saliencyDetect.js';
import { exportPdf } from './export/pdfExport.js';
import { exportPng } from './export/pngExport.js';
import { sharePdfOrDownload } from './export/share.js';
import { loadPersistedState, schedulePersist } from './persistence.js';
import { subscribe } from './state.js';
import { applyStaticStrings, getLang, setLang } from './i18n.js';
import { showDownloadScreen } from './downloadScreen.js';

runSelfTests();

document.documentElement.lang = getLang();
applyStaticStrings();

// El estado guardado tiene que estar listo ANTES de construir el grid,
// para que las fotos restauradas aparezcan desde el primer render en
// vez de aparecer en blanco y luego "saltar" a su contenido.
await loadPersistedState();

const gridContainer = document.getElementById('slot-grid');
buildSlotGrid(gridContainer);

buildDefaultTypePicker(document.getElementById('pin-size-picker'), () => {
  buildSlotGrid(gridContainer);
});

// Suscrito recién después de la carga inicial — si no, restaurar el
// estado guardado dispararía de inmediato un guardado redundante de lo
// mismo que se acaba de leer.
subscribe(schedulePersist);

const pdfBtn = document.getElementById('export-pdf-btn');
pdfBtn.addEventListener('click', () => {
  pdfBtn.disabled = true;
  exportPdf()
    .then(() => showDownloadScreen(pdfBtn))
    .finally(() => {
      pdfBtn.disabled = false;
    });
});

const pngBtn = document.getElementById('export-png-btn');
pngBtn.addEventListener('click', () => {
  exportPng().then(() => showDownloadScreen(pngBtn));
});

const shareBtn = document.getElementById('share-btn');
shareBtn.addEventListener('click', () => {
  shareBtn.disabled = true;
  sharePdfOrDownload()
    .then((status) => {
      // 'cancelled': el usuario cerró el panel nativo de compartir sin
      // elegir nada — no se generó ni descargó nada, así que no hay
      // pantalla de descarga que mostrar.
      if (status === 'cancelled') return;
      showDownloadScreen(shareBtn, { fallbackNote: status === 'downloaded' });
    })
    .finally(() => {
      shareBtn.disabled = false;
    });
});

document.getElementById('lang-toggle-btn').addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
});

// Diferido: se dispara después de que el primer render ya pintó, así el
// modelo de rostro (el asset más pesado del proyecto) nunca compite con
// la apertura inicial de la página. smartcrop.js pesa ~17KB — no vale
// la pena esperar a que haga falta (la primera foto sin rostro
// detectado) para recién ahí cargarlo, así que se precalienta junto con
// face-api.js. Safari no tiene requestIdleCallback, de ahí el respaldo
// con setTimeout.
if ('requestIdleCallback' in window) {
  requestIdleCallback(warmUpFaceDetection);
  requestIdleCallback(warmUpSaliencyDetection);
} else {
  setTimeout(warmUpFaceDetection, 200);
  setTimeout(warmUpSaliencyDetection, 200);
}
