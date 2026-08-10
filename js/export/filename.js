// Nombre de archivo compartido por PDF y PNG: pintori-{tamaño}-{fecha}.ext
// Usa el diámetro TERMINADO del pin (no el de corte) — es lo que el
// SPEC ejemplifica: pintori-70mm-2026-08-09.pdf para Frank's machine
// (70mm terminado, 85mm de corte).

function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function buildFilename(grid, ext) {
  return `pintori-${grid.pin.finishedMm}mm-${todayStamp()}.${ext}`;
}
