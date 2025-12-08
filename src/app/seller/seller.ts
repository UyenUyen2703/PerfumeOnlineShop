import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { NotificationDropdown } from '../components/notification-dropdown/notification-dropdown';

@Component({
  selector: 'app-seller',
  imports: [RouterOutlet, CommonModule, FormsModule, RouterModule, NotificationDropdown],
  templateUrl: './seller.html',
  styleUrls: ['./seller.css'],
})
export class Seller {
  constructor(
    private authService: AuthService,
    private router: Router,
    public notificationService: NotificationService
  ) {}
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
  mobileMenuOpen: boolean = false;

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  logout() {
    try {
      this.authService.signOut();
      this.router.navigate(['/login-seller']);
    } catch (error) {
      console.error('Error during seller logout:', error);
    }
  }
  closeDropdown() {
    this.dropdownOpen = false;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (event.target.innerWidth > 768) {
      this.mobileMenuOpen = false;
    }
  }
}
