// Toda la geometría se calcula en mm y se convierte a px solo al final.
// mm es la unidad canónica porque las tablas del SPEC están en mm y porque
// mantiene la lógica independiente de la resolución de salida.

import {
  DPI,
  MM_PER_INCH,
  PIN_SIZES,
  SHEET_SIZES,
  GRID_MIN_MARGIN_MM,
  GRID_MIN_GAP_MM,
} from './constants.js';

export function mmToPx(mm, dpi = DPI) {
  return (mm / MM_PER_INCH) * dpi;
}

export function pxToMm(px, dpi = DPI) {
  return (px / dpi) * MM_PER_INCH;
}

export function getPinSize(pinId) {
  const size = PIN_SIZES.find((p) => p.id === pinId);
  if (!size) throw new Error(`Tamaño de pin desconocido: ${pinId}`);
  return size;
}

export function getSheetSize(sheetId) {
  const sheet = SHEET_SIZES.find((s) => s.id === sheetId);
  if (!sheet) throw new Error(`Tamaño de hoja desconocido: ${sheetId}`);
  return sheet;
}

// Calcula cuántos círculos de diámetro `d` caben en un largo `length`,
// con separación mínima `gap` entre ellos y margen mínimo `margin` en
// cada extremo. Se centra el resultado, así que el margen real siempre
// termina siendo >= al mínimo pedido (nunca menor).
function fitCount(lengthMm, diameterMm, gapMm, marginMm) {
  const n = Math.floor((lengthMm - 2 * marginMm + gapMm) / (diameterMm + gapMm));
  return Math.max(0, n);
}

/**
 * Calcula la cuadrícula de pines que caben en una hoja, a partir de la
 * combinación de tamaño de pin y tamaño de hoja. No hay ningún 2x3
 * hardcodeado: columnas y filas salen de fitCount() para cada eje.
 */
export function computeGrid({
  pinId,
  sheetId,
  marginMm = GRID_MIN_MARGIN_MM,
  gapMm = GRID_MIN_GAP_MM,
  dpi = DPI,
}) {
  const pin = getPinSize(pinId);
  const sheet = getSheetSize(sheetId);
  const cutMm = pin.cutMm;

  const cols = fitCount(sheet.widthMm, cutMm, gapMm, marginMm);
  const rows = fitCount(sheet.heightMm, cutMm, gapMm, marginMm);

  const usedWidthMm = cols > 0 ? cols * cutMm + (cols - 1) * gapMm : 0;
  const usedHeightMm = rows > 0 ? rows * cutMm + (rows - 1) * gapMm : 0;

  // Espacio sobrante repartido como margen real, para que la cuadrícula
  // quede centrada en vez de pegada a una esquina.
  const marginXMm = (sheet.widthMm - usedWidthMm) / 2;
  const marginYMm = (sheet.heightMm - usedHeightMm) / 2;

  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const centerXMm = marginXMm + col * (cutMm + gapMm) + cutMm / 2;
      const centerYMm = marginYMm + row * (cutMm + gapMm) + cutMm / 2;
      cells.push({
        col,
        row,
        index: row * cols + col,
        centerXMm,
        centerYMm,
        centerXPx: mmToPx(centerXMm, dpi),
        centerYPx: mmToPx(centerYMm, dpi),
      });
    }
  }

  return {
    pin,
    sheet,
    cols,
    rows,
    count: cells.length,
    cutDiameterMm: cutMm,
    cutDiameterPx: mmToPx(cutMm, dpi),
    safeZoneMm: pin.safeZoneMm,
    safeZonePx: mmToPx(pin.safeZoneMm, dpi),
    marginMm,
    gapMm,
    marginXMm,
    marginYMm,
    sheetWidthPx: mmToPx(sheet.widthMm, dpi),
    sheetHeightPx: mmToPx(sheet.heightMm, dpi),
    cells,
  };
}
