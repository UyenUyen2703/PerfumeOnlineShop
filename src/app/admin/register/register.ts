import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { supabase } from '../../../env/enviroment';

@Component({
  selector: 'app-register',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterAdmin {
  registerData = {
    email: '',
    password: '',
    confirmPassword: '',
  };

  constructor(private router: Router) {}

  async onSubmit() {
    if (this.registerData.password !== this.registerData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    console.log('Admin registration attempt:', this.registerData);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: this.registerData.email,
        password: this.registerData.password,
        options: {
          data: {
            user_type: 'admin',
          },
        },
      });

      await supabase.from('users').insert([{
        email: this.registerData.email,
        full_name: 'Admin',
        role: 'admin',
        avatar_URL:'default-avatar.png',
        password: this.registerData.password
      }]);
      if (error) {
        console.error('Error during admin registration:', error);
        alert('Registration failed: ' + error.message);
      }
      this.router.navigate(['/login-admin']);
    } catch (error) {
      console.error('Unexpected error during admin registration:', error);
      alert('An unexpected error occurred. Please try again later.');
    }finally{
      console.log('Admin registration process completed.');
    }
  }
}
