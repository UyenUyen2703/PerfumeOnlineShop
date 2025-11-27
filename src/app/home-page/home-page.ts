import { NgForOf } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Supabase } from '../supabase';
import { CurrencyService } from '../services/currency.service';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home-page',
  imports: [NgForOf, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  products: any = [];
  constructor(
    private supabase: Supabase,
    private router: Router,
    private route: ActivatedRoute,
    public currencyService: CurrencyService,
    private cartService: CartService,
    private authService: AuthService
  ) {
    this.loadProducts();
  }

  private async loadProducts() {
    const products = await this.supabase.getProducts();
    this.products = products.slice(0, 3);
  }

  goToDetail(productId: string) {
    this.router.navigate(['/detail', productId]);
  }

  async addToCart(product: any, event: MouseEvent) {
    event.stopPropagation();
    try {
      const user = await this.authService.getUser();
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      const productToAdd = {
        product_id: product.product_id,
        name: product.name,
        price: product.price * 1000,
        image: product.image_url,
        quantity: 1,
        options: (product.brands?.name || 'No Brand') + ' • ' + (product.categories?.name || 'No Category')
      };
      this.cartService.addToCart(productToAdd);
      this.router.navigate(['/cart']);
    } catch (error) {
      console.error('Error adding product to cart:', error);
      alert('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng');
    }
  }

  onProductAdded(product: any): void {
    console.log('Product added to cart:', product);
  }
}
