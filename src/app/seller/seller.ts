import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-seller',
  imports: [RouterOutlet, CommonModule, FormsModule, RouterModule],
  templateUrl: './seller.html',
  styleUrls: ['./seller.css'],
})
export class Seller {
  constructor(private authService: AuthService, private router: Router) {}
  isLoginandRegisterRoute(): boolean {
    const url = window.location.pathname;
    return url.startsWith('/login-seller') || url.startsWith('/register-seller');
  }

  async ngOnInit() {
    const currentUser = await this.authService.getUserId();
    this.sellerName = currentUser || 'Admin';
  }

  sellerName: string = '';
  dropdownOpen: boolean = false;
  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }
  logout() {
    try {
      this.authService.signOut();
      this.router.navigate(['/login-seller']);
    } catch (error) {
      console.error('Error during seller logout:', error);
      // this.router.navigate(['/login-seller']);
    }
  }
  closeDropdown() {
    this.dropdownOpen = false;
  }
}
