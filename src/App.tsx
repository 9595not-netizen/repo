import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Login from '@/pages/Login';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { AddRedirect } from '@/components/AddRedirect';
import { Toaster } from '@/components/ui/toaster';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Stock = lazy(() => import('@/pages/Stock'));
const LowStockPage = lazy(() => import('@/pages/LowStockPage'));
const Sell = lazy(() => import('@/pages/Sell'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/add" element={<AddRedirect />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/low-stock" element={<LowStockPage />} />
                <Route path="/sell" element={<Sell />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* 404 redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
