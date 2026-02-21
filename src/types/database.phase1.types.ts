/**
 * Phase 1: Database Foundation – TypeScript Types จาก Schema 8 ตาราง
 * สอดคล้องกับ supabase/migrations/phase1_database_foundation.sql
 * ใช้เป็น reference; แอปใช้ database.types.ts (มี device_types + Views/Functions)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Phase1Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          password_hash: string;
          full_name: string;
          role: 'admin' | 'staff';
          phone: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          email: string;
          username: string;
          password_hash: string;
          full_name: string;
          role: 'admin' | 'staff';
          phone?: string | null;
          status?: 'active' | 'inactive';
        };
        Update: Partial<Phase1Database['public']['Tables']['users']['Insert']>;
      };
      brands: {
        Row: {
          id: string;
          name: string;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; status?: 'active' | 'inactive' };
        Update: Partial<Phase1Database['public']['Tables']['brands']['Insert']>;
      };
      models: {
        Row: {
          id: string;
          brand_id: string;
          model_name: string;
          main_image: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          model_name: string;
          main_image?: string | null;
          status?: 'active' | 'inactive';
        };
        Update: Partial<Phase1Database['public']['Tables']['models']['Insert']>;
      };
      model_variants: {
        Row: {
          id: string;
          model_id: string;
          storage: string;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          model_id: string;
          storage: string;
          status?: 'active' | 'inactive';
        };
        Update: Partial<Phase1Database['public']['Tables']['model_variants']['Insert']>;
      };
      colors: {
        Row: {
          id: string;
          name: string;
          hex_code: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; hex_code?: string | null; status?: 'active' | 'inactive' };
        Update: Partial<Phase1Database['public']['Tables']['colors']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          shop_code: string;
          imei: string;
          model_variant_id: string;
          color_id: string;
          type: 'มือ 1' | 'มือ 2';
          cost_price: number;
          selling_price: number;
          profit: number;
          status: 'in_stock' | 'reserved' | 'sold' | 'service';
          created_by: string | null;
          sold_by: string | null;
          sold_to: string | null;
          payment_method: 'เงินสด' | 'ผ่อนชำระ' | null;
          contract_number: string | null;
          received_date: string | null;
          sold_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          shop_code: string;
          imei: string;
          model_variant_id: string;
          color_id: string;
          type: 'มือ 1' | 'มือ 2';
          cost_price: number;
          selling_price: number;
          status?: 'in_stock' | 'reserved' | 'sold' | 'service';
          created_by?: string | null;
          sold_by?: string | null;
          sold_to?: string | null;
          payment_method?: 'เงินสด' | 'ผ่อนชำระ' | null;
          contract_number?: string | null;
          received_date?: string | null;
          sold_at?: string | null;
        };
        Update: Partial<Phase1Database['public']['Tables']['products']['Insert']>;
      };
      used_product_details: {
        Row: {
          product_id: string;
          condition_grade: 'A' | 'B' | 'C' | 'F';
          condition_note: string | null;
          battery_health: number | null;
          has_box: boolean;
          has_charger: boolean;
          has_cable: boolean;
          has_headphone: boolean;
          images: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          product_id: string;
          condition_grade: 'A' | 'B' | 'C' | 'F';
          condition_note?: string | null;
          battery_health?: number | null;
          has_box?: boolean;
          has_charger?: boolean;
          has_cable?: boolean;
          has_headphone?: boolean;
          images?: Json;
        };
        Update: Partial<Phase1Database['public']['Tables']['used_product_details']['Insert']>;
      };
      inventory_logs: {
        Row: {
          id: string;
          product_id: string;
          action_type: 'add' | 'sell' | 'reserve' | 'cancel_reserve' | 'service' | 'return';
          action_by: string;
          action_note: string | null;
          created_at: string;
        };
        Insert: {
          product_id: string;
          action_type: 'add' | 'sell' | 'reserve' | 'cancel_reserve' | 'service' | 'return';
          action_by: string;
          action_note?: string | null;
        };
        Update: never;
      };
    };
  };
};
