import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, CommonModule, MatSnackBarModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private authService: AuthService, private router: Router, private notificationService: NotificationService) { }

  async loginWithGoogle() {
    try {
      this.isLoading = true;
      const { url } = await this.authService.signInWithGoogle();

      // Google OAuth will redirect, no need for success notification here
      if (url) {
        // Redirect to Google OAuth
        window.location.href = url;
      }
    } catch (error) {
      this.notificationService.error('Login failed. Please try again.');
      console.error('Login failed:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithFacebook() {
    try {
      await this.authService.signInWithFacebook();
    } catch (error) {
      this.notificationService.error('Login failed. Please try again.');
      console.error('Login failed:', error);
    }
  }

  async onSubmit(event: Event, email: string, password: string) {
    event.preventDefault();
    this.errorMessage = '';

    if (!email || !password) {
      this.errorMessage = 'Please enter both email and password.';
      this.notificationService.error(this.errorMessage);
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
        this.notificationService.error(this.errorMessage);
        return;
      }

      this.notificationService.success('Login successful!');
      setTimeout(() => {
        this.router.navigate(['/'], { queryParams: { loginSuccess: 'true' } });
      }, 1000);
    } catch (error: any) {
      console.error('Login failed:', error);

      if (error?.message?.includes('Invalid login credentials')) {
        this.errorMessage = 'Email or password is incorrect';
        this.notificationService.error(this.errorMessage);
      } else if (error?.message?.includes('Email not confirmed')) {
        this.errorMessage = 'Email not confirmed';
        this.notificationService.error(this.errorMessage);
      } else if (error?.message) {
        this.errorMessage = 'Login failed: ' + error.message;
        this.notificationService.error(this.errorMessage);
      } else {
        this.errorMessage = 'An unknown error occurred';
        this.notificationService.error(this.errorMessage);
      }
    } finally {
      this.isLoading = false;
    }
  }
}
