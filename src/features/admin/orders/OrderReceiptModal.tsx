// ============================================================================
// ORDER RECEIPT MODAL - Printable receipt with QR barcode
// ============================================================================

import { QRCodeCanvas } from 'qrcode.react';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

const RECEIPT_SVC_LABELS: Record<string, string> = {
  'wash-fold': 'Wash & Fold', 'wash-iron': 'Wash & Iron',
  'iron-only': 'Iron Only',  'dry-clean': 'Dry Clean',
};

function buildReceiptGroup(item: any): string {
  const svcType = RECEIPT_SVC_LABELS[item.serviceType] ?? null;
  if (item.serviceName && svcType && item.serviceName !== svcType) return `${item.serviceName} — ${svcType}`;
  return item.serviceName || svcType || (item.serviceType && item.serviceType !== 'laundry' ? item.serviceType.replace(/-/g, ' ') : null) || 'Laundry';
}

export function OrderReceiptModal({ open, onOpenChange, order }: Props) {
  if (!order) return null;

  const isWalkIn = order.orderSource === 'offline';
  const customer = isWalkIn ? order.walkInCustomer : order.customer;
  const items: any[] = order.items || [];
  const pricing = order.pricing || {};
  const payment = order.payment || {};
  const qrValue = order.qrCode || order.orderNumber || '';
  const total = pricing.total ?? order.total ?? 0;
  const createdAt = order.createdAt
    ? format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')
    : '—';

  const handlePrint = () => {
    // Capture QR code as image before opening new window
    const canvas = document.getElementById('receipt-qr-canvas') as HTMLCanvasElement | null;
    const qrDataUrl = canvas?.toDataURL('image/png') ?? '';
    const printGroups = new Map<string, any[]>();
    items.forEach((item) => {
      const key = buildReceiptGroup(item);
      if (!printGroups.has(key)) printGroups.set(key, []);
      printGroups.get(key)!.push(item);
    });
    const itemsHtml = printGroups.size === 0
      ? '<tr><td colspan="2" style="padding:4px 0;color:#555">No items listed</td></tr>'
      : Array.from(printGroups.entries()).map(([grp, grpItems]) => `
          <tr>
            <td colspan="2" style="padding:5px 0 2px;font-weight:bold;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px dashed #999">
              ${grp}
            </td>
          </tr>
          ${grpItems.map((item) => `
            <tr>
              <td style="padding:2px 0 2px 8px">${item.itemType ?? '—'} × ${item.quantity ?? 1}</td>
              <td style="text-align:right;padding:2px 0">₦${((item.unitPrice ?? 0) * (item.quantity ?? 1)).toLocaleString()}</td>
            </tr>
          `).join('')}
        `).join('');

    const extraFees = [
      pricing.pickupFee > 0 ? `<div class="row"><span>Pickup Fee</span><span>₦${Number(pricing.pickupFee).toLocaleString()}</span></div>` : '',
      pricing.deliveryFee > 0 ? `<div class="row"><span>Delivery Fee</span><span>₦${Number(pricing.deliveryFee).toLocaleString()}</span></div>` : '',
      pricing.discount > 0 ? `<div class="row"><span>Discount</span><span>-₦${Number(pricing.discount).toLocaleString()}</span></div>` : '',
      pricing.tax > 0 ? `<div class="row"><span>Tax</span><span>₦${Number(pricing.tax).toLocaleString()}</span></div>` : '',
    ].filter(Boolean).join('');

    const win = window.open('', '_blank', 'width=420,height=780');
    if (!win) {
      alert('Please allow pop-ups to print receipts.');
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt — ${order.orderNumber ?? ''}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',Courier,monospace;font-size:12px;width:300px;margin:0 auto;padding:14px 8px;color:#000}
    .center{text-align:center}
    .company{font-size:20px;font-weight:bold;letter-spacing:2px}
    .tagline{font-size:10px;margin-top:3px;color:#444}
    hr{border:none;border-top:1px dashed #000;margin:8px 0}
    .row{display:flex;justify-content:space-between;margin:3px 0;font-size:11px}
    .total{font-size:14px;font-weight:bold;margin-top:5px;border-top:1px dashed #000;padding-top:5px}
    table{width:100%;border-collapse:collapse}
    th{font-size:10px;text-align:left;border-bottom:1px dashed #000;padding:3px 0}
    th.right,td.right{text-align:right}
    .status{display:inline-block;border:1px solid #000;padding:1px 6px;font-size:10px;font-weight:bold;text-transform:uppercase}
    .qr-box{text-align:center;margin:10px 0}
    .qr-label{font-size:9px;color:#555;margin-top:4px}
    .qr-code{font-size:8px;color:#777;margin-top:2px;font-family:monospace;word-break:break-all}
    .footer{text-align:center;font-size:9px;color:#444;line-height:1.7;margin-top:8px}
    @media print{@page{margin:0}body{padding:0}}
  </style>
</head>
<body>
  <div class="center">
    <div class="company">RELUX LAUNDRY</div>
    <div class="tagline">Professional Laundry Services</div>
  </div>
  <hr/>
  <div class="row"><span><b>Order #</b></span><span>${order.orderNumber ?? '—'}</span></div>
  <div class="row"><span>Date</span><span>${createdAt}</span></div>
  <div class="row"><span>Customer</span><span>${customer?.name ?? 'Walk-in'}</span></div>
  ${customer?.phone ? `<div class="row"><span>Phone</span><span>${customer.phone}</span></div>` : ''}
  ${customer?.email ? `<div class="row"><span>Email</span><span>${customer.email}</span></div>` : ''}
  <div class="row"><span>Status</span><span class="status">${order.status ?? 'pending'}</span></div>
  <div class="row"><span>Type</span><span>${isWalkIn ? 'Walk-in' : 'Online'}</span></div>
  <hr/>
  <table>
    <thead><tr><th>Item</th><th class="right">Amount</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <hr/>
  ${extraFees}
  <div class="row total"><span>TOTAL</span><span>₦${Number(total).toLocaleString()}</span></div>
  <div class="row"><span>Payment</span><span>${payment.method ?? 'cash'} · ${payment.status ?? 'pending'}</span></div>
  <hr/>
  <div class="qr-box">
    ${qrDataUrl ? `<img src="${qrDataUrl}" width="110" height="110" />` : ''}
    <div class="qr-label">Scan to confirm delivery</div>
    <div class="qr-code">${qrValue}</div>
  </div>
  <hr/>
  <div class="footer">
    <div>Thank you for choosing Relux Laundry!</div>
    <div>We appreciate your business.</div>
  </div>
</body>
</html>`);

    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Order Receipt</DialogTitle>
        </DialogHeader>

        {/* Receipt preview — always light-mode so print preview is legible */}
        <div className="bg-white text-gray-900 border border-gray-200 rounded-md p-4 font-mono text-[11px] space-y-3 max-h-[62vh] overflow-y-auto">
          {/* Company header */}
          <div className="text-center space-y-0.5">
            <p className="text-sm font-bold tracking-widest text-gray-900">RELUX LAUNDRY</p>
            <p className="text-[10px] text-gray-500">Professional Laundry Services</p>
          </div>

          <Separator className="border-dashed border-gray-300" />

          {/* Order meta */}
          <div className="space-y-0.5 text-gray-800">
            <div className="flex justify-between"><span className="font-semibold">Order #</span><span>{order.orderNumber ?? '—'}</span></div>
            <div className="flex justify-between"><span>Date</span><span>{createdAt}</span></div>
            <div className="flex justify-between"><span>Customer</span><span>{customer?.name ?? 'Walk-in'}</span></div>
            {customer?.phone && <div className="flex justify-between"><span>Phone</span><span>{customer.phone}</span></div>}
            {customer?.email && <div className="flex justify-between"><span>Email</span><span className="truncate max-w-[160px]">{customer.email}</span></div>}
            <div className="flex justify-between items-center">
              <span>Status</span>
              <span className="uppercase text-[9px] border border-gray-800 text-gray-800 px-1.5 py-0.5 font-bold">{order.status}</span>
            </div>
            <div className="flex justify-between"><span>Type</span><span>{isWalkIn ? 'Walk-in' : 'Online'}</span></div>
          </div>

          <Separator className="border-dashed border-gray-300" />

          {/* Items grouped by service */}
          <div className="text-gray-800">
            {items.length === 0 ? (
              <p className="text-gray-400 py-1 text-center">No items listed</p>
            ) : (() => {
              const previewGroups = new Map<string, any[]>();
              items.forEach((item) => {
                const key = buildReceiptGroup(item);
                if (!previewGroups.has(key)) previewGroups.set(key, []);
                previewGroups.get(key)!.push(item);
              });
              return Array.from(previewGroups.entries()).map(([grp, grpItems]) => (
                <div key={grp} className="mb-2">
                  {/* Service group header */}
                  <div className="flex justify-between items-center border-b border-dashed border-gray-300 pb-0.5 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-gray-600">{grp}</span>
                    <span className="text-[9px] text-gray-400">{grpItems.reduce((s, i) => s + ((i as any).quantity ?? 1), 0)} pc(s)</span>
                  </div>
                  {/* Item rows */}
                  {grpItems.map((item, i) => (
                    <div key={i} className="flex justify-between pl-2">
                      <span>{(item as any).itemType ?? '—'} × {(item as any).quantity ?? 1}</span>
                      <span>₦{(((item as any).unitPrice ?? 0) * ((item as any).quantity ?? 1)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>

          <Separator className="border-dashed border-gray-300" />

          {/* Pricing */}
          <div className="space-y-0.5 text-gray-800">
            {pricing.pickupFee > 0 && <div className="flex justify-between"><span>Pickup Fee</span><span>₦{Number(pricing.pickupFee).toLocaleString()}</span></div>}
            {pricing.deliveryFee > 0 && <div className="flex justify-between"><span>Delivery Fee</span><span>₦{Number(pricing.deliveryFee).toLocaleString()}</span></div>}
            {pricing.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₦{Number(pricing.discount).toLocaleString()}</span></div>}
            {pricing.tax > 0 && <div className="flex justify-between"><span>Tax</span><span>₦{Number(pricing.tax).toLocaleString()}</span></div>}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-gray-300 text-gray-900">
              <span>TOTAL</span><span>₦{Number(total).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment</span>
              <span>{payment.method ?? 'cash'} · {payment.status ?? 'pending'}</span>
            </div>
          </div>

          {/* QR Code */}
          {qrValue && (
            <>
              <Separator className="border-dashed border-gray-300" />
              <div className="flex flex-col items-center gap-1">
                <QRCodeCanvas
                  id="receipt-qr-canvas"
                  value={qrValue}
                  size={100}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
                <p className="text-[9px] text-gray-500">Scan to confirm delivery</p>
                <p className="text-[8px] text-gray-400 font-mono break-all text-center max-w-[200px]">{qrValue}</p>
              </div>
            </>
          )}

          <Separator className="border-dashed border-gray-300" />
          <p className="text-center text-[10px] text-gray-500">Thank you for choosing Relux Laundry!</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
