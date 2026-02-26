import * as z from 'zod';

export const productSchema = z.object({
  shop_code: z
    .string()
    .trim()
    .min(1, 'กรุณาระบุรหัสร้าน')
    .max(30, 'รหัสร้านยาวเกินไป'),
  imei: z
    .string()
    .trim()
    .regex(/^\d{15}$/, 'IMEI ต้องเป็นตัวเลข 15 หลัก'),
  brand_id: z.string().min(1, 'กรุณาเลือกยี่ห้อ'),
  model_id: z.string().min(1, 'กรุณาเลือกรุ่น'),
  model_variant_id: z.string().min(1, 'กรุณาเลือกความจุ'),
  color_id: z.string().min(1, 'กรุณาเลือกสี'),
  device_type_id: z.string().min(1, 'กรุณาเลือกประเภทอุปกรณ์'),
  type: z.enum(['มือ 1', 'มือ 2']),
  cost_price: z.coerce.number().min(1, 'ราคาทุนต้องมากกว่า 0'),
  received_date: z.string().optional(),
  source: z
    .string()
    .trim()
    .max(100, 'ที่มายาวเกินไป')
    .optional(),
  created_by_user_id: z.string().optional(),
  condition_grade: z.enum(['A', 'B', 'C', 'F']).optional(),
  battery_health: z.coerce
    .number()
    .min(0, 'สุขภาพแบตเตอรี่ต้องอยู่ระหว่าง 0-100')
    .max(100, 'สุขภาพแบตเตอรี่ต้องอยู่ระหว่าง 0-100')
    .optional(),
  has_box: z.boolean().default(false),
  has_charger: z.boolean().default(false),
  has_cable: z.boolean().default(false),
  has_headphone: z.boolean().default(false),
  condition_note: z
    .string()
    .trim()
    .max(500, 'หมายเหตุยาวเกินไป')
    .optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
