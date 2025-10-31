import { supabase } from './../env/enviroment';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  //get all data
  async getData(table: string) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return data;
  }

  //get products with brand information
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select(`
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
}
