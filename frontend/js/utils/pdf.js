// ===== PDF Invoice Generator =====
import DB from '../db.js';
import { formatDate, formatDateTime } from './format.js';

// Settings are loaded globally by the router (window.shopSettings); use that
// synchronously instead of DB.getSettings() which returns a Promise.
function getSettings() {
  return window.shopSettings || { shopName: 'SmartBill Store', currency: '₹', address: '', phone: '', gstin: '' };
}

export function generateInvoicePDF(sale) {
  const settings = getSettings();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' });

  const pw = 80;
  let y = 10;

  const center = (text, fontSize = 10) => {
    doc.setFontSize(fontSize);
    const w = doc.getTextWidth(text);
    doc.text(text, (pw - w) / 2, y);
    y += fontSize * 0.45 + 2;
  };

  const row = (left, right, fontSize = 9) => {
    doc.setFontSize(fontSize);
    doc.text(left, 5, y);
    const rw = doc.getTextWidth(right);
    doc.text(right, pw - rw - 5, y);
    y += fontSize * 0.45 + 2;
  };

  const line = () => {
    doc.setDrawColor(180);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(5, y, pw - 5, y);
    y += 4;
  };

  // Header
  doc.setFont('helvetica', 'bold');
  center(settings.shopName, 14);
  doc.setFont('helvetica', 'normal');
  if (settings.address) center(settings.address, 8);
  if (settings.phone) center('Tel: ' + settings.phone, 8);
  if (settings.gstin) center('GSTIN: ' + settings.gstin, 8);
  y += 2;
  line();

  doc.setFont('helvetica', 'bold');
  center('TAX INVOICE', 10);
  doc.setFont('helvetica', 'normal');
  y += 1;
  row('Invoice: ' + sale.invoiceNo, formatDate(sale.createdAt), 8);
  row('Date: ' + formatDateTime(sale.createdAt), '', 8);
  if (sale.customerName) row('Customer: ' + sale.customerName, '', 8);
  line();

  // Items
  doc.setFont('helvetica', 'bold');
  row('Item', 'Amount', 9);
  doc.setFont('helvetica', 'normal');
  y += 1;

  sale.items.forEach(item => {
    const name = item.name.length > 20 ? item.name.slice(0, 20) + '..' : item.name;
    doc.setFontSize(8);
    doc.text(name, 5, y);
    y += 4;
    const detail = `  ${item.qty} x ${settings.currency}${item.price}`;
    const amt = settings.currency + (item.price * item.qty).toFixed(2);
    doc.text(detail, 5, y);
    const aw = doc.getTextWidth(amt);
    doc.text(amt, pw - aw - 5, y);
    if (item.taxAmt && item.taxAmt > 0) {
      y += 3;
      doc.setTextColor(150);
      doc.text(`  Tax: ${settings.currency}${item.taxAmt.toFixed(2)}`, 5, y);
      doc.setTextColor(0);
    }
    y += 4;
  });

  line();
  doc.setFont('helvetica', 'normal');
  row('Subtotal', settings.currency + Number(sale.subtotal || 0).toFixed(2), 9);
  if (sale.tax > 0) row('Tax', settings.currency + Number(sale.tax).toFixed(2), 9);
  if (sale.discount > 0) row('Discount', '-' + settings.currency + Number(sale.discount).toFixed(2), 9);
  y += 1;
  line();
  doc.setFont('helvetica', 'bold');
  row('TOTAL', settings.currency + Number(sale.total).toFixed(2), 11);
  line();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  row('Payment:', sale.paymentMethod || 'Cash', 8);
  y += 3;
  center('Thank you for shopping!', 9);
  center('Visit again :)', 8);
  y += 2;
  line();
  doc.setFontSize(7);
  center('Powered by SmartBill POS', 7);

  doc.save(`Invoice-${sale.invoiceNo}.pdf`);
}

export function printInvoice(sale) {
  const settings = getSettings();
  const items = sale.items.map(item => `
    <div class="item-row">
      <div class="item-name">${item.name}</div>
      <div class="item-detail">
        <span>${item.qty} x ${settings.currency}${item.price}</span>
        <span>${settings.currency}${(item.price * item.qty).toFixed(2)}</span>
      </div>
      ${item.taxAmt > 0 ? `<div class="item-tax">Tax: ${settings.currency}${item.taxAmt.toFixed(2)}</div>` : ''}
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html><head><title>Invoice ${sale.invoiceNo}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Courier New',monospace;font-size:12px;padding:16px;background:#fff;color:#000;max-width:300px;margin:0 auto;}
  .shop-name{font-size:16px;font-weight:900;letter-spacing:2px;text-align:center;margin-bottom:4px;}
  .shop-info{font-size:10px;text-align:center;color:#555;}
  .divider{border:none;border-top:1px dashed #888;margin:8px 0;}
  .section-title{text-align:center;font-weight:bold;font-size:11px;margin:4px 0;}
  .meta-row{display:flex;justify-content:space-between;font-size:10px;margin:2px 0;}
  .item-row{margin:4px 0;}
  .item-name{font-size:11px;font-weight:600;}
  .item-detail{display:flex;justify-content:space-between;font-size:10px;color:#333;}
  .item-tax{font-size:9px;color:#777;padding-left:8px;}
  .summary-row{display:flex;justify-content:space-between;font-size:11px;margin:2px 0;}
  .total-row{display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin:4px 0;}
  .footer{text-align:center;font-size:10px;margin-top:8px;color:#555;}
  @media print { body { max-width:none; } }
</style>
</head><body>
<div class="shop-name">${settings.shopName}</div>
<div class="shop-info">${settings.address || ''}</div>
${settings.phone ? `<div class="shop-info">Tel: ${settings.phone}</div>` : ''}
${settings.gstin ? `<div class="shop-info">GSTIN: ${settings.gstin}</div>` : ''}
<hr class="divider">
<div class="section-title">TAX INVOICE</div>
<div class="meta-row"><span>${sale.invoiceNo}</span><span>${formatDateTime(sale.createdAt)}</span></div>
${sale.customerName ? `<div class="meta-row"><span>Customer:</span><span>${sale.customerName}</span></div>` : ''}
<hr class="divider">
${items}
<hr class="divider">
<div class="summary-row"><span>Subtotal</span><span>${settings.currency}${Number(sale.subtotal).toFixed(2)}</span></div>
${sale.tax > 0 ? `<div class="summary-row"><span>Tax</span><span>${settings.currency}${Number(sale.tax).toFixed(2)}</span></div>` : ''}
${sale.discount > 0 ? `<div class="summary-row"><span>Discount</span><span>-${settings.currency}${Number(sale.discount).toFixed(2)}</span></div>` : ''}
<hr class="divider">
<div class="total-row"><span>TOTAL</span><span>${settings.currency}${Number(sale.total).toFixed(2)}</span></div>
<hr class="divider">
<div class="summary-row"><span>Payment</span><span>${sale.paymentMethod || 'Cash'}</span></div>
<div class="footer"><p>Thank you for shopping!</p><p>Visit again :)</p><br><p style="font-size:8px;">Powered by SmartBill POS</p></div>
</body></html>`;

  // Use a hidden iframe so printing works on mobile (popups are blocked there).
  const existing = document.getElementById('sb-print-frame');
  if (existing) existing.remove();
  const iframe = document.createElement('iframe');
  iframe.id = 'sb-print-frame';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  iframe.srcdoc = html;
  iframe.onload = () => {
    try {
      const w = iframe.contentWindow;
      w.focus();
      w.print();
    } catch (e) {
      console.warn('Print failed, opening in new tab instead', e);
      const tab = window.open('', '_blank');
      if (tab) { tab.document.write(html); tab.document.close(); }
    }
    // Clean up after the print dialog is handled
    setTimeout(() => iframe.remove(), 2000);
  };
  document.body.appendChild(iframe);
}

export function shareWhatsApp(sale, phone) {
  const settings = getSettings();
  const lines = sale.items.map(i => `${i.name} x${i.qty} = ${settings.currency}${(i.price*i.qty).toFixed(2)}`).join('\n');
  const msg = `*${settings.shopName}*\n*Invoice: ${sale.invoiceNo}*\n\n${lines}\n\n*Total: ${settings.currency}${sale.total.toFixed(2)}*\nPayment: ${sale.paymentMethod}\n\n_Thank you for shopping!_`;
  const url = `https://wa.me/${phone ? phone.replace(/\D/g,'') : ''}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}
