// Canvas debug overlay for photo slots when ?debug=1 / pintori-debug=1.
// Draws cut / safe / fold ring, face bboxes, chosen center + score HUD.
// English (light bilingual OK). Never called from export/print paths.

import { isDebugEnabled } from '../debug.js';
import { PIN_SIZES, DPI, MM_PER_INCH } from '../constants.js';
import { computePhotoDrawRect } from '../render.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} slot
 * @param {object} box  screen box from specToBox (EDITOR_DPI)
 * @param {object|null} spec  resolveSlotSpec result (safeZoneMm, cutWidthMm, …)
 */
export function drawDebugOverlay(ctx, slot, box, spec) {
  if (!isDebugEnabled()) return;
  if (!slot || slot.type !== 'photo' || !slot.photo) return;

  const photo = slot.photo;
  const debug = photo.centerDebug;
  const ref = Math.min(box.cutWidthPx, box.cutHeightPx);
  const cx = box.centerXPx;
  const cy = box.centerYPx;

  ctx.save();
  ctx.lineWidth = Math.max(1, ref * 0.008);

  // --- Geometry rings (pins with bleed) ---
  if (spec && spec.category === 'pin' && spec.safeZoneMm != null && box.shape === 'circle') {
    const cutR = box.cutWidthPx / 2;
    const safeR = cutR * (spec.safeZoneMm / spec.cutWidthMm);

    // Fold / bleed ring = annulus between safe and cut (fill lightly)
    ctx.beginPath();
    ctx.arc(cx, cy, cutR, 0, Math.PI * 2);
    ctx.arc(cx, cy, safeR, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(255, 80, 80, 0.18)';
    ctx.fill();

    // Cut circle
    ctx.beginPath();
    ctx.arc(cx, cy, cutR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.95)';
    ctx.setLineDash([]);
    ctx.stroke();

    // Safe zone
    ctx.beginPath();
    ctx.arc(cx, cy, safeR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(40, 200, 90, 0.95)';
    ctx.stroke();

    // Fold ring outline (same as cut, dashed inner note)
    ctx.beginPath();
    ctx.arc(cx, cy, (cutR + safeR) / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 180, 40, 0.7)';
    ctx.setLineDash([ref * 0.02, ref * 0.015]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Non-pin: just stroke the cut shape lightly
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.8)';
    ctx.beginPath();
    if (box.shape === 'circle') {
      ctx.arc(cx, cy, box.cutWidthPx / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(cx - box.cutWidthPx / 2, cy - box.cutHeightPx / 2, box.cutWidthPx, box.cutHeightPx);
    }
    ctx.stroke();
  }

  // --- Face bboxes (mapped through current photo draw rect) ---
  const rect = computePhotoDrawRect(photo, box);
  if (debug && Array.isArray(debug.faces)) {
    ctx.strokeStyle = 'rgba(80, 160, 255, 0.95)';
    ctx.lineWidth = Math.max(1, ref * 0.006);
    for (const f of debug.faces) {
      const fx = rect.x + f.xFrac * rect.drawW;
      const fy = rect.y + f.yFrac * rect.drawH;
      const fw = f.wFrac * rect.drawW;
      const fh = f.hFrac * rect.drawH;
      ctx.strokeRect(fx, fy, fw, fh);
    }
  }

  // --- Chosen center (image frac → screen via draw rect) ---
  if (debug) {
    const px = rect.x + debug.xFrac * rect.drawW;
    const py = rect.y + debug.yFrac * rect.drawH;
    const r = Math.max(3, ref * 0.025);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.95)';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const label = `${debug.label || debug.source}  ${debug.score != null ? debug.score.toFixed(2) : ''}`;
    ctx.font = `bold ${Math.max(10, Math.round(ref * 0.055))}px monospace`;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(px + r + 2, py - ref * 0.04, ctx.measureText(label).width + 6, ref * 0.07);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px + r + 5, py);
  }

  // --- HUD (mm sizes Default 70/60, px = mm * DPI/25.4) ---
  const pin = PIN_SIZES[0]; // Default: cut 70 / safe 60 / finished 60
  const cutMm = spec?.cutWidthMm ?? pin.cutMm;
  const safeMm = spec?.safeZoneMm ?? pin.safeZoneMm;
  const finishedMm = spec?.finishedMm ?? pin.finishedMm;
  const lines = [
    `debug  cut ${cutMm}mm / safe ${safeMm}mm / fin ${finishedMm}mm`,
    `px = mm * DPI/${MM_PER_INCH}  (DPI=${DPI})`,
    debug
      ? `win=${debug.label} score=${(debug.score ?? 0).toFixed(2)} edge=${(debug.edgePenalty ?? 0).toFixed(2)}`
      : 'win=— (no centerDebug)',
  ];
  if (debug?.alternatives?.length) {
    const alt = debug.alternatives
      .map((a) => `${a.label}:${a.score.toFixed(2)}`)
      .join(' ');
    lines.push(alt);
  }

  const fontPx = Math.max(9, Math.round(ref * 0.045));
  ctx.font = `${fontPx}px monospace`;
  ctx.textBaseline = 'top';
  const pad = 4;
  const lineH = fontPx * 1.25;
  const boxW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const boxH = lines.length * lineH + pad * 2;
  const hx = box.centerXPx - box.cutWidthPx / 2 + 4;
  const hy = box.centerYPx - box.cutHeightPx / 2 + 4;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(hx, hy, boxW, boxH);
  ctx.fillStyle = '#e8ffe8';
  lines.forEach((l, i) => {
    ctx.fillText(l, hx + pad, hy + pad + i * lineH);
  });

  ctx.restore();
}
