// Dibuja el contenido de un pin (foto/texto/emoji/color) y su máscara
// circular, línea de corte y cruz de centro. Esta es la ÚNICA función que
// dibuja un pin — la usa tanto el editor (a escala de pantalla) como,
// más adelante, la exportación de la hoja completa (a 300 DPI real). Que
// sea la misma función es la garantía de que la hoja exportada nunca se
// vea distinta de lo que el usuario ajustó en pantalla.
//
// El contenido de una foto se guarda en fracciones del diámetro de corte
// (offsetXFrac/offsetYFrac, scale), no en píxeles absolutos — así el mismo
// slot se dibuja correcto sin importar si el canvas mide 180px (editor) o
// ~2500px (exportación 300 DPI).

export const FONT_FAMILY = "'Nunito', 'Quicksand', sans-serif";

function drawCutGuides(ctx, centerXPx, centerYPx, cutDiameterPx) {
  const radius = cutDiameterPx / 2;

  ctx.save();
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = Math.max(1, cutDiameterPx * 0.0025);
  ctx.setLineDash([cutDiameterPx * 0.015, cutDiameterPx * 0.015]);
  ctx.beginPath();
  ctx.arc(centerXPx, centerYPx, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const crossSize = cutDiameterPx * 0.04;
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerXPx - crossSize, centerYPx);
  ctx.lineTo(centerXPx + crossSize, centerYPx);
  ctx.moveTo(centerXPx, centerYPx - crossSize);
  ctx.lineTo(centerXPx, centerYPx + crossSize);
  ctx.stroke();
  ctx.restore();
}

// Placeholder de slot vacío (usado en la vista de depuración de la hoja
// completa, antes de que exista un editor con contenido real).
export function drawPinFrame(ctx, { centerXPx, centerYPx, cutDiameterPx }) {
  const radius = cutDiameterPx / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerXPx, centerYPx, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(centerXPx - radius, centerYPx - radius, cutDiameterPx, cutDiameterPx);
  ctx.restore();
  drawCutGuides(ctx, centerXPx, centerYPx, cutDiameterPx);
}

export function drawGridPreview(ctx, grid) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, grid.sheetWidthPx, grid.sheetHeightPx);
  for (const cell of grid.cells) {
    drawPinFrame(ctx, {
      centerXPx: cell.centerXPx,
      centerYPx: cell.centerYPx,
      cutDiameterPx: grid.cutDiameterPx,
    });
  }
}

// Rectángulo donde debe dibujarse la imagen dado su tamaño natural, el
// zoom del usuario y su offset — en las unidades del `box` que se pase
// (pantalla o 300 DPI, da igual, todo es relativo a cutDiameterPx).
export function computePhotoDrawRect(photo, box) {
  const { naturalW, naturalH, offsetXFrac = 0, offsetYFrac = 0, scale = 1 } = photo;
  // "cover": la imagen siempre llena el círculo completo, nunca deja
  // huecos blancos en el borde. El usuario puede acercar más (scale > 1)
  // pero no alejar por debajo de este ajuste base.
  const baseScale = Math.max(box.cutDiameterPx / naturalW, box.cutDiameterPx / naturalH);
  const drawScale = baseScale * scale;
  const drawW = naturalW * drawScale;
  const drawH = naturalH * drawScale;
  const offsetXPx = offsetXFrac * box.cutDiameterPx;
  const offsetYPx = offsetYFrac * box.cutDiameterPx;
  return {
    drawW,
    drawH,
    x: box.centerXPx - drawW / 2 + offsetXPx,
    y: box.centerYPx - drawH / 2 + offsetYPx,
  };
}

// A partir del centro de un rostro detectado (fracción 0..1 del tamaño
// de la imagen original), calcula el offset que deja ese punto exacto en
// el centro del círculo — que es donde siempre cae la zona segura, sin
// importar el tamaño de pin. No hace falta zoom adicional: centrar ya
// garantiza que el punto quede dentro de la zona segura.
export function computeFaceCenteredOffset(naturalW, naturalH, faceCenterFrac) {
  const unitBox = { centerXPx: 0.5, centerYPx: 0.5, cutDiameterPx: 1 };
  const rect = computePhotoDrawRect(
    { naturalW, naturalH, offsetXFrac: 0, offsetYFrac: 0, scale: 1 },
    unitBox
  );
  return {
    offsetXFrac: rect.drawW * (0.5 - faceCenterFrac.xFrac),
    offsetYFrac: rect.drawH * (0.5 - faceCenterFrac.yFrac),
  };
}

// Limita offsetXFrac/offsetYFrac para que la foto nunca se despegue del
// círculo (no se ve blanco en el borde), dado un diámetro de referencia.
export function clampPhotoOffset(photo, diameterPx) {
  const box = { centerXPx: diameterPx / 2, centerYPx: diameterPx / 2, cutDiameterPx: diameterPx };
  const rect = computePhotoDrawRect({ ...photo, offsetXFrac: 0, offsetYFrac: 0 }, box);
  const maxXPx = Math.max(0, (rect.drawW - diameterPx) / 2);
  const maxYPx = Math.max(0, (rect.drawH - diameterPx) / 2);
  const curXPx = (photo.offsetXFrac || 0) * diameterPx;
  const curYPx = (photo.offsetYFrac || 0) * diameterPx;
  const clampedXPx = Math.min(maxXPx, Math.max(-maxXPx, curXPx));
  const clampedYPx = Math.min(maxYPx, Math.max(-maxYPx, curYPx));
  return {
    ...photo,
    offsetXFrac: diameterPx ? clampedXPx / diameterPx : 0,
    offsetYFrac: diameterPx ? clampedYPx / diameterPx : 0,
  };
}

function drawPhoto(ctx, photo, box) {
  const rect = computePhotoDrawRect(photo, box);
  ctx.drawImage(photo.image, rect.x, rect.y, rect.drawW, rect.drawH);
}

function drawEmoji(ctx, emoji, box) {
  ctx.save();
  ctx.font = `${box.cutDiameterPx * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji.char, box.centerXPx, box.centerYPx);
  ctx.restore();
}

function drawColorFill(ctx, background, box) {
  const radius = box.cutDiameterPx / 2;
  ctx.save();
  ctx.fillStyle = background.color1 || '#8FBCE6';
  ctx.fillRect(box.centerXPx - radius, box.centerYPx - radius, box.cutDiameterPx, box.cutDiameterPx);
  ctx.restore();
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function drawText(ctx, text, box) {
  const value = (text.value || '').trim();
  if (!value) return;
  const fontSizeFrac = text.fontSizeFrac || 0.16;
  const fontPx = box.cutDiameterPx * fontSizeFrac;

  ctx.save();
  ctx.fillStyle = text.color || '#33363D';
  ctx.font = `700 ${fontPx}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = box.cutDiameterPx * 0.8;
  const lines = wrapLines(ctx, value, maxWidth, 3);
  const lineHeight = fontPx * 1.15;
  const startY = box.centerYPx - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, box.centerXPx, startY + i * lineHeight);
  });
  ctx.restore();
}

// Dibuja el contenido de un slot dentro del clip circular (llamada desde
// drawPin, ya recortado). El texto se dibuja siempre que exista, encima
// de foto/emoji/color — así una foto puede llevar texto superpuesto.
export function drawSlotContent(ctx, slot, box) {
  if (slot.type === 'photo' && slot.photo) drawPhoto(ctx, slot.photo, box);
  else if (slot.type === 'emoji' && slot.emoji) drawEmoji(ctx, slot.emoji, box);
  else if (slot.type === 'color' && slot.background) drawColorFill(ctx, slot.background, box);

  if (slot.text && slot.text.value) drawText(ctx, slot.text, box);
}

// Función principal: máscara + contenido + guías de corte. Usada por cada
// canvas de slot en el editor, y (en el prompt de exportación) por el
// canvas offscreen de la hoja completa.
export function drawPin(ctx, slot, box) {
  const radius = box.cutDiameterPx / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(box.centerXPx, box.centerYPx, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(box.centerXPx - radius, box.centerYPx - radius, box.cutDiameterPx, box.cutDiameterPx);

  drawSlotContent(ctx, slot, box);
  ctx.restore();

  drawCutGuides(ctx, box.centerXPx, box.centerYPx, box.cutDiameterPx);
}
