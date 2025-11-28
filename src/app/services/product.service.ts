import { Injectable } from '@angular/core';
import { supabase } from '../../env/enviroment';
import { CartItem } from '../../type/order';
import { Product } from '../../type/product';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor() {}

  async updateProductQuantity(productId: string, quantityPurchased: number): Promise<void> {
    try {
      // Lấy thông tin sản phẩm hiện tại
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('quantity')
        .eq('product_id', productId)
        .single();

      if (fetchError) {
        console.error(`Error fetching product ${productId}:`, fetchError);
        return;
      }

      if (!product) {
        console.warn(`Product ${productId} not found`);
        return;
      }
      const currentQuantity = product.quantity || 0;
      const newQuantity = Math.max(0, currentQuantity - quantityPurchased); // Đảm bảo không âm

      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('product_id', productId);

      if (updateError) {
        console.error(`Error updating product ${productId} quantity:`, updateError);
        return;
      }

      console.log(`Product ${productId} quantity updated: ${currentQuantity} -> ${newQuantity}`);
    } catch (error) {
      console.error('Error in updateProductQuantity:', error);
    }
  }

  async updateMultipleProductQuantities(items: CartItem[]): Promise<void> {
    try {
      const updatePromises = items.map(async (item) => {
        return this.updateProductQuantity(item.product_id, item.quantity);
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating multiple product quantities:', error);
      throw error;
    }
  }

  async validateStockAvailability(
    items: CartItem[]
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];

      for (const item of items) {
        const { data: product, error } = await supabase
          .from('products')
          .select('name, quantity')
          .eq('product_id', item.product_id)
          .single();

        if (error || !product) {
          console.warn(`Product ${item.product_id} not found for stock validation`);
          continue;
        }

        const availableQuantity = product.quantity || 0;
        if (availableQuantity < item.quantity) {
          const productName = product.name || item.name;
          errors.push(
            `${productName}: Không đủ hàng (Còn: ${availableQuantity}, Yêu cầu: ${item.quantity})`
          );
          console.warn(
            `Insufficient stock for ${productName}: available ${availableQuantity}, requested ${item.quantity}`
          );
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error('Error validating stock availability:', error);
      return {
        valid: true,
        errors: [],
      };
    }
  }

  async getProductQuantity(productId: string): Promise<number> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('quantity')
        .eq('product_id', productId)
        .single();

      if (error) {
        console.error(`Error fetching product quantity for ${productId}:`, error);
        return 0;
      }

      return product?.quantity || 0;
    } catch (error) {
      console.error('Error getting product quantity:', error);
      return 0;
    }
  }

  async restoreProductQuantity(productId: string, quantityToRestore: number): Promise<void> {
    try {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('quantity')
        .eq('product_id', productId)
        .single();

      if (fetchError) {
        console.error(`Error fetching product ${productId} for restoration:`, fetchError);
        return;
      }

      if (!product) {
        console.warn(`Product ${productId} not found for restoration`);
        return;
      }
      const currentQuantity = product.quantity || 0;
      const newQuantity = currentQuantity + quantityToRestore;

      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('product_id', productId);

      if (updateError) {
        console.error(`Error restoring product ${productId} quantity:`, updateError);
        return;
      }

      console.log(`Product ${productId} quantity restored: ${currentQuantity} -> ${newQuantity}`);
    } catch (error) {
      console.error('Error in restoreProductQuantity:', error);
      // Không throw để không gây lỗi hệ thống
    }
  }

  getStockStatus(quantity: number): { status: string; message: string; class: string } {
    if (quantity === 0) {
      return { status: 'out-of-stock', message: 'Hết hàng', class: 'text-danger' };
    }
    if (quantity <= 5) {
      return {
        status: 'low-stock',
        message: `Chỉ còn ${quantity} sản phẩm`,
        class: 'text-warning',
      };
    }
    if (quantity <= 10) {
      return { status: 'limited-stock', message: 'Còn ít hàng', class: 'text-info' };
    }
    return { status: 'in-stock', message: 'Còn hàng', class: 'text-success' };
  }

  async canAddToCart(productId: string, requestedQuantity: number): Promise<boolean> {
    try {
      const availableQuantity = await this.getProductQuantity(productId);
      return availableQuantity >= requestedQuantity;
    } catch (error) {
      console.error('Error checking if can add to cart:', error);
      return false;
    }
  }
}
