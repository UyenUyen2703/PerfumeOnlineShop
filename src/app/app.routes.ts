import { HomePage } from './home-page/home-page';
import { Routes } from '@angular/router';
import { ProductList } from './product-list/product-list';
import { DetailProduct } from './product-list/detail-product/detail-product';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';

export const routes: Routes = [

  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: '',
    component: HomePage
  },
  {
    path:'perfume',
    component: ProductList
  },
  {
    path: 'detail/:product_id',
    component: DetailProduct
  }
];
