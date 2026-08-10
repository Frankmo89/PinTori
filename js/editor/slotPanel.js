// Panel que aparece al tocar un slot: foto, texto, emoji, color, quitar,
// y "llenar todos con este diseño". Sin menús anidados ni pasos — todo
// visible a la vez, para que un niño no tenga que leer para encontrarlo.

import { getSlot, setSlot, clearSlot } from '../state.js';
import { computeFaceCenteredOffset, clampPhotoOffset } from '../render.js';
import { detectFaceCenterFrac } from '../face/faceDetect.js';
import { isPhotoLowRes } from '../resolutionCheck.js';
import { t } from '../i18n.js';

const EMOJI_CHOICES = ['😀', '🎉', '🐶', '🌈', '⭐', '❤️', '🎈', '🦄'];
const COLOR_CHOICES = ['#8FBCE6', '#B6DDA0', '#FFE9A8', '#F4C7D8'];
const TEXT_COLOR_CHOICES = ['#33363D', '#FFFFFF', '#1F3A5C', '#1F4520', '#5C1F2A'];
const TEXT_SIZE_CHOICES = [
  { key: 'S', fontSizeFrac: 0.12 },
  { key: 'M', fontSizeFrac: 0.16 },
  { key: 'L', fontSizeFrac: 0.22 },
];
const DEFAULT_TEXT_COLOR = TEXT_COLOR_CHOICES[0];
const DEFAULT_TEXT_SIZE = TEXT_SIZE_CHOICES[1].fontSizeFrac;

// "cover" puro (scale=1) deja CERO margen para arrastrar en el eje más
// ajustado de la foto — y en una foto cuadrada, cero margen en LOS DOS
// ejes, porque ambos ejes empatan como el límite. Por eso "arrastrar no
// hacía nada" con ciertas fotos: no era un bug de eventos, era que no
// había a dónde moverse. Se arranca con un poco de zoom de más para que
// siempre haya margen para arrastrar, sin importar la forma de la foto.
const DEFAULT_PHOTO_SCALE = 1.15;

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
      scale: DEFAULT_PHOTO_SCALE,
    };

    // Silencioso: si no se detecta rostro (o el modelo no cargó), el
    // encuadre se queda en el centro geométrico, sin avisar nada — es el
    // mismo resultado que un slot que nunca intentó detectar nada.
    const faceCenter = await detectFaceCenterFrac(bitmap);
    if (faceCenter) {
      const offset = computeFaceCenteredOffset(bitmap.width, bitmap.height, faceCenter, DEFAULT_PHOTO_SCALE);
      const clamped = clampPhotoOffset({ ...photo, ...offset }, 1000);
      photo.offsetXFrac = clamped.offsetXFrac;
      photo.offsetYFrac = clamped.offsetYFrac;
    }

    return { photo, error: null };
  } catch (err) {
    return { photo: null, error: t('photoError') };
  }
}

export function openSlotPanel(index, slotEl, { onSlotChange, onFillAll, returnFocusTo, cutDiameterPx }) {
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

  // El badge "!" en el slot es solo un aviso silencioso — en touch no
  // hay hover para leer su title. Este texto es la explicación real,
  // visible en cuanto se abre el panel, sin que haya que adivinar.
  const warningEl = document.createElement('p');
  warningEl.className = 'panel-warning';
  warningEl.hidden = true;
  function refreshWarning() {
    const slot = getSlot(index);
    const lowRes = slot.type === 'photo' && cutDiameterPx && isPhotoLowRes(slot.photo, cutDiameterPx);
    warningEl.textContent = lowRes ? t('lowResWarning') : '';
    warningEl.hidden = !lowRes;
  }
  refreshWarning();

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
    refreshWarning();
    onSlotChange();
  });
  photoRow.appendChild(photoInput);

  // --- Texto ---
  // El color y el tamaño de letra se guardan aparte del valor — antes
  // cada tecla en el campo de texto los pisaba de vuelta al default,
  // porque el handler de 'input' los hardcodeaba en vez de leer el
  // estilo ya elegido.
  const existingText = getSlot(index).text;
  let textColor = existingText?.color || DEFAULT_TEXT_COLOR;
  let textFontSizeFrac = existingText?.fontSizeFrac || DEFAULT_TEXT_SIZE;

  function writeText(value) {
    const slot = getSlot(index);
    const nextType = slot.type === 'empty' ? 'text' : slot.type;
    setSlot(index, { type: nextType, text: { value, color: textColor, fontSizeFrac: textFontSizeFrac } });
    onSlotChange();
  }

  const textRow = document.createElement('label');
  textRow.className = 'panel-row';
  textRow.innerHTML = `<span>${t('text')}</span>`;
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.maxLength = 24;
  textInput.placeholder = t('textPlaceholder');
  textInput.value = existingText?.value || '';
  textInput.addEventListener('input', () => writeText(textInput.value));
  textRow.appendChild(textInput);

  // Tamaño de letra: S/M/L, igual de simple que el resto del panel.
  const textSizeRow = document.createElement('div');
  textSizeRow.className = 'panel-row text-style-row';
  const sizeButtons = TEXT_SIZE_CHOICES.map(({ key, fontSizeFrac }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'text-size-btn';
    btn.textContent = key;
    btn.setAttribute('aria-pressed', String(fontSizeFrac === textFontSizeFrac));
    if (fontSizeFrac === textFontSizeFrac) btn.classList.add('is-active');
    btn.addEventListener('click', () => {
      textFontSizeFrac = fontSizeFrac;
      sizeButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (textInput.value) writeText(textInput.value);
    });
    textSizeRow.appendChild(btn);
    return btn;
  });

  // Color de letra: tonos oscuros legibles sobre foto, emoji o color de
  // fondo — no los mismos swatches pastel del fondo, esos son
  // demasiado claros para leerse como texto encima de una foto.
  const textColorRow = document.createElement('div');
  textColorRow.className = 'panel-row text-style-row';
  TEXT_COLOR_CHOICES.forEach((hex) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch text-color-swatch';
    btn.style.background = hex;
    btn.setAttribute('aria-pressed', String(hex === textColor));
    if (hex === textColor) btn.classList.add('is-active');
    btn.addEventListener('click', () => {
      textColor = hex;
      textColorRow.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (textInput.value) writeText(textInput.value);
    });
    textColorRow.appendChild(btn);
  });

  // --- Emoji ---
  // Marca cuál es el elegido ahora mismo — antes ningún botón mostraba
  // selección activa, había que adivinar qué estaba puesto.
  const currentSlotForActive = getSlot(index);
  const emojiRow = document.createElement('div');
  emojiRow.className = 'panel-row emoji-row';
  const emojiButtons = [];
  EMOJI_CHOICES.forEach((char) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-btn';
    btn.textContent = char;
    const isActive = currentSlotForActive.type === 'emoji' && currentSlotForActive.emoji?.char === char;
    btn.setAttribute('aria-pressed', String(isActive));
    if (isActive) btn.classList.add('is-active');
    btn.addEventListener('click', () => {
      setSlot(index, { type: 'emoji', emoji: { char } });
      emojiButtons.forEach((b) => b.classList.remove('is-active'));
      colorRow.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-active'));
      btn.classList.add('is-active');
      onSlotChange();
    });
    emojiRow.appendChild(btn);
    emojiButtons.push(btn);
  });

  // --- Color ---
  const colorRow = document.createElement('div');
  colorRow.className = 'panel-row color-row';
  COLOR_CHOICES.forEach((hex) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.style.background = hex;
    const isActive = currentSlotForActive.type === 'color' && currentSlotForActive.background?.color1 === hex;
    btn.setAttribute('aria-pressed', String(isActive));
    if (isActive) btn.classList.add('is-active');
    btn.addEventListener('click', () => {
      setSlot(index, { type: 'color', background: { color1: hex } });
      emojiButtons.forEach((b) => b.classList.remove('is-active'));
      colorRow.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-active'));
      btn.classList.add('is-active');
      onSlotChange();
    });
    colorRow.appendChild(btn);
  });
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#8FBCE6';
  colorInput.addEventListener('input', () => {
    setSlot(index, { type: 'color', background: { color1: colorInput.value } });
    emojiButtons.forEach((b) => b.classList.remove('is-active'));
    colorRow.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-active'));
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
    refreshWarning();
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

  panel.append(photoRow, textRow, textSizeRow, textColorRow, emojiRow, colorRow, errorEl, warningEl, actions);
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
