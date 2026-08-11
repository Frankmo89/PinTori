// Tablas del SPEC (sección 3). Ningún tamaño va hardcodeado en geometry.js —
// agregar un tamaño nuevo es agregar una fila aquí.

export const DPI = 300;
export const MM_PER_INCH = 25.4;

// id 'frank' se mantiene solo como identificador interno (histórico) —
// no aparece en ningún lugar visible para el usuario.
//
// finishedMm/cutMm/safeZoneMm CORREGIDOS el 2026-08-10 (segunda vez el
// mismo día): la primera medición (finishedMm:85/cutMm:105/safeZoneMm:73,
// con calibrador contra el molde) quedó reemplazada por esta, medida
// directamente con regla de acero contra el pin y el corte reales —
// finishedMm:60/cutMm:70/safeZoneMm:60. A diferencia de la primera
// corrección, safeZoneMm aquí NO sigue el patrón finished-12mm de los
// demás tamaños (que daría 48) — es 60, IGUAL al finishedMm, medido
// directo, no derivado. No "corregir" esto de vuelta a una fórmula: la
// fórmula es precisamente lo que ya falló una vez en este tamaño. El
// sangrado (cutMm-finishedMm) también es distinto al de los otros 4
// tamaños: 10mm aquí, no los ~14mm de la regla genérica.
export const PIN_SIZES = [
  { id: 'frank', label: 'Default', finishedMm: 60, cutMm: 70, safeZoneMm: 60 },
  { id: 'small', label: 'Small', finishedMm: 25, cutMm: 32, safeZoneMm: 20 },
  { id: 'medium', label: 'Medium', finishedMm: 32, cutMm: 41, safeZoneMm: 26 },
  { id: 'large', label: 'Large', finishedMm: 58, cutMm: 70, safeZoneMm: 48 },
  { id: 'xl', label: 'XL', finishedMm: 75, cutMm: 89, safeZoneMm: 62 },
];

export const SHEET_SIZES = [
  { id: 'letter', label: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
];

// Mínimos de cuadrícula. El margen se bajó de 8mm (valor original del SPEC)
// a 6mm el 2026-08-10: con 8mm, el tamaño default (85mm cut en ese
// momento) en Carta solo daba 2x2=4 pines, no los 2x3=6 que el SPEC
// describía como ejemplo. Ese mismo día el cut real del tamaño default
// pasó por DOS correcciones más: primero a 105mm (medido con calibrador
// contra el molde — con eso solo cabían 1x2=2 en Carta/A4), y después a
// 70mm (medido con regla de acero contra el pin y el corte reales — ver
// PIN_SIZES). Con 70mm y margen de 6mm vuelve a dar 2x3=6 en Carta/A4,
// como en el ejemplo original del SPEC — coincidencia con el número,
// no con la razón: ahora es porque así mide físicamente este molde, no
// porque se haya vuelto a la suposición original. Si esto vuelve a
// moverse, revisar de nuevo contra la tabla de PIN_SIZES x SHEET_SIZES.
export const GRID_MIN_MARGIN_MM = 6;
export const GRID_MIN_GAP_MM = 6;

// Categorías de producto (SPEC sección 4). Pin es la única con producto
// físico real detrás (zona segura, anillo de doblez, cruz de centro) —
// sticker y etiqueta son corte directo, sin bleed. Los rangos de tamaño
// son una propuesta inicial, no medidos contra una hoja de etiquetas
// real todavía; ajustar aquí si no calzan en la práctica.
export const PRODUCT_CATEGORIES = {
  pin: {
    id: 'pin',
    shapes: ['circle'],
    hasBleed: true, // zona segura + anillo de doblez + cruz de centro
  },
  sticker: {
    id: 'sticker',
    shapes: ['circle', 'square', 'rounded-square'],
    hasBleed: false,
    sizeRangeMm: { min: 20, max: 100 },
  },
  label: {
    id: 'label',
    shapes: ['rectangle'],
    hasBleed: false,
    widthRangeMm: { min: 25, max: 120 },
    heightRangeMm: { min: 15, max: 80 },
  },
};

export const ROUNDED_SQUARE_CORNER_RATIO = 0.15;
