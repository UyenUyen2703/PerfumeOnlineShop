import { NgForOf } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Supabase } from '../supabase';
import { CurrencyService } from '../services/currency.service';

@Component({
  selector: 'app-home-page',
  imports: [NgForOf, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  products: any = [];
  constructor(private supabase: Supabase, private router: Router, private route: ActivatedRoute, public currencyService: CurrencyService) {
    this.loadProducts();
  }

  private async loadProducts() {
    const products = await this.supabase.getProducts();
    this.products = products;
  }

  goToDetail(productId: string) {
    this.router.navigate(['/detail', productId]);
  }
}
