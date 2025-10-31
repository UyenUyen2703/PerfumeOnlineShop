import { HomePage } from './home-page/home-page';
import { Routes } from '@angular/router';
import { ProductList } from './product-list/product-list';

export const routes: Routes = [

  {
    path: '',
    component: HomePage
  },
  {
    path:'perfume',
    component: ProductList
  }
];
