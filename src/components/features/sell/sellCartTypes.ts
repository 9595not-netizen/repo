import { Database } from '@/types/database.types';

export type ProductDetail = Database['public']['Views']['product_details']['Row'];

export type SellMode = 'single' | 'multi';

export interface SellCartLine {
  product: ProductDetail;
  selling_price: number;
}

export interface MultiSaleSuccessItem {
  product: ProductDetail;
  selling_price: number;
  profit: number;
}

export interface MultiSaleSuccessData {
  saleData: {
    sold_to: string;
    payment_method: string;
    contract_number?: string;
    sold_at: string;
    sold_by: string;
    sold_by_name?: string;
  };
  items: MultiSaleSuccessItem[];
}
