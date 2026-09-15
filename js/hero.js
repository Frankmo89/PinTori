// Landing: hide editor until Empezar or demo. Demo loads assets/demo-face.jpg
// into the first empty slot via the same photoLoader pipeline as the panel.

import { getSlot, setSlot, getState, getDefaultSlotType, getSlotType } from './state.js';
import { computeDefaultSlotCount, resolveSlotSpec, specToBox } from './geometry.js';
import { DPI } from './constants.js';
import { loadImageFromFile } from './editor/photoLoader.js';
import { refreshSlotGrid } from './editor/slotGrid.js';
import { applyStaticStrings } from './i18n.js';

const HERO_SEEN_KEY = 'pintori-hero-seen';

function showEditor() {
  const hero = document.getElementById('hero');
  const editor = document.getElementById('app-editor');
  if (hero) hero.hidden = true;
  if (editor) {
    editor.hidden = false;
    editor.removeAttribute('hidden');
  }
  try {
    sessionStorage.setItem(HERO_SEEN_KEY, '1');
  } catch (_) {
    /* ignore */
  }
}

function firstEmptySlotIndex() {
  const { sheetId } = getState();
  const count = computeDefaultSlotCount({ slotType: getDefaultSlotType(), sheetId });
  for (let i = 0; i < count; i++) {
    const slot = getSlot(i);
    if (slot.type === 'empty' && !slot.text?.value) return i;
  }
  return 0;
}

function printBoxForIndex(index) {
  const spec = resolveSlotSpec(getSlotType(index));
  return specToBox(spec, 0, 0, DPI);
}

async function loadDemoIntoFirstEmpty() {
  const index = firstEmptySlotIndex();
  const box = printBoxForIndex(index);
  const res = await fetch('assets/demo-face.jpg');
  if (!res.ok) throw new Error('demo fetch failed');
  const blob = await res.blob();
  const file = new File([blob], 'demo-face.jpg', { type: 'image/jpeg' });
  const { photo, error } = await loadImageFromFile(file, {
    cutWidthPx: box.cutWidthPx,
    cutHeightPx: box.cutHeightPx,
  });
  if (error || !photo) throw new Error(error || 'demo load failed');
  // Illustration may not trip face-api — if offsets stayed at 0, nudge
  // slightly upward so the drawn face sits in a sensible "portrait" crop.
  if (!photo.offsetXFrac && !photo.offsetYFrac) {
    photo.offsetYFrac = 0.04;
  }
  setSlot(index, { type: 'photo', photo });
  return index;
}

export function initHero({ onEditorShown } = {}) {
  const hero = document.getElementById('hero');
  const editor = document.getElementById('app-editor');
  const startBtn = document.getElementById('hero-start-btn');
  const demoBtn = document.getElementById('hero-demo-btn');

  let seen = false;
  try {
    seen = sessionStorage.getItem(HERO_SEEN_KEY) === '1';
  } catch (_) {
    seen = false;
  }

  // If the user already entered this session, skip hero (keeps refresh in editor).
  if (seen && editor) {
    if (hero) hero.hidden = true;
    editor.hidden = false;
    onEditorShown?.();
  } else {
    if (hero) hero.hidden = false;
    if (editor) editor.hidden = true;
  }

  function enterEditor() {
    showEditor();
    onEditorShown?.();
    applyStaticStrings();
  }

  startBtn?.addEventListener('click', () => {
    enterEditor();
  });

  demoBtn?.addEventListener('click', async () => {
    demoBtn.disabled = true;
    startBtn && (startBtn.disabled = true);
    try {
      enterEditor();
      // Let the grid paint once before loading the demo bitmap.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await loadDemoIntoFirstEmpty();
      refreshSlotGrid();
    } catch (err) {
      console.warn('[PinTori] demo photo failed', err);
    } finally {
      demoBtn.disabled = false;
      startBtn && (startBtn.disabled = false);
    }
  });
}
