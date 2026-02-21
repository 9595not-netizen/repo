import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Smartphone, HardDrive, Palette, Cpu, Users, Bell } from 'lucide-react';
import { BrandsTab } from '@/components/features/settings/BrandsTab';
import { ModelsTab } from '@/components/features/settings/ModelsTab';
import { VariantsTab } from '@/components/features/settings/VariantsTab';
import { ColorsTab } from '@/components/features/settings/ColorsTab';
import { DeviceTypesTab } from '@/components/features/settings/DeviceTypesTab';
import { StaffTab } from '@/components/features/settings/StaffTab';
import { LowStockAlertsTab } from '@/components/features/settings/LowStockAlertsTab';
import { UserInfoBar } from '@/components/features/settings/UserInfoBar';
import { PageHeader } from '@/components/layout/PageHeader';

const VALID_TABS = ['brands', 'models', 'variants', 'colors', 'device-types', 'low-stock', 'staff'] as const;

export default function Settings() {
    const [searchParams, setSearchParams] = useSearchParams();
    const getValidTab = (raw: string | null) => {
        const t = raw || 'brands';
        return VALID_TABS.includes(t as (typeof VALID_TABS)[number]) ? t : 'brands';
    };
    const tabFromUrl = getValidTab(searchParams.get('tab'));
    const [activeTab, setActiveTab] = useState(tabFromUrl);

    useEffect(() => {
        const raw = searchParams.get('tab');
        const tab = getValidTab(raw);
        setActiveTab(tab);
        // Sync URL if invalid tab was in URL
        if (raw && raw !== tab) {
            setSearchParams({ tab }, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const handleTabChange = (value: string) => {
        const valid = getValidTab(value);
        setActiveTab(valid);
        setSearchParams({ tab: valid });
    };

    return (
        <div>
            <PageHeader
                title="ตั้งค่า"
                subtitle="จัดการข้อมูลยี่ห้อ รุ่น และสี"
            />

            <div className="page-content">
                {/* Tabs for Settings */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="border-b border-gold/30 pb-0 overflow-x-auto">
                        <TabsList className="grid w-full min-w-max grid-cols-7 bg-transparent p-0 h-auto">
                            <TabsTrigger 
                                value="brands" 
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg rounded-b-none transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-b-gold data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400"
                            >
                                <FileText className="h-4 w-4" />
                                <span>ยี่ห้อ</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="models" 
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg rounded-b-none transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-b-gold data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400"
                            >
                                <Smartphone className="h-4 w-4" />
                                <span>รุ่น</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="variants" 
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg rounded-b-none transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-b-gold data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400"
                            >
                                <HardDrive className="h-4 w-4" />
                                <span>ความจุ</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="colors" 
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg rounded-b-none transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-b-gold data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400"
                            >
                                <Palette className="h-4 w-4" />
                                <span>สี</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="device-types" 
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg rounded-b-none transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-b-gold data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400"
                            >
                                <Cpu className="h-4 w-4" />
                                <span>ประเภท</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="low-stock" 
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg rounded-b-none transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-b-gold data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400"
                            >
                                <Bell className="h-4 w-4" />
                                <span>แจ้งเตือน</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="staff" 
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg rounded-b-none transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-b-gold data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400"
                            >
                                <Users className="h-4 w-4" />
                                <span>พนักงาน</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="brands" className="mt-6" forceMount>
                        <BrandsTab />
                    </TabsContent>

                    <TabsContent value="models" className="mt-6" forceMount>
                        <ModelsTab />
                    </TabsContent>

                    <TabsContent value="variants" className="mt-6" forceMount>
                        <VariantsTab />
                    </TabsContent>

                    <TabsContent value="colors" className="mt-6" forceMount>
                        <ColorsTab />
                    </TabsContent>

                    <TabsContent value="device-types" className="mt-6" forceMount>
                        <DeviceTypesTab />
                    </TabsContent>

                    <TabsContent value="low-stock" className="mt-6" forceMount>
                        <LowStockAlertsTab />
                    </TabsContent>

                    <TabsContent value="staff" className="mt-6" forceMount>
                        <StaffTab />
                    </TabsContent>
                </Tabs>

                {/* User Info Bar - แสดงเฉพาะหน้า Settings ตามตัวอย่าง */}
                <div className="border border-gold/50 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                    <UserInfoBar />
                </div>
            </div>

            {/* Copyright Footer */}
            <div className="flex items-center justify-center mt-8 mb-4">
                <p className="text-xs text-muted-foreground">© 2025 พัฒนาโดย น๊อต"ตัวผู้"</p>
            </div>
        </div>
    );
}
