import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  async loginWithGoogle() {
    try {
      await this.authService.signInWithGoogle();

      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  async loginWithFacebook() {
    try {
      await this.authService.signInWithFacebook();
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  async onSubmit(event: Event, email: string, password: string) {
    event.preventDefault();
    this.errorMessage = '';

    if (!email || !password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    await this.loginWithEmailPassword(email, password);
  }

  async loginWithEmailPassword(email: string, password: string) {
    try {
      this.isLoading = true;
      this.errorMessage = '';

      const data = await this.authService.signIn(email, password);

      if (!data.user) {
        this.errorMessage = 'Login failed: User information not received';
        return;
      }

      setTimeout(() => {
        this.router.navigate(['/']);
      }, 1000);
    } catch (error: any) {
      console.error('Login failed:', error);

      if (error?.message?.includes('Invalid login credentials')) {
        this.errorMessage = 'Email or password is incorrect';
      } else if (error?.message?.includes('Email not confirmed')) {
        this.errorMessage = 'Email not confirmed';
      } else if (error?.message) {
        this.errorMessage = 'Login failed: ' + error.message;
      } else {
        this.errorMessage = 'An unknown error occurred';
      }
    } finally {
      this.isLoading = false;
    }
  }
}
