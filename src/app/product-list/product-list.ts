import { NgForOf } from '@angular/common';
import { Component } from '@angular/core';
import { Supabase } from '../supabase';
@Component({
  selector: 'app-product-list',
  imports: [NgForOf],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {

  products:any = [];
  constructor(private supabase: Supabase) {
    this.loadProducts();
  }

  private async loadProducts() {
    const products = await this.supabase.getData('products');
    this.products = products;
    console.log(products);
  }
}
