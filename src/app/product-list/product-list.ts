import { NgForOf } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Supabase } from '../supabase';
import { CurrencyService } from '../services/currency.service';
@Component({
  selector: 'app-product-list',
  imports: [NgForOf],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {

  products:any = [];
  constructor(private supabase: Supabase, private router: Router, public currencyService: CurrencyService) {
    this.loadProducts();
  }

  private async loadProducts() {
    const products = await this.supabase.getData('products');
    this.products = products;
    console.log(products);
  }

  goToDetail(productId: string) {
    this.router.navigate(['/detail', productId]);
  }
}
