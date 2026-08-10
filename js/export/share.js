// Prompt 17 (PROMPTS_V3.md): compartir la plantilla por correo sin
// backend propio. Web Share API (navigator.share) delega en el panel
// nativo de compartir del sistema operativo, que ya incluye Mail/Gmail
// y cualquier otra app instalada, con el PDF como adjunto real — es el
// método correcto porque funciona en iOS y Android sin que este
// proyecto tenga que hablar con ningún servidor de correo (ver SPEC
// sección 8: sin backend, y no debe haberlo).
//
// navigator.share existe en más navegadores de los que soportan
// compartir ARCHIVOS — hay que revisar navigator.canShare con la
// propiedad `files`, no solo la existencia de share(). Si no se puede,
// cae al mismo download de siempre.

import { buildPdf } from './pdfExport.js';

function canShareFile(file) {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

// Devuelve 'shared' (se abrió el panel nativo y el usuario lo completó),
// 'cancelled' (el usuario cerró el panel nativo sin compartir — no es un
// error, no hay nada que avisar ni descargar) o 'downloaded' (no se pudo
// compartir un archivo, así que se cayó al download normal — el caller
// debe avisar que se descargó para adjuntarlo a mano).
export async function sharePdfOrDownload() {
  const { doc, filename } = await buildPdf();
  const file = new File([doc.output('blob')], filename, { type: 'application/pdf' });

  if (navigator.share && canShareFile(file)) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
      // Cualquier otro fallo (raro) sí cae al download de siempre en
      // vez de dejar al usuario sin nada.
    }
  }

  doc.save(filename);
  return 'downloaded';
}
