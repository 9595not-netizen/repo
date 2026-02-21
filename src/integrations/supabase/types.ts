export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      colors: {
        Row: {
          created_at: string | null
          hex_code: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hex_code?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hex_code?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      device_types: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          action_by: string
          action_note: string | null
          action_type: string
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          action_by: string
          action_note?: string | null
          action_type: string
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          action_by?: string
          action_note?: string | null
          action_type?: string
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_action_by_fkey"
            columns: ["action_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      model_variants: {
        Row: {
          created_at: string | null
          id: string
          model_id: string
          status: string | null
          storage: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model_id: string
          status?: string | null
          storage: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model_id?: string
          status?: string | null
          storage?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_variants_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          brand_id: string
          created_at: string | null
          id: string
          main_image: string | null
          model_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          id?: string
          main_image?: string | null
          model_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          id?: string
          main_image?: string | null
          model_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          color_id: string
          contract_number: string | null
          cost_price: number
          created_at: string | null
          created_by: string | null
          device_type_id: string
          id: string
          imei: string
          model_variant_id: string
          payment_method: string | null
          profit: number | null
          received_date: string | null
          selling_price: number
          shop_code: string
          sold_at: string | null
          sold_by: string | null
          sold_to: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          color_id: string
          contract_number?: string | null
          cost_price: number
          created_at?: string | null
          created_by?: string | null
          device_type_id: string
          id?: string
          imei: string
          model_variant_id: string
          payment_method?: string | null
          profit?: number | null
          received_date?: string | null
          selling_price: number
          shop_code: string
          sold_at?: string | null
          sold_by?: string | null
          sold_to?: string | null
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          color_id?: string
          contract_number?: string | null
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
          device_type_id?: string
          id?: string
          imei?: string
          model_variant_id?: string
          payment_method?: string | null
          profit?: number | null
          received_date?: string | null
          selling_price?: number
          shop_code?: string
          sold_at?: string | null
          sold_by?: string | null
          sold_to?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_device_type_id_fkey"
            columns: ["device_type_id"]
            isOneToOne: false
            referencedRelation: "device_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_model_variant_id_fkey"
            columns: ["model_variant_id"]
            isOneToOne: false
            referencedRelation: "model_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      used_product_details: {
        Row: {
          battery_health: number | null
          condition_grade: string
          condition_note: string | null
          created_at: string | null
          has_box: boolean | null
          has_cable: boolean | null
          has_charger: boolean | null
          has_headphone: boolean | null
          images: Json | null
          product_id: string
          updated_at: string | null
        }
        Insert: {
          battery_health?: number | null
          condition_grade: string
          condition_note?: string | null
          created_at?: string | null
          has_box?: boolean | null
          has_cable?: boolean | null
          has_charger?: boolean | null
          has_headphone?: boolean | null
          images?: Json | null
          product_id: string
          updated_at?: string | null
        }
        Update: {
          battery_health?: number | null
          condition_grade?: string
          condition_note?: string | null
          created_at?: string | null
          has_box?: boolean | null
          has_cable?: boolean | null
          has_charger?: boolean | null
          has_headphone?: boolean | null
          images?: Json | null
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "used_product_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_product_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          password_hash: string
          phone: string | null
          role: string
          status: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          password_hash: string
          phone?: string | null
          role: string
          status?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          password_hash?: string
          phone?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      product_details: {
        Row: {
          battery_health: number | null
          brand_name: string | null
          color_hex: string | null
          color_name: string | null
          condition_grade: string | null
          condition_note: string | null
          contract_number: string | null
          cost_price: number | null
          created_at: string | null
          created_by_name: string | null
          device_type_code: string | null
          device_type_name: string | null
          has_box: boolean | null
          has_cable: boolean | null
          has_charger: boolean | null
          has_headphone: boolean | null
          id: string | null
          imei: string | null
          main_image: string | null
          model_name: string | null
          payment_method: string | null
          product_images: Json | null
          profit: number | null
          received_date: string | null
          selling_price: number | null
          shop_code: string | null
          sold_at: string | null
          sold_by_name: string | null
          sold_to: string | null
          status: string | null
          storage: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_stock_summary: {
        Args: never
        Returns: {
          new_devices: number
          total_in_stock: number
          total_reserved: number
          total_sold: number
          total_value: number
          used_devices: number
        }[]
      }
      get_today_sales: {
        Args: never
        Returns: {
          total_profit: number
          total_revenue: number
          total_sales: number
        }[]
      }
      get_top_selling_models: {
        Args: { limit_count?: number }
        Returns: {
          brand_name: string
          model_name: string
          storage: string
          total_revenue: number
          total_sold: number
        }[]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
