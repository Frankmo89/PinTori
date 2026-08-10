// Pruebas rápidas en consola para geometry.js. No es una suite de testing
// formal (ver DESIGN.md/decisiones de plan) — solo confirma en cada carga
// que la conversión mm->px y el cálculo de cuadrícula siguen siendo
// correctos, porque son la pieza donde un error se traduce directo en
// "el pin salió mal cortado".

import { mmToPx, computeGrid, packSlots, resolveSlotSpec, specToBox } from './geometry.js';
import { GRID_MIN_MARGIN_MM, GRID_MIN_GAP_MM, DPI } from './constants.js';
import { isPhotoLowRes } from './resolutionCheck.js';

function approxEqual(a, b, tolerance) {
  return Math.abs(a - b) <= tolerance;
}

export function runSelfTests() {
  console.log('--- PinTori selftest: geometry.js ---');

  // 2026-08-10: cutMm del tamaño default se corrigió de 85mm (fórmula
  // finished+14mm) a 105mm (medido directo del molde físico — ver
  // constants.js). Este assert confirma el diámetro en px que corresponde
  // imprimir/cortar para ese molde a 300 DPI.
  const px105 = mmToPx(105);
  console.log(`105mm a 300 DPI = ${px105.toFixed(2)}px (esperado ~1240.16px)`);
  console.assert(approxEqual(px105, 1240.16, 1), 'FALLO: 105mm a 300 DPI debería dar ~1240.16px');

  const letterFrank = computeGrid({ pinId: 'frank', sheetId: 'letter' });
  console.log(
    `Carta + tamaño default (105mm cut, margen=${GRID_MIN_MARGIN_MM}mm, gap=${GRID_MIN_GAP_MM}mm): ` +
      `${letterFrank.cols} columnas x ${letterFrank.rows} filas = ${letterFrank.count} pines`
  );
  console.assert(
    letterFrank.cols === 1 && letterFrank.rows === 2,
    `FALLO: se esperaba 1x2=2 para 105mm en Carta, dio ${letterFrank.cols}x${letterFrank.rows}`
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

  // Prompt 11: packSlots() (empaquetado genérico para formas mixtas)
  // debe dar EXACTAMENTE las mismas posiciones que computeGrid() (grid
  // uniforme de siempre) cuando todas las piezas son iguales — si esto
  // falla, el empaquetado rompió el caso simple que ya funcionaba.
  const frankSpec = resolveSlotSpec({ category: 'pin', shape: 'circle', pinId: 'frank' });
  const uniformSpecs = Array.from({ length: letterFrank.count }, (_, i) => ({ index: i, spec: frankSpec }));
  const packed = packSlots({ specs: uniformSpecs, sheetId: 'letter' });
  const samePositions =
    packed.cells.length === letterFrank.cells.length &&
    packed.cells.every((cell, i) => approxEqual(cell.centerXPx, letterFrank.cells[i].centerXPx, 0.01) &&
      approxEqual(cell.centerYPx, letterFrank.cells[i].centerYPx, 0.01));
  console.log(`packSlots() vs computeGrid() en el caso uniforme: ${packed.cells.length} piezas empaquetadas, posiciones ${samePositions ? 'idénticas' : 'DISTINTAS'}`);
  console.assert(samePositions, 'FALLO: packSlots() debería dar las mismas posiciones que computeGrid() para piezas uniformes');

  // Prompt 14 (PROMPTS_V3.md): reporte de que el aviso de baja resolución
  // salía SIEMPRE, hasta en fotos de alta resolución. Se verificó el
  // cálculo (resolutionCheck.js) contra el print box real a 300 DPI de
  // los 5 tamaños de pin, con resoluciones de cámara típicas (4032x3024,
  // 3264x2448) y también con una carga real simulada en el navegador —
  // en ningún caso dispara falso; el cálculo ya compara contra el tamaño
  // de IMPRESIÓN (specToBox(..., DPI)), no contra la caja de pantalla,
  // que era la causa más probable según el prompt. No se encontró bug
  // reproducible en el código actual — estos asserts solo dejan el
  // comportamiento correcto cubierto, en vez de que dependa de probarlo
  // a mano cada vez.
  const resBox = specToBox(frankSpec, 0, 0, DPI);
  const highResPhoto = { naturalW: 4032, naturalH: 3024, scale: 1.15 }; // cámara de celular típica
  const lowResPhoto = { naturalW: 800, naturalH: 600, scale: 1.15 }; // recorte/thumbnail chico
  const highResTriggers = isPhotoLowRes(highResPhoto, resBox.cutWidthPx, resBox.cutHeightPx);
  const lowResTriggers = isPhotoLowRes(lowResPhoto, resBox.cutWidthPx, resBox.cutHeightPx);
  console.log(`Aviso de baja resolución — foto alta (4032x3024) sobre tamaño default (${resBox.cutWidthPx.toFixed(0)}px): ${highResTriggers ? 'SÍ avisa' : 'no avisa'}`);
  console.assert(!highResTriggers, 'FALLO: una foto de alta resolución no debería disparar el aviso de baja resolución');
  console.log(`Aviso de baja resolución — foto baja (800x600) sobre tamaño default (${resBox.cutWidthPx.toFixed(0)}px): ${lowResTriggers ? 'sí avisa' : 'NO avisa'}`);
  console.assert(lowResTriggers, 'FALLO: una foto de baja resolución debería disparar el aviso de baja resolución');

  console.log('--- fin selftest ---');
}
