import { runSelfTests } from './selftest.js';
import { buildSlotGrid } from './editor/slotGrid.js';
import { buildDefaultTypePicker } from './editor/defaultTypePicker.js';
import { warmUpFaceDetection } from './face/faceDetect.js';
import { exportPdf } from './export/pdfExport.js';
import { exportPng } from './export/pngExport.js';
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

document.getElementById('lang-toggle-btn').addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
});

// Diferido: se dispara después de que el primer render ya pintó, así el
// modelo de rostro (el único asset pesado del proyecto) nunca compite
// con la apertura inicial de la página. Safari no tiene
// requestIdleCallback, de ahí el respaldo con setTimeout.
if ('requestIdleCallback' in window) {
  requestIdleCallback(warmUpFaceDetection);
} else {
  setTimeout(warmUpFaceDetection, 200);
}
