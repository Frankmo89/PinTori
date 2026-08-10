// Compone la hoja completa en un canvas offscreen a resolución real de
// 300 DPI: fondo blanco, cada pin (misma drawPin() que usa el editor —
// cero lógica de dibujo nueva), la regla de calibración impresa, y el
// texto de instrucciones en el margen.

import { computeGrid, mmToPx } from '../geometry.js';
import { getState, getSlot } from '../state.js';
import { drawPin, FONT_FAMILY } from '../render.js';
import { DPI } from '../constants.js';
import { t } from '../i18n.js';

const RULER_LENGTH_MM = 50.8; // 2 pulgadas exactas: cubre 5cm Y 2in completas
const CM_LABEL_PX = 26;
const IN_LABEL_PX = 22;
const CM_MAJOR_TICK_PX = 28;
const CM_MINOR_TICK_PX = 12;
const IN_MAJOR_TICK_PX = 24;
const IN_MINOR_TICK_PX = 10;
const CAPTION_PX = 30;
const RULER_COLOR = '#555555';
const BAND_PADDING_MM = 8;

export function renderSheetCanvas() {
  const { sheetId, pinId } = getState();
  const grid = computeGrid({ pinId, sheetId });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(grid.sheetWidthPx);
  canvas.height = Math.round(grid.sheetHeightPx);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const cell of grid.cells) {
    drawPin(ctx, getSlot(cell.index), {
      centerXPx: cell.centerXPx,
      centerYPx: cell.centerYPx,
      cutDiameterPx: grid.cutDiameterPx,
    });
  }

  drawMarginRuler(ctx, grid);
  drawMarginCaption(ctx, grid);

  return { canvas, grid };
}

// Dibuja la regla siempre igual, en coordenadas locales: eje x = a lo
// largo de la regla, eje y = alto de las marcas (positivo hacia abajo,
// como el canvas). El caso de margen vertical se logra rotando el
// contexto antes de llamar esta función, no duplicando su lógica.
function drawRulerLocal(ctx) {
  const lengthPx = mmToPx(RULER_LENGTH_MM);

  ctx.strokeStyle = RULER_COLOR;
  ctx.fillStyle = RULER_COLOR;
  ctx.lineWidth = 1.5;
  ctx.textAlign = 'center';

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(lengthPx, 0);
  ctx.stroke();

  // Centímetros arriba de la línea base (y negativo): marca mayor cada
  // cm (etiquetada), menor cada mm.
  ctx.font = `600 ${CM_LABEL_PX}px ${FONT_FAMILY}`;
  ctx.textBaseline = 'bottom';
  for (let mm = 0; mm <= RULER_LENGTH_MM + 0.01; mm += 1) {
    const x = mmToPx(mm);
    const isCm = Math.round(mm) % 10 === 0;
    const tickPx = isCm ? CM_MAJOR_TICK_PX : CM_MINOR_TICK_PX;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, -tickPx);
    ctx.stroke();
    if (isCm && mm > 0) {
      ctx.fillText(String(Math.round(mm / 10)), x, -tickPx - 4);
    }
  }

  // Pulgadas abajo de la línea base (y positivo): marca mayor cada
  // pulgada (etiquetada), menor cada 1/4". DPI = px por pulgada exacto,
  // por definición — no hace falta convertir por mm aquí.
  ctx.font = `600 ${IN_LABEL_PX}px ${FONT_FAMILY}`;
  ctx.textBaseline = 'top';
  const totalQuarters = Math.floor((RULER_LENGTH_MM / 25.4) * 4);
  for (let q = 0; q <= totalQuarters; q++) {
    const x = (DPI / 4) * q;
    const isWhole = q % 4 === 0;
    const tickPx = isWhole ? IN_MAJOR_TICK_PX : IN_MINOR_TICK_PX;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, tickPx);
    ctx.stroke();
    if (isWhole && q > 0) {
      ctx.fillText(`${q / 4}"`, x, tickPx + 4);
    }
  }
}

function drawMarginRuler(ctx, grid) {
  const horizontal = grid.marginYMm >= grid.marginXMm;
  ctx.save();
  if (horizontal) {
    const yMm = grid.sheet.heightMm - grid.marginYMm / 2;
    ctx.translate(mmToPx(BAND_PADDING_MM), mmToPx(yMm));
  } else {
    const xMm = grid.marginXMm / 2;
    ctx.translate(mmToPx(xMm), mmToPx(BAND_PADDING_MM));
    ctx.rotate(Math.PI / 2);
  }
  drawRulerLocal(ctx);
  ctx.restore();
}

function drawMarginCaption(ctx, grid) {
  const horizontal = grid.marginYMm >= grid.marginXMm;
  const text = t('printCaption', grid.pin.label, grid.cutDiameterMm, grid.sheet.label);

  ctx.save();
  ctx.fillStyle = RULER_COLOR;
  ctx.font = `500 ${CAPTION_PX}px ${FONT_FAMILY}`;

  if (horizontal) {
    // Misma banda inferior que la regla (que ocupa el lado izquierdo),
    // alineado a la derecha para no superponerse.
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const xPx = ctx.canvas.width - mmToPx(BAND_PADDING_MM);
    const yPx = mmToPx(grid.sheet.heightMm - grid.marginYMm / 2);
    ctx.fillText(text, xPx, yPx);
  } else {
    // Misma banda izquierda que la regla (que ocupa la parte de arriba),
    // anclado cerca del borde inferior y creciendo hacia arriba —
    // 'right' aquí, con la rotación de +90°, es lo que mantiene el
    // texto DENTRO de la hoja en vez de salirse por el borde inferior.
    ctx.translate(mmToPx(grid.marginXMm / 2), ctx.canvas.height - mmToPx(BAND_PADDING_MM));
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
  }
  ctx.restore();
}
