// Panel que aparece al tocar un slot. Pestañas — Foto / Texto / Emoji /
// Fondo / Tipo — para que solo se vea una sección a la vez. "Quitar" y
// "Llenar todos con este diseño" quedan fuera de las pestañas, siempre
// visibles.

import { getSlot, setSlot, clearSlot, getDefaultSlotType, setSlotTypeOverride } from '../state.js';
import { computeFaceCenteredOffset, clampPhotoOffset } from '../render.js';
import { detectFaceCenterFrac } from '../face/faceDetect.js';
import { detectSaliencyCenterFrac } from '../face/saliencyDetect.js';
import { isPhotoLowRes } from '../resolutionCheck.js';
import { buildTypeSelector } from './typeSelector.js';
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

const TABS = [
  { id: 'photo', labelKey: 'photo' },
  { id: 'text', labelKey: 'text' },
  { id: 'emoji', labelKey: 'emoji' },
  { id: 'background', labelKey: 'background' },
  { id: 'type', labelKey: 'typeTab' },
];

let openPanelEl = null;
let outsideClickHandler = null;
let escapeHandler = null;
let returnFocusTarget = null;
let resizeHandler = null;
let backdropEl = null;

// Debe calzar con el media query de editor.css (>=600px popover /
// <600px bottom-sheet) — mismo corte, justificado ahí: es donde el
// grid deja de tener 2 columnas cómodas para el pin default.
const NARROW_BREAKPOINT_PX = 600;
// Debe calzar con el width:300px fijo del popover en editor.css.
const PANEL_WIDTH_PX = 300;
const PANEL_EDGE_MARGIN_PX = 8;

function isNarrowViewport() {
  return window.innerWidth < NARROW_BREAKPOINT_PX;
}

function ensureBackdrop() {
  if (backdropEl) return;
  backdropEl = document.createElement('div');
  backdropEl.className = 'slot-panel-backdrop';
  document.body.appendChild(backdropEl);
}

function removeBackdrop() {
  if (backdropEl) {
    backdropEl.remove();
    backdropEl = null;
  }
}

// Bottom-sheet (<600px): posición y ancho los da el CSS fijo (position:
// fixed, width:100%) — no hay nada que clampear porque no hay 'left'
// que fijar. Popover (>=600px): 'left' se calcula en coordenadas
// LOCALES a slotEl (position:absolute la sigue tomando de ahí), pero el
// clamp se decide en coordenadas de PÁGINA contra window.innerWidth —
// es la única forma de saber si el popover centrado en el slot se sale
// del viewport real, sin importar dónde esté el slot en la hoja.
function positionPanel(panel, slotEl) {
  if (isNarrowViewport()) {
    panel.style.left = '';
    ensureBackdrop();
    return;
  }
  removeBackdrop();
  const slotRect = slotEl.getBoundingClientRect();
  const centeredLeftLocal = slotRect.width / 2 - PANEL_WIDTH_PX / 2;
  const desiredPageLeft = slotRect.left + centeredLeftLocal;
  const maxPageLeft = window.innerWidth - PANEL_WIDTH_PX - PANEL_EDGE_MARGIN_PX;
  const clampedPageLeft = Math.min(Math.max(desiredPageLeft, PANEL_EDGE_MARGIN_PX), Math.max(maxPageLeft, PANEL_EDGE_MARGIN_PX));
  panel.style.left = `${clampedPageLeft - slotRect.left}px`;
}

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
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  removeBackdrop();
  if (returnFocusTarget) {
    returnFocusTarget.focus();
    returnFocusTarget = null;
  }
}

async function loadImageFromFile(file, box) {
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

    // Cadena de encuadre (Prompt 18): rostro humano primero (más
    // preciso, cuando aplica) -> sujeto genérico como respaldo (dibujos,
    // anime, mascotas, objetos, paisajes) -> centro geométrico si
    // ninguna de las dos encuentra nada o algo falló cargando. Silencioso
    // en los tres casos, sin avisar nada — un slot sin subject center es
    // el mismo resultado que un slot que nunca intentó detectar nada.
    const subjectCenter = (await detectFaceCenterFrac(bitmap)) || (await detectSaliencyCenterFrac(bitmap));
    if (subjectCenter) {
      const offset = computeFaceCenteredOffset(bitmap.width, bitmap.height, subjectCenter);
      const clamped = clampPhotoOffset({ ...photo, ...offset }, box);
      photo.offsetXFrac = clamped.offsetXFrac;
      photo.offsetYFrac = clamped.offsetYFrac;
    }

    return { photo, error: null };
  } catch (err) {
    return { photo: null, error: t('photoError') };
  }
}

// Qué pestaña abrir por default: la que corresponde al contenido que ya
// tiene el slot, para que el usuario vea de entrada lo que puso. Un
// slot vacío abre en Foto — es la acción más común para empezar.
function defaultTabFor(slot) {
  if (slot.type === 'photo') return 'photo';
  if (slot.type === 'emoji') return 'emoji';
  if (slot.type === 'color') return 'background';
  if (slot.type === 'text' || slot.text?.value) return 'text';
  return 'photo';
}

export function openSlotPanel(
  index,
  slotEl,
  { onSlotChange, onFillAll, onRepeatIn, onTypeChange, returnFocusTo, cutWidthPx, cutHeightPx }
) {
  closeSlotPanel();

  const panel = document.createElement('div');
  panel.className = 'slot-panel';
  // No es un elemento con texto propio, pero necesita ser un punto de
  // foco al abrir (ver más abajo) — tabIndex -1 lo permite sin meterlo
  // en el orden normal de Tab.
  panel.tabIndex = -1;

  const initialSlot = getSlot(index);
  let activeTab = defaultTabFor(initialSlot);

  // El badge "!" en el slot es solo un aviso silencioso — en touch no
  // hay hover para leer su title. Este texto es la explicación real,
  // visible sin importar qué pestaña esté abierta.
  const warningEl = document.createElement('p');
  warningEl.className = 'panel-warning';
  warningEl.hidden = true;
  function refreshWarning() {
    const slot = getSlot(index);
    const lowRes = slot.type === 'photo' && cutWidthPx && isPhotoLowRes(slot.photo, cutWidthPx, cutHeightPx);
    warningEl.textContent = lowRes ? t('lowResWarning') : '';
    warningEl.hidden = !lowRes;
  }
  refreshWarning();

  // --- Barra de pestañas ---
  const tabBar = document.createElement('div');
  tabBar.className = 'panel-tabs';
  tabBar.setAttribute('role', 'tablist');
  const tabButtons = {};

  // --- Foto ---
  const photoPanelEl = document.createElement('div');
  photoPanelEl.className = 'tab-panel';
  photoPanelEl.setAttribute('role', 'tabpanel');

  const errorEl = document.createElement('p');
  errorEl.className = 'panel-error';
  errorEl.hidden = true;

  // Input de archivo nativo escondido (accesible, no display:none) detrás
  // de un botón que sí controlamos — el texto nativo "Ningún archivo
  // seleccionado" se salía de su caja y no se podía acortar de otra forma,
  // porque es UI del navegador, no algo que este CSS controle.
  const photoLabel = document.createElement('label');
  photoLabel.className = 'file-upload-btn';
  const photoInput = document.createElement('input');
  photoInput.type = 'file';
  photoInput.accept = 'image/*';
  photoInput.className = 'visually-hidden-input';
  const photoLabelText = document.createElement('span');
  photoLabelText.textContent = t('photo');
  photoLabel.append(photoInput, photoLabelText);

  const fileNameEl = document.createElement('p');
  fileNameEl.className = 'file-name-display';
  fileNameEl.hidden = true;

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    fileNameEl.textContent = file.name;
    fileNameEl.hidden = false;
    const { photo, error } = await loadImageFromFile(file, { cutWidthPx, cutHeightPx });
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

  photoPanelEl.append(photoLabel, fileNameEl, errorEl);

  // --- Texto ---
  const textPanelEl = document.createElement('div');
  textPanelEl.className = 'tab-panel';
  textPanelEl.setAttribute('role', 'tabpanel');

  // El color y el tamaño de letra se guardan aparte del valor — antes
  // cada tecla en el campo de texto los pisaba de vuelta al default,
  // porque el handler de 'input' los hardcodeaba en vez de leer el
  // estilo ya elegido.
  const existingText = initialSlot.text;
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

  textPanelEl.append(textRow, textSizeRow, textColorRow);

  // --- Emoji ---
  const emojiPanelEl = document.createElement('div');
  emojiPanelEl.className = 'tab-panel';
  emojiPanelEl.setAttribute('role', 'tabpanel');

  // Marca cuál es el elegido ahora mismo — antes ningún botón mostraba
  // selección activa, había que adivinar qué estaba puesto.
  const emojiRow = document.createElement('div');
  emojiRow.className = 'panel-row emoji-row';
  const emojiButtons = [];
  EMOJI_CHOICES.forEach((char) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-btn';
    btn.textContent = char;
    const isActive = initialSlot.type === 'emoji' && initialSlot.emoji?.char === char;
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
  emojiPanelEl.append(emojiRow);

  // --- Fondo (color de relleno) ---
  const backgroundPanelEl = document.createElement('div');
  backgroundPanelEl.className = 'tab-panel';
  backgroundPanelEl.setAttribute('role', 'tabpanel');

  const colorRow = document.createElement('div');
  colorRow.className = 'panel-row color-row';
  COLOR_CHOICES.forEach((hex) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.style.background = hex;
    const isActive = initialSlot.type === 'color' && initialSlot.background?.color1 === hex;
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
  backgroundPanelEl.append(colorRow);

  // --- Tipo (Pin / Sticker / Etiqueta) ---
  const typePanelEl = buildTypeTab(index, onTypeChange);

  // --- Ensamblar pestañas ---
  const tabPanels = {
    photo: photoPanelEl,
    text: textPanelEl,
    emoji: emojiPanelEl,
    background: backgroundPanelEl,
    type: typePanelEl,
  };

  function selectTab(tabId) {
    activeTab = tabId;
    TABS.forEach(({ id }) => {
      const isActive = id === tabId;
      tabPanels[id].hidden = !isActive;
      tabButtons[id].classList.toggle('is-active', isActive);
      tabButtons[id].setAttribute('aria-selected', String(isActive));
    });
  }

  TABS.forEach(({ id, labelKey }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-tab';
    btn.textContent = t(labelKey);
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => selectTab(id));
    tabBar.appendChild(btn);
    tabButtons[id] = btn;
  });

  // --- Acciones (siempre visibles, fuera de las pestañas) ---
  const actions = document.createElement('div');
  actions.className = 'panel-actions';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn-outline';
  clearBtn.textContent = t('clear');
  clearBtn.addEventListener('click', () => {
    clearSlot(index);
    textInput.value = '';
    fileNameEl.hidden = true;
    refreshWarning();
    onSlotChange();
  });

  const repeatBtn = document.createElement('button');
  repeatBtn.type = 'button';
  repeatBtn.className = 'btn-outline';
  repeatBtn.textContent = t('repeatIn');
  repeatBtn.addEventListener('click', () => {
    // Cierra el panel antes de entrar al modo de selección — el modo
    // necesita que el tap en un slot elija destino en vez de abrir su
    // panel, y closeSlotPanel() ya sabe deshacer todo lo que este panel
    // dejó registrado (listeners, foco, resize).
    closeSlotPanel();
    onRepeatIn();
  });

  const fillAllBtn = document.createElement('button');
  fillAllBtn.type = 'button';
  fillAllBtn.className = 'btn-primary';
  fillAllBtn.textContent = t('fillAll');
  fillAllBtn.addEventListener('click', () => {
    onFillAll();
  });

  actions.append(clearBtn, repeatBtn, fillAllBtn);

  panel.append(tabBar, photoPanelEl, textPanelEl, emojiPanelEl, backgroundPanelEl, typePanelEl, warningEl, actions);
  selectTab(activeTab);

  slotEl.appendChild(panel);
  openPanelEl = panel;
  returnFocusTarget = returnFocusTo || null;

  positionPanel(panel, slotEl);
  // Reposiciona en vivo si la ventana cambia de tamaño (o rota) con el
  // panel abierto — incluyendo el caso de cruzar el corte de 600px, que
  // cambia el modo entero (popover clampeado <-> bottom-sheet).
  resizeHandler = () => positionPanel(panel, slotEl);
  window.addEventListener('resize', resizeHandler);

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

function buildTypeTab(index, onTypeChange) {
  const panelEl = document.createElement('div');
  panelEl.className = 'tab-panel';
  panelEl.setAttribute('role', 'tabpanel');

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn-outline';
  resetBtn.textContent = t('useSheetDefault');

  const selector = buildTypeSelector({
    getValue: () => getSlot(index).slotTypeOverride || getDefaultSlotType(),
    onChange: (next) => {
      setSlotTypeOverride(index, next);
      selector.refresh();
      resetBtn.hidden = !getSlot(index).slotTypeOverride;
      onTypeChange();
    },
  });

  resetBtn.addEventListener('click', () => {
    setSlotTypeOverride(index, null);
    selector.refresh();
    resetBtn.hidden = true;
    onTypeChange();
  });
  resetBtn.hidden = !getSlot(index).slotTypeOverride;

  panelEl.append(selector.element, resetBtn);
  return panelEl;
}
