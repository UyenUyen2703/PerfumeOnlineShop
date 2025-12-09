import { Order, OrderItem, CartItem } from './../../type/order';
import { AuthService } from './auth.service';
import { ProductService } from './product.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../../env/enviroment';
import { OrderService } from './order.service';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  public cartItems$ = this.cartItemsSubject.asObservable();
  private isProcessingPayment = false;
  private buyNowModeSubject = new BehaviorSubject<boolean>(false);
  public buyNowMode$ = this.buyNowModeSubject.asObservable();
  private buyNowItemSubject = new BehaviorSubject<CartItem | null>(null);
  public buyNowItem$ = this.buyNowItemSubject.asObservable();

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private orderService: OrderService
  ) {
    this.loadCartFromStorage();
  }

  getCartItems(): CartItem[] {
    return this.cartItemsSubject.value;
  }

  addToCart(product: any): void {
    const currentItems = this.getCartItems();
    const existingItemIndex = currentItems.findIndex(
      (item) => item.product_id === product.product_id && item.size_ml === product.size_ml
    );

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
        size_ml: product.size_ml,
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

  setBuyNowMode(product: any): void {
    const buyNowItem: CartItem = {
      product_id: product.product_id,
      name: product.name,
      options: product.options || '',
      price: product.price,
      quantity: product.quantity || 1,
      image: product.image || 'assets/images/default-product.jpg',
    };
    this.buyNowModeSubject.next(true);
    this.buyNowItemSubject.next(buyNowItem);
  }

  clearBuyNowMode(): void {
    this.buyNowModeSubject.next(false);
    this.buyNowItemSubject.next(null);
  }

  isBuyNowMode(): boolean {
    return this.buyNowModeSubject.value;
  }

  getBuyNowItem(): CartItem | null {
    return this.buyNowItemSubject.value;
  }

  getBuyNowTotal(): number {
    const item = this.getBuyNowItem();
    return item ? item.price * item.quantity : 0;
  }

  updateBuyNowQuantity(newQuantity: number): void {
    const item = this.getBuyNowItem();
    if (item && newQuantity > 0) {
      item.quantity = newQuantity;
      this.buyNowItemSubject.next(item);
    }
  }

  async paymentProcess(
    address: string,
    recipientName: string,
    recipientPhone: string,
    note: string
  ): Promise<{ orderId: string; items: CartItem[]; total: number }> {
    if (this.isProcessingPayment) {
      throw new Error('Payment already in progress. Please wait...');
    }

    this.isProcessingPayment = true;

    try {
      const user = await this.authService.getUser();
      const item = this.isBuyNowMode() ? [this.getBuyNowItem()!] : this.getCartItems();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!address.trim()) {
        throw new Error('Delivery address is required');
      }

      if (!recipientName.trim()) {
        throw new Error('Recipient name is required');
      }

      if (!recipientPhone.trim()) {
        throw new Error('Recipient phone is required');
      }

      try {
        const stockValidation = await this.productService.validateStockAvailability(item);
        if (!stockValidation.valid) {
          console.warn('Stock validation warnings:', stockValidation.errors);
        }
      } catch (stockError) {
        console.warn('Could not validate stock, proceeding with order:', stockError);
      }

      const orderPayload = {
        user_id: user.id,
        total_amount: this.isBuyNowMode() ? this.getBuyNowTotal() : this.getCartTotal(),
        address: address.trim(),
        recipient_Name: recipientName.trim(),
        recipient_Phone: recipientPhone.trim(),
        note: note.trim(),
        status: 'Pending',
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();
      if (orderError) {
        throw orderError;
      }
      const orderId = orderData.order_id;

      const orderItems = item.map((CartItem) => ({
        order_id: orderId,
        product_id: CartItem.product_id,
        quantity: CartItem.quantity,
        unit_price: CartItem.price,
      }));

      const { data, error } = await supabase.from('order_items').insert(orderItems);

      if (error) {
        throw error;
      }

      try {
        await this.productService.updateMultipleProductQuantities(item);
      } catch (quantityError) {
        console.error('Error updating product quantities:', quantityError);
        console.warn('Order completed but inventory may not be updated');
      }

      try {
        for (const cartItem of item) {
          // Get product details to find the seller
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('seller_id, name')
            .eq('product_id', cartItem.product_id)
            .single();

          if (productError || !productData) {
            console.warn(`Could not find product ${cartItem.product_id} for notification`);
            continue;
          }

          if (productData.seller_id) {
            const notificationPayload = {
              seller_id: productData.seller_id,
              title: 'New Order Placed',
              content: `A new order (ID: ${orderId}) has been placed for your product "${productData.name || cartItem.name}".`,
              type: 'order',
              is_read: false,
              metadata: {
                orderId: orderId,
                productId: cartItem.product_id,
                customerId: user.id,
              },
            };
            const { error: notificationError } = await supabase
              .from('seller_notifications')
              .insert([notificationPayload]);
            if (notificationError) {
              console.error('Error creating notification for seller:', notificationError);
            }
          }
        }
      } catch (notificationError) {
        console.error('Error creating seller notifications:', notificationError);
        console.warn('Order completed but seller notifications may not have been created');
      }

      const orderInfo = {
        orderId: orderId,
        items: [...item],
        total: this.isBuyNowMode() ? this.getBuyNowTotal() : this.getCartTotal(),
      };

      if (this.isBuyNowMode()) {
        this.clearBuyNowMode();
      } else {
        this.clearCart();
      }

      return orderInfo;
    } catch (error) {
      console.error('Error during payment process:', error);
      throw error;
    } finally {
      this.isProcessingPayment = false;
    }
  }
}
