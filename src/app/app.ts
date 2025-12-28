import { Component, OnInit, signal } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { supabase } from '../env/enviroment';
import { Footer } from './footer/footer';
import { Header } from './header/header';
import { AuthService } from './services/auth.service';
import { CurrencyService } from './services/currency.service';
import { NotificationService } from './services/notification.service';
import { SessionService } from './services/session.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, MatSnackBarModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('PerfumeOnlineShop');
  currentUrl = signal('');
  isLoading = signal(true);
  private hasShownLoginSuccess = false;

  productList: any[] = [];

  constructor(
    private currencyService: CurrencyService,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private sessionService: SessionService
  ) {}

  async ngOnInit() {
    // Set loading to true initially
    this.isLoading.set(true);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentUrl.set(event.url);
        // Set loading to false after navigation completes
        setTimeout(() => this.isLoading.set(false), 100);
      });
    this.currentUrl.set(this.router.url);

    this.authService.onAuthStateChange(async (event, session) => {

      if (event === 'SIGNED_IN' && session) {
        try {
          if (session.user) {
            this.sessionService.startSessionTimer();
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

            // Check user role to navigate to the correct page
            setTimeout(async () => {
              try {
                // Get user info from database to check role
                const authUser = await this.authService.getUser();
                if (authUser) {
                  let { data: userData, error } = await supabase
                    .from('users')
                    .select('role')
                    .eq('user_id', authUser.id)
                    .single();

                  // If not found by user_id, try finding by email
                  if (error && error.code === 'PGRST116') {
                    const result = await supabase
                      .from('users')
                      .select('role')
                      .eq('email', authUser.email)
                      .single();
                    userData = result.data;
                  }

                  // Navigate based on role and current URL
                  if (userData?.role === 'seller') {
                    if (currentUrl.includes('/login-seller')) {
                      this.router.navigate(['/seller/seller-dashboard']);
                    } else if (!currentUrl.includes('/seller')) {
                      this.router.navigate(['/seller/seller-dashboard']);
                    }
                  } else if (userData?.role === 'admin') {
                    if (currentUrl.includes('/login-admin')) {
                      this.router.navigate(['/admin/dashboard']);
                    } else if (!currentUrl.includes('/admin')) {
                      this.router.navigate(['/admin/dashboard']);
                    }
                  } else {
                    // Customer or default role - navigate to home
                    this.router.navigate(['/'], { queryParams: { loginSuccess: 'true' } });
                  }
                } else {
                  // Fallback if user info cannot be retrieved
                  this.router.navigate(['/'], { queryParams: { loginSuccess: 'true' } });
                }
              } catch (error) {
                console.error('Error checking user role for navigation:', error);
                // Fallback to home if there is an error
                this.router.navigate(['/'], { queryParams: { loginSuccess: 'true' } });
              }
            }, 1000);
          }
        } catch (error) {
          console.error('Error handling sign in:', error);
          this.notificationService.error('Login successful but failed to complete setup');
        }
      }

      if (event === 'SIGNED_OUT') {
        this.sessionService.clearSession();
        this.hasShownLoginSuccess = false;
      }
    });

    try {
      const user = await this.authService.getUser();
      if (user) {
        await this.authService.addUserToDatabase(user);
      } else {
      }
    } catch (error) {
      console.error('Error checking user on app start:', error);
    }

    // Set loading to false after initial setup
    setTimeout(() => this.isLoading.set(false), 200);

    setInterval(() => {
      this.sessionService.checkSession();
    }, 5 * 60 * 1000); // Check every 5 minutes
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
    return url.startsWith('/seller') && !url.startsWith('/login-seller') && !url.startsWith('/register-seller');
  }

  isAdminAuthRoute(): boolean {
    const url = this.currentUrl();
    return url.startsWith('/login-admin') || url.startsWith('/register-admin');
  }

  isSellerAuthRoute(): boolean {
    const url = this.currentUrl();
    return url.startsWith('/login-seller') || url.startsWith('/register-seller');
  }
}
