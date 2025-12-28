import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { supabase } from '../../../env/enviroment';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class RegisterSeller {
  registerData = {
    email: '',
    password: '',
    confirmPassword: '',
    address: ''
  };

  agreeToTerms = false;
  passwordMismatch = false;
  isLoading = false;

  constructor(private router: Router) {}

  onPasswordChange() {
    this.passwordMismatch = this.registerData.password !== this.registerData.confirmPassword;
  }

  async onSubmit() {
    if (this.registerData.password !== this.registerData.confirmPassword) {
      alert('Confirm password does not match!');
      return;
    }

    if (!this.registerData.email || !this.registerData.password || !this.agreeToTerms) {
      alert('Please fill in all required fields and agree to the terms!');
      return;
    }

    this.isLoading = true;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: this.registerData.email,
        password: this.registerData.password,
        options: {
          data: {
            user_type: 'seller',
            address: this.registerData.address,
            full_name: 'Seller'
          }
        }
      });

      if (error) {
        throw error;
      }

      alert('Registration successful! Please check your email to verify your account.');
      this.router.navigate(['/login-seller']);
    } catch (error: any) {
      console.error('Registration error:', error);
      alert('An error occurred during registration: ' + error.message);
    } finally {
      this.isLoading = false;
    }
  }
}
