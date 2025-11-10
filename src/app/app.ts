import { ProductList } from './product-list/product-list';
import { supabase } from './../env/enviroment';
import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { Footer } from './footer/footer';
import { CurrencyService } from './services/currency.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('PerfumeOnlineShop');

  productList: any[] = [];

  constructor(
    private currencyService: CurrencyService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
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
}
