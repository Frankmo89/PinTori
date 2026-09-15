// Debug flag for ML/geometry overlay. Normal users never see it.
//
// Toggle:
//   ?debug=1  → enable (also writes sessionStorage pintori-debug=1)
//   ?debug=0  → disable (clears sessionStorage)
//   localStorage OR sessionStorage key "pintori-debug"="1" also enables
//   (localStorage survives tabs; sessionStorage is the URL-driven persist).
//
// Must not appear on the hero/demo path for normal users — only when
// explicitly enabled. Export/print paths never call the overlay.

const STORAGE_KEY = 'pintori-debug';

let cached = null;

function readStorageFlag() {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return true;
  } catch (_) {
    /* ignore */
  }
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') return true;
  } catch (_) {
    /* ignore */
  }
  return false;
}

function writeSession(on) {
  try {
    if (on) sessionStorage.setItem(STORAGE_KEY, '1');
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    /* ignore */
  }
}

/** Call once at boot (main.js). Parses URL and syncs sessionStorage. */
export function initDebugFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('debug')) {
      const v = params.get('debug');
      const on = v === '1' || v === 'true';
      writeSession(on);
      cached = on;
      return on;
    }
  } catch (_) {
    /* ignore */
  }
  cached = readStorageFlag();
  return cached;
}

export function isDebugEnabled() {
  if (cached !== null) return cached;
  cached = readStorageFlag();
  return cached;
}
