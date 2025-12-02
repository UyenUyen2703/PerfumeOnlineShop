import { RouterLink, Router } from '@angular/router';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { supabase } from '../../../env/enviroment';
import { RegisterData } from '../../../type/user';

@Component({
  selector: 'app-register',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  selectedAvatarFile: File | null = null;
  selectedAvatarUrl: string | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  genders = ['Male', 'Female', 'Other'];

  registerData: RegisterData = {
    username: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    avatar_url: '',
    confirmPassword: '',
    gender: 'Other',
  };

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedAvatarFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedAvatarUrl = e.target.result;
      };
      reader.readAsDataURL(this.selectedAvatarFile);
    }
  }

  removeAvatar() {
    this.selectedAvatarFile = null;
    this.selectedAvatarUrl = null;
  }

  async onRegister() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      this.isLoading = false;
      return;
    }
    try {
      const { user } = await this.authService.register(
        this.registerData.username,
        this.registerData.gender,
        Number(this.registerData.phone),
        this.registerData.address,
        this.registerData.email,
        this.registerData.password
      );

      if (user) {
        let avatarUrl: string | null = null;
        if (this.selectedAvatarFile) {
          avatarUrl = await this.authService.uploadAvatarFromFile(user.id, this.selectedAvatarFile);
        }

        const userData = await this.authService.addUserToDatabase({
          id: user.id,
          email: user.email,
          full_name: this.registerData.username,
          username: this.registerData.username,
          phone: this.registerData.phone,
          address: this.registerData.address,
          gender: this.registerData.gender,
          avatar_url: null,
          user_type: 'customer',
        });

        if (avatarUrl) {
          await this.authService.updateUserAvatar(user.id, avatarUrl);
        }
        this.successMessage = 'Registration successful! Redirecting to login...';
        this.router.navigate(['/login']);
      }
    } catch (error) {
      this.errorMessage = 'Registration failed. Please try again.';
      console.error('Registration error:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
