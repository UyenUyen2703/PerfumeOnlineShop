import { ExportService } from './../../services/export.service';
import { ProductService } from './../../services/product.service';
import { AuthService } from './../../services/auth.service';
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

  // Report Modal Properties
  showReportModal: boolean = false;
  isExporting: boolean = false;
  currentSellerId: string | null = null;

  constructor(
    private exportService: ExportService,
    private productService: ProductService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // Get current seller ID
    this.currentSellerId = await this.authService.getUserId();
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

  async importFile(event: any) {
    this.isLoading = true;

    await this.exportService.onFileChange(event, this.selectedGrid);

    if (this.selectedGrid === 'product') {
      await this.loadProducts();
    } else if (this.selectedGrid === 'brand') {
      await this.loadBrands();
    } else if (this.selectedGrid === 'category') {
      await this.loadCategories();
    }

    this.isLoading = false;
  }

  getImageUrl(relativePath: string): string {
    return this.productService.getImageUrl(relativePath);
  }

  openReportModal() {
    this.showReportModal = true;
  }

  closeReportModal() {
    this.showReportModal = false;
  }

  async exportOrdersReport() {
    if (!this.currentSellerId) {
      this.currentSellerId = await this.authService.getUserId();
      if (!this.currentSellerId) {
        alert('Please log in to export reports.');
        return;
      }
    }

    this.isExporting = true;
    this.closeReportModal();

    try {
      await this.exportService.generateSellerOrdersReport(this.currentSellerId);
    } catch (error) {
      console.error('Error exporting orders report:', error);
      alert('Failed to export orders report. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }

  async exportProductsReport() {
    if (!this.currentSellerId) {
      this.currentSellerId = await this.authService.getUserId();
      if (!this.currentSellerId) {
        alert('Please log in to export reports.');
        return;
      }
    }

    this.isExporting = true;
    this.closeReportModal();

    try {
      await this.exportService.generateSellerProductsReport(this.currentSellerId);
    } catch (error) {
      console.error('Error exporting products report:', error);
      alert('Failed to export products report. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }

  async exportRevenueReport() {
    if (!this.currentSellerId) {
      this.currentSellerId = await this.authService.getUserId();
      if (!this.currentSellerId) {
        alert('Please log in to export reports.');
        return;
      }
    }

    this.isExporting = true;
    this.closeReportModal();

    try {
      const currentYear = new Date().getFullYear();
      await this.exportService.generateSellerRevenueReport(this.currentSellerId, currentYear);
    } catch (error) {
      console.error('Error exporting revenue report:', error);
      alert('Failed to export revenue report. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }

  async exportComprehensiveReport() {
    if (!this.currentSellerId) {
      this.currentSellerId = await this.authService.getUserId();
      if (!this.currentSellerId) {
        alert('Please log in to export reports.');
        return;
      }
    }

    this.isExporting = true;
    this.closeReportModal();

    try {
      await this.exportService.generateComprehensiveSellerReport(this.currentSellerId);
    } catch (error) {
      console.error('Error exporting comprehensive report:', error);
      alert('Failed to export comprehensive report. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }
}
