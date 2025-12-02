import { User } from './../type/user';
import { supabase } from './../env/enviroment';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  [x: string]: any;
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
          brand_id,
          name
        ), categories (
          category_id,
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
          brand_id,
          name
        ), categories (
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
        .select(
          `
          *,
          categories!inner (
            category_id,
            name
          )
        `
        )
        .eq('categories.name', categoryName);

      if (!joinError && joinData && joinData.length > 0) {
        return joinData;
      }

      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('category_id')
        .eq('name', categoryName)
        .single();

      if (categoryError) {
        console.error('Error finding category:', categoryError);
        return [];
      }
      let products = [];

      if (categoryData.category_id) {
        const { data: productsById } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', categoryData.category_id);
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

  async getProductsByBrand(brandName: string) {
    try {
      const { data: joinData, error: joinError } = await supabase
        .from('products')
        .select(
          `
          *,
          brands!inner (
            brand_id,
            name, logo_url
          )
        `
        )
        .eq('brands.name', brandName);
      if (!joinError && joinData && joinData.length > 0) {
        return joinData;
      }
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('brand_id')
        .eq('name', brandName)
        .single();
      if (brandError) {
        console.error('Error finding brand:', brandError);
        return [];
      }
      let products = [];
      if (brandData.brand_id) {
        const { data: productsById } = await supabase
          .from('products')
          .select('*')
          .eq('brand_id', brandData.brand_id);
        if (productsById && productsById.length > 0) {
          products = productsById;
        }
      }

      if (products.length === 0 && brandData.brand_id) {
        const { data: productsByBrandId } = await supabase
          .from('products')
          .select('*')
          .eq('brand_id', brandData.brand_id);
        if (productsByBrandId) {
          products = productsByBrandId;
        }
      }

      return products || [];
    } catch (error) {
      console.error('Unexpected error in getProductsByBrand:', error);
      return [];
    }
  }

  async getOrdersByUserId(userId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              name,
              price,
              image_url
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Unexpected error in getOrdersByUserId:', error);
      throw error;
    }
  }

  async getCurrentUserOrders() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      return this.getOrdersByUserId(user.id);
    } catch (error) {
      console.error('Error in getCurrentUserOrders:', error);
      throw error;
    }
  }

  async getOrderUserId(orderId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              name,
              price,
              image_url
            )
          )
        `)
        .eq('order_id', orderId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Unexpected error in getOrderByIdAndUserId:', error);
      throw error;
    }
  }
}
