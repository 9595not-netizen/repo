import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { GoldCard } from '@/components/ui/gold-card';
import { Loader2, Camera, Save, Scan } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IMEIScanner } from './IMEIScanner';
import { ImageUploader } from './ImageUploader';
import { useAddProduct } from '@/hooks/useAddProduct';
import { useStaffList } from '@/hooks/useStaffList';
import { supabaseHelpers } from '@/lib/supabase-helpers';
import { getErrorMessage } from '@/lib/error-handler';
import type { Brand, Model, ModelVariant, Color, DeviceType, Product, ProductWithSource, UsedProductDetail } from '@/types/common.types';

// Define schema
const productSchema = z.object({
    shop_code: z.string().min(1, 'กรุณาระบุรหัสร้าน'),
    imei: z.string().regex(/^\d{15}$/, 'IMEI ต้องเป็นตัวเลข 15 หลัก'),
    brand_id: z.string().min(1, 'กรุณาเลือกยี่ห้อ'),
    model_id: z.string().min(1, 'กรุณาเลือกรุ่น'),
    model_variant_id: z.string().min(1, 'กรุณาเลือกความจุ'),
    color_id: z.string().min(1, 'กรุณาเลือกสี'),
    device_type_id: z.string().min(1, 'กรุณาเลือกประเภทอุปกรณ์'),
    type: z.enum(['มือ 1', 'มือ 2']),
    cost_price: z.coerce.number().min(1, 'ราคาทุนต้องมากกว่า 0'),
    received_date: z.string().optional(),
    source: z.string().optional(), // ที่มา
    created_by_user_id: z.string().optional(), // พนักงานบันทึก
    condition_grade: z.string().optional(),
    battery_health: z.coerce.number().optional(),
    has_box: z.boolean().default(false),
    has_charger: z.boolean().default(false),
    has_cable: z.boolean().default(false),
    has_headphone: z.boolean().default(false),
    condition_note: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
    /** โหมด Modal: ส่ง productId ตรงๆ แทน URL */
    productIdFromModal?: string | null;
    /** โหมด Modal: callback เมื่อบันทึกสำเร็จ */
    onSuccess?: () => void;
    /** โหมด Modal: callback เมื่อกดยกเลิก */
    onCancel?: () => void;
    /** โหมด Modal: true = ใช้ใน Modal, ซ่อน header/full layout */
    embedded?: boolean;
}

export function ProductForm({ productIdFromModal, onSuccess, onCancel, embedded }: ProductFormProps = {}) {
    const [searchParams] = useSearchParams();
    const productIdFromUrl = searchParams.get('product_id');
    const productId = embedded ? (productIdFromModal ?? null) : productIdFromUrl;
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const currentUserDisplay =
        userProfile?.username ||
        userProfile?.full_name ||
        (user?.user_metadata?.username as string) ||
        user?.email?.split('@')[0] ||
        'ไม่ระบุ';
    const { staff, loadingStaff } = useStaffList();
    const [loading, setLoading] = useState(false);
    const [shopCodeExists, setShopCodeExists] = useState(false);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [variants, setVariants] = useState<ModelVariant[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [showImeiScanner, setShowImeiScanner] = useState(false);
    const [loadingProduct, setLoadingProduct] = useState(!!productId);
    const [editProductId, setEditProductId] = useState<string | null>(productId);
    const { addProduct } = useAddProduct();

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            type: 'มือ 1',
            has_box: false,
            has_charger: false,
            has_cable: false,
            has_headphone: false,
            received_date: new Date().toISOString().split('T')[0],
        },
    });

    const watchBrand = form.watch('brand_id');
    const watchModel = form.watch('model_id');
    const watchType = form.watch('type');

    // โหลดสินค้าเมื่อแก้ไข (product_id จาก URL หรือ Modal)
    useEffect(() => {
        if (!productId) {
            setLoadingProduct(false);
            setEditProductId(null);
            return;
        }
        let cancelled = false;
        const loadProduct = async () => {
            setLoadingProduct(true);
            try {
                const { data: prod, error: prodErr } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', productId)
                    .single();
                if (cancelled) return;
                if (prodErr || !prod) {
                    toast({ title: 'ไม่พบสินค้า', variant: 'destructive' });
                    if (embedded && onCancel) onCancel();
                    else navigate('/stock');
                    return;
                }
                const p = prod as ProductWithSource;
                const { data: mv } = await supabase
                    .from('model_variants')
                    .select('model_id')
                    .eq('id', p.model_variant_id)
                    .single();
                const modelId = mv?.model_id;
                const { data: mod } = modelId
                    ? await supabase.from('models').select('brand_id').eq('id', modelId).single()
                    : { data: null };
                if (cancelled) return;
                const brandId = mod?.brand_id;
                if (brandId) {
                    form.setValue('brand_id', brandId);
                    const { data: modelsData } = await supabase.from('models').select('*').eq('brand_id', brandId).eq('status', 'active');
                    if (!cancelled && modelsData) setModels(modelsData);
                }
                if (modelId) {
                    form.setValue('model_id', modelId);
                    const { data: variantsData } = await supabase.from('model_variants').select('*').eq('model_id', modelId).eq('status', 'active');
                    if (!cancelled && variantsData) setVariants(variantsData);
                }
                if (cancelled) return;
                form.setValue('shop_code', p.shop_code ?? '');
                form.setValue('imei', p.imei ?? '');
                form.setValue('model_variant_id', p.model_variant_id ?? '');
                form.setValue('color_id', p.color_id ?? '');
                form.setValue('device_type_id', p.device_type_id ?? '');
                form.setValue('type', (p.type as 'มือ 1' | 'มือ 2') ?? 'มือ 1');
                form.setValue('cost_price', Number(p.cost_price) ?? 0);
                form.setValue('received_date', p.received_date ? String(p.received_date).split('T')[0] : '');
                form.setValue('source', p.source ?? '');
                form.setValue('created_by_user_id', p.created_by ?? undefined);
                if (p.type === 'มือ 2') {
                    const { data: used } = await supabase
                        .from('used_product_details')
                        .select('*')
                        .eq('product_id', productId!)
                        .maybeSingle();
                    if (cancelled) return;
                    const u: UsedProductDetail | null = used;
                    form.setValue('condition_grade', u?.condition_grade ?? 'C');
                    form.setValue('battery_health', u?.battery_health ?? undefined);
                    form.setValue('has_box', u?.has_box ?? false);
                    form.setValue('has_charger', u?.has_charger ?? false);
                    form.setValue('has_cable', u?.has_cable ?? false);
                    form.setValue('has_headphone', u?.has_headphone ?? false);
                    form.setValue('condition_note', u?.condition_note ?? '');
                }
                if (!cancelled) setEditProductId(productId);
            } catch {
                if (!cancelled) {
                    toast({ title: 'ไม่สามารถโหลดข้อมูลสินค้าได้', variant: 'destructive' });
                    if (embedded && onCancel) onCancel();
                    else navigate('/stock');
                }
            } finally {
                if (!cancelled) setLoadingProduct(false);
            }
        };
        loadProduct();
        return () => { cancelled = true; };
    }, [productId]);

    // Fetch Initial Data
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                const [b, c, d] = await Promise.all([
                    supabase.from('brands').select('*').eq('status', 'active'),
                    supabase.from('colors').select('*').eq('status', 'active'),
                    supabase.from('device_types').select('*').eq('status', 'active'),
                ]);
                if (!cancelled) {
                    if (b.data) setBrands(b.data);
                    if (c.data) setColors(c.data);
                    if (d.data) setDeviceTypes(d.data);
                }
            } catch (err) {
                if (!cancelled) toast({ title: 'ไม่สามารถโหลดข้อมูลตั้งค่าได้', variant: 'destructive' });
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [toast]);

    // Check Shop Code uniqueness (เมื่อแก้ไข ไม่นับตัวเอง)
    useEffect(() => {
        const shopCode = form.watch('shop_code');
        if (!shopCode) return;
        let cancelled = false;
        const checkShopCode = async () => {
            try {
                let q = supabase.from('products').select('*', { count: 'exact', head: true }).eq('shop_code', shopCode);
                if (editProductId) q = q.neq('id', editProductId);
                const { count } = await q;
                if (!cancelled) setShopCodeExists((count || 0) > 0);
            } catch {
                if (!cancelled) setShopCodeExists(false);
            }
        };
        checkShopCode();
        return () => { cancelled = true; };
    }, [form.watch('shop_code'), editProductId]);

    // Fetch Models when Brand changes
    useEffect(() => {
        if (watchBrand) {
            let cancelled = false;
            const fetchModels = async () => {
                try {
                    const { data } = await supabase.from('models').select('*').eq('brand_id', watchBrand).eq('status', 'active');
                    if (!cancelled) {
                        if (data) setModels(data);
                        else setModels([]);
                        form.setValue('model_id', '');
                        form.setValue('model_variant_id', '');
                        setVariants([]);
                    }
                } catch {
                    if (!cancelled) setModels([]);
                }
            };
            fetchModels();
            return () => { cancelled = true; };
        } else {
            setModels([]);
        }
    }, [watchBrand]);

    // Fetch Variants when Model changes
    useEffect(() => {
        if (watchModel) {
            let cancelled = false;
            const fetchVariants = async () => {
                try {
                    const { data } = await supabase.from('model_variants').select('*').eq('model_id', watchModel).eq('status', 'active');
                    if (!cancelled) {
                        if (data) setVariants(data);
                        else setVariants([]);
                        form.setValue('model_variant_id', '');
                    }
                } catch {
                    if (!cancelled) setVariants([]);
                }
            };
            fetchVariants();
            return () => { cancelled = true; };
        } else {
            setVariants([]);
        }
    }, [watchModel]);


    const onSubmit = async (data: ProductFormValues) => {
        if (shopCodeExists && !editProductId) {
            form.setError('shop_code', { message: 'Shop Code นี้มีในระบบแล้ว' });
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const createdBy = data.created_by_user_id || user.id;

            if (editProductId) {
                // แก้ไขสินค้า - ตรวจสอบซ้ำ (ยกเว้นตัวเอง)
                // IMEI ซ้ำได้เมื่อสินค้าเดิมขายแล้ว (มือสองรับคืนได้)
                const [shopRes, imeiRes] = await Promise.all([
                    supabase.from('products').select('id').eq('shop_code', data.shop_code).neq('id', editProductId),
                    supabase.from('products').select('id').eq('imei', data.imei).neq('id', editProductId).in('status', ['in_stock', 'reserved', 'service']),
                ]);
                if ((shopRes.data?.length ?? 0) > 0) throw new Error('Shop Code นี้มีในระบบแล้ว');
                if ((imeiRes.data?.length ?? 0) > 0) throw new Error('IMEI นี้มีสินค้าอื่นในสต๊อกอยู่แล้ว');

                const timestamp = new Date().toISOString();
                let imageUrls: string[] = [];
                if (data.type === 'มือ 2') {
                    const { data: used } = await supabase.from('used_product_details').select('images').eq('product_id', editProductId).maybeSingle();
                    imageUrls = (used?.images ?? []).slice();
                if (selectedImages.length > 0) {
                    for (const file of selectedImages) {
                            const ext = file.name.split('.').pop();
                            const fileName = `${Math.random().toString(36).substring(2)}.${ext}`;
                            const { error: ue } = await supabase.storage.from('product-images').upload(fileName, file);
                            if (!ue) {
                                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
                                imageUrls.push(publicUrl);
                            }
                        }
                    }
                }

                await supabaseHelpers.updateProduct(supabase, editProductId, {
                    shop_code: data.shop_code,
                    imei: data.imei,
                    model_variant_id: data.model_variant_id,
                    color_id: data.color_id,
                    device_type_id: data.device_type_id,
                    type: data.type,
                    cost_price: data.cost_price,
                    received_date: data.received_date || null,
                    updated_at: timestamp,
                });

                if (data.type === 'มือ 2') {
                    await supabaseHelpers.upsertUsedDetails(supabase, {
                        product_id: editProductId,
                        condition_grade: (data.condition_grade as 'A' | 'B' | 'C' | 'F') || 'C',
                        battery_health: data.battery_health ?? null,
                        has_box: data.has_box ?? false,
                        has_charger: data.has_charger ?? false,
                        has_cable: data.has_cable ?? false,
                        has_headphone: data.has_headphone ?? false,
                        condition_note: data.condition_note || null,
                        images: imageUrls.length > 0 ? imageUrls : [],
                    });
                }

                toast({ title: "แก้ไขสินค้าสำเร็จ", description: `${data.shop_code}`, className: "bg-green-500 text-white" });
            } else {
                await addProduct({
                    shop_code: data.shop_code,
                    imei: data.imei,
                    model_variant_id: data.model_variant_id,
                    color_id: data.color_id,
                    device_type_id: data.device_type_id,
                    type: data.type,
                    cost_price: data.cost_price,
                    received_date: data.received_date,
                    source: data.source,
                    created_by: createdBy,
                    condition_grade: data.condition_grade as 'A' | 'B' | 'C' | 'F' | undefined,
                    battery_health: data.battery_health,
                    has_box: data.has_box,
                    has_charger: data.has_charger,
                    has_cable: data.has_cable,
                    has_headphone: data.has_headphone,
                    condition_note: data.condition_note,
                    images: selectedImages,
                });

                toast({
                    title: "สำเร็จ",
                    description: `เพิ่มสินค้า ${data.shop_code} เรียบร้อยแล้ว`,
                    className: "bg-green-500 text-white"
                });
            }

            if (!editProductId) {
                form.reset({
                    type: 'มือ 1',
                    has_box: false,
                    has_charger: false,
                    has_cable: false,
                    has_headphone: false,
                    received_date: new Date().toISOString().split('T')[0],
                });
                setSelectedImages([]);
            }
            
            if (embedded && onSuccess) {
                setTimeout(onSuccess, 500);
            } else {
                setTimeout(() => navigate('/stock'), 1500);
            }

        } catch (error: unknown) {
            console.error('Error:', error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: getErrorMessage(error) || (editProductId ? "ไม่สามารถแก้ไขสินค้าได้" : "ไม่สามารถเพิ่มสินค้าได้"),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 relative">
            {loadingProduct && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-xl">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Basic Info Section */}
                <GoldCard className="p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground text-center mb-4">
                        ข้อมูลพื้นฐาน
                    </h3>
                    <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent w-full mb-4" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Shop Code */}
                        <div className="space-y-2">
                            <Label>รหัสร้าน (Shop Code) *</Label>
                            <div className="relative">
                                <Input
                                    {...form.register('shop_code')}
                                    placeholder="เช่น C001"
                                    className="pl-9"
                                    disabled={loading || loadingProduct}
                                />
                                <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                            {shopCodeExists && <p className="text-xs text-destructive">⚠️ รหัสร้านนี้มีในระบบแล้ว</p>}
                            {form.formState.errors.shop_code && <p className="text-xs text-destructive">{form.formState.errors.shop_code.message}</p>}
                        </div>

                        {/* IMEI */}
                        <div className="space-y-2">
                            <Label>IMEI (15 หลัก) *</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        {...form.register('imei')}
                                        placeholder="กรอกหรือสแกน IMEI"
                                        maxLength={15}
                                        className="pl-9"
                                        disabled={loading || loadingProduct}
                                    />
                                    <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0 border-gold/30"
                                    onClick={() => setShowImeiScanner(true)}
                                    disabled={loading || loadingProduct}
                                    title="สแกน IMEI"
                                >
                                    <Camera className="h-4 w-4" />
                                </Button>
                            </div>
                            {form.formState.errors.imei && <p className="text-xs text-destructive">{form.formState.errors.imei.message}</p>}
                        </div>
                        <IMEIScanner
                            open={showImeiScanner}
                            onClose={() => setShowImeiScanner(false)}
                            onScan={(imei) => form.setValue('imei', imei)}
                        />

                        {/* Brand */}
                        <div className="space-y-2">
                            <Label>ยี่ห้อ *</Label>
                            <Select value={watchBrand || ''} onValueChange={(val) => form.setValue('brand_id', val)}>
                                <SelectTrigger disabled={loading || loadingProduct}>
                                    <SelectValue placeholder="เลือกยี่ห้อ" />
                                </SelectTrigger>
                                <SelectContent>
                                    {brands.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.brand_id && <p className="text-xs text-destructive">{form.formState.errors.brand_id.message}</p>}
                        </div>

                        {/* Model */}
                        <div className="space-y-2">
                            <Label>รุ่น *</Label>
                            <Select
                                value={watchModel || ''}
                                onValueChange={(val) => form.setValue('model_id', val)}
                                disabled={!watchBrand || loading || loadingProduct}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={watchBrand ? "เลือกรุ่น" : "เลือกยี่ห้อก่อน"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {models.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>{m.model_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.model_id && <p className="text-xs text-destructive">{form.formState.errors.model_id.message}</p>}
                        </div>

                        {/* Model Variant (Storage) */}
                        <div className="space-y-2">
                            <Label>ความจุ *</Label>
                            <Select
                                value={form.watch('model_variant_id') || ''}
                                onValueChange={(val) => form.setValue('model_variant_id', val)}
                                disabled={!watchModel || loading || loadingProduct}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={watchModel ? "เลือกความจุ" : "เลือกรุ่นก่อน"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {variants.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>{v.storage}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.model_variant_id && <p className="text-xs text-destructive">{form.formState.errors.model_variant_id.message}</p>}
                        </div>

                        {/* Color */}
                        <div className="space-y-2">
                            <Label>สี *</Label>
                            <Select value={form.watch('color_id') || ''} onValueChange={(val) => form.setValue('color_id', val)}>
                                <SelectTrigger disabled={loading || loadingProduct}>
                                    <SelectValue placeholder="เลือกสี" />
                                </SelectTrigger>
                                <SelectContent>
                                    {colors.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.color_id && <p className="text-xs text-destructive">{form.formState.errors.color_id.message}</p>}
                        </div>

                        {/* Device Type */}
                        <div className="space-y-2">
                            <Label>ประเภทเครื่อง *</Label>
                            <Select value={form.watch('device_type_id') || ''} onValueChange={(val) => form.setValue('device_type_id', val)}>
                                <SelectTrigger disabled={loading || loadingProduct}>
                                    <SelectValue placeholder="เลือกประเภท" />
                                </SelectTrigger>
                                <SelectContent>
                                    {deviceTypes.map((dt) => (
                                        <SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.device_type_id && <p className="text-xs text-destructive">{form.formState.errors.device_type_id.message}</p>}
                        </div>

                        {/* Product Type */}
                        <div className="space-y-2">
                            <Label>สภาพสินค้า *</Label>
                            <RadioGroup value={watchType} onValueChange={(val) => form.setValue('type', val as 'มือ 1' | 'มือ 2')} className="flex flex-row gap-6">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="มือ 1" id="new" />
                                    <Label htmlFor="new" className="font-normal cursor-pointer">มือ 1 (ใหม่)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="มือ 2" id="used" />
                                    <Label htmlFor="used" className="font-normal cursor-pointer">มือ 2 (มือสอง)</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </GoldCard>

                {/* Pricing Section */}
                <GoldCard className="p-6 bg-gradient-to-br from-primary/5 to-blue-500/5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground text-center mb-4">
                        ข้อมูลการเงิน
                    </h3>
                    <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent w-full mb-4" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cost Price */}
                        <div className="space-y-2">
                            <Label>ราคาทุน (฿) *</Label>
                            <Input
                                type="number"
                                {...form.register('cost_price')}
                                placeholder="0"
                                disabled={loading || loadingProduct}
                                className="text-lg"
                            />
                            {form.formState.errors.cost_price && <p className="text-xs text-destructive">{form.formState.errors.cost_price.message}</p>}
                        </div>
                    </div>
                </GoldCard>

                {/* Additional Info Section */}
                <GoldCard className="p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground text-center mb-4">
                        ข้อมูลเพิ่มเติม
                    </h3>
                    <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent w-full mb-4" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Received Date */}
                        <div className="space-y-2">
                            <Label>วันที่รับสินค้า</Label>
                            <Input
                                type="date"
                                {...form.register('received_date')}
                                disabled={loading || loadingProduct}
                            />
                        </div>

                        {/* ที่มา */}
                        <div className="space-y-2">
                            <Label>ที่มา</Label>
                            <Input
                                {...form.register('source')}
                                placeholder="เช่น ซื้อจาก, รับแลก"
                                disabled={loading || loadingProduct}
                            />
                        </div>

                        {/* พนักงานบันทึก */}
                        <div className="md:col-span-2 space-y-2">
                            <Label>พนักงานบันทึก</Label>
                            {loadingStaff ? (
                                <div className="flex items-center gap-2 p-2 border rounded-md">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">กำลังโหลดรายชื่อพนักงาน...</span>
                                </div>
                            ) : (
                                <Select
                                    value={form.watch('created_by_user_id') || '__current__'}
                                    onValueChange={(v) => form.setValue('created_by_user_id', v === '__current__' ? undefined : v)}
                                    disabled={loading || loadingProduct}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกพนักงานบันทึก" />
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
                        </div>
                    </div>
                </GoldCard>

                {/* Used Product Details Section */}
                {watchType === 'มือ 2' && (
                    <GoldCard className="p-6 border-orange-500/30">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-600 text-center mb-4">
                            ข้อมูลสินค้ามือ 2
                        </h3>
                        <div className="h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent w-full mb-4" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Condition Grade */}
                            <div className="space-y-2">
                                <Label>เกรดสภาพ *</Label>
                                <Select
                                    value={form.watch('condition_grade') || ''}
                                    onValueChange={(val) => form.setValue('condition_grade', val)}
                                >
                                    <SelectTrigger disabled={loading || loadingProduct}>
                                        <SelectValue placeholder="เลือกเกรด" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="A">
                                            A - สภาพดีมาก
                                        </SelectItem>
                                        <SelectItem value="B">
                                            B - สภาพดี
                                        </SelectItem>
                                        <SelectItem value="C">
                                            C - สภาพพอใช้
                                        </SelectItem>
                                        <SelectItem value="F">
                                            F - สภาพรอยเยอะ
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Battery Health */}
                            <div className="space-y-2">
                                <Label>สุขภาพแบตเตอรี่ (%)</Label>
                                <Input
                                    type="number"
                                    {...form.register('battery_health')}
                                    placeholder="เช่น 85"
                                    min="0"
                                    max="100"
                                    disabled={loading || loadingProduct}
                                />
                            </div>
                        </div>

                        {/* Accessories */}
                        <div className="mt-4 space-y-3">
                            <Label className="font-semibold">อุปกรณ์ที่มีให้</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                                {[
                                    { id: 'has_box', label: 'กล่อง', icon: '📦' },
                                    { id: 'has_charger', label: 'หัวชาร์จ', icon: '🔌' },
                                    { id: 'has_cable', label: 'สายชาร์จ', icon: '🔗' },
                                    { id: 'has_headphone', label: 'หูฟัง', icon: '🎧' },
                                ].map((item) => (
                                    <div key={item.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={item.id}
                                            checked={form.watch(item.id as keyof ProductFormValues)}
                                            onCheckedChange={(c) => form.setValue(item.id as keyof ProductFormValues, !!c)}
                                            disabled={loading || loadingProduct}
                                        />
                                        <Label htmlFor={item.id} className="font-normal cursor-pointer">
                                            {item.icon} {item.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Condition Note */}
                        <div className="mt-4 space-y-2">
                            <Label>หมายเหตุสภาพสินค้า</Label>
                            <Textarea
                                {...form.register('condition_note')}
                                placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับตำหนิ หรือสภาพเครื่อง"
                                className="min-h-20"
                                disabled={loading || loadingProduct}
                            />
                        </div>
                    </GoldCard>
                )}

                {/* รูปภาพ - อยู่ล่างสุด ทั้งมือ 1 (รูปบิล/ที่มา) และมือ 2 (รูปสินค้า) */}
                <GoldCard className="p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground text-center mb-4">
                        {watchType === 'มือ 1'
                            ? 'รูปบิล/ที่มา (ว่ามาจากใคร) — สูงสุด 4 รูป'
                            : 'รูปภาพสินค้า — สูงสุด 4 รูป'}
                    </h3>
                    <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent w-full mb-4" />
                    <ImageUploader
                        maxImages={4}
                        onImagesChange={setSelectedImages}
                    />
                </GoldCard>

                {/* Submit Button */}
                <div className="flex gap-4">
                    <Button
                        type="submit"
                        className="flex-1 bg-primary text-lg h-12 font-semibold"
                        disabled={loading || loadingProduct || shopCodeExists}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-5 w-5" />
                                ยืนยันการบันทึก
                            </>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-12"
                        onClick={() => (embedded && onCancel ? onCancel() : navigate('/stock'))}
                        disabled={loading || loadingProduct}
                    >
                        ยกเลิก
                    </Button>
                </div>
            </form>
        </div>
    );
}
