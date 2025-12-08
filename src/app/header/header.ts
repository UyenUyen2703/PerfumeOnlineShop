import { AuthService } from './../services/auth.service';
import { NotificationService } from './../services/notification.service';
import { Component, OnInit, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  imports: [RouterLink, CommonModule, RouterLinkActive],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header implements OnInit {
  isLoggedIn = false;
  currentUser: any = null;
  mobileMenuOpen = false;
  personalDropdownOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    public notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.checkAuthState();

    this.authService.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);

      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await this.authService.addUserToDatabase(session.user);
          this.isLoggedIn = true;
          this.currentUser = session.user;
        } catch (error) {
          console.error('Error adding user to database after sign in:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        this.isLoggedIn = false;
        this.currentUser = null;
      }
    });

    // Close dropdowns on route change
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.personalDropdownOpen = false;
        this.mobileMenuOpen = false;
      });
  }

  async checkAuthState() {
    try {
      this.currentUser = await this.authService.getUser();
      this.isLoggedIn = !!this.currentUser;
      console.log('Current user:', this.currentUser, 'Is logged in:', this.isLoggedIn);
    } catch (error) {
      console.error('Error checking auth state:', error);
      this.isLoggedIn = false;
      this.currentUser = null;
    }
  }

  checkLogin() {
    this.authService.getUser().then(user => {
      if (user) {
        this.router.navigate(['/personal']);
        console.log('User is logged in:', user);
      } else {
        this.router.navigate(['/login']);
        console.log('No user is logged in.');
      }
    });
  }
  logout() {
    this.authService.signOut().then(() => {
      this.router.navigate(['/']);
      console.log('User logged out successfully.');
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  togglePersonalDropdown() {
    this.personalDropdownOpen = !this.personalDropdownOpen;
  }

  closePersonalDropdown() {
    this.personalDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.personal-dropdown');
    if (!dropdown) {
      this.personalDropdownOpen = false;
    }
  }
}
