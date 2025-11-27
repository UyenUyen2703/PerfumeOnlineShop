import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { supabase } from '../../../env/enviroment';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginAdmin {
  loginData = {
    email: '',
    password: '',
  };

  rememberMe = false;
  isLoading = false;

  constructor(private router: Router) {}

  async onSubmit() {
    if (!this.loginData.email || !this.loginData.password) {
      alert('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    this.isLoading = true;

    try {
      // Đăng nhập với Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: this.loginData.email,
        password: this.loginData.password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Đăng nhập không thành công');
      }

      // Kiểm tra role của user từ database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (userError) {
        console.error('Lỗi khi lấy thông tin user:', userError);
        throw new Error('Không thể xác thực quyền truy cập');
      }

      if (userData.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Tài khoản này không có quyền truy cập admin dashboard');
      }

      // Đăng nhập thành công, chuyển hướng
      this.router.navigate(['/admin/dashboard']);

    } catch (error: any) {
      console.error('Lỗi đăng nhập:', error);
      alert(error.message || 'Có lỗi xảy ra khi đăng nhập');
    } finally {
      this.isLoading = false;
    }
  }
}
