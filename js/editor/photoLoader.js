// Carga de foto + cadena de encuadre (rostro → saliencia → centro).
// Compartido por el panel de slot y el CTA de foto demo del hero.

import { computeFaceCenteredOffset, clampPhotoOffset } from '../render.js';
import { detectFaceCenterFrac } from '../face/faceDetect.js';
import { detectSaliencyCenterFrac } from '../face/saliencyDetect.js';
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
    };

    const subjectCenter =
      (await detectFaceCenterFrac(bitmap)) || (await detectSaliencyCenterFrac(bitmap));
    if (subjectCenter) {
      const offset = computeFaceCenteredOffset(bitmap.width, bitmap.height, subjectCenter);
      const clamped = clampPhotoOffset({ ...photo, ...offset }, box);
      photo.offsetXFrac = clamped.offsetXFrac;
      photo.offsetYFrac = clamped.offsetYFrac;
    }

    return { photo, error: null };
  } catch (err) {
    return { photo: null, error: t('photoError') };
  }
}
