import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../../env/enviroment';
import { Product } from '../../type/product';

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private wishlistSubject = new BehaviorSubject<Wishlist[]>([]);
  public wishlist$ = this.wishlistSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor() {}

  async getUserWishlist(userId: string): Promise<Wishlist[]> {
    try {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);

      const { data, error } = await supabase
        .from('wishlists')
        .select(
          `
          id,
          user_id,
          product_id,
          created_at,
          products (
            product_id,
            name,
            price,
            discount,
            quantity,
            brand_id,
            category_id,
            description,
            image_url,
            size_ml,
            created_at,
            updated_at,
            brands (
              name
            )
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const wishlist = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        created_at: item.created_at,
        product: item.products,
      }));

      this.wishlistSubject.next(wishlist);
      return wishlist;
    } catch (error: any) {
      const errorMessage = error.message || 'Error loading wishlist';
      this.errorSubject.next(errorMessage);
      console.error('Error fetching wishlist:', error);
      return [];
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async addToWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      this.errorSubject.next(null);

      const { data: existing } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (existing) {
        this.errorSubject.next('Product is already in wishlist');
        return false;
      }

      const { error } = await supabase.from('wishlists').insert([
        {
          user_id: userId,
          product_id: productId,
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }
      await this.getUserWishlist(userId);
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Error adding to wishlist';
      this.errorSubject.next(errorMessage);
      console.error('Error adding to wishlist:', error);
      return false;
    }
  }

  async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      this.errorSubject.next(null);

      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        throw new Error(error.message);
      }

      const updated = this.wishlistSubject.value.filter(
        (item) => item.product_id !== productId
      );
      this.wishlistSubject.next(updated);
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Error removing from wishlist';
      this.errorSubject.next(errorMessage);
      console.error('Error removing from wishlist:', error);
      return false;
    }
  }

  isInWishlist(productId: string): boolean {
    return this.wishlistSubject.value.some((item) => item.product_id === productId);
  }

  getWishlistCount(): number {
    return this.wishlistSubject.value.length;
  }


  getWishlist(): Wishlist[] {
    return this.wishlistSubject.value;
  }

  async clearWishlist(userId: string): Promise<boolean> {
    try {
      this.errorSubject.next(null);

      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }

      this.wishlistSubject.next([]);
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Error clearing wishlist';
      this.errorSubject.next(errorMessage);
      console.error('Error clearing wishlist:', error);
      return false;
    }
  }
}
