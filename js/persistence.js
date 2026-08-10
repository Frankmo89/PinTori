// Guarda el trabajo para que un refresh accidental no borre la hoja.
// Las fotos (pueden pesar varios MB cada una) van a IndexedDB; el resto
// del estado (texto, colores, posiciones, offsets) va a localStorage —
// localStorage tiene un cupo de unos 5-10MB y seis fotos de celular lo
// revientan fácil. Nada de esto sale del dispositivo.
//
// Si el navegador bloquea almacenamiento (modo privado, cuota llena),
// todo falla en silencio: persistir es una red de seguridad, no un
// requisito duro del flujo principal.

import { getState, setSlot } from './state.js';

const DB_NAME = 'pintori';
const DB_VERSION = 1;
const STORE_NAME = 'photos';
const STORAGE_KEY = 'pintori-state';
const DEBOUNCE_MS = 500;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putBlob(index, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, index);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getBlob(index) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(index);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

let debounceTimer = null;

// Arrastrar una foto dispara un setSlot por cada pointermove — sin
// debounce, eso serían decenas de escrituras a IndexedDB por segundo.
export function schedulePersist() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    persistNow().catch(() => {});
  }, DEBOUNCE_MS);
}

async function persistNow() {
  const { sheetId, defaultSlotType, slots } = getState();
  const lightSlots = {};

  for (const [index, slot] of Object.entries(slots)) {
    if (slot.type === 'photo' && slot.photo?.blob) {
      const { naturalW, naturalH, offsetXFrac, offsetYFrac, scale } = slot.photo;
      lightSlots[index] = {
        ...slot,
        photo: { naturalW, naturalH, offsetXFrac, offsetYFrac, scale, stored: true },
      };
      await putBlob(Number(index), slot.photo.blob);
    } else {
      lightSlots[index] = slot;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sheetId, defaultSlotType, slots: lightSlots }));
}

// Se llama una vez al arrancar, antes de construir el grid — el grid
// necesita el estado ya restaurado para pintar las fotos guardadas
// desde el primer render.
export async function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const state = getState();
    if (parsed.sheetId) state.sheetId = parsed.sheetId;
    if (parsed.defaultSlotType) state.defaultSlotType = parsed.defaultSlotType;

    for (const [indexStr, slot] of Object.entries(parsed.slots || {})) {
      const index = Number(indexStr);
      if (slot.type === 'photo' && slot.photo?.stored) {
        const blob = await getBlob(index);
        if (!blob) continue; // se perdió el blob (cuota, limpieza manual) — se descarta ese slot, no rompe el resto
        const image = await createImageBitmap(blob);
        setSlot(index, { type: 'photo', photo: { ...slot.photo, image, blob } });
      } else {
        setSlot(index, slot);
      }
    }
  } catch (err) {
    // Silencioso — ver nota arriba del archivo.
  }
}
