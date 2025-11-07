import { ProductList } from './product-list/product-list';
import { supabase } from './../env/enviroment';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { Footer } from './footer/footer';
import { CurrencyService } from './services/currency.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('PerfumeOnlineShop');

  productList: any[] = [];

  constructor(private currencyService: CurrencyService) {}
}
