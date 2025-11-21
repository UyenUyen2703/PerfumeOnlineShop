import { ExportService } from './../../services/export.service';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IgxGridComponent,
  IgxColumnComponent,
  IgxGridToolbarComponent,
  IgxGridToolbarTitleComponent,
  IgxGridToolbarActionsComponent,
  IgxGridPinningActionsComponent,
  IgxGridModule,
} from 'igniteui-angular';
import { supabase } from '../../../env/enviroment';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    IgxGridComponent,
    IgxGridModule,
    IgxColumnComponent,
    IgxGridToolbarComponent,
    IgxGridToolbarTitleComponent,
    IgxGridToolbarActionsComponent,
    IgxGridPinningActionsComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class SellerDashboard {
  selectedGrid = 'product';

  product: any[] = [];
  category: any[] = [];
  brand: any[] = [];
  isLoading: boolean = false;
  constructor(private exportService: ExportService) {}

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.loadBrands();
  }
  private async loadProducts() {
    this.isLoading = true;
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*, categories(name), brands(name)');
      if (error) throw error;
      this.product = productsData || [];
    } catch (error) {
      console.error('Error loading products:', error);
      this.product = [];
    } finally {
      this.isLoading = false;
    }
  }

  private async loadCategories() {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      this.category = data || [];
    } catch (error) {
      console.error('Error loading categories:', error);
      this.category = [];
    }
  }

  private async loadBrands() {
    try {
      const { data, error } = await supabase.from('brands').select('*');
      if (error) throw error;
      this.brand = data || [];
    } catch (error) {
      console.error('Error loading brands:', error);
      this.brand = [];
    }
  }

  exportFile() {
    if (this.selectedGrid === 'product') {
      this.exportService.exportToExcel(this.product, 'products_data');
    } else if (this.selectedGrid === 'brand') {
      this.exportService.exportToExcel(this.brand, 'brands_data');
    } else if (this.selectedGrid === 'category') {
      this.exportService.exportToExcel(this.category, 'categories_data');
    }
  }
}
