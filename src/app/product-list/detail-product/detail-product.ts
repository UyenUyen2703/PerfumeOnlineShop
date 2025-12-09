import { NgForOf, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { supabase } from '../../../env/enviroment';
import { CurrencyService } from '../../services/currency.service';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
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

  constructor(
    private route: ActivatedRoute,
    public currencyService: CurrencyService,
    private authService: AuthService,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const productId = params['product_id'];
      if (productId) {
        this.loadProductsOfId(productId);
      }
    });
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
}
