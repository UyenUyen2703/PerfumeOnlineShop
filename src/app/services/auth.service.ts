import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from './../../env/enviroment';
import { Injectable } from '@angular/core';
import { User } from '../../type/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  
  async register(username: string, gender: string, phone: number, address: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: username,
          phone: phone.toString(),
          address: address,
          user_type: 'customer',
          gender: gender,
        }
      }
    });
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async signInWithGoogle(){
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) throw error;
    console.log('Sign-in data:', data);
  }

  async getUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data.user ? data.user.id : null;
  }

  async signInWithFacebook(): Promise<void> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
    });
    if (error) throw error;
  }

  async uploadAvatarFromUrl(userId: string, avatarUrl: string): Promise<string | null> {
    try {
      if (!avatarUrl) return null;

      let response: Response | null = null;
      for (let i = 0; i < 3; i++) {
        response = await fetch(avatarUrl);
        if (response.ok) break;
        if (response.status === 429) {
          console.warn(`Google avatar rate-limited. Retry ${i + 1}/3...`);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      if (!response || !response.ok) {
        console.warn('Failed to fetch avatar — using Google URL instead.');
        return avatarUrl;
      }

      const blob = await response.blob();
      const fileName = `avatars/${Date.now()}.jpg`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('images-storage')
        .upload(filePath, blob, { cacheControl: '3600', upsert: false });

      if (error) {
        console.error('Error uploading avatar to storage:', error);
        return avatarUrl;
      }

      return data?.path || filePath;
    } catch (error) {
      console.error('Error in uploadAvatarFromUrl:', error);
      return avatarUrl;
    }
  }

  async addUserToDatabase(user: any) {
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
        throw checkError;
      }

      if (existingUser) {
        return existingUser;
      }

      let avatarStorageUrl = null;
      if (user.user_metadata?.avatar_url) {
        avatarStorageUrl = await this.uploadAvatarFromUrl(user.id, user.user_metadata.avatar_url);
      }

      const newUser: User = {
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.username || null,
        phone: user.user_metadata?.phone || null,
        address: user.user_metadata?.address || null,
        gender: user.user_metadata?.gender || null,
        avatar_url: avatarStorageUrl && avatarStorageUrl.trim() !== '' ? avatarStorageUrl : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: user.user_metadata?.user_type || 'customer',
      };

      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (insertError) {
        console.error('Error adding user to database:', insertError);
        throw insertError;
      } else {
        return insertedUser;
      }
    } catch (error) {
      console.error('Fatal error in addUserToDatabase:', error);
      throw error;
    }
  }

  async signOut() {
    await supabase.auth.signOut();
  }

  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  async uploadAvatarFromFile(userId: string, file: File): Promise<string | null> {
    try {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      }
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 2MB.');
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { data, error } = await supabase.storage.from('images-storage').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('Error uploading avatar file to storage:', error);
        throw error;
      }


      return data?.path || filePath;
    } catch (error) {
      console.error('Error in uploadAvatarFromFile:', error);
      throw error;
    }
  }
  async updateUserAvatar(userId: string, avatarUrl: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user avatar in database:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserAvatar:', error);
      return false;
    }
  }

  async deleteAvatarFromStorage(avatarUrl: string): Promise<boolean> {
    try {
      const urlParts = avatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = fileName;

      const { error } = await supabase.storage.from('images-storage').remove([filePath]);

      if (error) {
        console.error('Error deleting old avatar from storage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAvatarFromStorage:', error);
      return false;
    }
  }

  getAvatarUrl(avatarPath: string | null): string | null {
    if (!avatarPath) return null;

    if (avatarPath.startsWith('http') || avatarPath.startsWith('https')) {
      return avatarPath;
    }

    const { data } = supabase.storage
      .from('images-storage')
      .getPublicUrl(avatarPath);

    return data.publicUrl;
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}
