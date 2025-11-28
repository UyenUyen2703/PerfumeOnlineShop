import { Order, OrderItem, CartItem } from './../../type/order';
import { AuthService } from './auth.service';
import { ProductService } from './product.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../../env/enviroment';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  public cartItems$ = this.cartItemsSubject.asObservable();

  constructor(
    private authService: AuthService,
    private productService: ProductService
  ) {
    this.loadCartFromStorage();
  }

  getCartItems(): CartItem[] {
    return this.cartItemsSubject.value;
  }

  addToCart(product: any): void {
    const currentItems = this.getCartItems();
    const existingItemIndex = currentItems.findIndex((item) => item.product_id === product.product_id);

    if (existingItemIndex > -1) {
      currentItems[existingItemIndex].quantity += product.quantity || 1;
    } else {
      const newItem: CartItem = {
        product_id: product.product_id,
        name: product.name,
        options: product.options || '',
        price: product.price,
        quantity: product.quantity || 1,
        image: product.image || 'assets/images/default-product.jpg',
      };
      currentItems.push(newItem);
    }
    this.updateCart(currentItems);
  }

  updateQuantity(itemId: string, newQuantity: number): void {
    const currentItems = this.getCartItems();
    const itemIndex = currentItems.findIndex((item) => item.product_id === itemId);

    if (itemIndex > -1 && newQuantity > 0) {
      currentItems[itemIndex].quantity = newQuantity;
      this.updateCart(currentItems);
    }
  }

  increaseQuantity(itemId: string): void {
    const currentItems = this.getCartItems();
    const item = currentItems.find((item) => item.product_id === itemId);
    if (item) {
      item.quantity++;
      this.updateCart(currentItems);
    }
  }

  decreaseQuantity(itemId: string): void {
    const currentItems = this.getCartItems();
    const item = currentItems.find((item) => item.product_id === itemId);
    if (item && item.quantity > 1) {
      item.quantity--;
      this.updateCart(currentItems);
    }
  }

  removeItem(itemId: string): void {
    const currentItems = this.getCartItems().filter((item) => item.product_id !== itemId);
    this.updateCart(currentItems);
  }

  clearCart(): void {
    this.updateCart([]);
  }

  getItemTotal(item: CartItem): number {
    return item.price * item.quantity;
  }

  getCartTotal(): number {
    return this.getCartItems().reduce((total, item) => total + this.getItemTotal(item), 0);
  }

  getTotalItemCount(): number {
    return this.getCartItems().reduce((total, item) => total + item.quantity, 0);
  }

  isCartEmpty(): boolean {
    return this.getCartItems().length === 0;
  }

  private updateCart(items: CartItem[]): void {
    this.cartItemsSubject.next(items);
    this.saveCartToStorage(items);
  }

  private saveCartToStorage(items: CartItem[]): void {
    try {
      localStorage.setItem('cart', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }

  private loadCartFromStorage(): void {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const items: CartItem[] = JSON.parse(savedCart);
        this.cartItemsSubject.next(items);
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }

  findItemInCart(productId: string): CartItem | undefined {
    return this.getCartItems().find((item) => item.product_id === productId);
  }

  isItemInCart(productId: string): boolean {
    return this.findItemInCart(productId) !== undefined;
  }

  getItemQuantityInCart(productId: string): number {
    const item = this.findItemInCart(productId);
    return item ? item.quantity : 0;
  }

  async paymentProcess(address: string, recipientName: string, recipientPhone: string, note: string): Promise<{orderId: string, items: CartItem[], total: number}> {
    try {
      const user = await this.authService.getUser();
      const item = this.getCartItems();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate required fields
      if (!address.trim()) {
        throw new Error('Delivery address is required');
      }

      if (!recipientName.trim()) {
        throw new Error('Recipient name is required');
      }

      if (!recipientPhone.trim()) {
        throw new Error('Recipient phone is required');
      }

      // Kiểm tra tồn kho trước khi đặt hàng (chỉ cảnh báo, không chặn)
      try {
        const stockValidation = await this.productService.validateStockAvailability(item);
        if (!stockValidation.valid) {
          console.warn('Stock validation warnings:', stockValidation.errors);
          // Vẫn cho phép đặt hàng nhưng ghi log cảnh báo
        }
      } catch (stockError) {
        console.warn('Could not validate stock, proceeding with order:', stockError);
      }

      const orderPayload = {
        user_id: user.id,
        total_amount: this.getCartTotal(),
        address: address.trim(),
        recipient_Name: recipientName.trim(),
        recipient_Phone: recipientPhone.trim(),
        note: note.trim(),
        status: 'Pending',
      };

      console.log('Order payload:', orderPayload);

      // Tạo đơn hàng
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();
      if (orderError) {
        throw orderError;
      }
      const orderId = orderData.order_id;

      // Tạo order items
      const orderItems = item.map((CartItem) => ({
        order_id: orderId,
        product_id: CartItem.product_id,
        quantity: CartItem.quantity,
        unit_price: CartItem.price,
      }));

      const { data, error } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (error) {
        throw error;
      }

      // Cập nhật số lượng sản phẩm (trừ đi số lượng đã mua)
      try {
        await this.productService.updateMultipleProductQuantities(item);
        console.log('Product quantities updated successfully after purchase');
      } catch (quantityError) {
        // Nếu cập nhật số lượng thất bại, chỉ log lỗi không chặn đơn hàng
        console.error('Error updating product quantities:', quantityError);
        console.warn('Order completed but inventory may not be updated');
      }

      // Lưu thông tin đơn hàng để trả về
      const orderInfo = {
        orderId: orderId,
        items: [...item], // Copy items trước khi clear cart
        total: this.getCartTotal()
      };

      // Xóa giỏ hàng sau khi đặt hàng thành công
      this.clearCart();

      return orderInfo;

    } catch (error) {
      console.error('Error during payment process:', error);
      throw error;
    }
  }
}
