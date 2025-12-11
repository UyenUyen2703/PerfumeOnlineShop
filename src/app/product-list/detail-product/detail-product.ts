import { NgForOf, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { supabase } from '../../../env/enviroment';
import { CurrencyService } from '../../services/currency.service';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
import { WishlistService } from '../../services/wishlist.service';
import { AddToCartComponent } from '../../components/add-to-cart/add-to-cart.component';

@Component({
  selector: 'app-detail-product',
  imports: [NgForOf, AddToCartComponent],
  templateUrl: './detail-product.html',
  styleUrl: './detail-product.css',
})
export class DetailProduct implements OnInit {
  productList: any = [];
  selectedSize: number | null = null;
  userId: string | null = null;
  isInWishlist = false;
  wishlistLoading = false;
  wishlistMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    public currencyService: CurrencyService,
    private authService: AuthService,
    private router: Router,
    private productService: ProductService,
    private wishlistService: WishlistService
  ) {}

  ngOnInit() {
    this.initializeUser();
    this.route.params.subscribe((params) => {
      const productId = params['product_id'];
      if (productId) {
        this.loadProductsOfId(productId);
        this.checkWishlistStatus(productId);
      }
    });
  }

  private async initializeUser() {
    try {
      this.userId = await this.authService.getUserId();
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
  }

  private async checkWishlistStatus(productId: string) {
    if (!this.userId) return;
    try {
      const wishlist = this.wishlistService.getWishlist();
      this.isInWishlist = wishlist.some((item) => item.product_id === productId);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  }

  caculateDiscountedPrice(price: number, discountPercentage: number): number {
    const discountAmount = (price * discountPercentage) / 100;
    return price - discountAmount;
  }

  private async loadProductsOfId(productId: string) {
    const product = await this.fetchProductById(productId);
    this.productList = [product];
    // Initialize selectedSize with the first available size
    if (product.size_ml && Array.isArray(product.size_ml) && product.size_ml.length > 0) {
      this.selectedSize = product.size_ml[0];
    } else if (product.size_ml && typeof product.size_ml === 'number') {
      this.selectedSize = product.size_ml;
    }
  }

  private async fetchProductById(productId: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*, brands(name), categories(name)')
      .eq('product_id', productId)
      .single();

    if (error) {
      console.error('Error fetching product:', error);
      throw error;
    }

    return data;
  }

  async onAddToCart(product: any) {
    try {
      const user = await this.authService.getUser();
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      alert('Product added to cart successfully!');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  }

  onProductAdded(product: any): void {
    console.log('Product added to cart:', product);
  }

  getImageUrl(relativePath: string): string {
    return this.productService.getImageUrl(relativePath);
  }

  getSizeOptions(product: any): number[] {
    if (!product.size_ml) {
      return [];
    }
    if (Array.isArray(product.size_ml)) {
      return product.size_ml;
    }
    return [product.size_ml];
  }

  selectSize(size: number): void {
    this.selectedSize = size;
  }

  async toggleWishlist(productId: string): Promise<void> {
    if (!this.userId) {
      this.wishlistMessage = 'Vui lòng đăng nhập để thêm vào danh sách yêu thích';
      this.router.navigate(['/login']);
      return;
    }

    this.wishlistLoading = true;
    this.wishlistMessage = null;

    try {
      if (this.isInWishlist) {
        const success = await this.wishlistService.removeFromWishlist(this.userId, productId);
        if (success) {
          this.isInWishlist = false;
          this.wishlistMessage = 'Đã xóa khỏi danh sách yêu thích';
        } else {
          this.wishlistMessage = 'Không thể xóa khỏi danh sách yêu thích';
        }
      } else {
        const success = await this.wishlistService.addToWishlist(this.userId, productId);
        if (success) {
          this.isInWishlist = true;
          this.wishlistMessage = 'Đã thêm vào danh sách yêu thích';
        } else {
          this.wishlistMessage = 'Không thể thêm vào danh sách yêu thích';
        }
      }

      setTimeout(() => {
        this.wishlistMessage = null;
      }, 3000);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      this.wishlistMessage = 'Có lỗi xảy ra';
      setTimeout(() => {
        this.wishlistMessage = null;
      }, 3000);
    } finally {
      this.wishlistLoading = false;
    }
  }
}
