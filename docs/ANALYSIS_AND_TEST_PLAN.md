# NOTMOBILE Stock/Sales Web App — การวิเคราะห์และแผนทดสอบ

> เอกสารนี้อัปเดตล่าสุดตามการวิเคราะห์โค้ดเบสและฟังก์ชันที่มีทั้งหมด

---

## 1. โครงสร้างแอปและเส้นทาง

| Path | หน้าที่ | สิทธิ์ | ความสำคัญ |
|------|---------|--------|-----------|
| `/login` | เข้าสู่ระบบ | สาธารณะ | สูงมาก |
| `/` | แดชบอร์ด | ต้อง login | สูง |
| `/stock` | คลังสินค้า | ต้อง login | สูงมาก |
| `/low-stock` | สต๊อกต่ำ | ต้อง login | ปานกลาง |
| `/sell` | ขายสินค้า | ต้อง login | สูงมาก |
| `/reports` | รายงาน | ต้อง login | สูง |
| `/settings` | ตั้งค่า | ต้อง login | สูง |

---

## 2. ฟีเจอร์หลักและจุดที่ควรทดสอบ

### 2.1 Login (`/login`)
- [ ] Login ด้วย username + password
- [ ] Login สำเร็จ → redirect ไป `/`
- [ ] Login ล้มเหลว → แสดงข้อความ error
- [ ] กรณี session มีอยู่แล้ว → redirect อัตโนมัติ
- [ ] Validation: username ≥3 ตัว, รหัสผ่าน ≥6 ตัว
- [ ] RPC `get_user_email_by_username` 404 → fallback query `users` โดยตรง
- [x] กรณี user status = inactive → บล็อกแล้ว (Login.tsx บรรทัด 113–117)
- [ ] Remember me (ถ้ามี) — ตรวจสอบว่าใช้งานได้หรือไม่

**ความเสี่ยง:** ถ้า RLS อนุญาตให้ anon อ่าน `users` โดยตรง อาจเสี่ยงข้อมูลรั่วไหล

---

### 2.2 Dashboard (`/`)
- [ ] SummaryCards แสดงข้อมูลถูกต้อง (จำนวนสต๊อก, ยอดขายวันนี้, กำไรวันนี้, โมเดลขายดี)
- [ ] QuickActions นำทางไปหน้าถูกต้อง
- [ ] ComparisonDebtChart — เลือก period (week/month/year) แล้วกราฟเปลี่ยน
- [ ] SalesComparisonChart — แสดงข้อมูลตาม quarter
- [ ] Realtime: จำนวนสต๊อกอัปเดตเมื่อมีการเพิ่ม/ขายสินค้า
- [ ] กรณีไม่มีข้อมูล → แสดง empty state ที่เหมาะสม
- [ ] รายได้/กำไร: **ไม่รวมผ่อนชำระ** (ตาม logic ที่แก้ไขแล้ว)

**ความเสี่ยง:** RPC `get_today_sales`, `get_top_selling_models` ถ้าไม่มี → fallback ต้องทำงาน

---

### 2.3 Stock / คลังสินค้า (`/stock`)
- [ ] แสดงรายการสินค้าตามแท็บสถานะ (ทั้งหมด, พร้อมขาย, จอง, ขายแล้ว, ซ่อม)
- [ ] Filter: ค้นหา, แบรนด์, รุ่น, สี, ประเภทเครื่อง, sort
- [ ] URL params: `?edit=id` เปิด modal แก้ไข, `?action=add` เปิด modal เพิ่ม
- [ ] ProductCard / ProductTable สลับแสดง
- [ ] ProductDetailSlide: ดู, แก้ไข, ลบ, ขาย (navigate ไป `/sell?product_id=`)
- [ ] ProductFormModal: เพิ่ม/แก้ไขสินค้า
- [ ] ลบสินค้า → ยืนยัน → ลบจริง
- [ ] Pagination / infinite scroll (ถ้ามี)
- [ ] กรณีสินค้าเยอะ → performance scroll

**ความเสี่ยง:**
- Race condition: ผู้ใช้กดลบหลายครั้งก่อน confirm
- การแก้ไข IMEI ซ้ำกับสินค้าอื่น (ตรวจสอบแล้วใน ProductForm)

---

### 2.4 เพิ่มสินค้า (ProductForm)
- [ ] Validation: shop_code, IMEI 15 หลัก, brand/model/variant/color/device_type, cost_price > 0
- [ ] IMEI ซ้ำ (in_stock/reserved/service) → แสดง error
- [ ] Shop code ซ้ำ (ยกเว้นตัวเองเมื่อแก้ไข) → แสดง error
- [ ] Cascade: เลือก brand → โหลด models, เลือก model → โหลด variants
- [ ] มือ 2: condition_grade, battery_health 0–100, อัปโหลดรูป
- [ ] Edit: โหลดข้อมูลสินค้าเข้า form
- [ ] inventory_log insert ล้มเหลว → ไม่บล็อกการบันทึกหลัก (log เฉยๆ)
- [ ] Image upload: ตรวจสอบขนาด/ประเภทไฟล์

**ความเสี่ยง:**
- อัปโหลดรูปหลายไฟล์พร้อมกัน → race / order ไม่แน่นอน
- product_details view ไม่มีข้อมูลใหม่ทันทีหลัง insert (realtime delay)

---

### 2.5 ขายสินค้า (`/sell`)
- [ ] ค้นหาสินค้า (shop_code / IMEI) — debounce 500ms
- [ ] URL `?product_id=` โหลดสินค้าอัตโนมัติ
- [ ] เลือกวิธีชำระ: **เงินสด** vs **ผ่อนชำระ**
- [ ] เงินสด: บังคับกรอกราคาขาย > 0
- [ ] ผ่อนชำระ: ไม่กรอกราคาขาย (selling_price = 0), บังคับเลขที่สัญญา
- [ ] กรอกชื่อผู้ซื้อ, วันที่ขาย, พนักงานขาย
- [ ] ยืนยันขาย → SaleConfirmModal
- [ ] บันทึกสำเร็จ → SaleSuccessScreen
- [ ] RPC `complete_single_sale` ไม่มี → fallback update products + insert inventory_log
- [ ] เฉพาะ status = 'in_stock' เท่านั้นที่ขายได้
- [ ] IMEI Scanner (ถ้าเปิดใช้งาน)

**ความเสี่ยง:**
- สองผู้ใช้ขายสินค้าเดียวกันพร้อมกัน → optimistic lock ไม่มี, พึ่ง RLS/DB constraint
- สินค้าถูกขายแล้วแต่ยังโหลดจาก cache → แสดง error "สินค้าถูกขายไปแล้ว"

---

### 2.6 Reports (`/reports`)
- [ ] เลือกช่วงวันที่ (preset + custom)
- [ ] ส่งออก CSV
- [ ] ส่งออก PDF (window.open / iframe fallback เมื่อ popup ถูกบล็อก)
- [ ] SummaryCards: เครื่องที่ขาย, ยอดขายรวม, กำไร, อัตรากำไร — **เฉพาะขายสด ไม่รวมผ่อน**
- [ ] ReportCharts: ยอดขายรายวัน, กำไรรายวัน, สินค้าขายดี, สินค้าค้างสต๊อก
- [ ] SalesTransactionTable: pagination, ค้นหา, ดู/แก้ไข/ยกเลิกการขาย
- [ ] ยกเลิกการขาย (revert): RPC `revert_sale` หรือ fallback
- [ ] พิมพ์ใบเสร็จ (SaleViewModal)
- [ ] Responsive: mobile card view, tablet/desktop table

**ความเสี่ยง:**
- Date range ใหญ่มาก → query ช้า, ควร limit หรือแจ้งเตือน
- Revert sale: ตรวจสอบว่า profit คืนค่าถูกต้อง ไม่ตั้ง 0 โดยผิดพลาด

---

### 2.7 Settings (`/settings`)
- [ ] BrandsTab: CRUD แบรนด์
- [ ] ModelsTab: CRUD รุ่น (อัปโหลดรูป)
- [ ] VariantsTab: CRUD ความจุ
- [ ] ColorsTab: CRUD สี (hex)
- [ ] DeviceTypesTab: CRUD ประเภทเครื่อง
- [ ] StaffTab: CRUD พนักงาน (admin เท่านั้น)
- [ ] LowStockAlertsTab: ตั้งค่าแจ้งเตือนสต๊อกต่ำ
- [ ] Validation: ชื่อไม่ว่าง, ความยาวตามที่กำหนด, hex format
- [ ] Duplicate check: เช่น device_types.code, brands.name

**ความเสี่ยง:**
- ลบ brand/model/variant ที่มีสินค้าใช้งานอยู่ → FK constraint error (23503)
- แก้ไข/ลบ Staff ที่ login อยู่ → ควร handle ให้เหมาะสม

---

## 3. จุดที่อาจผิดพลาดหรือก่อให้เกิดบัค

### 3.1 Race Conditions
| สถานการณ์ | ความเสี่ยง | แนวทาง |
|-----------|-----------|--------|
| สองคนขายสินค้าเดียวกันพร้อมกัน | สูง | ใช้ `.eq('status','in_stock')` และตรวจ error ว่า "สินค้าถูกขายไปแล้ว" |
| สองคนแก้ไขสินค้าเดียวกัน | ปานกลาง | ไม่มี optimistic lock, แก้ไขทับกันได้ |
| กดส่งฟอร์มหลายครั้ง | ปานกลาง | ใช้ `submitting` state disable ปุ่ม |

### 3.2 Validation Gaps
| ฟิลด์ | สถานะ | หมายเหตุ |
|-------|-------|----------|
| IMEI | ✓ | 15 หลัก, ตรวจซ้ำ |
| shop_code | ✓ | ความยาว, ตรวจซ้ำ |
| cost_price | ✓ | ≥ 1 |
| selling_price | ✓ | เงินสด ≥ 1, ผ่อน = 0 |
| เบอร์โทร | ✓ | 0xxxxxxxx (8–9 หลัก) |
| contract_number | ✓ | ผ่อนบังคับ, max 50 |
| hex color | ✓ | #XXX หรือ #XXXXXX |

### 3.3 RPC Fallbacks
- `complete_single_sale`, `complete_cart_sale`, `revert_sale` — ถ้า RPC ไม่มีจะใช้ fallback
- `get_user_email_by_username` — fallback query `users`
- `get_top_selling_models` — fallback query แบบ manual
- ต้องตรวจสอบว่า fallback logic ครบและไม่สับสน

### 3.4 Security
- [ ] RLS (Row Level Security) ใน Supabase ต้องเปิดใช้งานและกำหนด policy ให้ถูกต้อง
- [ ] ไม่ควรให้ anon อ่าน `users` ได้ถ้าไม่จำเป็น (Login fallback)
- [x] JWT/Session หมดอายุ → redirect ไป login อัตโนมัติ (AuthContext onAuthStateChange + ProtectedRoute)
- [ ] Admin-only: StaffTab ใช้ `isAdmin` จาก AuthContext

### 3.5 UX / Edge Cases
- [x] หน้าจอแคบมาก (< 320px) — min-width: 320px ใน html/body
- [ ] วันที่ใน timezone ต่างประเทศ — ใช้ toISOString / local อาจเลื่อนวัน
- [x] ข้อมูลว่าง (ไม่มีสินค้า, ไม่มียอดขาย) — มี empty state แล้ว (Stock, Dashboard, Reports)
- [x] Network ล้มเหลวกลางทาง — try/catch + toast/error state ใช้อยู่แล้วในฟอร์มหลัก

---

## 4. แผนทดสอบ (Test Plan)

### 4.1 Unit Tests (Vitest) — มีอยู่แล้ว
- `error-handler.test.ts` — getErrorMessage
- `ProductForm.test.ts` — productSchema
- `SellForm.test.ts` — saleFormSchema (รวม ผ่อนชำระ selling_price 0)
- `PaymentModal.test.tsx` — validation (ต้อง resolve path @/components/ui/dialog)

**ควรเพิ่ม:**
- [x] DateRangeSelector: getDateRange logic (dateRangeUtils.test.ts)
- [x] ReportsSummaryCards / ReportCharts: การกรอง ผ่อนชำระ ออกจาก revenue (reportFilterUtils.test.ts)
- [x] ProductForm: IMEI/shop_code duplicate logic — productDuplicateUtils.test.ts (pure functions สำหรับตรวจสอบซ้ำ)

### 4.2 Integration Tests — แนะนำ
- [ ] Login flow (mock Supabase) — ต้อง mock supabase.auth และ supabase.rpc
- [ ] Add product → erscheintในรายการ Stock
- [ ] Sell flow: search → select → fill → confirm → success
- [ ] Revert sale → สินค้ากลับ in_stock

### 4.3 E2E Tests (Playwright) — มีเบื้องต้นแล้ว
- [x] Login: แสดงหน้า, validation username/password
- [x] Stock, Dashboard, Sell, Reports, Settings: redirect ไป login เมื่อไม่ login
- [ ] Stock: filter, เพิ่มสินค้า, แก้ไข, ลบ (ต้อง login ก่อน)
- [ ] Sell: ค้นหา, กรอกฟอร์ม, ยืนยันขาย
- [ ] Reports: เลือกวันที่, ส่งออก CSV, ดูรายการขาย, revert
- [ ] Settings: CRUD brands, models

### 4.4 Manual Test Checklist
ใช้เอกสารนี้เป็น checklist เมื่อทดสอบด้วยตนเอง:
- [ ] ทุกหน้าโหลดได้ไม่มี error
- [ ] ฟอร์มทุกฟอร์ม validate ถูกต้อง
- [ ] การบันทึก/อัปเดต/ลบ ทำงานถูกต้อง
- [ ] แสดง toast เมื่อสำเร็จ/ล้มเหลว
- [ ] Responsive บน mobile / tablet / desktop
- [ ] Dark mode สลับได้
- [ ] ลองกรณี edge: วันที่เก่ามาก, ข้อมูลยาวมาก, อักขระพิเศษ

---

## 5. สรุปและข้อเสนอแนะ

### 5.1 จุดที่ควรแก้/เสริมในอนาคต
1. ~~**Auth**: ตรวจสอบ user status = inactive ก่อน login~~ — ทำแล้ว
2. **Sell**: พิจารณา optimistic lock หรือ version check เมื่อขายสินค้า
3. ~~**Reports**: Limit ช่วงวันที่หรือแจ้งเตือนเมื่อ query ช้า~~ — ทำแล้ว (MAX_REPORT_DAYS 365 วัน, แสดง toast เตือนเมื่อเกิน)
4. ~~**E2E**: เพิ่ม Playwright tests สำหรับ critical path~~ — มีเบื้องต้น (Login, Stock redirect)
5. **Error tracking**: เชื่อม Sentry หรือบริการคล้ายกันสำหรับ production
6. **PaymentModal (Cart)**: ปัจจุบันไม่ใช้ใน main Sell flow — ถ้าไม่ใช้ควรซ่อนหรือลบออก

### 5.2 สถานะ Unit Tests
| ไฟล์ | สถานะ | หมายเหตุ |
|------|-------|----------|
| error-handler.test.ts | ✓ | ครบ |
| ProductForm.test.ts | ✓ | schema |
| SellForm.test.ts | ✓ | schema |
| PaymentModal.test.tsx | ⚠ | path resolve อาจ fail ใน env บางตัว |
| dateRangeUtils.test.ts | ✓ | getDateRange, toLocalDateString |
| reportFilterUtils.test.ts | ✓ | filterCashSales, computeCashSalesSummary |
| productDuplicateUtils.test.ts | ✓ | hasDuplicateShopCode, hasDuplicateImei |

---

## 6. รายการบัค/จุดเสี่ยงที่พบจากการวิเคราะห์

### 6.1 ความเสี่ยงสูง
| รายการ | คำอธิบาย | แนวทางลด |
|--------|----------|----------|
| ขายสินค้าซ้ำ | สองคนขายสินค้าเดียวกันพร้อมกัน | พึ่ง `.eq('status','in_stock')` และ error handling |
| RLS ไม่ได้ตั้ง | ถ้า Supabase RLS ปิด → ผู้ใช้เห็นข้อมูลกันหมด | ตรวจสอบ RLS policies ใน Supabase |
| Session หมดอายุ | ผู้ใช้ทำงานค้างแล้ว session หมด | ✓ AuthContext onAuthStateChange + ProtectedRoute redirect |

### 6.2 ความเสี่ยงปานกลาง
| รายการ | คำอธิบาย |
|--------|----------|
| PaymentModal.test | path `@/components/ui/dialog` อาจ resolve ไม่ได้ใน env บางตัว |
| แก้ไขสินค้าทับกัน | ไม่มี optimistic lock — ผู้ใช้สองคนแก้ไขพร้อมกันจะทับกัน |
| ~~FK constraint~~ | ✓ getErrorMessage 23503 แสดงข้อความไทยว่า "มีสินค้าใช้งานอยู่ กรุณาลบหรือแก้ไขสินค้าก่อน" |

### 6.3 ความเสี่ยงต่ำ
| รายการ | คำอธิบาย |
|--------|----------|
| ~~Date range ใหญ่มาก~~ | ✓ แสดง toast เตือนเมื่อเลือกช่วงเกิน 365 วัน |
| Timezone | วันที่ใน timezone ต่างประเทศอาจเลื่อนวัน |

---

*เอกสารนี้สร้างจาการวิเคราะห์โค้ดเบส — แนะนำให้อัปเดตเมื่อมีฟีเจอร์ใหม่หรือ logic เปลี่ยน*
