import { NgForOf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { CurrencyService } from '../services/currency.service';
import { NotificationService } from '../services/notification.service';
import { ProductService } from '../services/product.service';
import { Supabase } from '../supabase';

@Component({
  selector: 'app-home-page',
  imports: [NgForOf, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit {
  products: any = [];
  isLoading = true;
  constructor(
    private supabase: Supabase,
    private router: Router,
    private route: ActivatedRoute,
    public currencyService: CurrencyService,
    private cartService: CartService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private productService: ProductService
  ) {}

  ngOnInit() {
    // Check if there is a login success message from query params
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (params['loginSuccess'] === 'true') {
        this.notificationService.success('Welcome to the perfume shop!');
        // Remove query parameter after showing notification
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
    this.loadProducts();
  }

  private async loadProducts() {
    try {
      this.isLoading = true;
      const products = await this.supabase.getProducts();
      if (products && products.length > 0) {
        this.products = products.slice(0, 3);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      this.products = [];
    } finally {
      this.isLoading = false;
    }
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
        image: this.getImageUrl(product.image_url),
        quantity: 1,
        options: (product.brands?.name || 'No Brand') + ' • ' + (product.categories?.name || 'No Category')
      };
      // Use buy now mode instead of adding to cart
      this.cartService.setBuyNowMode(productToAdd);
      this.router.navigate(['/cart']);
    } catch (error) {
      console.error('Error adding product to cart:', error);
      alert('An error occurred while adding product to cart');
    }
  }

  onProductAdded(product: any): void {
  }

  getImageUrl(relativePath: string): string {
    return this.productService.getImageUrl(relativePath);
  }
}
