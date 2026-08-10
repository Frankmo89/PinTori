// Aviso de baja resolución (SPEC 5.4): si la foto necesita estirarse más
// allá de su tamaño nativo para cubrir el slot, avisa — no bloquea nada.
// Usa la misma matemática de "cover" que render.js (baseScale) para que
// el aviso nunca se desincronice de cómo se dibuja la foto de verdad.

export function isPhotoLowRes(photo, cutWidthPx, cutHeightPx) {
  if (!photo || !photo.naturalW || !photo.naturalH) return false;
  const baseScale = Math.max(cutWidthPx / photo.naturalW, cutHeightPx / photo.naturalH);
  const effectiveScale = baseScale * (photo.scale || 1);
  // >1 significa que un píxel del slot necesita más de un píxel nativo
  // de la foto para llenarse — se está agrandando la imagen más allá de
  // su resolución real.
  return effectiveScale > 1;
}
