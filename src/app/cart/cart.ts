import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CartService, CartItem } from '../services/cart.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  orderNote: string = '';
  agreeToTerms: boolean = false;
  private cartSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    // Subscribe to cart changes
    this.cartSubscription = this.cartService.cartItems$.subscribe(
      items => {
        this.cartItems = items;
      }
    );

  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }


  getItemTotal(item: CartItem): number {
    return this.cartService.getItemTotal(item);
  }

  getCartTotal(): string {
    return this.formatToCurrency(this.cartService.getCartTotal());
  }

  increaseQuantity(itemId: number): void {
    this.cartService.increaseQuantity(itemId);
  }

  decreaseQuantity(itemId: number): void {
    this.cartService.decreaseQuantity(itemId);
  }

  removeItem(itemId: number): void {
    this.cartService.removeItem(itemId);
  }

  addToCart(product: any): void {
    this.cartService.addToCart(product);
  }

  checkout(): void {
    if (!this.agreeToTerms) {
      alert('Vui lòng đồng ý với điều khoản và điều kiện');
      return;
    }

    if (this.cartService.isCartEmpty()) {
      alert('Giỏ hàng trống!');
      return;
    }

    // Xử lý logic thanh toán ở đây
    console.log('Proceeding to checkout:', {
      items: this.cartItems,
      total: this.getCartTotal(),
      note: this.orderNote,
      termsAgreed: this.agreeToTerms
    });

    // Redirect đến trang thanh toán hoặc xử lý thanh toán
    alert(`Đặt hàng thành công! Tổng tiền: ${this.getCartTotal()}`);

    // Clear cart after successful checkout
    this.cartService.clearCart();
    this.orderNote = '';
    this.agreeToTerms = false;
  }

  toggleTermsAgreement(): void {
    this.agreeToTerms = !this.agreeToTerms;
  }

  isCartEmpty(): boolean {
    return this.cartService.isCartEmpty();
  }

  getTotalItemCount(): number {
    return this.cartService.getTotalItemCount();
  }

  formatToCurrency(amount: number): string {
    return amount.toLocaleString('vn-VN', { style: 'currency', currency: 'VND' });
  }
}
