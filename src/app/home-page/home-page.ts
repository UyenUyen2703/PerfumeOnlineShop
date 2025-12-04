import { NgForOf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  constructor(
    private supabase: Supabase,
    private router: Router,
    private route: ActivatedRoute,
    public currencyService: CurrencyService,
    private cartService: CartService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private productService: ProductService
  ) {
    this.loadProducts();
  }

  ngOnInit() {
    // Kiểm tra nếu có thông báo login thành công từ query params
    this.route.queryParams.subscribe(params => {
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
        image: this.getImageUrl(product.image_url),
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

  getImageUrl(relativePath: string): string {
    return this.productService.getImageUrl(relativePath);
  }
}
