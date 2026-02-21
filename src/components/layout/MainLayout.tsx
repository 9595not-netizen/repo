import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

export function MainLayout() {
    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            <Header />

            <main className="flex-1 w-full max-w-screen-2xl mx-auto pt-16 pb-20 px-4 md:px-6 lg:px-8 overflow-y-auto overflow-x-hidden">
                <Outlet />
            </main>

            <BottomNav />
        </div>
    );
}
