import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { supabaseHelpers } from '@/lib/supabase-helpers';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffList } from '@/hooks/useStaffList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoldCard } from '@/components/ui/gold-card';
import { Loader2, CheckCircle2, Camera, Search } from 'lucide-react';
import { IMEIScanner } from '@/components/features/add-product/IMEIScanner';
import { useToast } from '@/hooks/use-toast';
import { SaleConfirmModal } from './SaleConfirmModal';
import { SaleSuccessScreen } from './SaleSuccessScreen';
import { getProductDisplayImage } from '@/lib/utils';
import { getErrorMessage } from '@/lib/error-handler';
import { Database } from '@/types/database.types';
import { saleFormSchema, type SaleFormValues } from './saleFormSchema';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

export function SellForm() {
    const [searchParams] = useSearchParams();
    const productIdFromUrl = searchParams.get('product_id');
    const { toast } = useToast();
    const { user, userProfile } = useAuth();
    const currentUserDisplay =
        userProfile?.username ||
        userProfile?.full_name ||
        (user?.user_metadata?.username as string) ||
        user?.email?.split('@')[0] ||
        'ไม่ระบุ';
    const { staff, loadingStaff } = useStaffList();
    const [searchTerm, setSearchTerm] = useState('');
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [showImeiScanner, setShowImeiScanner] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    
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
    }, [searchTerm, loading]);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);
    interface SaleSuccessData {
        product: ProductDetail;
        saleData: {
            sold_to: string;
            payment_method: string;
            contract_number?: string;
            selling_price: number;
            sold_at: string;
            sold_by: string;
            profit: number;
        };
    }

    const [successData, setSuccessData] = useState<SaleSuccessData | null>(null);
    const [saleData, setSaleData] = useState<SaleFormValues | null>(null);

    const form = useForm<SaleFormValues>({
        resolver: zodResolver(saleFormSchema),
        defaultValues: {
            payment_method: 'เงินสด',
            selling_price: 0,
            sold_to: '',
            contract_number: '',
            sold_at: new Date().toISOString().split('T')[0],
            sold_by: '__current__',
        },
    });

    const paymentMethod = form.watch('payment_method');
    const sellingPrice = form.watch('selling_price');
    const profit = paymentMethod === 'ผ่อนชำระ' ? 0 : (product ? (sellingPrice || 0) - (product.cost_price || 0) : 0);

    // เมื่อเลือกผ่อนชำระ → ตั้งราคาขาย 0 (ใช้แค่ตัดสต๊อก); เงินสด → คืนราคาแนะนำ
    useEffect(() => {
        if (paymentMethod === 'ผ่อนชำระ') {
            form.setValue('selling_price', 0);
        } else if (product) {
            form.setValue('selling_price', product.selling_price ?? 0);
        }
    }, [paymentMethod, product, form]);

    // Set default selling price when product changes (ยกเว้นกรณีผ่อนชำระ)
    useEffect(() => {
        if (product && paymentMethod !== 'ผ่อนชำระ') {
            form.setValue('selling_price', product.selling_price ?? 0);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run when product changes; omit form
    }, [product, paymentMethod]);

    // โหลดสินค้าจาก URL เมื่อกด "ขาย" จาก Product Detail Modal (Master: navigateToSell(product_id))
    useEffect(() => {
        if (!productIdFromUrl) return;
        let cancelled = false;
        const loadByProductId = async () => {
            setLoading(true);
            try {
                const { data: foundProduct, error } = await supabase
                    .from('product_details')
                    .select('*')
                    .eq('id', productIdFromUrl)
                    .single();
                if (cancelled) return;
                if (!error && foundProduct) {
                    const product = foundProduct as ProductDetail;
                    if (product.status !== 'in_stock') {
                        toast({
                            title: 'สินค้าไม่สามารถขายได้',
                            description: `สถานะ: ${product.status}`,
                            variant: 'destructive',
                        });
                        return;
                    }
                    setProduct(product);
                    form.setValue('selling_price', (product.selling_price ?? 0) as number);
                    setSearchTerm((product.shop_code || product.imei || '') as string);
                    toast({ title: 'พบสินค้า', description: `${product.brand_name} ${product.model_name}`, className: 'bg-green-500 text-white' });
                }
            } catch {
                if (!cancelled) toast({ title: 'ไม่พบสินค้า', variant: 'destructive' });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadByProductId();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run when productIdFromUrl changes
    }, [productIdFromUrl]);

    // Real-time search function (no button needed)
    const handleSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setLoading(false);
            return;
        }

        const trimmedQuery = searchQuery.trim();
        setLoading(true);
        try {
            // Query แยก 2 queries แล้ว merge เพื่อหลีกเลี่ยง 406 error
            // ใช้ ilike สำหรับ partial match (เช่น พิมพ์ "001" แล้วเจอ "C001")
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

            const foundProduct = (shopCodeResult.data || imeiResult.data) as ProductDetail | null;
            const error = shopCodeResult.error || imeiResult.error;

            if (error && error.code !== 'PGRST116') {
                console.error('Search error:', error);
                // ไม่แสดง toast เพื่อไม่รบกวนผู้ใช้ขณะพิมพ์ real-time
                return;
            }

            if (foundProduct) {
                // แสดงสินค้าที่พบ (ค้นหาใหม่ทุกครั้งที่ query เปลี่ยน)
                setProduct(foundProduct);
                form.setValue('selling_price', (foundProduct.selling_price ?? 0) as number);
                // ไม่ clear input field เพื่อให้ผู้ใช้พิมพ์ต่อได้
                // Focus จะถูก maintain โดย useEffect
            }
            // ไม่พบสินค้า - ไม่แสดง toast เพื่อไม่รบกวนผู้ใช้ขณะพิมพ์
        } catch (err: unknown) {
            console.error('Search error:', err);
            // ไม่แสดง toast เพื่อไม่รบกวนผู้ใช้ขณะพิมพ์ real-time
        } finally {
            setLoading(false);
        }
    };

    // Auto-search with debounce (real-time)
    useEffect(() => {
        if (!searchTerm.trim()) {
            setLoading(false);
            return;
        }

        // Debounce: รอ 500ms หลังผู้ใช้หยุดพิมพ์
        const timeoutId = setTimeout(() => {
            handleSearch(searchTerm);
        }, 500);

        return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run when searchTerm changes; omit handleSearch
    }, [searchTerm]);

    // Handle Enter key
    const handleEnterKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            e.preventDefault();
            const trimmedQuery = searchTerm.trim();
            setLoading(true);
            try {
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

                const foundProduct = (shopCodeResult.data || imeiResult.data) as ProductDetail | null;
                const error = shopCodeResult.error || imeiResult.error;

                if (error && error.code !== 'PGRST116') {
                    toast({
                        title: "เกิดข้อผิดพลาด",
                        description: error.message || "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
                        variant: "destructive"
                    });
                    return;
                }

                if (foundProduct) {
                    setProduct(foundProduct);
                    form.setValue('selling_price', (foundProduct.selling_price ?? 0) as number);
                    // ไม่ clear input field เพื่อให้ผู้ใช้พิมพ์ต่อได้
                } else {
                    toast({
                        title: "ไม่พบสินค้า",
                        description: "ไม่พบสินค้าในสต๊อก หรือสินค้านี้ขายไปแล้ว",
                        variant: "destructive"
                    });
                }
            } catch (err: unknown) {
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

    // Handle IMEI scan
    const handleScan = async (imei: string) => {
        const trimmedImei = imei.trim();
        setSearchTerm(trimmedImei);
        setShowImeiScanner(false);
        // Auto search immediately after scan
        setLoading(true);
        try {
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

            const foundProduct = (shopCodeResult.data || imeiResult.data) as ProductDetail | null;
            const error = shopCodeResult.error || imeiResult.error;

            if (error && error.code !== 'PGRST116') {
                toast({
                    title: "เกิดข้อผิดพลาด",
                    description: error.message || "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
                    variant: "destructive"
                });
                return;
            }

            if (foundProduct) {
                setProduct(foundProduct);
                form.setValue('selling_price', (foundProduct.selling_price ?? 0) as number);
                // ไม่ clear input field เพื่อให้ผู้ใช้พิมพ์ต่อได้
            } else {
                toast({
                    title: "ไม่พบสินค้า",
                    description: "ไม่พบสินค้าในสต๊อก หรือสินค้านี้ขายไปแล้ว",
                    variant: "destructive"
                });
            }
        } catch (err: unknown) {
            toast({
                title: "เกิดข้อผิดพลาด",
                description: getErrorMessage(err),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitSale = async (data: SaleFormValues) => {
        if (!product) {
            toast({
                title: "ข้อผิดพลาด",
                description: "กรุณาค้นหาสินค้าก่อน",
                variant: "destructive"
            });
            return;
        }

        // Validate contract number for installment
        if (data.payment_method === 'ผ่อนชำระ' && !data.contract_number) {
            form.setError('contract_number', { message: 'กรุณาระบุเลขที่สัญญาสำหรับผ่อนชำระ' });
            return;
        }

        const soldByStaff = staff.find((s) => s.id === data.sold_by);
        const soldByName =
            data.sold_by === '__current__'
                ? currentUserDisplay
                : (soldByStaff?.username || soldByStaff?.full_name || 'ไม่ระบุ');
        setSaleData({ ...data, sold_by_name: soldByName } as SaleFormValues & { sold_by_name?: string });
        setShowConfirmModal(true);
    };

    const handleConfirmSale = async () => {
        if (!product || !saleData) return;

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // sold_at: เก็บเป็น TIMESTAMPTZ (เที่ยงวัน local เพื่อไม่เลื่อนวันจาก timezone)
            const soldAtIso = saleData.sold_at
                ? new Date(saleData.sold_at + 'T12:00:00.000').toISOString()
                : new Date().toISOString();

            const soldByUserId = saleData.sold_by === '__current__' ? user.id : saleData.sold_by;
            const priceToSave = saleData.payment_method === 'ผ่อนชำระ' ? 0 : saleData.selling_price;

            // 1. พยายามใช้ RPC หากมี เพื่อให้เป็นธุรกรรมเดียวใน DB
            let usedRpc = false;
            try {
                const { error: rpcError } = await supabase.rpc('complete_single_sale', {
                    p_product_id: product.id,
                    p_sold_to: saleData.sold_to,
                    p_payment_method: saleData.payment_method,
                    p_contract_number: saleData.contract_number ?? null,
                    p_selling_price: priceToSave,
                    p_sold_at: soldAtIso,
                    p_sold_by: soldByUserId,
                });

                if (rpcError) {
                    const code = (rpcError as { code?: string }).code;
                    const msg = (rpcError as { message?: string }).message ?? '';
                    const isRpcMissing =
                        code === 'PGRST202' ||
                        /404|not found|function/i.test(msg);

                    if (!isRpcMissing) {
                        throw rpcError;
                    }
                } else {
                    usedRpc = true;
                }
            } catch (e) {
                if (e && typeof e === 'object' && 'code' in e) {
                    const code = (e as { code?: string }).code;
                    const msg = (e as { message?: string }).message ?? '';
                    const isRpcMissing =
                        code === 'PGRST202' ||
                        /404|not found|function/i.test(msg);
                    if (!isRpcMissing) {
                        throw e;
                    }
                } else {
                    throw e;
                }
            }

            if (!usedRpc) {
                // Fallback เดิม: update โดยตรงในตาราง products
                const { data: updatedProduct, error: updateError } = await supabase
                    .from('products')
                    .update({
                        status: 'sold',
                        selling_price: priceToSave,
                        sold_by: soldByUserId,
                        sold_to: saleData.sold_to,
                        payment_method: saleData.payment_method as 'เงินสด' | 'ผ่อนชำระ' | null,
                        contract_number: saleData.payment_method === 'ผ่อนชำระ' ? saleData.contract_number : null,
                        sold_at: soldAtIso,
                    } as never)
                    .eq('id', product.id)
                    .eq('status', 'in_stock')
                    .select()
                    .single();

                if (updateError) {
                    throw updateError;
                }

                if (!updatedProduct) {
                    throw new Error('ไม่พบสินค้าสำหรับขาย หรือสินค้านี้ถูกขายไปแล้ว');
                }

                // 2. Insert inventory log (เฉพาะ fallback; RPC จะเขียน log เอง)
                const { error: logError } = await supabaseHelpers.insertInventoryLog(supabase, {
                    product_id: product.id,
                    action_type: 'sell',
                    action_by: user.id,
                    action_note: `ขายให้: ${saleData.sold_to} (${saleData.payment_method})`,
                });
                if (logError) {
                    console.error('Inventory log error (sell):', logError);
                }
            }

            // Show success screen
            setSuccessData({
                product,
                saleData: {
                    ...saleData,
                    profit
                }
            });
            setShowSuccessScreen(true);
            setShowConfirmModal(false);

        } catch (error: unknown) {
            toast({
                title: "เกิดข้อผิดพลาด",
                description: getErrorMessage(error),
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSuccessReset = () => {
        setProduct(null);
        setSearchTerm('');
        form.reset({
            payment_method: 'เงินสด',
            selling_price: 0,
            sold_to: '',
            contract_number: '',
            sold_at: new Date().toISOString().split('T')[0],
            sold_by: '__current__',
        });
        setSaleData(null);
        setShowSuccessScreen(false);
        // Focus back to input field
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    };

    // Success screen
    if (showSuccessScreen && successData) {
        return <SaleSuccessScreen data={successData} onContinue={handleSuccessReset} />;
    }

    return (
        <div className="space-y-6">
            {/* Product Lookup Section */}
            <GoldCard className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                    ค้นหาสินค้า
                </h3>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            value={searchTerm}
                            onChange={(e) => {
                                const value = e.target.value;
                                const cursorPos = e.target.selectionStart;
                                setSearchTerm(value);
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
                            placeholder="กรอก Shop Code หรือ IMEI (ค้นหาอัตโนมัติ)"
                            className="pl-9 h-12"
                            disabled={loading}
                            autoFocus
                        />
                        {loading && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                    </div>
                    <Button
                        onClick={() => setShowImeiScanner(true)}
                        variant="outline"
                        className="h-12 px-4"
                        disabled={loading}
                        type="button"
                        title="สแกน IMEI"
                    >
                        <Camera className="w-5 h-5" />
                    </Button>
                </div>
                <IMEIScanner
                    open={showImeiScanner}
                    onClose={() => setShowImeiScanner(false)}
                    onScan={handleScan}
                />
            </GoldCard>

            {/* Product Summary Section */}
            {product && (
                <>
                    <GoldCard className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Product Image */}
                            <div className="flex justify-center items-start">
                                <div className="w-32 h-40 bg-muted rounded-lg border border-gold/30 flex items-center justify-center overflow-hidden">
                                    {getProductDisplayImage(product) ? (
                                        <img src={getProductDisplayImage(product)!} alt={product.model_name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-muted-foreground text-xs text-center p-2">ไม่มีรูปภาพ</div>
                                    )}
                                </div>
                            </div>

                            {/* Product Details */}
                            <div className="md:col-span-2 space-y-3">
                                <div>
                                    <h3 className="text-2xl font-bold text-primary">{product.brand_name} {product.model_name}</h3>
                                    <p className="text-muted-foreground">{product.storage} • {product.color_name}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 py-2 border-y border-gold/20">
                                    <div>
                                        <p className="text-xs text-muted-foreground">รหัสร้าน</p>
                                        <p className="font-semibold text-sm">{product.shop_code}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">IMEI</p>
                                        <p className="font-semibold text-sm">{product.imei}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">ประเภท</p>
                                        <p className={`font-semibold text-sm ${product.type === 'มือ 1' ? 'text-blue-600' : 'text-orange-600'}`}>
                                            {product.type}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">สถานะ</p>
                                        <p className="font-semibold text-sm text-green-600 flex items-center gap-1">
                                            <CheckCircle2 className="h-4 w-4" /> พร้อมขาย
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="bg-secondary/50 p-3 rounded-lg">
                                        <p className="text-xs text-muted-foreground">ราคาทุน</p>
                                        <p className="text-lg font-bold text-secondary-foreground">
                                            ฿{product.cost_price?.toLocaleString('th-TH')}
                                        </p>
                                    </div>
                                    <div className="bg-primary/10 p-3 rounded-lg">
                                        <p className="text-xs text-muted-foreground">ราคาแนะนำ</p>
                                        <p className="text-lg font-bold text-primary">
                                            ฿{product.selling_price?.toLocaleString('th-TH')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GoldCard>

                    {/* Sale Form Section */}
                    <form onSubmit={form.handleSubmit(handleSubmitSale)} className="space-y-6">
                        {/* Payment Section */}
                        <GoldCard className="p-6">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                                ข้อมูลการชำระเงิน
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Payment Method */}
                                <div className="space-y-2">
                                    <Label>วิธีชำระเงิน *</Label>
                                    <div className="flex gap-2">
                                        {['เงินสด', 'ผ่อนชำระ'].map((method) => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => form.setValue('payment_method', method as 'เงินสด' | 'ผ่อนชำระ')}
                                                className={`flex-1 py-2 px-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                                                    paymentMethod === method
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-border bg-muted/50 text-muted-foreground'
                                                }`}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Selling Price - ไม่ใช้สำหรับผ่อนชำระ (ใช้แค่ตัดสต๊อก) */}
                                {paymentMethod === 'เงินสด' ? (
                                    <div className="space-y-2">
                                        <Label>ราคาขาย (฿) *</Label>
                                        <Input
                                            type="number"
                                            {...form.register('selling_price')}
                                            placeholder="0"
                                            disabled={submitting}
                                            className="text-lg"
                                        />
                                        {form.formState.errors.selling_price && (
                                            <p className="text-xs text-destructive">{form.formState.errors.selling_price.message}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>ราคาขาย</Label>
                                        <p className="text-sm text-muted-foreground py-2">ผ่อนชำระ — ไม่บันทึกราคาขาย (ตัดสต๊อกเท่านั้น)</p>
                                    </div>
                                )}

                                {/* Customer Name */}
                                <div className="space-y-2">
                                    <Label>ชื่อผู้ซื้อ *</Label>
                                    <Input
                                        {...form.register('sold_to')}
                                        placeholder="เช่น นาย ก"
                                        disabled={submitting}
                                    />
                                    {form.formState.errors.sold_to && (
                                        <p className="text-xs text-destructive">{form.formState.errors.sold_to.message}</p>
                                    )}
                                </div>

                                {/* Contract Number (for installment) */}
                                {paymentMethod === 'ผ่อนชำระ' && (
                                    <div className="space-y-2">
                                        <Label>เลขที่สัญญา *</Label>
                                        <Input
                                            {...form.register('contract_number')}
                                            placeholder="เช่น SKY-2569-001"
                                            disabled={submitting}
                                        />
                                        {form.formState.errors.contract_number && (
                                            <p className="text-xs text-destructive">{form.formState.errors.contract_number.message}</p>
                                        )}
                                    </div>
                                )}

                                {/* Date */}
                                <div className="space-y-2">
                                    <Label>วันที่ขาย *</Label>
                                    <Input
                                        type="date"
                                        {...form.register('sold_at')}
                                        disabled={submitting}
                                    />
                                </div>

                                {/* Staff Member */}
                                <div className="space-y-2">
                                    <Label>พนักงานขาย *</Label>
                                    {loadingStaff ? (
                                        <div className="flex items-center gap-2 p-2 border rounded-md">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">กำลังโหลดรายชื่อพนักงาน...</span>
                                        </div>
                                    ) : (
                                        <Select value={form.watch('sold_by') || '__current__'} onValueChange={(val) => form.setValue('sold_by', val)}>
                                            <SelectTrigger disabled={submitting}>
                                                <SelectValue placeholder="เลือกพนักงานขาย" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__current__">
                                                    👤 ผู้ใช้ปัจจุบัน ({currentUserDisplay})
                                                </SelectItem>
                                                {staff.length === 0 ? (
                                                    <SelectItem value="__no_staff__" disabled>ไม่พบรายชื่อพนักงาน</SelectItem>
                                                ) : (
                                                    staff.map((s) => {
                                                        const displayName = s.username || s.full_name || 'ไม่ระบุ';
                                                        return (
                                                            <SelectItem key={s.id} value={s.id}>
                                                                {displayName}
                                                            </SelectItem>
                                                        );
                                                    })
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {form.formState.errors.sold_by && (
                                        <p className="text-xs text-destructive">{form.formState.errors.sold_by.message}</p>
                                    )}
                                </div>
                            </div>
                        </GoldCard>

                        {/* Summary Card */}
                        <GoldCard className="p-6 bg-gradient-to-br from-primary/5 to-blue-500/5 border-green-500/30">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                                สรุปการขาย
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-secondary/50 p-4 rounded-lg">
                                    <p className="text-xs text-muted-foreground">ราคาทุน</p>
                                    <p className="text-2xl font-bold text-secondary-foreground">
                                        ฿{product.cost_price?.toLocaleString('th-TH')}
                                    </p>
                                </div>
                                <div className="bg-primary/10 p-4 rounded-lg">
                                    <p className="text-xs text-muted-foreground">ราคาขาย</p>
                                    <p className="text-2xl font-bold text-primary">
                                        ฿{sellingPrice.toLocaleString('th-TH')}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-lg border-2 ${
                                    profit > 0
                                        ? 'border-green-500/30 bg-green-500/10'
                                        : profit < 0
                                        ? 'border-red-500/30 bg-red-500/10'
                                        : 'border-yellow-500/30 bg-yellow-500/10'
                                }`}>
                                    <p className="text-xs text-muted-foreground">กำไร</p>
                                    <p className={`text-2xl font-bold ${
                                        profit > 0
                                            ? 'text-green-600'
                                            : profit < 0
                                            ? 'text-red-600'
                                            : 'text-yellow-600'
                                    }`}>
                                        ฿{profit.toLocaleString('th-TH')}
                                    </p>
                                </div>
                            </div>
                        </GoldCard>

                        {/* Buttons */}
                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-lg h-12 font-semibold"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    'ยืนยันการขาย'
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-12"
                                onClick={() => {
                                    setProduct(null);
                                    setSearchTerm('');
                                    form.reset({
                                        payment_method: 'เงินสด',
                                        selling_price: 0,
                                        sold_to: '',
                                        contract_number: '',
                                        sold_at: new Date().toISOString().split('T')[0],
                                        sold_by: '__current__',
                                    });
                                    // Focus back to input field
                                    setTimeout(() => {
                                        inputRef.current?.focus();
                                    }, 0);
                                }}
                                disabled={submitting}
                            >
                                ยกเลิก
                            </Button>
                        </div>
                    </form>
                </>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && product && saleData && (
                <SaleConfirmModal
                    product={product}
                    saleData={{
                        ...saleData,
                        profit
                    }}
                    onConfirm={handleConfirmSale}
                    onCancel={() => setShowConfirmModal(false)}
                    loading={submitting}
                />
            )}
        </div>
    );
}
