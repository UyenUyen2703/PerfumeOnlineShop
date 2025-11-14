import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart-icon',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="cart-icon-container" [routerLink]="['/cart']">
      <div class="cart-icon">
        🛒
        <span *ngIf="itemCount > 0" class="cart-badge">{{ itemCount }}</span>
      </div>
      <span class="cart-text">Cart</span>
    </div>
  `,
  styles: [`
    .cart-icon-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
      position: relative;
    }

    .cart-icon-container:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .cart-icon {
      position: relative;
      font-size: 24px;
      margin-bottom: 4px;
    }

    .cart-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ff4444;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: bounce 0.3s ease;
    }

    .cart-text {
      font-size: 12px;
      font-weight: 500;
      color: #333;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-5px);
      }
      60% {
        transform: translateY(-3px);
      }
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .cart-text {
        display: none;
      }

      .cart-icon-container {
        padding: 6px;
      }

      .cart-icon {
        font-size: 20px;
      }
    }
  `]
})
export class CartIconComponent implements OnInit, OnDestroy {
  itemCount: number = 0;
  private cartSubscription?: Subscription;

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.cartSubscription = this.cartService.cartItems$.subscribe(() => {
      this.itemCount = this.cartService.getTotalItemCount();
    });
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }
}
