import { Order } from './../../type/order';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { supabase } from '../../env/enviroment';
import { CartItem } from '../../type/order';

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
  orderAddress: string = '';
  address: string = '';
  recipientName: string = '';
  recipientPhone: string = '';
  note: string = '';
  private cartSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
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

  increaseQuantity(itemId: string): void {
    this.cartService.increaseQuantity(itemId);
  }

  decreaseQuantity(itemId: string): void {
    this.cartService.decreaseQuantity(itemId);
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  addToCart(product: any): void {
    this.cartService.addToCart(product);
  }

  async checkout(): Promise<void> {
    if (!this.agreeToTerms) {
      alert('Please agree to the terms and conditions before proceeding.');
      return;
    }

    if (this.cartService.isCartEmpty()) {
      alert('Cart is empty!');
      return;
    }

    // Validate required fields
    if (!this.address.trim()) {
      alert('Please enter delivery address!');
      return;
    }

    if (!this.recipientName.trim()) {
      alert('Please enter recipient name!');
      return;
    }

    if (!this.recipientPhone.trim()) {
      alert('Please enter recipient phone number!');
      return;
    }

    try {
      await this.cartService.paymentProcess(this.address, this.recipientName, this.recipientPhone, this.note);
      alert(`Order placed successfully! Total amount: ${this.getCartTotal()}`);
      this.cartService.clearCart();
      this.orderNote = '';
      this.address = '';
      this.recipientName = '';
      this.recipientPhone = '';
      this.note = '';
      this.agreeToTerms = false;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred while processing your order. Please try again.');
    }
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
