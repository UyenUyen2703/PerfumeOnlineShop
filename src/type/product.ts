export interface Product {
  product_id: string;
  name: string;
  price: number;
  discount?: number;
  quantity: number;
  brand_id?: string;
  category_id?: string;
  description?: string;
  image_url?: string;
  size_ml?: number | number[];
  created_at?: string;
  updated_at?: string;
}
