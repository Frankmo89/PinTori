// Estado central del editor. Sin framework: un objeto simple con funciones
// de acceso. El grid (columnas/filas/posiciones) NO vive aquí — se deriva
// siempre de geometry.js a partir de sheetId+pinId, así nunca se
// desincroniza de los slots reales.

const state = {
  sheetId: 'letter',
  pinId: 'frank',
  slots: {},
  activeIndex: null,
};

function emptySlot() {
  return { type: 'empty' };
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
  state.slots[index] = emptySlot();
  notify();
  return state.slots[index];
}

export function setActiveIndex(index) {
  state.activeIndex = index;
}

// Cambiar de tamaño de pin no toca el contenido de los slots — los
// offsets/escala de cada foto están guardados como fracción del
// diámetro de corte (ver render.js), así que siguen siendo válidos sin
// importar qué tan grande sea el círculo nuevo. Si el grid nuevo tiene
// menos celdas que antes, los slots de más simplemente no se muestran
// hasta que se vuelva a un tamaño con más espacio — no se pierden.
export function setPinId(pinId) {
  state.pinId = pinId;
  notify();
}

// "Llenar todos con este diseño": copia el contenido del slot `index` a
// todos los demás. Las fotos comparten el mismo ImageBitmap por
// referencia — es de solo lectura para dibujar, no hay razón para
// clonarlo.
export function fillAllFrom(index, totalCount) {
  const source = getSlot(index);
  if (source.type === 'empty' && !source.text?.value) return;
  for (let i = 0; i < totalCount; i++) {
    if (i === index) continue;
    state.slots[i] = { ...source };
  }
  notify();
}
