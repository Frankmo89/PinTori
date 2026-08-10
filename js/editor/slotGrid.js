import { computeGrid } from '../geometry.js';
import { getSlot, setSlot, setActiveIndex, fillAllFrom, getState } from '../state.js';
import { drawPin } from '../render.js';
import { attachPhotoInteraction } from './slotController.js';
import { openSlotPanel, closeSlotPanel } from './slotPanel.js';
import { isPhotoLowRes } from '../resolutionCheck.js';
import { t, onLangChange } from '../i18n.js';

// Tamaño de slot en pantalla: independiente de la escala física de
// impresión. El editor no necesita verse "a escala real" — solo el
// canvas de exportación (300 DPI) sí, porque ese es el que importa
// físicamente.
const EDITOR_DISPLAY_DIAMETER = 180;

export function buildSlotGrid(container) {
  const { sheetId, pinId } = getState();
  const grid = computeGrid({ pinId, sheetId });

  const safeZonePct = (grid.safeZoneMm / grid.cutDiameterMm) * 100;
  container.style.setProperty('--safe-zone-pct', `${safeZonePct}%`);
  container.style.gridTemplateColumns = `repeat(${grid.cols}, ${EDITOR_DISPLAY_DIAMETER}px)`;

  container.innerHTML = '';

  grid.cells.forEach((cell) => {
    const slotEl = document.createElement('div');
    slotEl.className = 'slot';
    slotEl.dataset.index = String(cell.index);
    slotEl.style.width = `${EDITOR_DISPLAY_DIAMETER}px`;
    slotEl.style.height = `${EDITOR_DISPLAY_DIAMETER}px`;

    const canvas = document.createElement('canvas');
    canvas.className = 'slot-canvas';
    canvas.width = EDITOR_DISPLAY_DIAMETER;
    canvas.height = EDITOR_DISPLAY_DIAMETER;
    // Teclado: la circunferencia es un botón — Tab llega, Enter/Espacio
    // abren el panel, igual que un clic.
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'button');

    const foldOverlay = document.createElement('div');
    foldOverlay.className = 'fold-overlay';

    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'slot-empty-icon';
    emptyIcon.textContent = '+';
    emptyIcon.setAttribute('aria-hidden', 'true');

    const warningBadge = document.createElement('div');
    warningBadge.className = 'slot-warning-badge';
    warningBadge.setAttribute('aria-hidden', 'true');
    warningBadge.textContent = '!';

    slotEl.append(canvas, foldOverlay, emptyIcon, warningBadge);
    container.appendChild(slotEl);

    const renderThisSlot = () => renderSlot(cell.index, slotEl, canvas, emptyIcon, warningBadge, grid.cutDiameterPx);
    renderThisSlot();

    attachPhotoInteraction(canvas, cell.index, (idx, newPhoto) => {
      setSlot(idx, { type: 'photo', photo: newPhoto });
      renderThisSlot();
    });

    function openPanelForSlot() {
      setActiveIndex(cell.index);
      openSlotPanel(cell.index, slotEl, {
        returnFocusTo: canvas,
        onSlotChange: renderThisSlot,
        onFillAll: () => {
          fillAllFrom(cell.index, grid.count);
          renderAllSlots(container, grid.cutDiameterPx);
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
  });
}

function slotStatusKey(slot) {
  if (slot.type === 'photo') return 'slotPhoto';
  if (slot.type === 'emoji') return 'slotEmoji';
  if (slot.type === 'color') return 'slotColor';
  if (slot.type === 'text' || slot.text?.value) return 'slotText';
  return 'slotEmpty';
}

function renderSlot(index, slotEl, canvas, emptyIcon, warningBadge, cutDiameterPx) {
  const slot = getSlot(index);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPin(ctx, slot, {
    centerXPx: canvas.width / 2,
    centerYPx: canvas.height / 2,
    cutDiameterPx: canvas.width,
  });

  const hasContent = slot.type !== 'empty' || Boolean(slot.text?.value);
  emptyIcon.style.display = hasContent ? 'none' : 'flex';

  const lowRes = slot.type === 'photo' && isPhotoLowRes(slot.photo, cutDiameterPx);
  slotEl.classList.toggle('has-warning', lowRes);
  warningBadge.style.display = lowRes ? 'flex' : 'none';
  if (lowRes) warningBadge.title = t('lowResWarning');

  const statusText = t(slotStatusKey(slot));
  const warningText = lowRes ? t('lowResWarning') : '';
  canvas.setAttribute('aria-label', t('slotLabel', index + 1, statusText, warningText));
}

function renderAllSlots(container, cutDiameterPx) {
  closeSlotPanel();
  container.querySelectorAll('.slot').forEach((slotEl) => {
    const index = Number(slotEl.dataset.index);
    const canvas = slotEl.querySelector('.slot-canvas');
    const emptyIcon = slotEl.querySelector('.slot-empty-icon');
    const warningBadge = slotEl.querySelector('.slot-warning-badge');
    renderSlot(index, slotEl, canvas, emptyIcon, warningBadge, cutDiameterPx);
  });
}
