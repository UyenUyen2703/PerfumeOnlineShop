import { AuthService } from './../services/auth.service';
import { NotificationService } from './../services/notification.service';
import { WishlistService } from './../services/wishlist.service';
import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [RouterLink, CommonModule, RouterLinkActive],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header implements OnInit, OnDestroy {
  isLoggedIn = false;
  currentUser: any = null;
  mobileMenuOpen = false;
  personalDropdownOpen = false;
  userFullName: string | null = null;
  wishlistCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    public notificationService: NotificationService,
    private wishlistService: WishlistService
  ) {}

  async ngOnInit() {
    await this.checkAuthState();
    await this.loadWishlistCount();

    this.authService.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);

      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await this.authService.addUserToDatabase(session.user);
          this.isLoggedIn = true;
          this.currentUser = session.user;
          await this.loadWishlistCount();
        } catch (error) {
          console.error('Error adding user to database after sign in:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.wishlistCount = 0;
      }
      this.userFullName = await this.authService.getUserFullName();
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.personalDropdownOpen = false;
        this.mobileMenuOpen = false;
      });

    // Subscribe to wishlist changes
    this.wishlistService.wishlist$
      .pipe(takeUntil(this.destroy$))
      .subscribe((wishlist) => {
        this.wishlistCount = wishlist.length;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadWishlistCount() {
    try {
      const userId = await this.authService.getUserId();
      if (userId) {
        await this.wishlistService.getUserWishlist(userId);
        this.wishlistCount = this.wishlistService.getWishlistCount();
      }
    } catch (error) {
      console.error('Error loading wishlist count:', error);
    }
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
