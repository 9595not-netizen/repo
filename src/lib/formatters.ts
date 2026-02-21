const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const formatThaiDate = (date: Date) => {
  const dayName = thaiDays[date.getDay()];
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear() + 543;
  return `${dayName}.${day}/${month}/${year}`;
};

export const formatThaiDateTime = (date: Date) => {
  const datePart = formatThaiDate(date);
  const time = date.toLocaleTimeString('th-TH', { hour12: false });
  return `${datePart} | ${time}`;
};

export const formatCurrency = (amount: number) => {
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatNumber = (num: number) => {
  return num.toLocaleString('th-TH');
};

export const statusMap: Record<string, { text: string; color: string }> = {
  in_stock: { text: 'พร้อมขาย', color: 'bg-success text-success-foreground' },
  reserved: { text: 'จอง', color: 'bg-warning text-warning-foreground' },
  sold: { text: 'ขายแล้ว', color: 'bg-muted text-muted-foreground' },
  service: { text: 'ส่งซ่อม', color: 'bg-destructive text-destructive-foreground' },
};

export const statusFilterMap: Record<string, string> = {
  'ทุกสถานะ': '',
  'พร้อมขาย': 'in_stock',
  'จอง': 'reserved',
  'ขายแล้ว': 'sold',
  'ส่งซ่อม': 'service',
};
