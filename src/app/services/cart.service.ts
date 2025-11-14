import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  id: number;
  name: string;
  code: string;
  options: string;
  price: number;
  quantity: number;
  image: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  public cartItems$ = this.cartItemsSubject.asObservable();

  constructor() {
    // Load cart from localStorage if exists
    this.loadCartFromStorage();
  }

  // Lấy danh sách sản phẩm trong giỏ hàng
  getCartItems(): CartItem[] {
    return this.cartItemsSubject.value;
  }

  // Thêm sản phẩm vào giỏ hàng
  addToCart(product: any): void {
    const currentItems = this.getCartItems();
    const existingItemIndex = currentItems.findIndex(item => item.id === product.id);

    if (existingItemIndex > -1) {
      // Nếu sản phẩm đã có, tăng số lượng
      currentItems[existingItemIndex].quantity += product.quantity || 1;
    } else {
      // Nếu sản phẩm chưa có, thêm mới
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        code: product.code || `#${Date.now()}`,
        options: product.options || '',
        price: product.price,
        quantity: product.quantity || 1,
        image: product.image || 'assets/images/default-product.jpg'
      };
      currentItems.push(newItem);
    }

    this.updateCart(currentItems);
  }

  // Cập nhật số lượng sản phẩm
  updateQuantity(itemId: number, newQuantity: number): void {
    const currentItems = this.getCartItems();
    const itemIndex = currentItems.findIndex(item => item.id === itemId);

    if (itemIndex > -1 && newQuantity > 0) {
      currentItems[itemIndex].quantity = newQuantity;
      this.updateCart(currentItems);
    }
  }

  // Tăng số lượng
  increaseQuantity(itemId: number): void {
    const currentItems = this.getCartItems();
    const item = currentItems.find(item => item.id === itemId);
    if (item) {
      item.quantity++;
      this.updateCart(currentItems);
    }
  }

  // Giảm số lượng
  decreaseQuantity(itemId: number): void {
    const currentItems = this.getCartItems();
    const item = currentItems.find(item => item.id === itemId);
    if (item && item.quantity > 1) {
      item.quantity--;
      this.updateCart(currentItems);
    }
  }

  // Xóa sản phẩm khỏi giỏ hàng
  removeItem(itemId: number): void {
    const currentItems = this.getCartItems().filter(item => item.id !== itemId);
    this.updateCart(currentItems);
  }

  // Xóa toàn bộ giỏ hàng
  clearCart(): void {
    this.updateCart([]);
  }

  // Tính tổng tiền của một sản phẩm
  getItemTotal(item: CartItem): number {
    return item.price * item.quantity;
  }

  // Tính tổng tiền của toàn bộ giỏ hàng
  getCartTotal(): number {
    return this.getCartItems().reduce((total, item) => total + this.getItemTotal(item), 0);
  }

  // Đếm tổng số lượng sản phẩm trong giỏ
  getTotalItemCount(): number {
    return this.getCartItems().reduce((total, item) => total + item.quantity, 0);
  }

  // Kiểm tra giỏ hàng có trống không
  isCartEmpty(): boolean {
    return this.getCartItems().length === 0;
  }

  // Cập nhật giỏ hàng và lưu vào localStorage
  private updateCart(items: CartItem[]): void {
    this.cartItemsSubject.next(items);
    this.saveCartToStorage(items);
  }

  // Lưu giỏ hàng vào localStorage
  private saveCartToStorage(items: CartItem[]): void {
    try {
      localStorage.setItem('cart', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }

  // Load giỏ hàng từ localStorage
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

  // Tìm sản phẩm trong giỏ hàng
  findItemInCart(productId: number): CartItem | undefined {
    return this.getCartItems().find(item => item.id === productId);
  }

  // Kiểm tra sản phẩm đã có trong giỏ chưa
  isItemInCart(productId: number): boolean {
    return this.findItemInCart(productId) !== undefined;
  }

  // Lấy số lượng của sản phẩm trong giỏ
  getItemQuantityInCart(productId: number): number {
    const item = this.findItemInCart(productId);
    return item ? item.quantity : 0;
  }
}