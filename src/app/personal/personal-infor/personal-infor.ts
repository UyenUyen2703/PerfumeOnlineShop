import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Supabase } from '../../supabase';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-personal-infor',
  imports: [CommonModule],
  templateUrl: './personal-infor.html',
  styleUrl: './personal-infor.css',
})
export class PersonalInfor implements OnInit {
  user: any;
  userProfile: any;
  isUploading = false;
  uploadError: string | null = null;

  constructor(
    private authService: AuthService,
    private supabase: Supabase,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUser();
  }

  private async loadUser() {
    try {
      this.user = await this.authService.getUser();

      if (this.user) {
        const profiles = await this.supabase.getData('users');
        this.userProfile = profiles?.find((profile: any) => profile.user_id === this.user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  getAvatarUrl(): string | null {
    if (this.userProfile?.avatar_URL) {
      return this.authService.getAvatarUrl(this.userProfile.avatar_URL);
    }
    if (this.user?.user_metadata?.avatar_url) {
      return this.user.user_metadata.avatar_url;
    }
    return '/assets/default-avatar.png';
  }

  onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadAvatar(input.files[0]);
    }
  }

  private async uploadAvatar(file: File) {
    if (!this.user) {
      this.uploadError = 'User not authenticated';
      return;
    }
    this.isUploading = true;
    this.uploadError = null;

    try {
      const newAvatarUrl = await this.authService.uploadAvatarFromFile(this.user.id, file);

      if (newAvatarUrl) {
        // Delete old avatar from storage if it exists
        if (this.userProfile?.avatar_URL && !this.userProfile.avatar_URL.startsWith('http')) {
          await this.authService.deleteAvatarFromStorage(this.userProfile.avatar_URL);
        }

        const success = await this.authService.updateUserAvatar(this.user.id, newAvatarUrl);
        if (success) {
          if (this.userProfile) {
            this.userProfile.avatar_URL = newAvatarUrl;
          }
          await this.loadUser();
        } else {
          this.uploadError = 'Failed to update avatar in database';
        }
      } else {
        this.uploadError = 'Failed to upload avatar';
      }
    } catch (error: any) {
      this.uploadError = error.message || 'Error uploading avatar';
      console.error('Upload avatar error:', error);
    } finally {
      this.isUploading = false;
    }
  }

  async signOut() {
    await this.authService.signOut();
    this.user = null;
    this.userProfile = null;
    this.router.navigate(['/login']);
  }
}
