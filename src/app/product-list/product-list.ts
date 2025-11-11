import { NgForOf } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLinkActive } from '@angular/router';
import { Supabase } from '../supabase';
import { CurrencyService } from '../services/currency.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-product-list',
  imports: [NgForOf],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit, OnDestroy {
  products: any[] = [];
  categories: string[] = [];
  selectedCategory: string | null = null;
  private authSubscription: any;

  constructor(
    private supabase: Supabase,
    private router: Router,
    public currencyService: CurrencyService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.authSubscription = this.authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        setTimeout(() => {
          this.loadProducts();
        }, 500);
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.data.subscription.unsubscribe();
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
    console.log('filterByCategory called with:', category);
    this.selectedCategory = category;
    try {
      this.products = await this.supabase.getProductsByCategory(category) || [];
      console.log('Filtered products:', this.products);
    } catch (error) {
      console.error('Error filtering products by category:', error);
      this.products = [];
    }
  }

  async showAllProducts() {
    this.selectedCategory = null;
    await this.loadProducts();
  }

  addToCart(product: any, event: MouseEvent) {
    event.stopPropagation();
    // Implement add to cart functionality
  }
}
