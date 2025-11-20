import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  constructor(private authService: AuthService, private router: Router) {}

  async loginWithGoogle() {
    try {
      console.log('Starting Google sign in...');
      await this.authService.signInWithGoogle();

      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }
}
