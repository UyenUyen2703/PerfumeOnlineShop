import { Injectable } from '@angular/core';
import { supabase } from '../../env/enviroment';
import { Order, OrderItem } from '../../type/order';
import { AuthService } from './auth.service';
import { ProductService } from './product.service';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  constructor(
    private authService: AuthService,
    private productService: ProductService
  ) {}
  async placeOrder(order: Order, item: OrderItem[]) {
    try {
      // Kiểm tra tồn kho trước khi tạo đơn hàng (chỉ cảnh báo)
      const cartItems = item.map(orderItem => ({
        product_id: orderItem.product_id,
        quantity: orderItem.quantity,
        name: '',
        options: '',
        price: orderItem.unit_price,
        image: ''
      }));

      try {
        const stockValidation = await this.productService.validateStockAvailability(cartItems);
        if (!stockValidation.valid) {
          console.warn('Stock validation warnings:', stockValidation.errors);
        }
      } catch (stockError) {
        console.warn('Could not validate stock, proceeding with order:', stockError);
      }

      // Tạo đơn hàng
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([order])
        .select()
        .single();
      if (orderError) {
        throw new Error(orderError.message);
      }
      const orderId = orderData.order_id;

      // Tạo order items
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

      // Cập nhật số lượng sản phẩm
      try {
        await this.productService.updateMultipleProductQuantities(cartItems);
        console.log('Product quantities updated successfully after order placement');
      } catch (quantityError) {
        console.error('Error updating product quantities:', quantityError);
        console.warn('Order created but inventory may not be updated');
      }

      return data;
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
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

  /**
   * Hủy đơn hàng và hoàn lại số lượng sản phẩm
   * @param orderId - ID của đơn hàng
   * @returns Promise<void>
   */
  async cancelOrder(orderId: string): Promise<void> {
    try {
      const user = await this.authService.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Kiểm tra đơn hàng có thuộc về user này không
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('status')
        .eq('order_id', orderId)
        .eq('user_id', user.id)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found or access denied');
      }

      // Chỉ cho phép hủy đơn hàng có status là 'Pending'
      if (order.status !== 'Pending') {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      // Lấy danh sách sản phẩm trong đơn hàng
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (itemsError) {
        throw new Error('Error fetching order items');
      }

      // Hoàn lại số lượng sản phẩm
      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          await this.productService.restoreProductQuantity(item.product_id, item.quantity);
        }
      }

      // Cập nhật status đơn hàng thành 'Cancelled'
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'Cancelled' })
        .eq('order_id', orderId);

      if (updateError) {
        throw new Error('Error updating order status');
      }

      console.log(`Order ${orderId} cancelled and product quantities restored`);
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Cập nhật trạng thái đơn hàng
   * @param orderId - ID của đơn hàng
   * @param newStatus - Trạng thái mới
   * @returns Promise<void>
   */
  async updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          ...(newStatus === 'Shipped' && { shipped_date: new Date().toISOString() })
        })
        .eq('order_id', orderId);

      if (error) {
        throw new Error(`Error updating order status: ${error.message}`);
      }

      console.log(`Order ${orderId} status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết đơn hàng kèm theo thông tin sản phẩm
   * @param orderId - ID của đơn hàng
   * @returns Promise<any>
   */
  async getOrderWithDetails(orderId: string): Promise<any> {
    try {
      const user = await this.authService.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              name,
              price,
              image_url,
              quantity
            )
          )
        `)
        .eq('order_id', orderId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw new Error(`Error fetching order details: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting order details:', error);
      throw error;
    }
  }
}
