import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffList } from '@/hooks/useStaffList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoldCard } from '@/components/ui/gold-card';
import { Loader2, CheckCircle2, Camera, Search, Plus, List } from 'lucide-react';
import { LazyIMEIScanner } from '@/components/features/add-product/LazyIMEIScanner';
import { useToast } from '@/hooks/use-toast';
import { SaleConfirmModal } from './SaleConfirmModal';
import { SaleSuccessScreen } from './SaleSuccessScreen';
import { MultiSaleConfirmModal } from './MultiSaleConfirmModal';
import { MultiSaleSuccessScreen } from './MultiSaleSuccessScreen';
import { SellCartPanel } from './SellCartPanel';
import { getProductDisplayImage } from '@/lib/utils';
import { getErrorMessage } from '@/lib/error-handler';
import { Database } from '@/types/database.types';
import { saleFormSchema, type SaleFormValues } from './saleFormSchema';
import { completeOneSale, completeManySales, soldAtToIso } from './completeSale';
import type { SellCartLine, SellMode, MultiSaleSuccessData } from './sellCartTypes';
import { cn } from '@/lib/utils';

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

    const [sellMode, setSellMode] = useState<SellMode>('single');
    const [cartItems, setCartItems] = useState<SellCartLine[]>([]);
    const [showMultiConfirmModal, setShowMultiConfirmModal] = useState(false);
    const [multiSaleData, setMultiSaleData] = useState<(SaleFormValues & { sold_by_name?: string }) | null>(null);
    const [multiSuccessData, setMultiSuccessData] = useState<MultiSaleSuccessData | null>(null);
    const [showMultiSuccessScreen, setShowMultiSuccessScreen] = useState(false);

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

    // โหมดหลายรายการ: อัปเดตราคาในตะกร้าเมื่อเปลี่ยนวิธีชำระ
    useEffect(() => {
        if (sellMode !== 'multi' || cartItems.length === 0) return;
        setCartItems((prev) =>
            prev.map((line) => ({
                ...line,
                selling_price:
                    paymentMethod === 'ผ่อนชำระ'
                        ? 0
                        : line.selling_price > 0
                          ? line.selling_price
                          : (line.product.selling_price ?? 0),
            }))
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync cart prices when payment method changes
    }, [paymentMethod, sellMode]);

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

            const soldAtIso = soldAtToIso(saleData.sold_at);
            const soldByUserId = saleData.sold_by === '__current__' ? user.id : saleData.sold_by;
            const priceToSave = saleData.payment_method === 'ผ่อนชำระ' ? 0 : saleData.selling_price;

            await completeOneSale({
                productId: product.id,
                soldTo: saleData.sold_to,
                paymentMethod: saleData.payment_method,
                contractNumber: saleData.contract_number ?? null,
                sellingPrice: priceToSave,
                soldAtIso,
                soldByUserId,
                actionByUserId: user.id,
            });

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

    const resolveSoldByName = (soldBy: string) => {
        if (soldBy === '__current__') return currentUserDisplay;
        const soldByStaff = staff.find((s) => s.id === soldBy);
        return soldByStaff?.username || soldByStaff?.full_name || 'ไม่ระบุ';
    };

    const handleAddToCart = () => {
        if (!product) {
            toast({ title: 'กรุณาค้นหาสินค้าก่อน', variant: 'destructive' });
            return;
        }
        if (cartItems.some((line) => line.product.id === product.id)) {
            toast({
                title: 'มีในรายการแล้ว',
                description: `${product.shop_code} ถูกเพิ่มในรายการขายแล้ว`,
                variant: 'destructive',
            });
            return;
        }
        const linePrice = paymentMethod === 'ผ่อนชำระ' ? 0 : sellingPrice;
        if (paymentMethod === 'เงินสด' && linePrice < 1) {
            form.setError('selling_price', { message: 'ราคาขายต้องมากกว่า 0 สำหรับขายสด' });
            return;
        }
        setCartItems((prev) => [
            ...prev,
            { product, selling_price: linePrice },
        ]);
        setProduct(null);
        setSearchTerm('');
        toast({
            title: 'เพิ่กลงรายการแล้ว',
            description: `${product.brand_name} ${product.model_name}`,
            className: 'bg-green-500 text-white',
        });
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleSubmitMultiSale = async (data: SaleFormValues) => {
        if (cartItems.length === 0) {
            toast({
                title: 'ไม่มีรายการขาย',
                description: 'กรุณาเพิ่กสินค้าอย่างน้อย 1 รายการ',
                variant: 'destructive',
            });
            return;
        }
        if (data.payment_method === 'ผ่อนชำระ' && !data.contract_number) {
            form.setError('contract_number', { message: 'กรุณาระบุเลขที่สัญญาสำหรับผ่อนชำระ' });
            return;
        }
        if (data.payment_method === 'เงินสด') {
            const invalid = cartItems.find((line) => line.selling_price < 1);
            if (invalid) {
                toast({
                    title: 'ราคาขายไม่ครบ',
                    description: `กรุณาระบุราคาขายของ ${invalid.product.shop_code}`,
                    variant: 'destructive',
                });
                return;
            }
        }
        setMultiSaleData({ ...data, sold_by_name: resolveSoldByName(data.sold_by) });
        setShowMultiConfirmModal(true);
    };

    const handleConfirmMultiSale = async () => {
        if (!multiSaleData || cartItems.length === 0) return;

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const soldAtIso = soldAtToIso(multiSaleData.sold_at);
            const soldByUserId =
                multiSaleData.sold_by === '__current__' ? user.id : multiSaleData.sold_by;
            const isInstallment = multiSaleData.payment_method === 'ผ่อนชำระ';

            await completeManySales({
                lines: cartItems.map((line) => ({
                    productId: line.product.id,
                    sellingPrice: line.selling_price,
                })),
                soldTo: multiSaleData.sold_to,
                paymentMethod: multiSaleData.payment_method,
                contractNumber: multiSaleData.contract_number ?? null,
                soldAtIso,
                soldByUserId,
                actionByUserId: user.id,
            });

            const successItems = cartItems.map((line) => ({
                product: line.product,
                selling_price: isInstallment ? 0 : line.selling_price,
                profit: isInstallment
                    ? 0
                    : line.selling_price - (line.product.cost_price || 0),
            }));

            setMultiSuccessData({
                saleData: {
                    sold_to: multiSaleData.sold_to,
                    payment_method: multiSaleData.payment_method,
                    contract_number: multiSaleData.contract_number,
                    sold_at: multiSaleData.sold_at,
                    sold_by: multiSaleData.sold_by,
                    sold_by_name: multiSaleData.sold_by_name,
                },
                items: successItems,
            });
            setShowMultiSuccessScreen(true);
            setShowMultiConfirmModal(false);
            setCartItems([]);
            setMultiSaleData(null);
        } catch (error: unknown) {
            toast({
                title: 'เกิดข้อผิดพลาด',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleMultiSuccessReset = () => {
        setCartItems([]);
        setMultiSuccessData(null);
        setShowMultiSuccessScreen(false);
        setSearchTerm('');
        setProduct(null);
        form.reset({
            payment_method: 'เงินสด',
            selling_price: 0,
            sold_to: '',
            contract_number: '',
            sold_at: new Date().toISOString().split('T')[0],
            sold_by: '__current__',
        });
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleSellModeChange = (mode: SellMode) => {
        if (mode === sellMode) return;
        setSellMode(mode);
        setProduct(null);
        setSearchTerm('');
        setShowConfirmModal(false);
        setShowMultiConfirmModal(false);
        if (mode === 'single') {
            setCartItems([]);
        }
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const cartTotalSelling = cartItems.reduce((s, line) => s + line.selling_price, 0);
    const cartTotalProfit = cartItems.reduce(
        (s, line) => s + (line.selling_price - (line.product.cost_price || 0)),
        0
    );

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

    // Success screen (ขายทีละรายการ — เดิม)
    if (showSuccessScreen && successData) {
        return <SaleSuccessScreen data={successData} onContinue={handleSuccessReset} />;
    }

    if (showMultiSuccessScreen && multiSuccessData) {
        return (
            <MultiSaleSuccessScreen data={multiSuccessData} onContinue={handleMultiSuccessReset} />
        );
    }

    const handleMultiFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fieldsValid = await form.trigger([
            'sold_to',
            'sold_at',
            'sold_by',
            'payment_method',
            'contract_number',
        ]);
        if (!fieldsValid) return;
        await handleSubmitMultiSale(form.getValues());
    };

    const renderPaymentFields = (
        onSubmit: (data: SaleFormValues) => void,
        submitLabel: string,
        options?: { multiCart?: boolean }
    ) => (
        <form
            onSubmit={
                options?.multiCart
                    ? handleMultiFormSubmit
                    : form.handleSubmit(onSubmit)
            }
            className="space-y-6"
        >
            <GoldCard className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                    ข้อมูลการชำระเงิน
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!options?.multiCart && (
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
                    )}
                    {sellMode === 'single' && paymentMethod === 'เงินสด' ? (
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
                    ) : sellMode === 'single' ? (
                        <div className="space-y-2">
                            <Label>ราคาขาย</Label>
                            <p className="text-sm text-muted-foreground py-2">ผ่อนชำระ — ไม่บันทึกราคาขาย (ตัดสต๊อกเท่านั้น)</p>
                        </div>
                    ) : null}
                    <div className="space-y-2">
                        <Label>ชื่อผู้ซื้อ *</Label>
                        <Input {...form.register('sold_to')} placeholder="เช่น นาย ก" disabled={submitting} />
                        {form.formState.errors.sold_to && (
                            <p className="text-xs text-destructive">{form.formState.errors.sold_to.message}</p>
                        )}
                    </div>
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
                    <div className="space-y-2">
                        <Label>วันที่ขาย *</Label>
                        <Input type="date" {...form.register('sold_at')} disabled={submitting} />
                    </div>
                    <div className="space-y-2">
                        <Label>พนักงานขาย *</Label>
                        {loadingStaff ? (
                            <div className="flex items-center gap-2 p-2 border rounded-md">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">กำลังโหลดรายชื่อพนักงาน...</span>
                            </div>
                        ) : (
                            <Select
                                value={form.watch('sold_by') || '__current__'}
                                onValueChange={(val) => form.setValue('sold_by', val)}
                            >
                                <SelectTrigger disabled={submitting}>
                                    <SelectValue placeholder="เลือกพนักงานขาย" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__current__">
                                        👤 ผู้ใช้ปัจจุบัน ({currentUserDisplay})
                                    </SelectItem>
                                    {staff.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.username || s.full_name || 'ไม่ระบุ'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            </GoldCard>
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
                        submitLabel
                    )}
                </Button>
            </div>
        </form>
    );

    return (
        <div className="space-y-6">
            {/* โหมดขาย */}
            <div className="flex rounded-lg border border-gold/30 p-1 bg-muted/30">
                <button
                    type="button"
                    onClick={() => handleSellModeChange('single')}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-semibold transition-all',
                        sellMode === 'single'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <CheckCircle2 className="h-4 w-4" />
                    ขายทีละรายการ
                </button>
                <button
                    type="button"
                    onClick={() => handleSellModeChange('multi')}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-semibold transition-all',
                        sellMode === 'multi'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <List className="h-4 w-4" />
                    ขายหลายรายการ
                </button>
            </div>

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
                <LazyIMEIScanner
                    open={showImeiScanner}
                    onClose={() => setShowImeiScanner(false)}
                    onScan={handleScan}
                />
            </GoldCard>

            {sellMode === 'multi' && (
                <GoldCard className="p-4">
                    <Label className="text-xs text-muted-foreground mb-2 block">วิธีชำระเงิน (ใช้กับทุกรายการ)</Label>
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
                </GoldCard>
            )}

            {sellMode === 'multi' && (
                <SellCartPanel
                    items={cartItems}
                    paymentMethod={paymentMethod}
                    onRemove={(id) => setCartItems((prev) => prev.filter((l) => l.product.id !== id))}
                    onClear={() => setCartItems([])}
                    onUpdatePrice={(id, price) =>
                        setCartItems((prev) =>
                            prev.map((l) =>
                                l.product.id === id ? { ...l, selling_price: price } : l
                            )
                        )
                    }
                />
            )}

            {/* Product Summary Section */}
            {product && sellMode === 'multi' && (
                <GoldCard className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-primary truncate">
                                {product.brand_name} {product.model_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {product.shop_code} • IMEI: {product.imei}
                            </p>
                        </div>
                        {paymentMethod === 'เงินสด' && (
                            <div className="space-y-1 w-full sm:w-36">
                                <Label className="text-xs">ราคาขาย (฿)</Label>
                                <Input
                                    type="number"
                                    {...form.register('selling_price')}
                                    disabled={submitting}
                                />
                            </div>
                        )}
                        <Button
                            type="button"
                            onClick={handleAddToCart}
                            className="bg-blue-600 hover:bg-blue-700 shrink-0"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            เพิ่กลงรายการขาย
                        </Button>
                    </div>
                </GoldCard>
            )}

            {product && sellMode === 'single' && (
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

                    <form onSubmit={form.handleSubmit(handleSubmitSale)} className="space-y-6">
                        <GoldCard className="p-6">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                                ข้อมูลการชำระเงิน
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <div className="space-y-2">
                                    <Label>ชื่อผู้ซื้อ *</Label>
                                    <Input {...form.register('sold_to')} placeholder="เช่น นาย ก" disabled={submitting} />
                                    {form.formState.errors.sold_to && (
                                        <p className="text-xs text-destructive">{form.formState.errors.sold_to.message}</p>
                                    )}
                                </div>
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
                                <div className="space-y-2">
                                    <Label>วันที่ขาย *</Label>
                                    <Input type="date" {...form.register('sold_at')} disabled={submitting} />
                                </div>
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
                                                {staff.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.username || s.full_name || 'ไม่ระบุ'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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

            {sellMode === 'multi' && cartItems.length > 0 && (
                <>
                    {renderPaymentFields(
                        handleSubmitMultiSale,
                        `ยืนยันขายทั้งหมด (${cartItems.length} รายการ)`,
                        { multiCart: true }
                    )}
                    <GoldCard className="p-6 bg-gradient-to-br from-primary/5 to-blue-500/5 border-green-500/30">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                            สรุปรายการขาย
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-primary/10 p-4 rounded-lg">
                                <p className="text-xs text-muted-foreground">ยอดขายรวม</p>
                                <p className="text-2xl font-bold text-primary">
                                    {paymentMethod === 'ผ่อนชำระ'
                                        ? '— (ตัดสต๊อก)'
                                        : `฿${cartTotalSelling.toLocaleString('th-TH')}`}
                                </p>
                            </div>
                            <div className="bg-green-500/10 p-4 rounded-lg border-2 border-green-500/30">
                                <p className="text-xs text-muted-foreground">กำไรรวม</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {paymentMethod === 'ผ่อนชำระ'
                                        ? '—'
                                        : `฿${cartTotalProfit.toLocaleString('th-TH')}`}
                                </p>
                            </div>
                        </div>
                    </GoldCard>
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

            {showMultiConfirmModal && multiSaleData && cartItems.length > 0 && (
                <MultiSaleConfirmModal
                    items={cartItems}
                    saleData={multiSaleData}
                    totalSelling={cartTotalSelling}
                    totalProfit={cartTotalProfit}
                    onConfirm={handleConfirmMultiSale}
                    onCancel={() => setShowMultiConfirmModal(false)}
                    loading={submitting}
                />
            )}
        </div>
    );
}
