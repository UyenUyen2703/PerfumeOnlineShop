import { supabase } from './../env/enviroment';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  async getData(table: string) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error fetching data from ${table}:`, error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error(`Unexpected error in getData for ${table}:`, error);
      throw error;
    }
  }

  async getProducts() {
    const { data, error } = await supabase.from('products').select(`
        *,
        brands (
          id,
          name
        ), categories (
          id,
          name
        )
      `);
    if (error) throw error;
    return data;
  }

  async getProductById(productId: string) {
    const { data, error } = await supabase
      .from('products')
      .select(
        `
        *,
        brands (
          id,
          brand_id,
          name
        ), categories (
          id,
          category_id,
          name
        )
      `
      )
      .eq('product_id', productId)
      .single();
    if (error) throw error;
    return data;
  }
}
