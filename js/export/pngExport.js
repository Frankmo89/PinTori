import { renderSheetCanvas } from './sheetRenderer.js';
import { buildFilename } from './filename.js';

export function exportPng() {
  const { canvas, grid } = renderSheetCanvas();
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildFilename(grid, 'png');
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
