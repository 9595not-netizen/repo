import * as z from 'zod';

export const saleFormSchema = z
  .object({
    payment_method: z.enum(['เงินสด', 'ผ่อนชำระ']),
    selling_price: z.coerce.number().min(0, 'ราคาขายต้องไม่ติดลบ'),
    sold_to: z
      .string()
      .trim()
      .min(1, 'กรุณาระบุชื่อผู้ซื้อ')
      .max(100, 'ชื่อผู้ซื้อยาวเกินไป'),
    contract_number: z
      .string()
      .trim()
      .max(50, 'เลขที่สัญญายาวเกินไป')
      .optional(),
    sold_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง'),
    sold_by: z.string().min(1, 'กรุณาเลือกพนักงานขาย'),
  })
  .refine(
    (data) =>
      data.payment_method !== 'เงินสด' || data.selling_price >= 1,
    { message: 'ราคาขายต้องมากกว่า 0 สำหรับขายสด', path: ['selling_price'] }
  );

export type SaleFormValues = z.infer<typeof saleFormSchema>;
