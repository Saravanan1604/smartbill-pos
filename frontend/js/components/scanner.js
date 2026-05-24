// ===== QR / Barcode Scanner Component =====
import { createModal, closeModal } from './modal.js';
import toast from './toast.js';

let html5QrCode = null;

// openScanner(onScan, options)
//   options.continuous : keep the camera open and keep scanning (good for
//                        scan-to-deduct stock). Default false (scan once, close).
//   options.title      : modal title override.
export function openScanner(onScan, options = {}) {
  const { continuous = false, title = '📷 Scan QR / Barcode' } = options;

  createModal({
    id: 'scanner',
    title,
    size: '',
    body: `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <p style="color:var(--text-muted);font-size:.85rem;">${continuous ? 'Show each product\'s barcode to the camera — stock is deducted automatically.' : 'Point camera at product QR code or barcode'}</p>
        <div class="scanner-wrapper" id="scanner-box" style="min-height:300px;">
          <div id="scanner-status" class="scanner-status">
            <div class="scanner-status-icon">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p>Starting camera...</p>
          </div>
          <div class="scanner-overlay-border">
            <div class="scanner-corner tl"></div>
            <div class="scanner-corner tr"></div>
            <div class="scanner-corner bl"></div>
            <div class="scanner-corner br"></div>
            <div class="scanner-scan-line"></div>
          </div>
        </div>
        ${continuous ? `<div id="scanner-log" style="display:flex;flex-direction:column;gap:4px;max-height:120px;overflow-y:auto;font-size:.8rem;"></div>` : ''}
        <div style="display:flex;flex-direction:column;gap:8px;">
          <p style="font-size:.8rem;color:var(--text-muted);text-align:center;">— or enter barcode manually —</p>
          <div class="input-group">
            <input type="text" id="manual-barcode" class="form-input" placeholder="Enter barcode / QR code..." autofocus>
            <button class="btn btn-primary" id="manual-scan-btn">${continuous ? 'Deduct' : 'Add'}</button>
          </div>
        </div>
        ${continuous ? `<button class="btn btn-secondary" id="scanner-done-btn" style="width:100%;">✓ Done</button>` : ''}
      </div>
    `,
    onClose: stopScanner
  });

  setTimeout(() => startScanner(onScan, continuous), 300);

  document.getElementById('manual-scan-btn')?.addEventListener('click', () => {
    const input = document.getElementById('manual-barcode');
    const val = input?.value?.trim();
    if (!val) { toast.warning('Please enter a barcode'); return; }
    if (continuous) {
      onScan(val);
      if (input) { input.value = ''; input.focus(); }
    } else {
      onScan(val);
      closeModal('scanner');
    }
  });

  document.getElementById('manual-barcode')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('manual-scan-btn')?.click();
  });

  document.getElementById('scanner-done-btn')?.addEventListener('click', () => closeModal('scanner'));
}

function startScanner(onScan, continuous = false) {
  const box = document.getElementById('scanner-box');
  if (!box || !window.Html5Qrcode) {
    document.getElementById('scanner-status')?.querySelector('p')?.setText?.('Camera not available. Use manual entry.');
    return;
  }

  try {
    html5QrCode = new window.Html5Qrcode('scanner-box');
    html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 180 }, aspectRatio: 1.2 },
      (decodedText) => {
        if (continuous) {
          // Keep scanning: pause briefly to avoid duplicate reads of the same code
          try { html5QrCode.pause(true); } catch {}
          onScan(decodedText);
          setTimeout(() => { try { html5QrCode?.resume(); } catch {} }, 1300);
        } else {
          stopScanner();
          onScan(decodedText);
          closeModal('scanner');
        }
      },
      (err) => {}
    ).catch(err => {
      console.warn('Scanner error:', err);
      const status = document.getElementById('scanner-status');
      if (status) status.innerHTML = `<div class="scanner-status-icon">⚠️</div><p style="color:var(--text-muted);text-align:center;">Camera not accessible.<br>Please use manual entry below.</p>`;
    });
  } catch (e) {
    console.warn('Html5Qrcode init error', e);
  }
}

function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().catch(() => {}).finally(() => {
      html5QrCode.clear();
      html5QrCode = null;
    });
  }
}
