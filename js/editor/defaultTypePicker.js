// Picker de arriba: fija la categoría/forma/tamaño DEFAULT de toda la
// hoja (chips, no <select>, para que se vea y se toque como el resto de
// la app). Cada slot puede todavía tener su propio override individual
// (pestaña "Tipo" en el panel del slot) — este picker solo cambia lo
// que aplica a los slots que NO tienen override.

import { getDefaultSlotType, setDefaultSlotType } from '../state.js';
import { buildTypeSelector } from './typeSelector.js';

export function buildDefaultTypePicker(container, onChange) {
  container.innerHTML = '';
  const selector = buildTypeSelector({
    getValue: getDefaultSlotType,
    onChange: (next) => {
      setDefaultSlotType(next);
      selector.refresh();
      onChange();
    },
  });
  container.appendChild(selector.element);
}
