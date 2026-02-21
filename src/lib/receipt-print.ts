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

const WARRANTY_TEXT = `เงื่อนไขการรับประกัน

เครื่องมือสองรับประกัน 1 เดือน

ตัวเครื่องต้องเปิดติด สามารถเช็ค imei ได้

ตัวเครื่องไม่มีรอย ไม่หล่นกระแทก ไม่มีคราบความชื้น

ตัวเครื่องไม่ผ่านการแกะหรือซ่อม

เครื่องศูนย์การรับประกันเป็นไปตามเงื่อนไขของศูนย์`;

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

  const productLine = `${product.brand_name || ''} ${product.model_name || ''}`.trim() || '-';
  const colorText = product.color_name?.startsWith('สี') ? product.color_name : `สี${product.color_name || ''}`;
  const productLineFull = `${productLine} / ${product.storage} ( ${colorText} )`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ใบเสร็จรับเงิน/ใบรับประกัน</title>
  <style>
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
    .receipt {
      width: 100%;
      word-wrap: break-word;
    }
    .receipt > div {
      margin-bottom: 2px;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .warranty { white-space: pre-line; margin-top: 6px; }
    .terms { font-size: 11px; margin-top: 4px; }
    @media print {
      body { margin: 0; padding: 2px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center bold" style="font-size: 14px;">NOTMOBILE</div>
    <div class="center" style="margin-bottom: 4px;">ใบเสร็จรับเงิน/ใบรับประกัน (สำหรับลูกค้า)</div>
    <div>${dateTimeLine}</div>
    <div>Cust : ${(saleData.sold_to || '-').replace(/</g, '&lt;')}</div>
    <div>${productLineFull.replace(/</g, '&lt;')}</div>
    <div>IMEI: ${(product.imei || '-').replace(/</g, '&lt;')}</div>
    <div>Qty: 1</div>
    <div>Price: ${(saleData.selling_price ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
    <div>จำนวนรวม 1 รายการ</div>
    <div class="bold">รวมสุทธิ ${(saleData.selling_price ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</div>
    <div class="divider"></div>
    <div class="terms">***โปรดตรวจสอบสินค้าก่อนออกจากร้าน</div>
    <div class="terms">***สินค้าซื้อแล้วไม่รับเปลี่ยน/คืน</div>
    <div class="terms">***Good Purchase Can Not Change or Refund</div>
    <div class="divider"></div>
    <div class="warranty">${WARRANTY_TEXT.replace(/</g, '&lt;')}</div>
    <div class="divider"></div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return null;
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return printWindow;
}
