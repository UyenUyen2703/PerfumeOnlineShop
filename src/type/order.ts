export interface CartItem {
  product_id: string;
  name: string;
  options: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  order_id?: string;
  user_id: string;
  total_amount: number;
  address: string;
  recipient_Name: string;
  recipient_Phone: string;
  note: string;
  status: string;
  created_at?: string;
  shipped_date?: string;
}

export interface OrderItem {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}
