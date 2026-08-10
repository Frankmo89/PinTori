// UI compartida para elegir categoría de producto (Pin/Sticker/Etiqueta)
// + forma + tamaño. La usan tanto el picker de arriba (fija el default
// de toda la hoja) como la pestaña "Tipo" de cada slot (override
// individual) — es la misma lógica en los dos lugares, solo cambia a
// dónde se guarda el resultado.

import { PIN_SIZES, PRODUCT_CATEGORIES } from '../constants.js';
import { t } from '../i18n.js';

const STICKER_SHAPES = ['circle', 'square', 'rounded-square'];
const STICKER_SHAPE_LABEL_KEYS = {
  circle: 'shapeCircle',
  square: 'shapeSquare',
  'rounded-square': 'shapeRoundedSquare',
};
const CATEGORIES = [
  { id: 'pin', labelKey: 'categoryPin' },
  { id: 'sticker', labelKey: 'categorySticker' },
  { id: 'label', labelKey: 'categoryLabel' },
];

function buildRangeRow(labelText, min, max, initialValue, onCommit) {
  const row = document.createElement('label');
  row.className = 'panel-row range-row';
  const span = document.createElement('span');
  span.textContent = `${labelText}: ${initialValue}mm`;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.value = String(initialValue);
  // 'input' solo actualiza la etiqueta mientras se arrastra — cambiar el
  // tipo de verdad puede reconstruir todo el grid (el tamaño del slot
  // cambió), y hacer eso en cada pixel de arrastre sería un desastre.
  // 'change' recién dispara al soltar.
  input.addEventListener('input', () => {
    span.textContent = `${labelText}: ${input.value}mm`;
  });
  input.addEventListener('change', () => onCommit(Number(input.value)));
  row.append(span, input);
  return row;
}

// Valor inicial razonable al cambiar de categoría — conserva forma/
// tamaño previos si el usuario ya había pasado por esa categoría antes
// (ida y vuelta entre Pin/Sticker no debería resetear el tamaño cada vez).
export function defaultTypeFor(categoryId, previous) {
  if (categoryId === 'pin') {
    return { category: 'pin', shape: 'circle', pinId: previous?.category === 'pin' ? previous.pinId : 'frank', sizeMm: null, sizeMm2: null };
  }
  if (categoryId === 'sticker') {
    const { min, max } = PRODUCT_CATEGORIES.sticker.sizeRangeMm;
    return {
      category: 'sticker',
      shape: previous?.category === 'sticker' ? previous.shape : 'circle',
      pinId: null,
      sizeMm: previous?.category === 'sticker' ? previous.sizeMm : Math.round((min + max) / 2),
      sizeMm2: null,
    };
  }
  return {
    category: 'label',
    shape: 'rectangle',
    pinId: null,
    sizeMm: previous?.category === 'label' ? previous.sizeMm : 70,
    sizeMm2: previous?.category === 'label' ? previous.sizeMm2 : 40,
  };
}

// getValue() debe devolver el slotType actual; onChange(next) se llama
// con el slotType propuesto — quien use esto decide dónde guardarlo.
export function buildTypeSelector({ getValue, onChange }) {
  const container = document.createElement('div');
  container.className = 'type-selector';

  const categoryRow = document.createElement('div');
  categoryRow.className = 'panel-row type-category-row';
  const categoryButtons = {};
  CATEGORIES.forEach(({ id, labelKey }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'type-category-btn';
    btn.textContent = t(labelKey);
    btn.addEventListener('click', () => {
      const current = getValue();
      if (id === current.category) return;
      onChange(defaultTypeFor(id, current));
    });
    categoryRow.appendChild(btn);
    categoryButtons[id] = btn;
  });

  const optionsEl = document.createElement('div');

  function render() {
    const current = getValue();
    CATEGORIES.forEach(({ id }) => categoryButtons[id].classList.toggle('is-active', id === current.category));
    optionsEl.innerHTML = '';

    if (current.category === 'pin') {
      const row = document.createElement('div');
      row.className = 'panel-row emoji-row';
      PIN_SIZES.forEach((pin) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pin-size-chip';
        btn.textContent = `${pin.label} · ${pin.finishedMm}mm`;
        if (pin.id === current.pinId) btn.classList.add('is-active');
        btn.addEventListener('click', () => onChange({ ...current, category: 'pin', shape: 'circle', pinId: pin.id }));
        row.appendChild(btn);
      });
      optionsEl.appendChild(row);
    } else if (current.category === 'sticker') {
      const shapeRow = document.createElement('div');
      shapeRow.className = 'panel-row emoji-row';
      STICKER_SHAPES.forEach((shape) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pin-size-chip';
        btn.textContent = t(STICKER_SHAPE_LABEL_KEYS[shape]);
        if (shape === current.shape) btn.classList.add('is-active');
        btn.addEventListener('click', () => onChange({ ...current, category: 'sticker', shape }));
        shapeRow.appendChild(btn);
      });
      optionsEl.appendChild(shapeRow);

      const { min, max } = PRODUCT_CATEGORIES.sticker.sizeRangeMm;
      optionsEl.appendChild(
        buildRangeRow(t('size'), min, max, current.sizeMm ?? Math.round((min + max) / 2), (value) =>
          onChange({ ...current, category: 'sticker', sizeMm: value })
        )
      );
    } else {
      const { min: wMin, max: wMax } = PRODUCT_CATEGORIES.label.widthRangeMm;
      const { min: hMin, max: hMax } = PRODUCT_CATEGORIES.label.heightRangeMm;
      optionsEl.appendChild(
        buildRangeRow(t('width'), wMin, wMax, current.sizeMm ?? 70, (value) =>
          onChange({ ...current, category: 'label', shape: 'rectangle', sizeMm: value })
        )
      );
      optionsEl.appendChild(
        buildRangeRow(t('height'), hMin, hMax, current.sizeMm2 ?? 40, (value) =>
          onChange({ ...current, category: 'label', shape: 'rectangle', sizeMm2: value })
        )
      );
    }
  }

  render();
  container.append(categoryRow, optionsEl);
  return { element: container, refresh: render };
}
