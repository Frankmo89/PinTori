// Chips para elegir el tamaño de pin — no un <select>, para que se vea
// y se toque como el resto de la app. Cambiar de tamaño reconstruye el
// grid completo; el contenido de los slots sobrevive porque está
// guardado en fracciones del diámetro (ver state.js: setPinId).

import { PIN_SIZES } from '../constants.js';
import { getState, setPinId } from '../state.js';

export function buildPinSizePicker(container, onChange) {
  render();

  function render() {
    const { pinId } = getState();
    container.innerHTML = '';
    PIN_SIZES.forEach((pin) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pin-size-chip';
      chip.textContent = `${pin.label} · ${pin.finishedMm}mm`;
      chip.setAttribute('aria-pressed', String(pin.id === pinId));
      if (pin.id === pinId) chip.classList.add('is-active');
      chip.addEventListener('click', () => {
        if (pin.id === getState().pinId) return;
        setPinId(pin.id);
        render();
        onChange();
      });
      container.appendChild(chip);
    });
  }
}
