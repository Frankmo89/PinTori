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
  PRODUCT_CATEGORIES,
  ROUNDED_SQUARE_CORNER_RATIO,
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

// Calcula cuántas piezas de tamaño `sizeMm` caben en un largo `length`,
// con separación mínima `gap` entre ellas y margen mínimo `margin` en
// cada extremo. Se centra el resultado, así que el margen real siempre
// termina siendo >= al mínimo pedido (nunca menor).
export function fitCount(lengthMm, sizeMm, gapMm, marginMm) {
  const n = Math.floor((lengthMm - 2 * marginMm + gapMm) / (sizeMm + gapMm));
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

// --- Categoría de producto (Pin / Sticker / Etiqueta) ---
//
// Convierte un `slotType` ({category, shape, pinId, sizeMm, sizeMm2}) en
// una "spec" normalizada que ya no distingue de dónde vino el tamaño —
// render.js y el empaquetado solo necesitan cutWidthMm/cutHeightMm/
// safeZoneMm/cornerRadiusMm/shape, sin saber si es un pin de la tabla
// fija o un sticker de tamaño libre.
export function resolveSlotSpec(slotType) {
  const category = PRODUCT_CATEGORIES[slotType.category];
  if (!category) throw new Error(`Categoría desconocida: ${slotType.category}`);

  if (slotType.category === 'pin') {
    const pin = getPinSize(slotType.pinId);
    return {
      category: 'pin',
      shape: 'circle',
      cutWidthMm: pin.cutMm,
      cutHeightMm: pin.cutMm,
      safeZoneMm: pin.safeZoneMm,
      cornerRadiusMm: null,
      label: pin.label,
      finishedMm: pin.finishedMm,
    };
  }

  if (slotType.category === 'sticker') {
    const w = slotType.sizeMm;
    return {
      category: 'sticker',
      shape: slotType.shape,
      cutWidthMm: w,
      cutHeightMm: w,
      safeZoneMm: null,
      cornerRadiusMm: slotType.shape === 'rounded-square' ? w * ROUNDED_SQUARE_CORNER_RATIO : null,
      label: null,
      finishedMm: null,
    };
  }

  // label
  return {
    category: 'label',
    shape: 'rectangle',
    cutWidthMm: slotType.sizeMm,
    cutHeightMm: slotType.sizeMm2,
    safeZoneMm: null,
    cornerRadiusMm: null,
    label: null,
    finishedMm: null,
  };
}

// Empaqueta un conjunto de slots con formas/tamaños posiblemente
// distintos en la hoja. No es óptimo (bin-packing real es NP-difícil) —
// es un "shelf packing" determinístico: llena una fila de izquierda a
// derecha mientras quepa, si no cabe más cierra la fila y abre la
// siguiente abajo. El orden de entrada (índice de slot) se respeta tal
// cual — no se reordena por tamaño — para que un slot no "salte" de
// lugar cuando el usuario le cambia el tipo a otro distinto del default.
//
// Para el caso uniforme (todas las piezas iguales) esto da EXACTAMENTE
// las mismas posiciones que computeGrid(): mismo llenado por fila, mismo
// centrado del sobrante como margen. Verificado a mano contra el caso
// Frank's machine + Carta (6.2mm de margen, 2 columnas).
export function packSlots({ specs, sheetId, marginMm = GRID_MIN_MARGIN_MM, gapMm = GRID_MIN_GAP_MM, dpi = DPI }) {
  const sheet = getSheetSize(sheetId);
  const usableWidthMm = sheet.widthMm - 2 * marginMm;
  const usableHeightMm = sheet.heightMm - 2 * marginMm;

  const shelves = [];
  let current = null;
  const unplacedIndexes = [];

  for (const item of specs) {
    if (item.spec.cutWidthMm > usableWidthMm || item.spec.cutHeightMm > usableHeightMm) {
      unplacedIndexes.push(item.index);
      continue;
    }
    const neededWidthMm = current
      ? current.usedWidthMm + gapMm + item.spec.cutWidthMm
      : item.spec.cutWidthMm;
    if (current && neededWidthMm <= usableWidthMm) {
      current.items.push(item);
      current.usedWidthMm = neededWidthMm;
      current.heightMm = Math.max(current.heightMm, item.spec.cutHeightMm);
    } else {
      if (current) shelves.push(current);
      current = { items: [item], usedWidthMm: item.spec.cutWidthMm, heightMm: item.spec.cutHeightMm };
    }
  }
  if (current) shelves.push(current);

  // Solo se descartan las filas que ya no caben verticalmente — nunca a
  // medias, la fila entera se queda fuera junto con las que siguen.
  let yCursorMm = 0;
  const placedShelves = [];
  for (const shelf of shelves) {
    if (yCursorMm + shelf.heightMm > usableHeightMm + 1e-9) {
      shelf.items.forEach((it) => unplacedIndexes.push(it.index));
      continue;
    }
    placedShelves.push({ ...shelf, topMm: yCursorMm });
    yCursorMm += shelf.heightMm + gapMm;
  }
  const usedHeightMm = placedShelves.length ? yCursorMm - gapMm : 0;
  const extraYMm = (usableHeightMm - usedHeightMm) / 2;

  const cells = [];
  for (const shelf of placedShelves) {
    const extraXMm = (usableWidthMm - shelf.usedWidthMm) / 2;
    let xCursorMm = 0;
    for (const item of shelf.items) {
      const centerXMm = marginMm + extraXMm + xCursorMm + item.spec.cutWidthMm / 2;
      const shelfTopMm = marginMm + extraYMm + shelf.topMm;
      const centerYMm = shelfTopMm + shelf.heightMm / 2; // centrado vertical dentro de su fila
      cells.push({
        index: item.index,
        spec: item.spec,
        centerXMm,
        centerYMm,
        centerXPx: mmToPx(centerXMm, dpi),
        centerYPx: mmToPx(centerYMm, dpi),
      });
      xCursorMm += item.spec.cutWidthMm + gapMm;
    }
  }

  return {
    sheet,
    marginMm,
    gapMm,
    sheetWidthPx: mmToPx(sheet.widthMm, dpi),
    sheetHeightPx: mmToPx(sheet.heightMm, dpi),
    cells,
    unplacedIndexes,
  };
}

// Cuántos slots del tipo default arrancan en la hoja al cargar/cambiar
// el tamaño de arriba — el mismo cálculo de siempre (fitCount por eje),
// generalizado a cualquier categoría, no solo círculos. Los overrides
// por slot no cambian este número; solo afectan cómo se empaquetan.
export function computeDefaultSlotCount({ slotType, sheetId, marginMm = GRID_MIN_MARGIN_MM, gapMm = GRID_MIN_GAP_MM }) {
  const spec = resolveSlotSpec(slotType);
  const sheet = getSheetSize(sheetId);
  const cols = fitCount(sheet.widthMm, spec.cutWidthMm, gapMm, marginMm);
  const rows = fitCount(sheet.heightMm, spec.cutHeightMm, gapMm, marginMm);
  return cols * rows;
}

// "DPI" ficticio para el editor: no es para imprimir, solo fija cuántos
// píxeles de pantalla representan un mm real, para que un pin de 85mm y
// un sticker de 40mm se vean en la proporción correcta entre sí en vez
// de forzarse ambos a la misma caja. Reutiliza mmToPx tal cual — es
// literalmente la misma fórmula (mm/25.4*dpi), solo con un "dpi" que da
// ~2px/mm en vez de 300px/pulgada.
export const EDITOR_PX_PER_MM = 2;
export const EDITOR_DPI = EDITOR_PX_PER_MM * MM_PER_INCH;

// Convierte una spec resuelta (mm) en una caja de píxeles lista para
// render.js, a cualquier escala (editor o exportación) — un solo lugar
// que sabe traducir mm a la "box" que drawSlot() espera.
export function specToBox(spec, centerXPx, centerYPx, dpi = DPI) {
  return {
    centerXPx,
    centerYPx,
    cutWidthPx: mmToPx(spec.cutWidthMm, dpi),
    cutHeightPx: mmToPx(spec.cutHeightMm, dpi),
    shape: spec.shape,
    cornerRadiusPx: spec.cornerRadiusMm ? mmToPx(spec.cornerRadiusMm, dpi) : 0,
  };
}
