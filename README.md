# NOTMOBILE Stock

ระบบจัดการสต๊อกและยอดขายโทรศัพท์มือถือ (React + Vite + Supabase)

## ความต้องการ

- Node.js 18+
- npm
- โปรเจกต Supabase (URL + anon key)

## ติดตั้งและรัน

```bash
npm install
```

สร้างไฟล์ `.env` จากตัวอย่าง (อย่า commit ไฟล์ `.env`):

```bash
copy .env.example .env
```

แก้ค่าใน `.env`:

- `VITE_SUPABASE_URL` — URL โปรเจกต Supabase
- `VITE_SUPABASE_ANON_KEY` — anon public key

รัน dev server (พอร์ต **8080**):

```bash
npm run dev
```

เปิดเบราว์เซอร์: [http://localhost:8080](http://localhost:8080)

หน้า Login รองรับ **จดจำชื่อผู้ใช้** (ไม่เก็บรหัสผ่าน) เมื่อติ๊ก "จดจำฉันไว้ในระบบ"

### HTTPS สำหรับสแกนกล้องบนมือถือ

```bash
# Windows PowerShell
$env:VITE_HTTPS="true"; npm run dev
```

## คำสั่งอื่น

| คำสั่ง | ความหมาย |
|--------|----------|
| `npm run build` | build production |
| `npm run preview` | ดู build หลัง build |
| `npm test` | unit tests (Vitest) |
| `npm run test:e2e` | E2E (Playwright, รอพอร์ต 8080) |
| `npm run lint` | ESLint |

## Supabase migrations

รัน SQL ใน Supabase Dashboard → SQL Editor ตามลำดับใน `supabase/migrations/` (รวม login, RLS, `revert_sale` ฯลฯ)

ไฟล์สำคัญ:

- `04_login_username_lookup.sql` — login ด้วย username
- `09_revert_sale_reset.sql` — ยกเลิกการขาย + ล้างข้อมูลขายเก่า
- `10_complete_single_sale.sql` — บันทึกขาย 1 รายการแบบ atomic
- `11_complete_cart_sale.sql` — บันทึกขายหลายรายการในบิลเดียวแบบ atomic

Staff ใน **ตั้งค่า** ดูรายการแบรนด์/รุ่น/สี/ประเภทเครื่องได้ แต่เพิ่ม/แก้ไข/ลบได้เฉพาะ Admin

แอปโหลดหน้าหลักแบบ lazy (แยก chunk) โหลดกราฟเมื่อเข้า Dashboard/รายงาน และโหลดสแกน IMEI (`html5-qrcode`) เฉพาะเมื่อกดปุ่มกล้อง — ช่วยลดขนาด bundle ตอนเปิดครั้งแรก

## Deploy

ตั้ง environment variables เดียวกับ `.env` บน hosting (เช่น Vercel) แล้ว `npm run build`
