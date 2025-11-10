import { NgForOf } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
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
  private authSubscription: any;

  constructor(
    private supabase: Supabase,
    private router: Router,
    public currencyService: CurrencyService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProducts();

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

  private async loadProducts() {
    try {
      console.log('Loading products...');
      const products = await this.supabase.getData('products');
      this.products = products || [];
      console.log('Products loaded:', this.products);

      if (!products || products.length === 0) {
        console.warn('No products found or empty result');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      this.products = [];
    }
  }

  goToDetail(productId: string) {
    this.router.navigate(['/detail', productId]);
  }
}
