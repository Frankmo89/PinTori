// Estado central del editor. Sin framework: un objeto simple con funciones
// de acceso. El grid (columnas/filas/posiciones) NO vive aquí — se deriva
// siempre de geometry.js a partir de sheetId+defaultSlotType, así nunca se
// desincroniza de los slots reales.
//
// `defaultSlotType` es la categoría/forma/tamaño que aplica a todo slot
// que no tenga su propio override — lo que fija el picker de arriba.
// Cada slot puede tener su propio `slotTypeOverride` (Pin/Sticker/
// Etiqueta con su forma y tamaño), independiente del default — así
// conviven distintos tipos en la misma hoja.

const state = {
  sheetId: 'letter',
  defaultSlotType: { category: 'pin', shape: 'circle', pinId: 'frank', sizeMm: null, sizeMm2: null },
  slots: {},
  activeIndex: null,
};

function emptySlot() {
  return { type: 'empty', slotTypeOverride: null };
}

export function getState() {
  return state;
}

export function getSlot(index) {
  return state.slots[index] || emptySlot();
}

// Suscripción mínima: persistence.js necesita enterarse de cada cambio
// para guardar, sin que state.js tenga que saber nada de cómo se
// guarda. Un Set de funciones es toda la infraestructura que hace falta
// para un solo suscriptor real.
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function setSlot(index, data) {
  const current = getSlot(index);
  state.slots[index] = { ...current, ...data };
  notify();
  return state.slots[index];
}

export function clearSlot(index) {
  const current = getSlot(index);
  // Quitar contenido no debe quitar el tipo (Pin/Sticker/Etiqueta) que
  // el usuario ya eligió para ese slot — son dos cosas independientes.
  state.slots[index] = { ...emptySlot(), slotTypeOverride: current.slotTypeOverride };
  notify();
  return state.slots[index];
}

export function setActiveIndex(index) {
  state.activeIndex = index;
}

// Copia el contenido del slot `index` a cada índice de `targetIndexes`.
// El tipo (forma/tamaño) de cada slot destino NO se toca — repetir una
// foto no debe convertir un sticker en un pin. Base común de "Llenar
// todos" (Prompt 6) y "Repetir en..." (Prompt 16) — mismo copiado,
// distinta lista de destinos.
export function repeatFromInto(index, targetIndexes) {
  const source = getSlot(index);
  if (source.type === 'empty' && !source.text?.value) return;
  const { slotTypeOverride, ...content } = source;
  for (const i of targetIndexes) {
    if (i === index) continue;
    const existing = getSlot(i);
    state.slots[i] = { ...content, slotTypeOverride: existing.slotTypeOverride };
  }
  notify();
}

// "Llenar todos con este diseño": repetir el slot `index` en todos los
// demás slots de la hoja.
export function fillAllFrom(index, totalCount) {
  repeatFromInto(index, Array.from({ length: totalCount }, (_, i) => i));
}

export function getDefaultSlotType() {
  return state.defaultSlotType;
}

export function setDefaultSlotType(slotType) {
  state.defaultSlotType = slotType;
  notify();
}

// El tipo efectivo de un slot: su propio override, o el default global
// si nunca se cambió. Todo el código de render/empaquetado llama a
// esta función en vez de leer slot.slotTypeOverride directo, para que
// la regla "sin override = usa el default" viva en un solo lugar.
export function getSlotType(index) {
  const slot = getSlot(index);
  return slot.slotTypeOverride || state.defaultSlotType;
}

// null limpia el override — el slot vuelve a seguir al default global.
export function setSlotTypeOverride(index, slotType) {
  setSlot(index, { slotTypeOverride: slotType });
}
