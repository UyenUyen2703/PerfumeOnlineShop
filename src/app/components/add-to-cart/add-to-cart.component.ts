import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-add-to-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="add-to-cart-container">
      <div class="quantity-selector" *ngIf="showQuantitySelector">
        <label for="quantity">Quantity:</label>
        <div class="quantity-controls">
          <button
            type="button"
            class="qty-btn"
            (click)="decreaseQuantity()"
            [disabled]="selectedQuantity <= 1">
            −
          </button>
          <input
            type="number"
            id="quantity"
            [(ngModel)]="selectedQuantity"
            [min]="1"
            [max]="maxQuantity"
            class="quantity-input" />
          <button
            type="button"
            class="qty-btn"
            (click)="increaseQuantity()"
            [disabled]="selectedQuantity >= maxQuantity">
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        class="add-to-cart-btn"
        [class.success]="isAdded"
        [disabled]="isDisabled || isLoading"
        (click)="addToCart()">
        <span *ngIf="isLoading" class="loading-spinner"></span>
        <span *ngIf="!isLoading && !isAdded">{{ buttonText }}</span>
        <span *ngIf="!isLoading && isAdded">✓ Added to Cart</span>
      </button>
    </div>
  `,
  styles: [`
    .add-to-cart-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
      max-width: 300px;
    }

    .quantity-selector {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .quantity-selector label {
      font-weight: 500;
      color: #333;
      min-width: 70px;
    }

    .quantity-controls {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .qty-btn {
      width: 32px;
      height: 32px;
      border: 1px solid #ddd;
      background: #fff;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .qty-btn:hover:not(:disabled) {
      background: #f5f5f5;
      border-color: #ccc;
    }

    .qty-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .quantity-input {
      width: 60px;
      height: 32px;
      border: 1px solid #ddd;
      border-radius: 4px;
      text-align: center;
      font-size: 14px;
    }

    .add-to-cart-btn {
      padding: 12px 24px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .add-to-cart-btn:hover:not(:disabled) {
      background: #0056b3;
      transform: translateY(-1px);
    }

    .add-to-cart-btn:active {
      transform: translateY(0);
    }

    .add-to-cart-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    .add-to-cart-btn.success {
      background: #28a745;
    }

    .add-to-cart-btn.success:hover {
      background: #1e7e34;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .cart-info {
      text-align: center;
      color: #666;
    }

    .cart-info small {
      font-size: 12px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .add-to-cart-container {
        max-width: 100%;
      }

      .quantity-selector {
        flex-direction: column;
        align-items: stretch;
      }

      .quantity-controls {
        justify-content: center;
      }
    }
  `]
})
export class AddToCartComponent implements OnInit {
  @Input() product: any = null;
  @Input() buttonText: string = 'Add to Cart';
  @Input() maxQuantity: number = 99;
  @Input() showQuantitySelector: boolean = true;
  @Input() showCartInfo: boolean = false;
  @Input() isDisabled: boolean = false;
  @Output() productAdded = new EventEmitter<any>();

  selectedQuantity: number = 1;
  isAdded: boolean = false;
  isLoading: boolean = false;
  requiresLogin: boolean = false;

  constructor(
    public cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.checkAuthState();

    this.authService.onAuthStateChange(async (event, session) => {
      await this.checkAuthState();
    });
  }

  private async checkAuthState(): Promise<void> {
    try {
      const user = await this.authService.getUser();
      this.requiresLogin = !user;
    } catch (error) {
      console.error('Error checking auth state:', error);
      this.requiresLogin = true;
    }
  }

  increaseQuantity(): void {
    if (this.selectedQuantity < this.maxQuantity) {
      this.selectedQuantity++;
    }
  }

  decreaseQuantity(): void {
    if (this.selectedQuantity > 1) {
      this.selectedQuantity--;
    }
  }

  async addToCart(): Promise<void> {
    if (!this.product || this.isLoading || this.isDisabled) {
      return;
    }

    if (this.requiresLogin) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const productToAdd = {
        ...this.product,
        quantity: this.selectedQuantity
      };

      this.cartService.addToCart(productToAdd);
      this.productAdded.emit(productToAdd);

      this.isAdded = true;
      setTimeout(() => {
        this.isAdded = false;
      }, 2000);

    } catch (error) {
      console.error('Error adding product to cart:', error);
      alert('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng');
    } finally {
      this.isLoading = false;
    }
  }

  isProductInCart(): boolean {
    return this.product ? this.cartService.isItemInCart(this.product.product_id) : false;
  }

  getProductQuantityInCart(): number {
    return this.product ? this.cartService.getItemQuantityInCart(this.product.product_id) : 0;
  }
}
