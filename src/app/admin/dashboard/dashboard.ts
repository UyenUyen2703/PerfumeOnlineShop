import { supabase } from './../../../env/enviroment';
import { Component, OnInit } from '@angular/core';
import { IgxColumnComponent, IgxGridComponent, IgxGridModule, IgxFilterDirective, IgxGridPinningActionsComponent } from 'igniteui-angular';
import { CurrencyPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IgxGridModule, IgxGridComponent, IgxColumnComponent, CommonModule, FormsModule, IgxGridPinningActionsComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  selectedGrid = 'product';
  product: any[] = [];
  brand: any[] = [];
  category: any[] = [];
  isLoading: boolean = false;

  ngOnInit() {
    this.loadProducts();
    this.loadBrand();
    this.loadCategory();
  }

  private async loadProducts() {
    this.isLoading = true;
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*, categories(name), brands(name)');
      if (error) throw error;
      this.product = productsData || [];
      console.log('Products loaded:', this.product);
    } catch (error) {
      console.error('Error loading products:', error);
      this.product = [];
    } finally {
      this.isLoading = false;
    }
  }

  private async loadBrand() {
    try {
      const { data, error } = await supabase.from('brands').select('*');
      if (error) throw error;
      this.brand = data;
      console.log('Brand loaded:', this.brand);
      return this.brand;
    } catch (error) {
      console.error('Error loading brand:', error);
      return 'Unknown Brand';
    }
  }

  private async loadCategory() {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      this.category = data || [];
      return this.category;
    } catch (error) {
      console.error('Error loading brand:', error);
      return 'Unknown Brand';
    }
  }
}
