// Aviso de baja resolución (SPEC 4.4): si la foto necesita estirarse más
// allá de su tamaño nativo para cubrir el círculo de corte, avisa — no
// bloquea nada. Usa la misma matemática de "cover" que render.js
// (baseScale) para que el aviso nunca se desincronice de cómo se dibuja
// la foto de verdad.

export function isPhotoLowRes(photo, cutDiameterPx) {
  if (!photo || !photo.naturalW || !photo.naturalH) return false;
  const baseScale = Math.max(cutDiameterPx / photo.naturalW, cutDiameterPx / photo.naturalH);
  const effectiveScale = baseScale * (photo.scale || 1);
  // >1 significa que un píxel del círculo de corte necesita más de un
  // píxel nativo de la foto para llenarse — se está agrandando la
  // imagen más allá de su resolución real.
  return effectiveScale > 1;
}
