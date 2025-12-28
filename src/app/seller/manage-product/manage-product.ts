import { CommonModule, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import {
  IgxGridComponent,
  IgxGridModule,
  IgxSelectComponent,
  IgxSelectItemComponent,
  IgxButtonDirective,
} from 'igniteui-angular';
import { supabase } from '../../../env/enviroment';
import { FormsModule } from '@angular/forms';
import { CarouselModule } from 'ngx-owl-carousel-o';

@Component({
  selector: 'app-manage-product',
  imports: [
    NgIf,
    IgxGridComponent,
    IgxGridModule,
    FormsModule,
    CommonModule,
    CarouselModule,
    IgxSelectComponent,
    IgxSelectItemComponent,
    IgxButtonDirective,
  ],
  templateUrl: './manage-product.html',
  styleUrl: './manage-product.css',
})
export class ManageProduct {
  product: any[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  isUpdating: boolean = false;
  successMessage: string | null = null;
  brands: any[] = [];
  categories: any[] = [];
  isAddingProduct: boolean = false;
  selectedImageFile: File | null = null;
  imagePreview: string | null = null;

  // Object for new product form
  newProduct = {
    name: '',
    price: 0,
    quantity: 0,
    brand_id: '',
    category_id: '',
    description: '',
    image_url: '',
    size_ml: 0,
    discount: 0
  };

  constructor() {}

  ngOnInit() {
    this.isLoading = true;
    this.loadProducts();
    this.loadBrands();
    this.loadCategories();
    this.closeAddProductModal();
  }
  formatToCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  }

  async loadBrands() {
    try {
      const { data: brands, error } = await supabase.from('brands').select('*');
      if (error) throw error;
      this.brands = brands || [];
      return this.brands;
    } catch (error) {
      console.error('Error loading brands:', error);
      return [];
    }
  }

  async loadProducts() {
    this.isLoading = true;
    try {
      const { data: brands } = await supabase.from('brands').select('*');
      this.brands = brands || [];

      const { data: productsData, error } = await supabase
        .from('products')
        .select('*, categories(name), brands(name)');
      if (error) throw error;
      this.product = productsData || [];
      if (productsData) {
        this.product = this.product.map((p) => {
          const brand = this.brands.find((b) => b.brand_id === p.brand_id);

          return {
            ...p,
            brand_name: brand ? brand.name : null,
            category_name: p.categories?.name || null,
          };
        });
      }
    } catch (error) {
      console.error('Error loading products:', error);
      this.product = [];
    } finally {
      this.isLoading = false;
    }
  }

  async deleteProduct(productId: number) {
    this.isUpdating = true;
    this.errorMessage = null;
    this.successMessage = null;
    try {
      const { data, error } = await supabase.from('products').delete().eq('product_id', productId);
      if (error) {
        throw error;
      }
      this.product = this.product.filter((p) => p.product_id !== productId);
      this.successMessage = 'Product deleted successfully!';
      setTimeout(() => {
        this.successMessage = null;
      }, 2000);
    } catch (error) {
      console.error('Error deleting product:', error);
      this.errorMessage = 'Failed to delete product. Please try again.';
      await this.loadProducts();
      setTimeout(() => {
        this.errorMessage = null;
      }, 2000);
    } finally {
      this.isUpdating = false;
    }
  }

  onCellEditDone(event: any) {
    const rowData = event.rowData || event.data || event.row?.data;
    const newValue =
      event.newValue !== undefined ? event.newValue : event.cell ? event.cell.value : undefined;
    const oldValue =
      event.oldValue !== undefined ? event.oldValue : event.cell ? event.cell.oldValue : undefined;

    if (!rowData) {
      console.error('No row data found in event');
      return;
    }

    const productId = rowData.product_id;
    const newQuantity = Number(newValue);
    const oldQuantity = Number(oldValue);

    if (event.column.field === 'name') {
      if (newValue !== oldValue && newValue.trim() !== '') {
        this.updateNameProduct(productId, newValue.trim());
      }
    } else {
      if (event.column.field === 'quantity')
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
  }

  async updateQuantityProduct(productId: number, newQuantity: number) {
    this.isUpdating = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const { data, error } = await supabase
        .from('products')
        .update({ quantity: newQuantity, updated_at: new Date() })
        .eq('product_id', productId)
        .select();
      if (error) {
        throw error;
      }

      const productIndex = this.product.findIndex((p) => p.product_id === productId);

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

  async updateNameProduct(productId: number, newName: string) {
    this.isUpdating = true;
    this.errorMessage = null;
    this.successMessage = null;
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ name: newName, updated_at: new Date() })
        .eq('product_id', productId)
        .select();
      console.log('Update response data:', data);
      if (error) {
        throw error;
      }
      const productIndex = this.product.findIndex((p) => p.product_id === productId);
      if (productIndex > -1) {
        this.product[productIndex].name = newName;
        this.successMessage = 'Name updated successfully!';
        setTimeout(() => {
          this.successMessage = null;
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating product name:', error);
      this.errorMessage = 'Failed to update name. Please try again.';
      await this.loadProducts();
      setTimeout(() => {
        this.errorMessage = null;
      }, 2000);
    } finally {
      this.isUpdating = false;
    }
  }

  async updateBrandProduct(productId: number, newBrand: string) {
    this.isUpdating = true;
    this.errorMessage = null;
    this.successMessage = null;
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ brand: newBrand, updated_at: new Date() })
        .eq('product_id', productId)
        .select();
      console.log('Update response data:', data);
      if (error) {
        throw error;
      }
      const productIndex = this.product.findIndex((p) => p.product_id === productId);
      if (productIndex > -1) {
        this.product[productIndex].brand = newBrand;
        this.successMessage = 'Brand updated successfully!';
        setTimeout(() => {
          this.successMessage = null;
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating product brand:', error);
      this.errorMessage = 'Failed to update brand. Please try again.';
      await this.loadProducts();
      setTimeout(() => {
        this.errorMessage = null;
      }, 2000);
    } finally {
      this.isUpdating = false;
    }
  }

  async loadCategories() {
    try {
      const { data: categories, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      this.categories = categories || [];
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  openAddProductModal() {
    this.resetForm();
    const modal = document.getElementById('addProductModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }

  closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.resetForm();
  }

  resetForm() {
    this.newProduct = {
      name: '',
      price: 0,
      quantity: 0,
      brand_id: '',
      category_id: '',
      description: '',
      image_url: '',
      size_ml: 0,
      discount: 0
    };
    this.selectedImageFile = null;
    this.imagePreview = null;

    // Reset file input
    const fileInput = document.getElementById('productImage') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size must be less than 5MB';
        setTimeout(() => this.errorMessage = null, 3000);
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select a valid image file';
        setTimeout(() => this.errorMessage = null, 3000);
        return;
      }

      this.selectedImageFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.newProduct.image_url = '';

    const fileInput = document.getElementById('productImage') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  async uploadImage(file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  isFormValid(): boolean {
    return !!(this.newProduct.name.trim() &&
             this.newProduct.price > 0 &&
             this.newProduct.quantity >= 0 &&
             this.newProduct.brand_id);
  }

  async addProduct() {
    if (!this.isFormValid()) {
      this.errorMessage = 'Please fill in all required fields';
      setTimeout(() => this.errorMessage = null, 3000);
      return;
    }

    this.isAddingProduct = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      let imageUrl = '';

      if (this.selectedImageFile) {
        imageUrl = await this.uploadImage(this.selectedImageFile) || '';
        if (!imageUrl && this.selectedImageFile) {
          throw new Error('Failed to upload image');
        }
      }

      const productData = {
        name: this.newProduct.name.trim(),
        price: this.newProduct.price,
        quantity: this.newProduct.quantity,
        brand_id: this.newProduct.brand_id,
        category_id: this.newProduct.category_id || null,
        description: this.newProduct.description.trim() || null,
        image_url: imageUrl || null,
        size_ml: this.newProduct.size_ml || null,
        discount: this.newProduct.discount || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select('*, categories(name), brands(name)');

      if (error) throw error;

      if (data && data[0]) {
        const brand = this.brands.find(b => b.brand_id === data[0].brand_id);
        const newProductWithDetails = {
          ...data[0],
          brand_name: brand ? brand.name : null,
          category_name: data[0].categories?.name || null
        };
        this.product.push(newProductWithDetails);
      }

      this.successMessage = 'Product added successfully!';
      this.closeAddProductModal();

      setTimeout(() => {
        this.successMessage = null;
      }, 2000);

    } catch (error) {
      console.error('Error adding product:', error);
      this.errorMessage = 'Failed to add product. Please try again.';
      setTimeout(() => {
        this.errorMessage = null;
      }, 5000);
    } finally {
      this.isAddingProduct = false;
    }
  }
}
