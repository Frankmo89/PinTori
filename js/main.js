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
import { initHero } from './hero.js';

runSelfTests();

document.documentElement.lang = getLang();
applyStaticStrings();

await loadPersistedState();

const gridContainer = document.getElementById('slot-grid');
buildSlotGrid(gridContainer);

buildDefaultTypePicker(document.getElementById('pin-size-picker'), () => {
  buildSlotGrid(gridContainer);
});

subscribe(schedulePersist);

function wireExportButtons() {
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
        if (status === 'cancelled') return;
        showDownloadScreen(shareBtn, { fallbackNote: status === 'downloaded' });
      })
      .finally(() => {
        shareBtn.disabled = false;
      });
  });
}

wireExportButtons();

function wireLangToggles() {
  const handler = () => setLang(getLang() === 'es' ? 'en' : 'es');
  document.getElementById('lang-toggle-btn')?.addEventListener('click', handler);
  document.getElementById('lang-toggle-btn-editor')?.addEventListener('click', handler);
}

wireLangToggles();

initHero();

if ('requestIdleCallback' in window) {
  requestIdleCallback(warmUpFaceDetection);
  requestIdleCallback(warmUpSaliencyDetection);
} else {
  setTimeout(warmUpFaceDetection, 200);
  setTimeout(warmUpSaliencyDetection, 200);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[PinTori] service worker registration failed', err);
    });
  });
}
