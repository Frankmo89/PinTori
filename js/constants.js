// Tablas del SPEC (sección 3). Ningún tamaño va hardcodeado en geometry.js —
// agregar un tamaño nuevo es agregar una fila aquí.

export const DPI = 300;
export const MM_PER_INCH = 25.4;

export const PIN_SIZES = [
  { id: 'small', label: 'Small', finishedMm: 25, cutMm: 32, safeZoneMm: 20 },
  { id: 'medium', label: 'Medium', finishedMm: 32, cutMm: 41, safeZoneMm: 26 },
  { id: 'large', label: 'Large', finishedMm: 58, cutMm: 70, safeZoneMm: 48 },
  { id: 'xl', label: 'XL', finishedMm: 75, cutMm: 89, safeZoneMm: 62 },
  { id: 'frank', label: "Frank's machine", finishedMm: 70, cutMm: 85, safeZoneMm: 58 },
];

export const SHEET_SIZES = [
  { id: 'letter', label: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
];

// Mínimos de cuadrícula. El margen se bajó de 8mm (valor original del SPEC)
// a 6mm el 2026-08-10: con 8mm, Frank's machine (85mm cut) en Carta solo
// da 2x2=4 pines, no los 2x3=6 que el SPEC describe como ejemplo. Ver
// DESIGN.md / historial de chat para el cálculo completo. Si esto vuelve
// a moverse, revisar de nuevo contra la tabla de PIN_SIZES x SHEET_SIZES.
export const GRID_MIN_MARGIN_MM = 6;
export const GRID_MIN_GAP_MM = 6;
