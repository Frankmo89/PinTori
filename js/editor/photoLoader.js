// Carga de foto + encuadre por score (face / smartcrop / geometric).
// Compartido por el panel de slot y el CTA de foto demo del hero.
//
// Ya no es un cascade ciego: cada señal es un candidato, se puntúa con
// centerScoring.js (faceConf + saliency − edgePenalty) y gana el mejor.
// El resultado (source, score, alternatives, faces) se guarda en
// photo.centerDebug para el overlay ?debug=1 — no afecta exportación.

import { computeFaceCenteredOffset, clampPhotoOffset } from '../render.js';
import { detectFacesFrac } from '../face/faceDetect.js';
import { detectSaliencyFrac } from '../face/saliencyDetect.js';
import { pickBestCenter } from '../face/centerScoring.js';
import { getDefaultSlotType } from '../state.js';
import { t } from '../i18n.js';

// "cover" puro (scale=1) deja CERO margen para arrastrar en el eje más
// ajustado — se arranca con un poco de zoom de más. Misma constante que
// vivía en slotPanel.js.
export const DEFAULT_PHOTO_SCALE = 1.15;

export async function loadImageFromFile(file, box) {
  try {
    const bitmap = await createImageBitmap(file);
    const photo = {
      image: bitmap,
      blob: file,
      naturalW: bitmap.width,
      naturalH: bitmap.height,
      offsetXFrac: 0,
      offsetYFrac: 0,
      scale: DEFAULT_PHOTO_SCALE,
      centerDebug: null,
    };

    const pinId = getDefaultSlotType()?.pinId || 'frank';
    const [face, saliency] = await Promise.all([
      detectFacesFrac(bitmap),
      detectSaliencyFrac(bitmap),
    ]);

    const { winner, alternatives, faces } = pickBestCenter({ face, saliency, pinId });

    photo.centerDebug = {
      source: winner.source,
      label: winner.label,
      score: winner.score,
      conf: winner.conf,
      edgePenalty: winner.edgePenalty,
      xFrac: winner.xFrac,
      yFrac: winner.yFrac,
      alternatives: alternatives.map((a) => ({
        source: a.source,
        label: a.label,
        score: a.score,
        conf: a.conf,
        edgePenalty: a.edgePenalty,
        xFrac: a.xFrac,
        yFrac: a.yFrac,
      })),
      faces,
    };

    // Geometric winner already means offset 0,0 — still run through
    // computeFaceCenteredOffset for a single code path.
    const offset = computeFaceCenteredOffset(bitmap.width, bitmap.height, {
      xFrac: winner.xFrac,
      yFrac: winner.yFrac,
    });
    const clamped = clampPhotoOffset({ ...photo, ...offset }, box);
    photo.offsetXFrac = clamped.offsetXFrac;
    photo.offsetYFrac = clamped.offsetYFrac;

    return { photo, error: null };
  } catch (err) {
    return { photo: null, error: t('photoError') };
  }
}
