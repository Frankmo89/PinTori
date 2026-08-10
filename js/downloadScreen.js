// Pantalla de descarga: aparece después de generar el PDF o el PNG, con
// las instrucciones de impresión del SPEC (4.7), cortas y sin jerga.

import { t } from './i18n.js';

let backdrop = null;
let returnFocusTarget = null;
let escapeHandler = null;

export function closeDownloadScreen() {
  if (backdrop) {
    backdrop.remove();
    backdrop = null;
  }
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
  if (returnFocusTarget) {
    returnFocusTarget.focus();
    returnFocusTarget = null;
  }
}

export function showDownloadScreen(triggerEl) {
  closeDownloadScreen();
  returnFocusTarget = triggerEl || null;

  backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'download-modal-title');
  modal.tabIndex = -1;

  const title = document.createElement('h2');
  title.id = 'download-modal-title';
  title.textContent = t('downloadTitle');

  const list = document.createElement('ul');
  list.className = 'modal-tips';
  [t('tipScale'), t('tipRuler'), t('tipPaper'), t('tipCut')].forEach((tip) => {
    const li = document.createElement('li');
    li.textContent = tip;
    list.appendChild(li);
  });

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn-generate';
  closeBtn.textContent = t('close');
  closeBtn.addEventListener('click', closeDownloadScreen);

  modal.append(title, list, closeBtn);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeDownloadScreen();
  });

  escapeHandler = (e) => {
    if (e.key === 'Escape') closeDownloadScreen();
  };
  document.addEventListener('keydown', escapeHandler);

  modal.focus();
}
