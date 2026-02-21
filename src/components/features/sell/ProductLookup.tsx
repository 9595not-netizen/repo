import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { Database } from '@/types/database.types';
import { IMEIScanner } from '@/components/features/add-product/IMEIScanner';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

interface ProductLookupProps {
    onProductFound: (product: ProductDetail) => void;
}

/**
 * Product Lookup Component
 * - Scan IMEI หรือ shop_code
 * - Refresh Real-time แสดงข้อมูลทันทีไม่ต้องมีปุ่มค้นหา
 * - ปุ่มกล้องสแกน เปิดกล้องหลัง (mobile)
 * - แสดงกรอบ guide จับภาพและอ่าน IMEI
 * - ยังพิมพ์ด้วยมือได้
 * - Check: status = 'in_stock'
 */
export function ProductLookup({ onProductFound }: ProductLookupProps) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [showImeiScanner, setShowImeiScanner] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    
    // Maintain focus on input field - prevent losing focus on re-render
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;
        
        // Store current selection
        const selectionStart = input.selectionStart;
        const selectionEnd = input.selectionEnd;
        
        // Refocus after a short delay to ensure DOM is ready
        const timer = setTimeout(() => {
            if (input && document.activeElement !== input) {
                input.focus();
                // Restore cursor position
                if (selectionStart !== null && selectionEnd !== null) {
                    input.setSelectionRange(selectionStart, selectionEnd);
                }
            }
        }, 0);
        
        return () => clearTimeout(timer);
    }, [query, loading]);

    const cancelledRef = useRef(false);
    useEffect(() => {
        cancelledRef.current = false;
        return () => { cancelledRef.current = true; };
    }, []);

    const handleSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setLoading(false);
            return;
        }

        const trimmedQuery = searchQuery.trim();
        setLoading(true);
        try {
            // Find product by IMEI or Shop Code that is IN STOCK
            // ใช้ ilike สำหรับ partial match (เช่น พิมพ์ "001" แล้วเจอ "C001")
            // Query แยก 2 queries แล้ว merge เพื่อหลีกเลี่ยง 406 error
            const [shopCodeResult, imeiResult] = await Promise.all([
                supabase
                    .from('product_details')
                    .select('*')
                    .ilike('shop_code', `%${trimmedQuery}%`)
                    .eq('status', 'in_stock')
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from('product_details')
                    .select('*')
                    .ilike('imei', `%${trimmedQuery}%`)
                    .eq('status', 'in_stock')
                    .limit(1)
                    .maybeSingle(),
            ]);

            const product = (shopCodeResult.data || imeiResult.data) as ProductDetail | null;
            const error = shopCodeResult.error || imeiResult.error;

            if (error && error.code !== 'PGRST116') {
                // 406 error หรือ error อื่นๆ
                console.error('Search error:', error);
                // ไม่ throw error เพื่อไม่รบกวนผู้ใช้ขณะพิมพ์ real-time
                return;
            }
            
            if (product && !cancelledRef.current) {
                onProductFound(product);
            }
        } catch (err: unknown) {
            if (!cancelledRef.current) console.error('Search error:', err);
        } finally {
            if (!cancelledRef.current) setLoading(false);
        }
    }, [onProductFound]);

    // Auto-search with debounce (real-time)
    useEffect(() => {
        if (!query.trim()) {
            setLoading(false);
            return;
        }

        // Debounce: รอ 500ms หลังผู้ใช้หยุดพิมพ์
        const timeoutId = setTimeout(() => {
            handleSearch(query);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, handleSearch]);

    const handleScan = async (imei: string) => {
        const trimmedImei = imei.trim();
        setQuery(trimmedImei);
        setShowImeiScanner(false);
        // Auto search immediately after scan (ไม่ต้องรอ debounce)
        setLoading(true);
        try {
            // Query แยก 2 queries แล้ว merge เพื่อหลีกเลี่ยง 406 error
            // ใช้ ilike สำหรับ partial match
            const [shopCodeResult, imeiResult] = await Promise.all([
                supabase
                    .from('product_details')
                    .select('*')
                    .ilike('shop_code', `%${trimmedImei}%`)
                    .eq('status', 'in_stock')
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from('product_details')
                    .select('*')
                    .ilike('imei', `%${trimmedImei}%`)
                    .eq('status', 'in_stock')
                    .limit(1)
                    .maybeSingle(),
            ]);

            const product = (shopCodeResult.data || imeiResult.data) as ProductDetail | null;
            const error = shopCodeResult.error || imeiResult.error;

            if (error && error.code !== 'PGRST116') {
                console.error('Scan search error:', error);
                toast({
                    title: "เกิดข้อผิดพลาด",
                    description: error.message || "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
                    variant: "destructive"
                });
                return;
            }

            if (product) {
                onProductFound(product);
                // ไม่ clear input field เพื่อให้ผู้ใช้พิมพ์ต่อได้
            } else {
                toast({
                    title: "ไม่พบสินค้า",
                    description: "ไม่พบสินค้าในสต๊อก หรือสินค้านี้ขายไปแล้ว",
                    variant: "destructive"
                });
            }
        } catch (err: unknown) {
            console.error('Scan search error:', err);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: getErrorMessage(err),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEnterKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && query.trim()) {
            e.preventDefault();
            const trimmedQuery = query.trim();
            // เมื่อกด Enter ให้แสดง error ถ้าไม่พบ
            setLoading(true);
            try {
                // Query แยก 2 queries แล้ว merge เพื่อหลีกเลี่ยง 406 error
                // ใช้ ilike สำหรับ partial match
                const [shopCodeResult, imeiResult] = await Promise.all([
                    supabase
                        .from('product_details')
                        .select('*')
                        .ilike('shop_code', `%${trimmedQuery}%`)
                        .eq('status', 'in_stock')
                        .limit(1)
                        .maybeSingle(),
                    supabase
                        .from('product_details')
                        .select('*')
                        .ilike('imei', `%${trimmedQuery}%`)
                        .eq('status', 'in_stock')
                        .limit(1)
                        .maybeSingle(),
                ]);

                const product = (shopCodeResult.data || imeiResult.data) as ProductDetail | null;
                const error = shopCodeResult.error || imeiResult.error;

                if (error && error.code !== 'PGRST116') {
                    console.error('Enter search error:', error);
                    toast({
                        title: "เกิดข้อผิดพลาด",
                        description: error.message || "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
                        variant: "destructive"
                    });
                    return;
                }

                if (product) {
                    onProductFound(product);
                    // ไม่ clear input field เพื่อให้ผู้ใช้พิมพ์ต่อได้
                } else {
                    toast({
                        title: "ไม่พบสินค้า",
                        description: "ไม่พบสินค้าในสต๊อก หรือสินค้านี้ขายไปแล้ว",
                        variant: "destructive"
                    });
                }
            } catch (err: unknown) {
                console.error('Enter search error:', err);
                toast({
                    title: "เกิดข้อผิดพลาด",
                    description: getErrorMessage(err),
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <>
            <div className="imei-input-wrapper">
                <span style={{
                    position: 'absolute',
                    left: '14px',
                    color: '#9CA3AF',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 1
                }}>
                    🔍
                </span>
                <input
                    ref={inputRef}
                    className="form-input"
                    style={{ paddingLeft: '40px', paddingRight: loading ? '48px' : '48px' }}
                    placeholder="กรอก Shop Code หรือ IMEI (ค้นหาอัตโนมัติ)"
                    value={query}
                    onChange={(e) => {
                        const value = e.target.value;
                        const cursorPos = e.target.selectionStart;
                        setQuery(value);
                        // Maintain focus and cursor position
                        requestAnimationFrame(() => {
                            if (inputRef.current) {
                                inputRef.current.focus();
                                if (cursorPos !== null) {
                                    inputRef.current.setSelectionRange(cursorPos, cursorPos);
                                }
                            }
                        });
                    }}
                    onKeyDown={handleEnterKey}
                    onFocus={(e) => {
                        // Ensure cursor is at the end when focused
                        const len = e.target.value.length;
                        e.target.setSelectionRange(len, len);
                    }}
                    disabled={loading}
                    autoFocus
                />
                {loading && (
                    <Loader2 style={{
                        position: 'absolute',
                        right: '48px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px'
                    }} className="animate-spin text-muted-foreground" />
                )}
                <button
                    className="imei-scan-btn"
                    onClick={() => setShowImeiScanner(true)}
                    disabled={loading}
                    type="button"
                    title="สแกน IMEI"
                >
                    📷
                </button>
            </div>
            
            <IMEIScanner
                open={showImeiScanner}
                onClose={() => setShowImeiScanner(false)}
                onScan={handleScan}
            />
        </>
    );
}
