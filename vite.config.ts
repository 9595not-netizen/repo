import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { fileURLToPath } from 'url';
import mkcert from "vite-plugin-mkcert";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => ({
    server: {
        host: "::",
        port: 8080,
        // ใช้ VITE_HTTPS=true npm run dev เพื่อเปิด HTTPS (กล้องใช้ได้เมื่อเข้า via IP)
    },
    plugins: [
        react(),
        mode === 'development' && componentTagger(),
        process.env.VITE_HTTPS === 'true' && mkcert(), // HTTPS dev: VITE_HTTPS=true npm run dev
    ].filter(Boolean),
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : undefined,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui-radix': [
                        '@radix-ui/react-dialog',
                        '@radix-ui/react-dropdown-menu',
                        '@radix-ui/react-select',
                        '@radix-ui/react-tabs',
                        '@radix-ui/react-toast',
                    ],
                    'data-vendor': ['@tanstack/react-query', '@supabase/supabase-js'],
                    'charts': ['recharts'],
                    'scanner': ['html5-qrcode'],
                    'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
                },
            },
        },
        chunkSizeWarningLimit: 500,
        minify: 'esbuild',
        target: 'esnext',
    },
}));
