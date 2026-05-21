/** แจ้ง Staff ว่าไม่มีสิทธิ์แก้ไข master data */
export function SettingsStaffNotice() {
  return (
    <p className="text-sm text-muted-foreground">
      โหมด Staff — ดูข้อมูลได้อย่างเดียว การเพิ่ม/แก้ไข/ลบทำได้เฉพาะ Admin
    </p>
  );
}
