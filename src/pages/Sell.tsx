import { SellForm } from '@/components/features/sell/SellForm';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Sell() {
    return (
        <div>
            <PageHeader
                title="ขายสินค้า"
                subtitle="ค้นหาและขายสินค้าจากคลัง"
            />

            <div className="page-content">
                <SellForm />
            </div>
        </div>
    );
}
