// Tablas del SPEC (sección 3). Ningún tamaño va hardcodeado en geometry.js —
// agregar un tamaño nuevo es agregar una fila aquí.

export const DPI = 300;
export const MM_PER_INCH = 25.4;

// id 'frank' se mantiene solo como identificador interno (histórico) —
// no aparece en ningún lugar visible para el usuario. finishedMm/cutMm
// medidos el 2026-08-10 directamente del molde físico de esta máquina
// con calibrador, NO con la fórmula finished+14mm (regla que sí aplica
// a los otros 4 tamaños): el sangrado real de esta máquina es 20mm
// (105-85), no 14mm. safeZoneMm sigue el patrón finished-12mm de los
// demás tamaños (margen ~6mm por lado) a falta de una medida física del
// anillo de doblez — es una guía visual en el editor, no afecta el corte,
// así que el riesgo de estar unos mm desviado aquí es bajo.
export const PIN_SIZES = [
  { id: 'frank', label: 'Default', finishedMm: 85, cutMm: 105, safeZoneMm: 73 },
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
// a 6mm el 2026-08-10: con 8mm, el tamaño default (entonces 85mm cut) en
// Carta solo daba 2x2=4 pines, no los 2x3=6 que el SPEC describía como
// ejemplo. Ese mismo día, más tarde, el cut real del tamaño default se
// corrigió a 105mm tras medir el molde físico — con el margen de 6mm ya
// solo caben 1x2=2 en Carta/A4 (ver PIN_SIZES arriba); el ajuste de
// margen sigue siendo válido para los otros 4 tamaños de la tabla. Si
// esto vuelve a moverse, revisar de nuevo contra la tabla de PIN_SIZES x
// SHEET_SIZES.
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
