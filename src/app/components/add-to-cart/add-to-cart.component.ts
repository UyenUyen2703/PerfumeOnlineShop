import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-add-to-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-to-cart.html',
  styleUrls: ['./add-to-cart.css'],
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
      alert('An error occurred while adding product to cart');
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
