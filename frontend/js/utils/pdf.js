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

// Indian-format amount in words (e.g. "One Thousand Two Hundred Fifty")
function numberToWordsIN(n) {
  n = Math.round(n);
  if (n === 0) return 'Zero';
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two = (x) => x < 20 ? a[x] : (b[Math.floor(x/10)] + (x%10 ? ' ' + a[x%10] : ''));
  const three = (x) => { const h = Math.floor(x/100), r = x%100; return (h ? a[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? two(r) : ''); };
  let res = '';
  const crore = Math.floor(n/10000000); n %= 10000000;
  const lakh = Math.floor(n/100000); n %= 100000;
  const thousand = Math.floor(n/1000); n %= 1000;
  if (crore)    res += two(crore) + ' Crore ';
  if (lakh)     res += two(lakh) + ' Lakh ';
  if (thousand) res += two(thousand) + ' Thousand ';
  if (n)        res += three(n);
  return res.trim();
}

export function printInvoice(sale) {
  const settings = getSettings();
  const cur = settings.currency || '₹';
  const totalQty = sale.items.reduce((s, i) => s + i.qty, 0);
  const rows = sale.items.map((item, idx) => `
    <tr>
      <td class="c">${idx + 1}</td>
      <td>${item.name}</td>
      <td class="c">${item.qty}</td>
      <td class="r">${cur}${Number(item.price).toFixed(2)}</td>
      <td class="r">${cur}${(item.price * item.qty).toFixed(2)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html><head><title>Invoice ${sale.invoiceNo}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:18px;max-width:380px;margin:0 auto;}
  .head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:8px;}
  .shop-name{font-size:19px;font-weight:800;letter-spacing:.5px;}
  .shop-info{font-size:10.5px;color:#555;margin-top:2px;}
  .title{text-align:center;font-weight:700;font-size:12px;letter-spacing:2px;background:#111;color:#fff;padding:3px;border-radius:3px;margin:8px 0;}
  .meta{display:flex;justify-content:space-between;font-size:10.5px;color:#333;margin:2px 0;}
  .meta b{color:#111;}
  table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11px;}
  thead th{background:#f0f0f0;border-bottom:1.5px solid #999;padding:5px 4px;text-align:left;font-size:10px;text-transform:uppercase;}
  td{padding:5px 4px;border-bottom:1px dashed #ccc;}
  td.c,th.c{text-align:center;} td.r,th.r{text-align:right;}
  .totals{margin-top:6px;font-size:11.5px;}
  .totals .row{display:flex;justify-content:space-between;padding:2px 0;}
  .grand{display:flex;justify-content:space-between;font-size:16px;font-weight:800;border-top:2px solid #111;border-bottom:2px solid #111;padding:6px 0;margin-top:4px;}
  .words{font-size:10.5px;font-style:italic;color:#444;margin-top:6px;}
  .pay{font-size:11px;margin-top:8px;}
  .footer{text-align:center;font-size:10px;color:#666;margin-top:12px;border-top:1px dashed #999;padding-top:8px;}
  @media print { body { max-width:none; padding:8px; } }
</style>
</head><body>
  <div class="head">
    <div class="shop-name">${settings.shopName}</div>
    ${settings.address ? `<div class="shop-info">${settings.address}</div>` : ''}
    <div class="shop-info">${settings.phone ? 'Ph: ' + settings.phone : ''}${settings.gstin ? ' &nbsp;|&nbsp; GSTIN: ' + settings.gstin : ''}</div>
  </div>
  <div class="title">TAX INVOICE</div>
  <div class="meta"><span>Invoice: <b>${sale.invoiceNo}</b></span><span>${formatDateTime(sale.createdAt)}</span></div>
  ${sale.customerName ? `<div class="meta"><span>Customer: <b>${sale.customerName}</b></span></div>` : ''}
  <table>
    <thead><tr><th class="c">#</th><th>Item</th><th class="c">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Total Items: ${sale.items.length} &nbsp; Qty: ${totalQty}</span><span></span></div>
    <div class="row"><span>Subtotal</span><span>${cur}${Number(sale.subtotal).toFixed(2)}</span></div>
    ${sale.discount > 0 ? `<div class="row"><span>Discount</span><span>- ${cur}${Number(sale.discount).toFixed(2)}</span></div>` : ''}
    ${sale.tax > 0 ? `<div class="row"><span>GST / Tax</span><span>${cur}${Number(sale.tax).toFixed(2)}</span></div>` : ''}
  </div>
  <div class="grand"><span>GRAND TOTAL</span><span>${cur}${Number(sale.total).toFixed(2)}</span></div>
  <div class="words">Amount in words: ${numberToWordsIN(sale.total)} Rupees Only</div>
  <div class="pay"><b>Payment:</b> ${sale.paymentMethod || 'Cash'}</div>
  <div class="footer">Thank you for shopping with us! Visit again 🙏<br><span style="font-size:8px;">Powered by SmartBill POS</span></div>
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
