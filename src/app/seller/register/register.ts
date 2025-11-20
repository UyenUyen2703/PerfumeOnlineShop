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
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (!this.registerData.email || !this.registerData.password || !this.agreeToTerms) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc và đồng ý điều khoản!');
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
            address: this.registerData.address
          }
        }
      });

      await supabase.from('users').insert([{
        email: this.registerData.email,
        full_name: 'Seller',
        role: 'seller',
        avatar_URL:'default-avatar.png',
        gender: 'Not specified',
        password: this.registerData.password,
      }]);
      if (error) {
        throw error;
      }

      this.router.navigate(['/login-seller']);
    } catch (error: any) {
      console.error('Registration error:', error);
      alert('Có lỗi xảy ra khi đăng ký: ' + error.message);
    } finally {
      this.isLoading = false;
    }
  }
}
