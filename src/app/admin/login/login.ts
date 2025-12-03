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
      alert('Please enter all required information!');
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

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (userError) {
        console.error('Error fetching user information:', userError);
        throw new Error('Unable to verify access rights');
      }

      if (userData.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Account does not have admin access');
      }

      this.router.navigate(['/admin/dashboard']);

    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.message || 'An error occurred during login');
    } finally {
      this.isLoading = false;
    }
  }
}
