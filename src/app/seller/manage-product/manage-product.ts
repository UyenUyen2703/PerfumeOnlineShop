import { CommonModule, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { IgxGridComponent, IgxGridModule } from 'igniteui-angular';
import { supabase } from '../../../env/enviroment';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manage-product',
  imports: [NgIf, IgxGridComponent, IgxGridModule, FormsModule, CommonModule],
  templateUrl: './manage-product.html',
  styleUrl: './manage-product.css',
})
export class ManageProduct {
  product: any[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  isUpdating: boolean = false;
  successMessage: string | null = null;
  constructor() {}

  ngOnInit() {
    this.isLoading = true;
    this.loadProducts();
  }
  formatToCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  }

  async loadProducts() {
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
  onCellEditDone(event: any) {
    const rowData = event.rowData || event.data || event.row?.data;
    const newValue = event.newValue !== undefined ? event.newValue : (event.cell ? event.cell.value : undefined);
    const oldValue = event.oldValue !== undefined ? event.oldValue : (event.cell ? event.cell.oldValue : undefined);

    if (!rowData) {
      console.error('No row data found in event');
      return;
    }

    const productId = rowData.product_id;
    const newQuantity = Number(newValue);
    const oldQuantity = Number(oldValue);

    if (newQuantity !== oldQuantity && !isNaN(newQuantity)) {
      if (newQuantity < 0) {
        this.errorMessage = 'Quantity cannot be negative';
        if (rowData.quantity !== undefined) {
          rowData.quantity = oldQuantity;
        }
        setTimeout(() => {
          this.errorMessage = null;
        }, 3000);
        return;
      }

      this.updateQuantityProduct(productId, newQuantity);
    }
  }

  async updateQuantityProduct(productId: number, newQuantity: number) {
    console.log('Starting updateQuantityProduct with:', { productId, newQuantity });

    this.isUpdating = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const { data, error } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('product_id', productId)
        .select();

      if (error) {
        throw error;
      }

      const productIndex = this.product.findIndex(
        (p) => p.product_id === productId
      );


      if (productIndex > -1) {
        this.product[productIndex].quantity = newQuantity;
        this.successMessage = 'Quantity updated successfully!';

        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      }

    } catch (error) {
      console.error('Error updating product quantity:', error);
      this.errorMessage = 'Failed to update quantity. Please try again.';
      await this.loadProducts();

      setTimeout(() => {
        this.errorMessage = null;
      }, 5000);
    } finally {
      this.isUpdating = false;
    }
  }

}
