import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export const supabaseHelpers = {
  // Products
  async insertProduct(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['products']['Insert']
  ) {
    return client
      .from('products')
      .insert([data] as never)
      .select()
      .single();
  },

  async updateProduct(
    client: SupabaseClient<Database>,
    id: string,
    data: Database['public']['Tables']['products']['Update']
  ) {
    return client
      .from('products')
      .update(data as never)
      .eq('id', id)
      .select()
      .single();
  },

  // Used Product Details
  async insertUsedDetails(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['used_product_details']['Insert']
  ) {
    return client
      .from('used_product_details')
      .insert([data] as never)
      .select()
      .single();
  },

  async upsertUsedDetails(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['used_product_details']['Insert']
  ) {
    return client
      .from('used_product_details')
      .upsert(data as never, { onConflict: 'product_id' })
      .select()
      .single();
  },

  // Inventory Logs
  async insertInventoryLog(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['inventory_logs']['Insert']
  ) {
    return client
      .from('inventory_logs')
      .insert([data] as never);
  },

  // Brands
  async insertBrand(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['brands']['Insert']
  ) {
    return client
      .from('brands')
      .insert([data] as never)
      .select();
  },

  async insertBrandBulk(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['brands']['Insert'][]
  ) {
    return client
      .from('brands')
      .insert(data as never);
  },

  // Models
  async insertModel(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['models']['Insert']
  ) {
    return client
      .from('models')
      .insert([data] as never)
      .select();
  },

  async insertModelBulk(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['models']['Insert'][]
  ) {
    return client
      .from('models')
      .insert(data as never);
  },

  // Variants
  async insertVariant(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['model_variants']['Insert']
  ) {
    return client
      .from('model_variants')
      .insert([data] as never)
      .select();
  },

  async insertVariantBulk(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['model_variants']['Insert'][]
  ) {
    return client
      .from('model_variants')
      .insert(data as never);
  },

  // Colors
  async insertColor(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['colors']['Insert']
  ) {
    return client
      .from('colors')
      .insert([data] as never)
      .select();
  },

  async insertColorBulk(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['colors']['Insert'][]
  ) {
    return client
      .from('colors')
      .insert(data as never);
  },

  // Device Types
  async insertDeviceType(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['device_types']['Insert']
  ) {
    return client
      .from('device_types')
      .insert([data] as never)
      .select();
  },

  async insertDeviceTypeBulk(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['device_types']['Insert'][]
  ) {
    return client
      .from('device_types')
      .insert(data as never);
  },

  // Users
  async insertUser(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['users']['Insert']
  ) {
    return client
      .from('users')
      .insert([data] as never)
      .select();
  },

  async insertUserBulk(
    client: SupabaseClient<Database>,
    data: Database['public']['Tables']['users']['Insert'][]
  ) {
    return client
      .from('users')
      .insert(data as never);
  },
};
