import { Component, OnInit, signal } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Footer } from './footer/footer';
import { Header } from './header/header';
import { AuthService } from './services/auth.service';
import { CurrencyService } from './services/currency.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, MatSnackBarModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('PerfumeOnlineShop');
  currentUrl = signal('');
  private hasShownLoginSuccess = false;

  productList: any[] = [];

  constructor(
    private currencyService: CurrencyService,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentUrl.set(event.url);
      });
    this.currentUrl.set(this.router.url);

    this.authService.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session) {
        try {
          // Lưu user info vào localStorage
          if (session.user) {
            localStorage.setItem('user', JSON.stringify(session.user));

            // Thêm user vào database
            await this.authService.addUserToDatabase(session.user);
          }

          const currentUrl = this.router.url;
          if (
            currentUrl.includes('/login') ||
            currentUrl === '/' ||
            currentUrl.includes('#access_token=') ||
            !this.hasShownLoginSuccess
          ) {
            this.hasShownLoginSuccess = true;
            this.notificationService.success('Login successful!');

            setTimeout(() => {
              this.router.navigate(['/'], { queryParams: { loginSuccess: 'true' } });
            }, 1000);
          }
        } catch (error) {
          console.error('Error handling sign in:', error);
          this.notificationService.error('Login successful but failed to complete setup');
        }
      }

      if (event === 'SIGNED_OUT') {
        localStorage.clear();
        this.hasShownLoginSuccess = false;
      }
    });

    try {
      const user = await this.authService.getUser();
      if (user) {
        await this.authService.addUserToDatabase(user);
      } else {
        console.log('No user found, continuing with guest access...');
      }
    } catch (error) {
      console.error('Error checking user on app start:', error);
    }
  }

  isAdminRoute(): boolean {
    const url = this.currentUrl();
    return (
      url.startsWith('/admin') &&
      !url.startsWith('/login-admin') &&
      !url.startsWith('/register-admin')
    );
  }

  isSellerRoute(): boolean {
    const url = this.currentUrl();
    return (
      url.startsWith('/login-seller') ||
      url.startsWith('/register-seller') ||
      url.startsWith('/seller')
    );
  }

  isAdminAuthRoute(): boolean {
    const url = this.currentUrl();
    return url.startsWith('/login-admin') || url.startsWith('/register-admin');
  }
}
