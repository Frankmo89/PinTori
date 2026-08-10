import {
  computeDefaultSlotCount,
  resolveSlotSpec,
  specToBox,
  EDITOR_DPI,
} from '../geometry.js';
import { DPI } from '../constants.js';
import {
  getSlot,
  setSlot,
  setActiveIndex,
  fillAllFrom,
  getState,
  getDefaultSlotType,
  getSlotType,
} from '../state.js';
import { drawSlot } from '../render.js';
import { attachPhotoInteraction } from './slotController.js';
import { openSlotPanel, closeSlotPanel } from './slotPanel.js';
import { isPhotoLowRes } from '../resolutionCheck.js';
import { t, onLangChange } from '../i18n.js';

// El editor no necesita verse "a escala real de impresión" — solo el
// canvas de exportación (300 DPI) sí, porque ese es el que importa
// físicamente. Pero ahora que un pin de 85mm y un sticker de 40mm
// pueden convivir en la misma hoja, sí necesita que las proporciones
// ENTRE slots sean honestas — por eso cada slot mide su propio tamaño
// en pantalla (EDITOR_DPI, ~2px/mm) en vez de forzarse todos a la misma
// caja fija de antes.
export function buildSlotGrid(container) {
  const { sheetId } = getState();
  const defaultType = getDefaultSlotType();
  const slotCount = computeDefaultSlotCount({ slotType: defaultType, sheetId });

  container.innerHTML = '';
  container.className = 'slot-grid';

  for (let index = 0; index < slotCount; index++) {
    buildSlotElement(container, index, slotCount);
  }
}

function buildSlotElement(container, index, slotCount) {
  const slotType = getSlotType(index);
  const spec = resolveSlotSpec(slotType);
  const screenBox = specToBox(spec, 0, 0, EDITOR_DPI);
  const displayW = Math.round(screenBox.cutWidthPx);
  const displayH = Math.round(screenBox.cutHeightPx);

  const slotEl = document.createElement('div');
  slotEl.className = `slot shape-${spec.shape}`;
  slotEl.dataset.index = String(index);
  slotEl.style.width = `${displayW}px`;
  slotEl.style.height = `${displayH}px`;

  const canvas = document.createElement('canvas');
  canvas.className = 'slot-canvas';
  canvas.width = displayW;
  canvas.height = displayH;
  if (spec.shape === 'rounded-square') {
    canvas.style.borderRadius = `${screenBox.cornerRadiusPx}px`;
  }
  // Teclado: la forma es un botón — Tab llega, Enter/Espacio abren el
  // panel, igual que un clic.
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'button');

  let foldOverlay = null;
  if (spec.category === 'pin') {
    foldOverlay = document.createElement('div');
    foldOverlay.className = 'fold-overlay';
    const safeZonePct = (spec.safeZoneMm / spec.cutWidthMm) * 100;
    slotEl.style.setProperty('--safe-zone-pct', `${safeZonePct}%`);
  }

  const emptyIcon = document.createElement('div');
  emptyIcon.className = 'slot-empty-icon';
  emptyIcon.textContent = '+';
  emptyIcon.setAttribute('aria-hidden', 'true');

  const warningBadge = document.createElement('div');
  warningBadge.className = 'slot-warning-badge';
  warningBadge.setAttribute('aria-hidden', 'true');
  warningBadge.textContent = '!';

  slotEl.append(canvas);
  if (foldOverlay) slotEl.append(foldOverlay);
  slotEl.append(emptyIcon, warningBadge);
  container.appendChild(slotEl);

  const renderThisSlot = () => renderSlot(index, slotEl, canvas, emptyIcon, warningBadge, spec);
  renderThisSlot();

  attachPhotoInteraction(canvas, index, (idx, newPhoto) => {
    setSlot(idx, { type: 'photo', photo: newPhoto });
    renderThisSlot();
  });

  function openPanelForSlot() {
    setActiveIndex(index);
    // El aviso de baja resolución compara contra el tamaño REAL de
    // impresión (300 DPI), no contra la caja chica de pantalla — si no,
    // nunca dispararía.
    const printBox = specToBox(spec, 0, 0, DPI);
    openSlotPanel(index, slotEl, {
      returnFocusTo: canvas,
      cutWidthPx: printBox.cutWidthPx,
      cutHeightPx: printBox.cutHeightPx,
      onSlotChange: renderThisSlot,
      onTypeChange: () => buildSlotGrid(container),
      onFillAll: () => {
        fillAllFrom(index, slotCount);
        renderAllSlots(container);
      },
    });
  }

  // Escucha en el canvas, no en slotEl: el panel se agrega como hijo de
  // slotEl, así que un clic en el panel también hace bubbling hasta
  // slotEl. Si el listener estuviera ahí, cada clic dentro del panel
  // (por ejemplo el input de texto) volvería a llamar a openSlotPanel,
  // destruyendo y recreando el panel — y con él, el foco del input.
  canvas.addEventListener('click', () => {
    if (slotEl.classList.contains('is-adjusting')) return;
    openPanelForSlot();
  });

  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      openPanelForSlot();
    }
  });

  onLangChange(renderThisSlot);
}

function slotStatusKey(slot) {
  if (slot.type === 'photo') return 'slotPhoto';
  if (slot.type === 'emoji') return 'slotEmoji';
  if (slot.type === 'color') return 'slotColor';
  if (slot.type === 'text' || slot.text?.value) return 'slotText';
  return 'slotEmpty';
}

function renderSlot(index, slotEl, canvas, emptyIcon, warningBadge, spec) {
  const slot = getSlot(index);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Recalcula la caja a la escala de pantalla del canvas — el mismo
  // specToBox() que usa la exportación, solo que a EDITOR_DPI en vez de
  // 300. drawSlot() nunca sabe (ni le importa) a qué escala se le llamó.
  const screenBox = specToBox(spec, canvas.width / 2, canvas.height / 2, EDITOR_DPI);
  drawSlot(ctx, slot, screenBox);

  const hasContent = slot.type !== 'empty' || Boolean(slot.text?.value);
  emptyIcon.style.display = hasContent ? 'none' : 'flex';

  const printBox = specToBox(spec, 0, 0, DPI);
  const lowRes = slot.type === 'photo' && isPhotoLowRes(slot.photo, printBox.cutWidthPx, printBox.cutHeightPx);
  slotEl.classList.toggle('has-warning', lowRes);
  warningBadge.style.display = lowRes ? 'flex' : 'none';
  if (lowRes) warningBadge.title = t('lowResWarning');

  const statusText = t(slotStatusKey(slot));
  const warningText = lowRes ? t('lowResWarning') : '';
  canvas.setAttribute('aria-label', t('slotLabel', index + 1, statusText, warningText));
}

function renderAllSlots(container) {
  closeSlotPanel();
  container.querySelectorAll('.slot').forEach((slotEl) => {
    const index = Number(slotEl.dataset.index);
    const canvas = slotEl.querySelector('.slot-canvas');
    const emptyIcon = slotEl.querySelector('.slot-empty-icon');
    const warningBadge = slotEl.querySelector('.slot-warning-badge');
    const spec = resolveSlotSpec(getSlotType(index));
    renderSlot(index, slotEl, canvas, emptyIcon, warningBadge, spec);
  });
}
