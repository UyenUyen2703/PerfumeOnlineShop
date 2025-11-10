import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from './../../env/enviroment';
import { Injectable } from '@angular/core';
import { User } from '../../type/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  async signInWithGoogle(): Promise<void> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) throw error;
    console.log('Sign-in data:', data);
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
        .from('avatars')
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
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        phone: user.user_metadata?.phone || null,
        address: user.user_metadata?.address || null,
        avatar_URL: avatarStorageUrl || user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: 'customer',
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
      const { data, error } = await supabase.storage.from('avatars').upload(filePath, file, {
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
          avatar_URL: avatarUrl,
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

      console.log('Deleting avatar from storage:', filePath);
      const { error } = await supabase.storage.from('avatars').remove([filePath]);

      if (error) {
        console.error('Error deleting old avatar from storage:', error);
        return false;
      }

      console.log('Old avatar deleted from storage successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteAvatarFromStorage:', error);
      return false;
    }
  }

  getAvatarUrl(avatarPath: string | null): string | null {
    if (!avatarPath) return null;

    // If it's already a full URL (Google avatar or external), return as is
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }

    // If it's a storage path, get the public URL from Supabase
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarPath);

    return data.publicUrl;
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}
