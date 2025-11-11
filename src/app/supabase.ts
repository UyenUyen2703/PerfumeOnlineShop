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

  async getProductsByCategory(categoryName: string) {
    try {
      const { data: joinData, error: joinError } = await supabase
        .from('products')
        .select(`
          *,
          categories!inner (
            id,
            name
          )
        `)
        .eq('categories.name', categoryName);

      if (!joinError && joinData && joinData.length > 0) {
        return joinData;
      }

      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id, category_id')
        .eq('name', categoryName)
        .single();

      if (categoryError) {
        console.error('Error finding category:', categoryError);
        return [];
      }
      let products = [];

      if (categoryData.id) {
        const { data: productsById } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', categoryData.id);

        if (productsById && productsById.length > 0) {
          products = productsById;
        }
      }

      if (products.length === 0 && categoryData.category_id) {
        const { data: productsByCategoryId } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', categoryData.category_id);

        if (productsByCategoryId) {
          products = productsByCategoryId;
        }
      }
      
      return products || [];
    } catch (error) {
      console.error('Unexpected error in getProductsByCategory:', error);
      return [];
    }
  }
}
