import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { supabase } from '../../../env/enviroment';
import { Product } from '../../../type/product';
import { AddToCartComponent } from '../../components/add-to-cart/add-to-cart.component';
import { CurrencyService } from '../../services/currency.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-search',
  imports: [CommonModule, FormsModule, AddToCartComponent],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class Search implements OnInit {
  searchTerm: string = '';
  products: Product[] = [];
  categories: any[] = [];
  brands: any[] = [];
  selectedCategory: string = '';
  selectedBrand: string = '';
  sortBy: string = 'name';
  isLoading: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 8;
  totalProducts: number = 0;
  public Math = Math;

  // UI state
  showFilters: boolean = false;

  constructor(
    private productService: ProductService,
    public currencyService: CurrencyService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadBrands();

    // Check for query parameters
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchTerm = params['q'];
      }
      if (params['category']) {
        this.selectedCategory = params['category'];
      }
      if (params['brand']) {
        this.selectedBrand = params['brand'];
      }

      // Luôn gọi searchProducts để load sản phẩm (tất cả hoặc filtered)
      this.searchProducts();
    });
  }

  async loadCategories() {
    try {
      this.categories = await this.productService.getCategories();
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async loadBrands() {
    try {
      this.brands = await this.productService.getBrands();
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  }

  async searchProducts() {
    this.isLoading = true;

    try {
      // If no search term and no filter, show all products
      if (!this.searchTerm.trim() && !this.selectedCategory && !this.selectedBrand) {
        this.products = await this.getAllProducts();
      } else {
        this.products = await this.productService.searchProducts(
          this.searchTerm,
          this.selectedCategory || undefined,
          this.selectedBrand || undefined,
          this.sortBy
        );
      }

      this.totalProducts = this.products.length;
      this.currentPage = 1;

      // Update URL with search parameters
      this.updateUrl();
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async getAllProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('quantity', 0)
        .order('name');

      if (error) {
        console.error('Error fetching all products:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      return [];
    }
  }



  onSearch() {
    this.searchProducts();
  }

  onFilterChange() {
    this.searchProducts();
  }

  onSortChange() {
    this.searchProducts();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedBrand = '';
    this.sortBy = 'name';
    this.currentPage = 1;
    this.router.navigate(['/search']);
    // Tự động load lại tất cả sản phẩm
    this.searchProducts();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }



  getImageUrl(imagePath: string): string {
    return this.productService.getImageUrl(imagePath);
  }

  viewProductDetail(productId: string) {
    this.router.navigate(['/detail', productId]);
  }

  get paginatedProducts() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.products.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(page: number) {
    this.currentPage = page;
  }

  private updateUrl() {
    const queryParams: any = {};

    if (this.searchTerm) {
      queryParams.q = this.searchTerm;
    }
    if (this.selectedCategory) {
      queryParams.category = this.selectedCategory;
    }
    if (this.selectedBrand) {
      queryParams.brand = this.selectedBrand;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'merge'
    });
  }
}
