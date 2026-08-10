// jsPDF se vendorizó localmente (vendor/jspdf/jspdf.umd.min.js) y se
// carga de forma diferida — no se descarga hasta que el usuario
// realmente pide un PDF, igual que el modelo de rostro no se carga
// hasta que hace falta.
//
// Se usa el build UMD, no el "module"/ESM que publica el paquete: el
// build ESM de jsPDF 4.x no es un archivo autocontenido — trae imports
// de nombre desnudo (`@babel/runtime/helpers/...`, `fflate`, `fast-png`)
// pensados para que un bundler los resuelva desde node_modules. Sin
// bundler, el navegador no puede resolverlos y el import falla. El UMD
// sí trae todo empaquetado en un solo archivo, como face-api.js.

import { renderSheetCanvas } from './sheetRenderer.js';
import { buildFilename } from './filename.js';

const JSPDF_SCRIPT_URL = 'vendor/jspdf/jspdf.umd.min.js';

let loadPromise = null;

function loadJsPdf() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = JSPDF_SCRIPT_URL;
      script.onload = () => resolve(window.jspdf.jsPDF);
      script.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

export async function exportPdf() {
  const jsPDF = await loadJsPdf();
  const { canvas, grid } = renderSheetCanvas();

  const doc = new jsPDF({
    unit: 'mm',
    format: [grid.sheet.widthMm, grid.sheet.heightMm],
    orientation: grid.sheet.widthMm > grid.sheet.heightMm ? 'landscape' : 'portrait',
  });

  // JPEG, no PNG: se probó primero con PNG (que en teoría no pierde
  // calidad, ideal para las líneas finas de corte y el texto chico de
  // la regla) y el PDF resultante pesaba ~25MB para una hoja mayormente
  // blanca — jsPDF no reusa el PNG ya comprimido del canvas, lo
  // reprocesa internamente de forma mucho menos eficiente. Con JPEG al
  // 95% de calidad el PDF pesa ~200KB (126x menos) y, verificado a ojo
  // con zoom, la línea punteada y los números de la regla se ven
  // igual de nítidos — a esta calidad la pérdida no es perceptible en
  // contenido de líneas/texto sobre fondo plano.
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  doc.addImage(jpegDataUrl, 'JPEG', 0, 0, grid.sheet.widthMm, grid.sheet.heightMm);
  doc.save(buildFilename(grid, 'pdf'));
}
