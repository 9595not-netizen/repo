import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

/**
 * Phase 3: Core Layout
 * - Header 64px fixed top
 * - Main: padding top 64px, padding bottom 64px, responsive grid
 * - BottomNav 64px fixed bottom
 * - Design: Glass morphism, Gold border 1.5px (#D4AF37), 8px spacing, Prompt font
 */
export function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <main
        className="flex-1 w-full max-w-screen-2xl mx-auto overflow-y-auto overflow-x-hidden"
        style={{
          paddingTop: '64px',
          paddingBottom: '64px',
        }}
      >
        <div className="grid grid-cols-1 gap-2 p-2 md:gap-4 md:p-4 lg:px-8">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
