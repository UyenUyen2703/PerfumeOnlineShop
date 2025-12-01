import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { supabase } from '../../../env/enviroment';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginSeller {
  loginData = {
    email: '',
    password: ''
  };

  rememberMe = false;
  isLoading = false;

  constructor(private router: Router) {}

  async onSubmit() {
    if (!this.loginData.email || !this.loginData.password) {
      alert('Please fill in all required fields!');
      return;
    }

    this.isLoading = true;

    try {

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: this.loginData.email,
        password: this.loginData.password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Login unsuccessful');
      }

      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (userError && userError.code === 'PGRST116') {
        const result = await supabase
          .from('users')
          .select('*')
          .eq('email', authData.user.email)
          .single();

        userData = result.data;
        userError = result.error;
      }

      console.log('User data từ database:', { userData, userError });

      if (userError) {
        console.error('Error fetching user information:', userError);
        if (userError.code === 'PGRST116') {
          throw new Error('Account not set up in the system. Please try registering again.');
        }
        throw new Error('Unable to verify access rights');
      }

      if (!userData || userData.role !== 'seller') {
        await supabase.auth.signOut();
        throw new Error('This account does not have access to the seller dashboard. Current role: ' + (userData?.role || 'undefined'));
      }

        await this.router.navigate(['/seller/seller-dashboard']);

    } catch (error: any) {
      console.error('Lỗi đăng nhập:', error);
      alert(error.message || 'Có lỗi xảy ra khi đăng nhập');
    } finally {
      this.isLoading = false;
    }
  }
}
