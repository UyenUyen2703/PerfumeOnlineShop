import { NgForOf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { CurrencyService } from '../services/currency.service';
import { NotificationService } from '../services/notification.service';
import { ProductService } from '../services/product.service';
import { Supabase } from '../supabase';
import { take } from 'rxjs';

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
    // Kiểm tra nếu có thông báo login thành công từ query params
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (params['loginSuccess'] === 'true') {
        this.notificationService.success('Chào mừng bạn đến với cửa hàng nước hoa!');
        // Xóa query parameter sau khi hiển thị thông báo
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
      // Sử dụng buy now mode thay vì thêm vào cart
      this.cartService.setBuyNowMode(productToAdd);
      this.router.navigate(['/cart']);
    } catch (error) {
      console.error('Error adding product to cart:', error);
      alert('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng');
    }
  }

  onProductAdded(product: any): void {
    console.log('Product added to cart:', product);
  }

  getImageUrl(relativePath: string): string {
    return this.productService.getImageUrl(relativePath);
  }
}
