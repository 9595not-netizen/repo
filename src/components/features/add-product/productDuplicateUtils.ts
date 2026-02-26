/**
 * Pure functions สำหรับตรวจสอบซ้ำ IMEI / Shop Code
 * ใช้สำหรับ unit test; ProductForm ใช้ logic เดียวกันผ่าน Supabase query
 */

export interface ProductForDuplicateCheck {
    id: string;
    shop_code?: string | null;
    imei?: string | null;
    status?: string | null;
}

/** เช็ค shop_code ซ้ำ (ยกเว้นตัวเองเมื่อแก้ไข) */
export function hasDuplicateShopCode(
    products: ProductForDuplicateCheck[],
    shopCode: string,
    excludeId?: string | null
): boolean {
    if (!shopCode?.trim()) return false;
    return products.some(
        (p) =>
            (p.shop_code ?? '').trim() === shopCode.trim() &&
            (!excludeId || p.id !== excludeId)
    );
}

/** เช็ค IMEI ซ้ำในสินค้าที่ in_stock/reserved/service (ยกเว้นตัวเองเมื่อแก้ไข) */
export function hasDuplicateImei(
    products: ProductForDuplicateCheck[],
    imei: string,
    excludeId?: string | null
): boolean {
    if (!imei?.trim()) return false;
    const validStatuses = ['in_stock', 'reserved', 'service'];
    return products.some(
        (p) =>
            (p.imei ?? '').trim() === imei.trim() &&
            validStatuses.includes(p.status ?? '') &&
            (!excludeId || p.id !== excludeId)
    );
}
