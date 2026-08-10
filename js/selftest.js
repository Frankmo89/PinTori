// Pruebas rápidas en consola para geometry.js. No es una suite de testing
// formal (ver DESIGN.md/decisiones de plan) — solo confirma en cada carga
// que la conversión mm->px y el cálculo de cuadrícula siguen siendo
// correctos, porque son la pieza donde un error se traduce directo en
// "el pin salió mal cortado".

import { mmToPx, computeGrid } from './geometry.js';
import { GRID_MIN_MARGIN_MM, GRID_MIN_GAP_MM } from './constants.js';

function approxEqual(a, b, tolerance) {
  return Math.abs(a - b) <= tolerance;
}

export function runSelfTests() {
  console.log('--- PinTori selftest: geometry.js ---');

  const px85 = mmToPx(85);
  console.log(`85mm a 300 DPI = ${px85.toFixed(2)}px (esperado ~1004px)`);
  console.assert(approxEqual(px85, 1004, 1), 'FALLO: 85mm a 300 DPI debería dar ~1004px');

  const letterFrank = computeGrid({ pinId: 'frank', sheetId: 'letter' });
  console.log(
    `Carta + Frank's machine (85mm cut, margen=${GRID_MIN_MARGIN_MM}mm, gap=${GRID_MIN_GAP_MM}mm): ` +
      `${letterFrank.cols} columnas x ${letterFrank.rows} filas = ${letterFrank.count} pines`
  );
  console.assert(
    letterFrank.cols === 2 && letterFrank.rows === 3,
    `FALLO: se esperaba 2x3=6 para 85mm en Carta, dio ${letterFrank.cols}x${letterFrank.rows}`
  );

  // Sanity check extra: las dimensiones en px de las hojas deben coincidir
  // con los valores que da el SPEC directamente (2550x3300 y 2480x3508).
  console.log(
    `Carta en px: ${letterFrank.sheetWidthPx.toFixed(0)} x ${letterFrank.sheetHeightPx.toFixed(0)} (esperado 2550 x 3300)`
  );

  const a4Frank = computeGrid({ pinId: 'frank', sheetId: 'a4' });
  console.log(
    `A4 en px: ${a4Frank.sheetWidthPx.toFixed(0)} x ${a4Frank.sheetHeightPx.toFixed(0)} (esperado 2480 x 3508)`
  );

  console.log('--- fin selftest ---');
}
