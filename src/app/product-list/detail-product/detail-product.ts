import { NgForOf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { supabase } from '../../../env/enviroment';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'app-detail-product',
  imports: [NgForOf],
  templateUrl: './detail-product.html',
  styleUrl: './detail-product.css',
})
export class DetailProduct implements OnInit {
  productList: any = [];

  constructor(private route: ActivatedRoute, public currencyService: CurrencyService) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const productId = params['product_id'];
      if (productId) {
        this.loadProductsOfId(productId);
      }
    });
  }

  private async loadProductsOfId(productId: string) {
    const product = await this.fetchProductById(productId);
    this.productList = [product];
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

}
