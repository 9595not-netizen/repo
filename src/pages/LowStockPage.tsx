import { PageHeader } from '@/components/layout/PageHeader';
import { LowStockList } from '@/components/features/dashboard/LowStockList';

export default function LowStockPage() {
  return (
    <div>
      <PageHeader
        title="รายการสินค้าเหลือต่ำ"
        subtitle="แจ้งเตือนเมื่อสต๊อกเหลือต่ำกว่า 2 ตัว"
      />
      <div className="page-content">
        <LowStockList />
      </div>
    </div>
  );
}
