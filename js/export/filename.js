// Nombre de archivo compartido por PDF y PNG: pintori-{tamaño}-{fecha}.ext
// Usa el diámetro TERMINADO del pin (no el de corte) cuando el default
// de la hoja es un Pin — es lo que el SPEC ejemplifica:
// pintori-85mm-2026-08-09.pdf para el tamaño default (85mm terminado,
// 105mm de corte). Para Sticker/Etiqueta, o una hoja mixta, no hay un
// solo "tamaño terminado" que describa todo, así que se usa el tamaño
// de corte del default de la hoja.

function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function buildFilename(defaultSpec, ext) {
  const sizeLabel =
    defaultSpec.category === 'pin'
      ? `${defaultSpec.finishedMm}mm`
      : `${Math.round(defaultSpec.cutWidthMm)}x${Math.round(defaultSpec.cutHeightMm)}mm`;
  return `pintori-${sizeLabel}-${todayStamp()}.${ext}`;
}
