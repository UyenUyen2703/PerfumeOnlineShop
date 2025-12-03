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
  ) { }

  async ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentUrl.set(event.url);
      });
    this.currentUrl.set(this.router.url);

    // Lắng nghe auth state changes cho OAuth
    this.authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !this.hasShownLoginSuccess) {
        // Kiểm tra nếu đang ở trang login thì chuyển về home với thông báo
        const currentUrl = this.router.url;
        if (currentUrl.includes('/login') &&
          !currentUrl.includes('/login-admin') &&
          !currentUrl.includes('/login-seller')) {
          this.hasShownLoginSuccess = true;
          this.notificationService.success('Đăng nhập thành công!');
          setTimeout(() => {
            this.router.navigate(['/'], { queryParams: { loginSuccess: 'true' } });
          }, 1000);
        }
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
    return (
      url.startsWith('/login-admin') ||
      url.startsWith('/register-admin')
    );
  }
}
