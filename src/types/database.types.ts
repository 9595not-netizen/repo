/**
 * Database types สำหรับแอป NOTMOBILE
 * สอดคล้องกับ Phase 1 (8 ตาราง) + device_types + Views/Functions
 * Schema หลัก: supabase/migrations/phase1_database_foundation.sql
 */
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    username: string
                    password_hash: string
                    full_name: string
                    role: 'admin' | 'staff'
                    phone: string | null
                    status: 'active' | 'inactive'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    email: string
                    username: string
                    password_hash: string
                    full_name: string
                    role: 'admin' | 'staff'
                    phone?: string | null
                    status?: 'active' | 'inactive'
                }
                Update: {
                    email?: string
                    username?: string
                    password_hash?: string
                    full_name?: string
                    role?: 'admin' | 'staff'
                    phone?: string | null
                    status?: 'active' | 'inactive'
                }
            }
            brands: {
                Row: {
                    id: string
                    name: string
                    status: 'active' | 'inactive'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    name: string
                    status?: 'active' | 'inactive'
                }
                Update: {
                    name?: string
                    status?: 'active' | 'inactive'
                }
            }
            models: {
                Row: {
                    id: string
                    brand_id: string
                    model_name: string
                    main_image: string | null
                    status: 'active' | 'inactive'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    brand_id: string
                    model_name: string
                    main_image?: string | null
                    status?: 'active' | 'inactive'
                }
                Update: {
                    brand_id?: string
                    model_name?: string
                    main_image?: string | null
                    status?: 'active' | 'inactive'
                }
            }
            model_variants: {
                Row: {
                    id: string
                    model_id: string
                    storage: string
                    status: 'active' | 'inactive'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    model_id: string
                    storage: string
                    status?: 'active' | 'inactive'
                }
                Update: {
                    model_id?: string
                    storage?: string
                    status?: 'active' | 'inactive'
                }
            }
            colors: {
                Row: {
                    id: string
                    name: string
                    hex_code: string | null
                    status: 'active' | 'inactive'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    name: string
                    hex_code?: string | null
                    status?: 'active' | 'inactive'
                }
                Update: {
                    name?: string
                    hex_code?: string | null
                    status?: 'active' | 'inactive'
                }
            }
            device_types: {
                Row: {
                    id: string
                    name: string
                    code: string
                    status: 'active' | 'inactive'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    name: string
                    code: string
                    status?: 'active' | 'inactive'
                }
                Update: {
                    name?: string
                    code?: string
                    status?: 'active' | 'inactive'
                }
            }
            products: {
                Row: {
                    id: string
                    shop_code: string
                    imei: string
                    model_variant_id: string
                    color_id: string
                    device_type_id: string
                    type: 'มือ 1' | 'มือ 2'
                    cost_price: number
                    selling_price: number
                    profit: number
                    status: 'in_stock' | 'reserved' | 'sold' | 'service'
                    created_by: string | null
                    sold_by: string | null
                    sold_to: string | null
                    payment_method: 'เงินสด' | 'ผ่อนชำระ' | 'โอนเงิน' | 'บัตรเครดิต' | null
                    contract_number: string | null
                    received_date: string | null
                    sold_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    shop_code: string
                    imei: string
                    model_variant_id: string
                    color_id: string
                    device_type_id: string
                    type: 'มือ 1' | 'มือ 2'
                    cost_price: number
                    selling_price: number
                    status?: 'in_stock' | 'reserved' | 'sold' | 'service'
                    created_by?: string | null
                    sold_by?: string | null
                    sold_to?: string | null
                    payment_method?: 'เงินสด' | 'ผ่อนชำระ' | null
                    contract_number?: string | null
                    received_date?: string | null
                    sold_at?: string | null
                }
                Update: {
                    shop_code?: string
                    imei?: string
                    model_variant_id?: string
                    color_id?: string
                    device_type_id?: string
                    type?: 'มือ 1' | 'มือ 2'
                    cost_price?: number
                    selling_price?: number
                    status?: 'in_stock' | 'reserved' | 'sold' | 'service'
                    created_by?: string | null
                    sold_by?: string | null
                    sold_to?: string | null
                    payment_method?: 'เงินสด' | 'ผ่อนชำระ' | null
                    contract_number?: string | null
                    received_date?: string | null
                    sold_at?: string | null
                }
            }
            used_product_details: {
                Row: {
                    product_id: string
                    condition_grade: 'A' | 'B' | 'C' | 'F'
                    condition_note: string | null
                    battery_health: number | null
                    has_box: boolean
                    has_charger: boolean
                    has_cable: boolean
                    has_headphone: boolean
                    images: string[]
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    product_id: string
                    condition_grade: 'A' | 'B' | 'C' | 'F'
                    condition_note?: string | null
                    battery_health?: number | null
                    has_box?: boolean
                    has_charger?: boolean
                    has_cable?: boolean
                    has_headphone?: boolean
                    images?: string[]
                }
                Update: {
                    product_id?: string
                    condition_grade?: 'A' | 'B' | 'C' | 'F'
                    condition_note?: string | null
                    battery_health?: number | null
                    has_box?: boolean
                    has_charger?: boolean
                    has_cable?: boolean
                    has_headphone?: boolean
                    images?: string[]
                }
            }
            inventory_logs: {
                Row: {
                    id: string
                    product_id: string
                    action_type: 'add' | 'sell' | 'reserve' | 'cancel_reserve' | 'service' | 'return'
                    action_by: string
                    action_note: string | null
                    created_at: string
                }
                Insert: {
                    product_id: string
                    action_type: 'add' | 'sell' | 'reserve' | 'cancel_reserve' | 'service' | 'return'
                    action_by: string
                    action_note?: string | null
                }
                Update: never
            }
        }
        Views: {
            product_details: {
                Row: {
                    id: string
                    shop_code: string
                    imei: string
                    brand_name: string
                    model_name: string
                    main_image: string | null
                    storage: string
                    color_name: string
                    color_hex: string | null
                    device_type_name: string
                    device_type_code: string
                    type: 'มือ 1' | 'มือ 2'
                    cost_price: number
                    selling_price: number
                    profit: number
                    status: string
                    payment_method: string | null
                    contract_number: string | null
                    received_date: string | null
                    sold_to: string | null
                    sold_at: string | null
                    created_by_name: string | null
                    sold_by_name: string | null
                    created_at: string
                    updated_at: string
                    condition_grade: string | null
                    condition_note: string | null
                    battery_health: number | null
                    has_box: boolean | null
                    has_charger: boolean | null
                    has_cable: boolean | null
                    has_headphone: boolean | null
                    product_images: string[] | null
                }
            }
        }
        Functions: {
            get_stock_summary: {
                Args: Record<string, never>;
                Returns: {
                    total_in_stock: number
                    total_sold: number
                    total_reserved: number
                    total_value: number
                    new_devices: number
                    used_devices: number
                }
            }
            get_today_sales: {
                Args: Record<string, never>;
                Returns: {
                    total_sales: number
                    total_revenue: number
                    total_profit: number
                }
            }
            get_top_selling_models: {
                Args: { limit_count?: number }
                Returns: Array<{
                    brand_name: string
                    model_name: string
                    storage: string
                    total_sold: number
                    total_revenue: number
                }>
            }
        }
    }
}
