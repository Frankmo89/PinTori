// Arrastrar para mover y rueda/pellizco para zoom, sobre el canvas de un
// slot con foto. Usa Pointer Events (no mouse/touch por separado) porque
// unifica mouse, touch y pen en un solo modelo de eventos — es lo que
// hace que esto funcione igual con mouse y con dedo sin duplicar lógica.

import { getSlot } from '../state.js';
import { clampPhotoOffset, computePhotoDrawRect } from '../render.js';

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function attachPhotoInteraction(canvasEl, index, onChange) {
  const pointers = new Map();
  let dragStart = null;
  let pinchStart = null;
  let gestureMoved = false;

  const slotEl = canvasEl.closest('.slot');

  // La caja real del slot (puede no ser cuadrada — una etiqueta
  // rectangular, por ejemplo). clientWidth/clientHeight ya reflejan la
  // forma real porque slotGrid.js dimensiona el canvas en proporción a
  // sus mm reales, no a un cuadrado fijo.
  function currentBox() {
    return {
      centerXPx: (canvasEl.clientWidth || canvasEl.width) / 2,
      centerYPx: (canvasEl.clientHeight || canvasEl.height) / 2,
      cutWidthPx: canvasEl.clientWidth || canvasEl.width,
      cutHeightPx: canvasEl.clientHeight || canvasEl.height,
    };
  }

  // Si el usuario arrastró o hizo pellizco, el "click" que dispara el
  // navegador al soltar no debe abrir el panel de edición — se sentiría
  // como que el ajuste se te escapa de las manos.
  function suppressNextClick() {
    const handler = (e) => {
      e.stopPropagation();
      canvasEl.removeEventListener('click', handler, true);
    };
    canvasEl.addEventListener('click', handler, true);
  }

  function currentPhoto() {
    const slot = getSlot(index);
    return slot.type === 'photo' ? slot.photo : null;
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    if (!currentPhoto()) return;
    canvasEl.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    slotEl.classList.add('is-adjusting');

    if (pointers.size === 1) {
      gestureMoved = false;
      const photo = currentPhoto();
      dragStart = {
        x: e.clientX,
        y: e.clientY,
        offsetXFrac: photo.offsetXFrac || 0,
        offsetYFrac: photo.offsetYFrac || 0,
      };
      pinchStart = null;
    } else if (pointers.size === 2) {
      const pts = [...pointers.values()];
      pinchStart = { dist: distance(pts[0], pts[1]), scale: currentPhoto().scale || 1 };
      dragStart = null;
    }
  });

  canvasEl.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const photo = currentPhoto();
    if (!photo) return;
    const box = currentBox();

    if (pointers.size === 2 && pinchStart) {
      const pts = [...pointers.values()];
      const ratio = distance(pts[0], pts[1]) / pinchStart.dist;
      const newScale = clamp(pinchStart.scale * ratio, 1, 4);
      gestureMoved = true;
      onChange(index, clampPhotoOffset({ ...photo, scale: newScale }, box));
    } else if (pointers.size === 1 && dragStart) {
      // offsetXFrac/offsetYFrac son fracción de la imagen YA DIBUJADA
      // (no de la caja) — hay que convertir el arrastre en px de
      // pantalla a fracción del ancho/alto que la foto ocupa dibujada,
      // no del ancho/alto del slot.
      const rect = computePhotoDrawRect({ ...photo, offsetXFrac: 0, offsetYFrac: 0 }, box);
      const dxFrac = rect.drawW > 0 ? (e.clientX - dragStart.x) / rect.drawW : 0;
      const dyFrac = rect.drawH > 0 ? (e.clientY - dragStart.y) / rect.drawH : 0;
      if (Math.abs(e.clientX - dragStart.x) > 3 || Math.abs(e.clientY - dragStart.y) > 3) {
        gestureMoved = true;
      }
      const moved = {
        ...photo,
        offsetXFrac: dragStart.offsetXFrac + dxFrac,
        offsetYFrac: dragStart.offsetYFrac + dyFrac,
      };
      onChange(index, clampPhotoOffset(moved, box));
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      slotEl.classList.remove('is-adjusting');
      dragStart = null;
      pinchStart = null;
      if (gestureMoved) suppressNextClick();
      gestureMoved = false;
    } else if (pointers.size === 1) {
      const photo = currentPhoto();
      const [remaining] = pointers.values();
      dragStart = photo
        ? { x: remaining.x, y: remaining.y, offsetXFrac: photo.offsetXFrac || 0, offsetYFrac: photo.offsetYFrac || 0 }
        : null;
      pinchStart = null;
    }
  }

  canvasEl.addEventListener('pointerup', endPointer);
  canvasEl.addEventListener('pointercancel', endPointer);

  canvasEl.addEventListener(
    'wheel',
    (e) => {
      const photo = currentPhoto();
      if (!photo) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      const newScale = clamp((photo.scale || 1) * (1 + delta), 1, 4);
      onChange(index, clampPhotoOffset({ ...photo, scale: newScale }, currentBox()));
    },
    { passive: false }
  );
}
