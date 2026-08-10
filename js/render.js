// Dibuja el contenido de un slot (foto/texto/emoji/color) y su máscara,
// línea de corte y cruz de centro (círculo solamente). Esta es la ÚNICA
// función que dibuja un slot — la usa tanto el editor (a escala de
// pantalla) como la exportación de la hoja completa (a 300 DPI real).
// Que sea la misma función es la garantía de que la hoja exportada
// nunca se vea distinta de lo que el usuario ajustó en pantalla.
//
// `box` describe la caja de destino en píxeles, sin importar de dónde
// salió (editor o exportación):
//   { centerXPx, centerYPx, cutWidthPx, cutHeightPx, shape, cornerRadiusPx }
// shape: 'circle' | 'square' | 'rounded-square' | 'rectangle'.
// cutWidthPx === cutHeightPx para círculo/cuadrado/redondeado — solo el
// rectángulo (etiqueta) tiene proporciones distintas.
//
// offsetXFrac/offsetYFrac de una foto son fracción de la imagen YA
// DIBUJADA (no de la caja) — así el mismo par de valores centra el mismo
// punto de la foto sin importar la forma, el tamaño o la resolución de
// la caja destino. Ver computePhotoDrawRect.

export const FONT_FAMILY = "'Nunito', 'Quicksand', sans-serif";

function traceShapePath(ctx, box) {
  const { centerXPx, centerYPx, cutWidthPx, cutHeightPx, shape, cornerRadiusPx } = box;
  const left = centerXPx - cutWidthPx / 2;
  const top = centerYPx - cutHeightPx / 2;
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(centerXPx, centerYPx, cutWidthPx / 2, 0, Math.PI * 2);
  } else if (shape === 'rounded-square') {
    const r = Math.max(0, Math.min(cornerRadiusPx || 0, cutWidthPx / 2, cutHeightPx / 2));
    ctx.roundRect(left, top, cutWidthPx, cutHeightPx, r);
  } else {
    // square, rectangle
    ctx.rect(left, top, cutWidthPx, cutHeightPx);
  }
  ctx.closePath();
}

function drawCutGuides(ctx, box) {
  const refSize = Math.min(box.cutWidthPx, box.cutHeightPx);

  ctx.save();
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = Math.max(1, refSize * 0.0025);
  ctx.setLineDash([refSize * 0.015, refSize * 0.015]);
  traceShapePath(ctx, box);
  ctx.stroke();
  ctx.restore();

  // La cruz de centro es para alinear un cortador CIRCULAR — no aplica
  // a un corte recto (SPEC 4.2), así que solo se dibuja para círculos.
  if (box.shape === 'circle') {
    const crossSize = refSize * 0.04;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(box.centerXPx - crossSize, box.centerYPx);
    ctx.lineTo(box.centerXPx + crossSize, box.centerYPx);
    ctx.moveTo(box.centerXPx, box.centerYPx - crossSize);
    ctx.lineTo(box.centerXPx, box.centerYPx + crossSize);
    ctx.stroke();
    ctx.restore();
  }
}

// Rectángulo donde debe dibujarse la imagen dado su tamaño natural, el
// zoom del usuario y su offset.
export function computePhotoDrawRect(photo, box) {
  const { naturalW, naturalH, offsetXFrac = 0, offsetYFrac = 0, scale = 1 } = photo;
  // "cover": la imagen siempre llena la caja completa, nunca deja
  // huecos blancos en el borde. El usuario puede acercar más (scale > 1)
  // pero no alejar por debajo de este ajuste base.
  const baseScale = Math.max(box.cutWidthPx / naturalW, box.cutHeightPx / naturalH);
  const drawScale = baseScale * scale;
  const drawW = naturalW * drawScale;
  const drawH = naturalH * drawScale;
  const offsetXPx = offsetXFrac * drawW;
  const offsetYPx = offsetYFrac * drawH;
  return {
    drawW,
    drawH,
    x: box.centerXPx - drawW / 2 + offsetXPx,
    y: box.centerYPx - drawH / 2 + offsetYPx,
  };
}

// A partir del centro de un rostro detectado (fracción 0..1 del tamaño
// de la imagen original), calcula el offset que deja ese punto exacto
// en el centro de la caja. Como offsetXFrac/offsetYFrac son fracción de
// la imagen dibujada (no de la caja), este cálculo no depende de la
// forma ni el tamaño del slot destino — es el mismo para un pin, un
// sticker cuadrado o una etiqueta rectangular.
export function computeFaceCenteredOffset(naturalW, naturalH, faceCenterFrac) {
  return {
    offsetXFrac: 0.5 - faceCenterFrac.xFrac,
    offsetYFrac: 0.5 - faceCenterFrac.yFrac,
  };
}

// Limita offsetXFrac/offsetYFrac para que la foto nunca se despegue de
// la caja (no se ve blanco en el borde), dada la caja de destino real.
export function clampPhotoOffset(photo, box) {
  const rect = computePhotoDrawRect({ ...photo, offsetXFrac: 0, offsetYFrac: 0 }, box);
  const maxXFrac = rect.drawW > 0 ? Math.max(0, (rect.drawW - box.cutWidthPx) / 2 / rect.drawW) : 0;
  const maxYFrac = rect.drawH > 0 ? Math.max(0, (rect.drawH - box.cutHeightPx) / 2 / rect.drawH) : 0;
  return {
    ...photo,
    offsetXFrac: Math.min(maxXFrac, Math.max(-maxXFrac, photo.offsetXFrac || 0)),
    offsetYFrac: Math.min(maxYFrac, Math.max(-maxYFrac, photo.offsetYFrac || 0)),
  };
}

function drawPhoto(ctx, photo, box) {
  const rect = computePhotoDrawRect(photo, box);
  ctx.drawImage(photo.image, rect.x, rect.y, rect.drawW, rect.drawH);
}

function drawEmoji(ctx, emoji, box) {
  const refSize = Math.min(box.cutWidthPx, box.cutHeightPx);
  ctx.save();
  ctx.font = `${refSize * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji.char, box.centerXPx, box.centerYPx);
  ctx.restore();
}

function drawColorFill(ctx, background, box) {
  ctx.save();
  ctx.fillStyle = background.color1 || '#8FBCE6';
  ctx.fillRect(
    box.centerXPx - box.cutWidthPx / 2,
    box.centerYPx - box.cutHeightPx / 2,
    box.cutWidthPx,
    box.cutHeightPx
  );
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
  const refSize = Math.min(box.cutWidthPx, box.cutHeightPx);
  const fontSizeFrac = text.fontSizeFrac || 0.16;
  const fontPx = refSize * fontSizeFrac;

  ctx.save();
  ctx.fillStyle = text.color || '#33363D';
  ctx.font = `700 ${fontPx}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = box.cutWidthPx * 0.8;
  const lines = wrapLines(ctx, value, maxWidth, 3);
  const lineHeight = fontPx * 1.15;
  const startY = box.centerYPx - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, box.centerXPx, startY + i * lineHeight);
  });
  ctx.restore();
}

// Dibuja el contenido de un slot dentro del clip de su forma (llamada
// desde drawSlot, ya recortado). El texto se dibuja siempre que exista,
// encima de foto/emoji/color — así una foto puede llevar texto
// superpuesto.
export function drawSlotContent(ctx, slot, box) {
  if (slot.type === 'photo' && slot.photo) drawPhoto(ctx, slot.photo, box);
  else if (slot.type === 'emoji' && slot.emoji) drawEmoji(ctx, slot.emoji, box);
  else if (slot.type === 'color' && slot.background) drawColorFill(ctx, slot.background, box);

  if (slot.text && slot.text.value) drawText(ctx, slot.text, box);
}

// Función principal: máscara de forma + contenido + guías de corte.
// Usada por cada canvas de slot en el editor, y por el canvas offscreen
// de la hoja completa en la exportación.
export function drawSlot(ctx, slot, box) {
  traceShapePath(ctx, box);
  ctx.save();
  ctx.clip();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(
    box.centerXPx - box.cutWidthPx / 2,
    box.centerYPx - box.cutHeightPx / 2,
    box.cutWidthPx,
    box.cutHeightPx
  );

  drawSlotContent(ctx, slot, box);
  ctx.restore();

  drawCutGuides(ctx, box);
}
