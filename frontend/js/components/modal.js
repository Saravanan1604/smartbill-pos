// ===== Modal Component =====

export function createModal({ id, title, body, footer = '', size = '', onClose }) {
  removeModal(id);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = `modal-overlay-${id}`;

  overlay.innerHTML = `
    <div class="modal ${size ? 'modal-' + size : ''}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="btn btn-ghost btn-icon" id="modal-close-${id}">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const closeBtn = document.getElementById(`modal-close-${id}`);
  closeBtn?.addEventListener('click', () => closeModal(id, onClose));

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(id, onClose);
  });

  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { closeModal(id, onClose); document.removeEventListener('keydown', esc); }
  });

  return overlay;
}

export function closeModal(id, onClose) {
  const overlay = document.getElementById(`modal-overlay-${id}`);
  if (!overlay) return;
  overlay.classList.remove('show');
  setTimeout(() => { overlay.remove(); onClose?.(); }, 250);
}

export function removeModal(id) {
  document.getElementById(`modal-overlay-${id}`)?.remove();
}

export function confirmDialog(message, title = 'Confirm') {
  return new Promise(resolve => {
    createModal({
      id: 'confirm',
      title,
      body: `<p style="color:var(--text-secondary);font-size:.9rem;">${message}</p>`,
      footer: `
        <button class="btn btn-secondary" id="confirm-no">Cancel</button>
        <button class="btn btn-danger" id="confirm-yes">Confirm</button>
      `,
    });
    document.getElementById('confirm-yes')?.addEventListener('click', () => { closeModal('confirm'); resolve(true); });
    document.getElementById('confirm-no')?.addEventListener('click', () => { closeModal('confirm'); resolve(false); });
  });
}

// Global helper for inline onclick attributes
window._closeModal = (id) => closeModal(id);
