import { NgForOf } from '@angular/common';
import { Component } from '@angular/core';
import { Supabase } from '../supabase';

@Component({
  selector: 'app-home-page',
  imports: [ NgForOf],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  products: any = [];
  constructor(private supabase: Supabase) {
    this.loadProducts();
  }

  private async loadProducts() {
    const products = await this.supabase.getProducts();
    this.products = products;
  }
}
