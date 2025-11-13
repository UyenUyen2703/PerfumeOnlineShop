import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from './header/header';
import { Footer } from './footer/footer';
import { CurrencyService } from './services/currency.service';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';
import { Admin } from "./admin/admin";
import { IgxGridComponent } from 'igniteui-angular';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, Admin],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('PerfumeOnlineShop');
  currentUrl = signal('');

  productList: any[] = [];

  constructor(
    private currencyService: CurrencyService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Track route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentUrl.set(event.url);
      });

    // Set initial URL
    this.currentUrl.set(this.router.url);

    try {
      const user = await this.authService.getUser();
      if (user) {
        console.log('User found on app start, ensuring they are in database...');
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
    return url.startsWith('/dashboard') || url.startsWith('/admin');
  }
}
