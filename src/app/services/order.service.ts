import { Injectable } from '@angular/core';
import { supabase } from '../../env/enviroment';
import { Order, OrderItem } from '../../type/order';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  constructor(private authService: AuthService) {}
  async placeOrder(order: Order, item: OrderItem[]) {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single();
    if (orderError) {
      throw new Error(orderError.message);
    }
    const orderId = orderData.order_id;

    const orderItems = item.map((orderItem) => ({
      order_id: orderId,
      product_id: orderItem.product_id,
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
    }));
    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItems);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async getCurrentUserOrders(): Promise<Order[]> {
    const user = await this.authService.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      throw new Error(error.message);
    }
    return data as Order[];
  }
}
