export interface Product {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  brand_id?: string;
  category_id?: string;
  description?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}
