import { renderSheetCanvas } from './sheetRenderer.js';
import { buildFilename } from './filename.js';
import { resolveSlotSpec } from '../geometry.js';
import { getDefaultSlotType } from '../state.js';

export function exportPng() {
  const { canvas } = renderSheetCanvas();
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildFilename(resolveSlotSpec(getDefaultSlotType()), 'png');
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
