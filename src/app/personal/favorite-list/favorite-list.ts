import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WishlistService, Wishlist } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-favorite-list',
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './favorite-list.html',
  styleUrl: './favorite-list.css',
})
export class FavoriteList implements OnInit, OnDestroy {
  wishlist: Wishlist[] = [];
  loading = false;
  error: string | null = null;
  userId: string | null = null;
  selectedItems: Set<string> = new Set();
  successMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private wishlistService: WishlistService,
    private authService: AuthService,
    private cartService: CartService,
    public productService: ProductService
  ) {}

  ngOnInit() {
    this.initializeWishlist();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeWishlist() {
    try {
      this.userId = await this.authService.getUserId();
      if (this.userId) {
        await this.loadWishlist();
        this.subscribeToWishlist();
      } else {
        this.error = 'Please log in to view your wishlist';
      }
    } catch (error) {
      console.error('Error initializing wishlist:', error);
      this.error = 'An error occurred while loading the wishlist';
    }
  }

  private async loadWishlist() {
    this.loading = true;
    if (this.userId) {
      this.wishlist = await this.wishlistService.getUserWishlist(this.userId);
    }
    this.loading = false;
  }

  private subscribeToWishlist() {
    this.wishlistService.wishlist$
      .pipe(takeUntil(this.destroy$))
      .subscribe((wishlist) => {
        this.wishlist = wishlist;
      });

    this.wishlistService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.error = error;
      });

    this.wishlistService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
      });
  }

  async removeFromWishlist(productId: string) {
    if (!this.userId) return;

    const success = await this.wishlistService.removeFromWishlist(this.userId, productId);
    if (success) {
      this.successMessage = 'Removed product from the wishlist';
      setTimeout(() => {
        this.successMessage = null;
      }, 3000);
    }
  }

  addToCart(item: Wishlist) {
    if (!item.product) return;

    const product = {
      product_id: item.product.product_id,
      name: item.product.name,
      price: item.product.price,
      image: this.productService.getImageUrl(item.product.image_url || ''),
      quantity: 1,
      size_ml: item.product.size_ml,
    };

    this.cartService.addToCart(product);
    this.successMessage = 'Added product to the cart';
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }

  toggleSelectItem(productId: string) {
    if (this.selectedItems.has(productId)) {
      this.selectedItems.delete(productId);
    } else {
      this.selectedItems.add(productId);
    }
  }

  isItemSelected(productId: string): boolean {
    return this.selectedItems.has(productId);
  }

  selectAll() {
    if (this.selectedItems.size === this.wishlist.length && this.wishlist.length > 0) {
      this.selectedItems.clear();
    } else {
      this.wishlist.forEach((item) => {
        this.selectedItems.add(item.product_id);
      });
    }
  }

  isAllSelected(): boolean {
    return this.selectedItems.size === this.wishlist.length && this.wishlist.length > 0;
  }

  async removeSelectedItems() {
    if (this.selectedItems.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${this.selectedItems.size} products?`)) {
      return;
    }

    if (!this.userId) return;

    for (const productId of this.selectedItems) {
      await this.wishlistService.removeFromWishlist(this.userId, productId);
    }

    this.selectedItems.clear();
    this.successMessage = `Deleted ${this.selectedItems.size} selected products`;
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }

  async addSelectedToCart() {
    if (this.selectedItems.size === 0) return;

    for (const productId of this.selectedItems) {
      const item = this.wishlist.find((w) => w.product_id === productId);
      if (item) {
        this.addToCart(item);
      }
    }

    this.selectedItems.clear();
    this.successMessage = `Added ${this.selectedItems.size} products to the cart`;
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }

  getDisplayPrice(item: Wishlist): number {
    if (!item.product) return 0;
    const basePrice = item.product.price * 1000;
    if (item.product.discount && item.product.discount > 0) {
      return basePrice - (basePrice * item.product.discount) / 100;
    }
    return basePrice;
  }

  getDiscountedPrice(item: Wishlist): number | null {
    if (!item.product || !item.product.discount || item.product.discount === 0) {
      return null;
    }
    const basePrice = item.product.price * 1000;
    return basePrice - (basePrice * item.product.discount) / 100;
  }

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  }

  getStockStatus(item: Wishlist): string {
    if (!item.product) return 'Not available';
    if (item.product.quantity > 0) return 'In stock';
    return 'Out of stock';
  }

  getStockStatusClass(item: Wishlist): string {
    if (!item.product) return 'out-of-stock';
    return item.product.quantity > 0 ? 'in-stock' : 'out-of-stock';
  }

  isOutOfStock(item: Wishlist): boolean {
    return !item.product || item.product.quantity <= 0;
  }
}
