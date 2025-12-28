import { NgForOf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AddToCartComponent } from '../components/add-to-cart/add-to-cart.component';
import { AuthService } from '../services/auth.service';
import { CurrencyService } from '../services/currency.service';
import { ProductService } from '../services/product.service';
import { WishlistService } from '../services/wishlist.service';
import { Supabase } from '../supabase';

@Component({
  selector: 'app-product-list',
  imports: [NgForOf, AddToCartComponent, RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit, OnDestroy {
  products: any[] = [];
  categories: string[] = [];
  brands: string[] = [];
  selectedCategory: string | null = null;
  public Math = Math;
  pageSize: number = 8;
  currentPage: number = 1;
  private authSubscription: any;
  isCategoryOpen: boolean = false;
  showAllBrands: boolean = false;
  maxVisibleBrands: number = 5;
  favorites: string[] = [];
  userId: string | null = null;

  constructor(
    private supabase: Supabase,
    private router: Router,
    public currencyService: CurrencyService,
    private authService: AuthService,
    private productService: ProductService,
    private wishlistService: WishlistService
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.loadBrands();
    this.initializeUser();
    this.authSubscription = this.authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await this.initializeUser();
        setTimeout(() => {
          this.loadProducts();
        }, 500);
      } else if (event === 'SIGNED_OUT') {
        this.userId = null;
        this.favorites = [];
      }
    });
  }

  private async initializeUser() {
    try {
      this.userId = await this.authService.getUserId();
      if (this.userId) {
        await this.loadFavorites();
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  }

  caculateDiscountedPrice(price: number, discountPercentage: number): number {
    const discountAmount = (price * discountPercentage) / 100;
    return price - discountAmount;
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.data.subscription.unsubscribe();
    }
  }

  private async loadBrands() {
    try {
      const brandsData = await this.supabase.getData('brands');
      this.brands = brandsData?.map((brand: any) => brand.name) || [];
    } catch (error) {
      console.error('Error loading brands:', error);
      this.brands = [];
    }
  }

  private async loadCategories() {
    try {
      const categoriesData = await this.supabase.getData('categories');
      this.categories = categoriesData?.map((cat: any) => cat.name) || [];
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories = [];
    }
  }

  goToDetail(productId: string) {
    this.router.navigate(['/detail', productId]);
  }

  private async loadProducts() {
    try {
      const products = await this.supabase.getProducts();
      this.products = products || [];

      if (!products || products.length === 0) {
        console.warn('No products found or empty result');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      this.products = [];
    }
  }

  async filterByCategory(category: string) {
    this.selectedCategory = category;
    try {
      this.products = (await this.supabase.getProductsByCategory(category)) || [];
    } catch (error) {
      console.error('Error filtering products by category:', error);
      this.products = [];
    }
  }
  async filterByBrand(brand: string) {
    this.selectedCategory = brand;
    try {
      this.products = (await this.supabase.getProductsByBrand(brand)) || [];
    } catch (error) {
      console.error('Error filtering products by brand:', error);
      this.products = [];
    }
  }

  async showAllProducts() {
    this.selectedCategory = null;
    await this.loadProducts();
  }

  addToCart(product: any, event: MouseEvent) {
    product.addedToCart = true;
    event.stopPropagation();
  }

  get paginatedProducts() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.products.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(page: number) {
    this.currentPage = page;
  }

  onProductAdded(product: any): void {
  }

  toggleCategory(): void {
    this.isCategoryOpen = !this.isCategoryOpen;
  }

  closeCategoryOnMobile(): void {
    if (window.innerWidth <= 991) {
      this.isCategoryOpen = false;
    }
  }

  getImageUrl(relativePath: string): string {
    return this.productService.getImageUrl(relativePath);
  }

  get visibleBrands() {
    if (this.showAllBrands) {
      return this.brands;
    }
    return this.brands.slice(0, this.maxVisibleBrands);
  }

  get hasMoreBrands() {
    return this.brands.length > this.maxVisibleBrands;
  }

  toggleBrandsVisibility() {
    this.showAllBrands = !this.showAllBrands;
  }

  async loadFavorites() {
    if (!this.userId) return;

    try {
      const wishlist = await this.wishlistService.getUserWishlist(this.userId);
      this.favorites = wishlist.map((item) => item.product_id);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  isFavorite(productId: string): boolean {
    return this.favorites.includes(productId);
  }

  async toggleFavorite(product: any, event: MouseEvent) {
    event.stopPropagation();

    if (!this.userId) {
      alert('You need to login!');
      this.router.navigate(['/login']);
      return;
    }

    const exists = this.isFavorite(product.product_id);

    if (exists) {
      const success = await this.wishlistService.removeFromWishlist(this.userId, product.product_id);
      if (success) {
        this.favorites = this.favorites.filter((id) => id !== product.product_id);
      }
    } else {
      const success = await this.wishlistService.addToWishlist(this.userId, product.product_id);
      if (success) {
        this.favorites.push(product.product_id);
      }
    }
  }
}
