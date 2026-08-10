// Diccionario plano es/en + helper t(). Sin librería — el proyecto no
// tiene build step y el diccionario es chico, no vale la pena la
// dependencia. Español por defecto; el idioma elegido se recuerda en
// localStorage para que sobreviva un refresh, igual que el resto del
// trabajo (ver persistence.js).

const STRINGS = {
  es: {
    subtitle: 'Toca un círculo para agregar foto, texto, emoji o color.',
    generatePdf: 'Generar PDF',
    downloadPng: 'Descargar PNG',
    langToggle: 'English',
    photo: 'Foto',
    text: 'Texto',
    emoji: 'Emoji',
    background: 'Fondo',
    textPlaceholder: 'Nombre...',
    clear: 'Quitar',
    fillAll: 'Llenar todos con este diseño',
    photoError: 'Esta foto no se pudo abrir. Intenta con otra.',
    lowResWarning: 'Esta foto puede salir borrosa al imprimir',
    slotEmpty: 'vacío',
    slotPhoto: 'con foto',
    slotText: 'con texto',
    slotEmoji: 'con emoji',
    slotColor: 'con color',
    slotLabel: (index, statusText, warningText) =>
      `Slot ${index}: ${statusText}${warningText ? ' — ' + warningText : ''}. Toca para editar.`,
    downloadTitle: '¡Tu hoja está lista!',
    tipScale: 'Imprime a escala 100% — desactiva "ajustar a la página"',
    tipRuler: 'Verifica la regla impresa contra una regla real antes de cortar',
    tipPaper: 'Usa papel couché o fotográfico de 120–160 gsm',
    tipCut: 'Corta sobre la línea punteada, con cortador circular si tienes uno',
    close: 'Cerrar',
    printCaption: (sheetLabel) => `Hoja ${sheetLabel} · Imprime al 100% — no escalar`,
    typeTab: 'Tipo',
    categoryPin: 'Pin',
    categorySticker: 'Sticker',
    categoryLabel: 'Etiqueta',
    useSheetDefault: 'Usar tamaño de la hoja',
    shapeCircle: 'Círculo',
    shapeSquare: 'Cuadrado',
    shapeRoundedSquare: 'Redondeado',
    size: 'Tamaño',
    width: 'Ancho',
    height: 'Alto',
  },
  en: {
    subtitle: 'Tap a circle to add a photo, text, emoji, or color.',
    generatePdf: 'Generate PDF',
    downloadPng: 'Download PNG',
    langToggle: 'Español',
    photo: 'Photo',
    text: 'Text',
    emoji: 'Emoji',
    background: 'Background',
    textPlaceholder: 'Name...',
    clear: 'Clear',
    fillAll: 'Fill all slots with this design',
    photoError: "This photo couldn't be opened. Try another one.",
    lowResWarning: 'This photo may print blurry',
    slotEmpty: 'empty',
    slotPhoto: 'with photo',
    slotText: 'with text',
    slotEmoji: 'with emoji',
    slotColor: 'with color',
    slotLabel: (index, statusText, warningText) =>
      `Slot ${index}: ${statusText}${warningText ? ' — ' + warningText : ''}. Tap to edit.`,
    downloadTitle: 'Your sheet is ready!',
    tipScale: 'Print at 100% scale — turn off "fit to page"',
    tipRuler: 'Check the printed ruler against a real ruler before cutting',
    tipPaper: 'Use 120–160 gsm coated or photo paper',
    tipCut: 'Cut on the dashed line, with a circle cutter if you have one',
    close: 'Close',
    printCaption: (sheetLabel) => `${sheetLabel} sheet · Print at 100% — do not scale`,
    typeTab: 'Type',
    categoryPin: 'Pin',
    categorySticker: 'Sticker',
    categoryLabel: 'Label',
    useSheetDefault: 'Use sheet default',
    shapeCircle: 'Circle',
    shapeSquare: 'Square',
    shapeRoundedSquare: 'Rounded',
    size: 'Size',
    width: 'Width',
    height: 'Height',
  },
};

let currentLang = localStorage.getItem('pintori-lang') === 'en' ? 'en' : 'es';

export function getLang() {
  return currentLang;
}

export function t(key, ...args) {
  const entry = STRINGS[currentLang][key] ?? STRINGS.es[key];
  return typeof entry === 'function' ? entry(...args) : entry;
}

const langChangeListeners = new Set();

export function onLangChange(fn) {
  langChangeListeners.add(fn);
  return () => langChangeListeners.delete(fn);
}

export function setLang(lang) {
  if (lang !== 'es' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem('pintori-lang', lang);
  document.documentElement.lang = lang;
  applyStaticStrings();
  langChangeListeners.forEach((fn) => fn(lang));
}

// Aplica t() a todo elemento marcado con data-i18n / data-i18n-placeholder
// en el HTML estático. El contenido armado dinámicamente (panel de slot,
// modal de descarga) llama a t() directo al construirse.
export function applyStaticStrings() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}
