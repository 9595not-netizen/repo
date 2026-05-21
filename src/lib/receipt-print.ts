/**
 * Thermal 80mm Receipt / Warranty Print
 * Printable width ~72mm
 * Font 12-14px equivalent
 */

import { Database } from '@/types/database.types';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

interface ReceiptData {
  product: ProductDetail;
  saleData: {
    sold_to: string;
    payment_method: string;
    contract_number?: string;
    selling_price: number;
    sold_at: string;
    sold_by: string;
    profit: number;
  };
}

function escapeHtml(text: string): string {
  return (text || '-').replace(/</g, '&lt;');
}

function formatPrice(amount: number): string {
  return amount.toLocaleString('th-TH', { minimumFractionDigits: 2 });
}

const RECEIPT_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Prompt', 'TH Sarabun', sans-serif;
      font-size: 12px;
      line-height: 1.4;
      max-width: 72mm;
      padding: 4px;
      color: #000;
      background: #fff;
    }
    .receipt { width: 100%; word-wrap: break-word; }
    .receipt > div { margin-bottom: 2px; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .warranty { white-space: pre-line; margin-top: 6px; }
    .terms { font-size: 11px; margin-top: 4px; }
    .item-block { margin: 6px 0; padding-bottom: 4px; border-bottom: 1px dotted #ccc; }
    .item-block:last-of-type { border-bottom: none; }
    .item-no { font-weight: 700; }
    @media print {
      body { margin: 0; padding: 2px; }
      .no-print { display: none !important; }
    }
`;

const WARRANTY_TEXT = `เงื่อนไขการรับประกัน

เครื่องมือสองรับประกัน 1 เดือน

ตัวเครื่องต้องเปิดติด สามารถเช็ค imei ได้

ตัวเครื่องไม่มีรอย ไม่หล่นกระแทก ไม่มีคราบความชื้น

ตัวเครื่องไม่ผ่านการแกะหรือซ่อม

เครื่องศูนย์การรับประกันเป็นไปตามเงื่อนไขของศูนย์`;

export interface CombinedReceiptItem {
  product: ProductDetail;
  selling_price: number;
}

export interface CombinedReceiptData {
  items: CombinedReceiptItem[];
  saleData: {
    sold_to: string;
    payment_method: string;
    contract_number?: string;
    sold_at: string;
  };
}

function buildReceiptHtml(bodyContent: string, title = 'ใบเสร็จรับเงิน/ใบรับประกัน'): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${RECEIPT_STYLES}</style>
</head>
<body>
  <div class="receipt">${bodyContent}</div>
</body>
</html>`;
}

function openPrintHtml(htmlContent: string): Window | null {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return null;
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return printWindow;
}

/** เปิดหน้าต่างพิมพ์แล้วสั่ง print (ใช้ร่วมกับทุกประเภทใบเสร็จ) */
export function triggerReceiptPrint(printWindow: Window | null): boolean {
  if (!printWindow) return false;
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
    setTimeout(() => {
      if (!printWindow.closed) printWindow.close();
    }, 500);
  }, 250);
  return true;
}

function productLineFull(product: ProductDetail): string {
  const productLine = `${product.brand_name || ''} ${product.model_name || ''}`.trim() || '-';
  const colorText = product.color_name?.startsWith('สี')
    ? product.color_name
    : `สี${product.color_name || ''}`;
  return `${productLine} / ${product.storage} ( ${colorText} )`;
}

/** ใบเสร็จรวมหลายรายการในบิลเดียว */
export function openCombinedReceiptPrintWindow(data: CombinedReceiptData): Window | null {
  const { items, saleData } = data;
  const isInstallment = saleData.payment_method === 'ผ่อนชำระ';
  const totalSelling = items.reduce((s, i) => s + i.selling_price, 0);
  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dateTimeLine = `${dateStr} ${timeStr} (${items.length} รายการ)`;

  const itemBlocks = items
    .map((line, index) => {
      const priceLine = isInstallment
        ? 'Price: — (ผ่อนชำระ)'
        : `Price: ${formatPrice(line.selling_price)}`;
      return `
    <div class="item-block">
      <div class="item-no">${index + 1}. ${escapeHtml(productLineFull(line.product))}</div>
      <div>รหัส: ${escapeHtml(line.product.shop_code || '-')}</div>
      <div>IMEI: ${escapeHtml(line.product.imei || '-')}</div>
      <div>${priceLine}</div>
    </div>`;
    })
    .join('');

  const totalLine = isInstallment
    ? '<div class="bold">รวมสุทธิ — (ผ่อนชำระ / ตัดสต๊อก)</div>'
    : `<div class="bold">รวมสุทธิ ${formatPrice(totalSelling)} บาท</div>`;

  const contractLine =
    isInstallment && saleData.contract_number
      ? `<div>สัญญา: ${escapeHtml(saleData.contract_number)}</div>`
      : '';

  const bodyContent = `
    <div class="center bold" style="font-size: 14px;">NOTMOBILE</div>
    <div class="center" style="margin-bottom: 4px;">ใบเสร็จรับเงิน/ใบรับประกัน (รวม ${items.length} รายการ)</div>
    <div>${escapeHtml(dateTimeLine)}</div>
    <div>Cust : ${escapeHtml(saleData.sold_to)}</div>
    <div>ชำระ: ${escapeHtml(saleData.payment_method)}</div>
    ${contractLine}
    <div class="divider"></div>
    ${itemBlocks}
    <div>จำนวนรวม ${items.length} รายการ</div>
    ${totalLine}
    <div class="divider"></div>
    <div class="terms">***โปรดตรวจสอบสินค้าก่อนออกจากร้าน</div>
    <div class="terms">***สินค้าซื้อแล้วไม่รับเปลี่ยน/คืน</div>
    <div class="terms">***Good Purchase Can Not Change or Refund</div>
    <div class="divider"></div>
    <div class="warranty">${escapeHtml(WARRANTY_TEXT)}</div>
    <div class="divider"></div>
  `;

  return openPrintHtml(buildReceiptHtml(bodyContent));
}

export function openReceiptPrintWindow(data: ReceiptData): Window | null {
  const { product, saleData } = data;
  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dateTimeLine = `${dateStr} ${timeStr} ${product.shop_code || '-'}`;

  const bodyContent = `
    <div class="center bold" style="font-size: 14px;">NOTMOBILE</div>
    <div class="center" style="margin-bottom: 4px;">ใบเสร็จรับเงิน/ใบรับประกัน (สำหรับลูกค้า)</div>
    <div>${escapeHtml(dateTimeLine)}</div>
    <div>Cust : ${escapeHtml(saleData.sold_to)}</div>
    <div>${escapeHtml(productLineFull(product))}</div>
    <div>IMEI: ${escapeHtml(product.imei || '-')}</div>
    <div>Qty: 1</div>
    <div>Price: ${formatPrice(saleData.selling_price ?? 0)}</div>
    <div>จำนวนรวม 1 รายการ</div>
    <div class="bold">รวมสุทธิ ${formatPrice(saleData.selling_price ?? 0)} บาท</div>
    <div class="divider"></div>
    <div class="terms">***โปรดตรวจสอบสินค้าก่อนออกจากร้าน</div>
    <div class="terms">***สินค้าซื้อแล้วไม่รับเปลี่ยน/คืน</div>
    <div class="terms">***Good Purchase Can Not Change or Refund</div>
    <div class="divider"></div>
    <div class="warranty">${escapeHtml(WARRANTY_TEXT)}</div>
    <div class="divider"></div>
  `;

  return openPrintHtml(buildReceiptHtml(bodyContent));
}
