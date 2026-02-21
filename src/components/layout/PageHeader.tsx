// ============================================================
// PageHeader.tsx — มาตรฐานหัวข้อทุกหน้า เหมือนหน้าคลังสินค้าทุกประการ
// โครงสร้าง สี ความสูง เท่ากันทุกหน้า
// ============================================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <div className="flex flex-col items-center text-center mb-6 pt-10 pb-8">
      <h1 className="text-3xl md:text-4xl font-bold logo-gradient w-fit">{title}</h1>
      <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent w-24 mt-2" />
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
};
