// Panel que aparece al tocar un slot: foto, texto, emoji, color, quitar,
// y "llenar todos con este diseño". Sin menús anidados ni pasos — todo
// visible a la vez, para que un niño no tenga que leer para encontrarlo.

import { getSlot, setSlot, clearSlot } from '../state.js';
import { computeFaceCenteredOffset, clampPhotoOffset } from '../render.js';
import { detectFaceCenterFrac } from '../face/faceDetect.js';
import { t } from '../i18n.js';

const EMOJI_CHOICES = ['😀', '🎉', '🐶', '🌈', '⭐', '❤️', '🎈', '🦄'];
const COLOR_CHOICES = ['#8FBCE6', '#B6DDA0', '#FFE9A8', '#F4C7D8'];

let openPanelEl = null;
let outsideClickHandler = null;
let escapeHandler = null;
let returnFocusTarget = null;

export function closeSlotPanel() {
  if (openPanelEl) {
    openPanelEl.remove();
    openPanelEl = null;
  }
  if (outsideClickHandler) {
    document.removeEventListener('pointerdown', outsideClickHandler, true);
    outsideClickHandler = null;
  }
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
  if (returnFocusTarget) {
    returnFocusTarget.focus();
    returnFocusTarget = null;
  }
}

async function loadImageFromFile(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const photo = {
      image: bitmap,
      blob: file, // se conserva para persistence.js — un ImageBitmap no se
      // puede volver a convertir a Blob sin pasar por un canvas, más
      // simple guardar el archivo original que ya tenemos a la mano.
      naturalW: bitmap.width,
      naturalH: bitmap.height,
      offsetXFrac: 0,
      offsetYFrac: 0,
      scale: 1,
    };

    // Silencioso: si no se detecta rostro (o el modelo no cargó), el
    // encuadre se queda en el centro geométrico, sin avisar nada — es el
    // mismo resultado que un slot que nunca intentó detectar nada.
    const faceCenter = await detectFaceCenterFrac(bitmap);
    if (faceCenter) {
      const offset = computeFaceCenteredOffset(bitmap.width, bitmap.height, faceCenter);
      const clamped = clampPhotoOffset({ ...photo, ...offset }, 1000);
      photo.offsetXFrac = clamped.offsetXFrac;
      photo.offsetYFrac = clamped.offsetYFrac;
    }

    return { photo, error: null };
  } catch (err) {
    return { photo: null, error: t('photoError') };
  }
}

export function openSlotPanel(index, slotEl, { onSlotChange, onFillAll, returnFocusTo }) {
  closeSlotPanel();

  const panel = document.createElement('div');
  panel.className = 'slot-panel';
  // No es un elemento con texto propio, pero necesita ser un punto de
  // foco al abrir (ver más abajo) — tabIndex -1 lo permite sin meterlo
  // en el orden normal de Tab.
  panel.tabIndex = -1;

  const errorEl = document.createElement('p');
  errorEl.className = 'panel-error';
  errorEl.hidden = true;

  // --- Foto ---
  const photoRow = document.createElement('label');
  photoRow.className = 'panel-row';
  photoRow.innerHTML = `<span>${t('photo')}</span>`;
  const photoInput = document.createElement('input');
  photoInput.type = 'file';
  photoInput.accept = 'image/*';
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    const { photo, error } = await loadImageFromFile(file);
    if (error) {
      errorEl.textContent = error;
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;
    setSlot(index, { type: 'photo', photo });
    onSlotChange();
  });
  photoRow.appendChild(photoInput);

  // --- Texto ---
  const textRow = document.createElement('label');
  textRow.className = 'panel-row';
  textRow.innerHTML = `<span>${t('text')}</span>`;
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.maxLength = 24;
  textInput.placeholder = t('textPlaceholder');
  textInput.value = getSlot(index).text?.value || '';
  textInput.addEventListener('input', () => {
    const slot = getSlot(index);
    const nextType = slot.type === 'empty' ? 'text' : slot.type;
    setSlot(index, { type: nextType, text: { value: textInput.value, color: '#33363D', fontSizeFrac: 0.16 } });
    onSlotChange();
  });
  textRow.appendChild(textInput);

  // --- Emoji ---
  const emojiRow = document.createElement('div');
  emojiRow.className = 'panel-row emoji-row';
  EMOJI_CHOICES.forEach((char) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-btn';
    btn.textContent = char;
    btn.addEventListener('click', () => {
      setSlot(index, { type: 'emoji', emoji: { char } });
      onSlotChange();
    });
    emojiRow.appendChild(btn);
  });

  // --- Color ---
  const colorRow = document.createElement('div');
  colorRow.className = 'panel-row color-row';
  COLOR_CHOICES.forEach((hex) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.style.background = hex;
    btn.addEventListener('click', () => {
      setSlot(index, { type: 'color', background: { color1: hex } });
      onSlotChange();
    });
    colorRow.appendChild(btn);
  });
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#8FBCE6';
  colorInput.addEventListener('input', () => {
    setSlot(index, { type: 'color', background: { color1: colorInput.value } });
    onSlotChange();
  });
  colorRow.appendChild(colorInput);

  // --- Acciones ---
  const actions = document.createElement('div');
  actions.className = 'panel-actions';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn-outline';
  clearBtn.textContent = t('clear');
  clearBtn.addEventListener('click', () => {
    clearSlot(index);
    textInput.value = '';
    onSlotChange();
  });

  const fillAllBtn = document.createElement('button');
  fillAllBtn.type = 'button';
  fillAllBtn.className = 'btn-primary';
  fillAllBtn.textContent = t('fillAll');
  fillAllBtn.addEventListener('click', () => {
    onFillAll();
  });

  actions.append(clearBtn, fillAllBtn);

  panel.append(photoRow, textRow, emojiRow, colorRow, errorEl, actions);
  slotEl.appendChild(panel);
  openPanelEl = panel;
  returnFocusTarget = returnFocusTo || null;

  // Foco al abrir: un usuario de teclado que activó el slot con
  // Enter/Espacio queda parado justo dentro del panel recién creado, no
  // perdido en el resto de la página.
  panel.focus();

  outsideClickHandler = (e) => {
    if (!panel.contains(e.target) && !slotEl.contains(e.target)) {
      closeSlotPanel();
    }
  };
  // Se registra en el siguiente tick para no cerrarse por el mismo click
  // que lo abrió.
  setTimeout(() => document.addEventListener('pointerdown', outsideClickHandler, true), 0);

  escapeHandler = (e) => {
    if (e.key === 'Escape') closeSlotPanel();
  };
  document.addEventListener('keydown', escapeHandler);
}
