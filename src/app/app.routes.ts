import { HomePage } from './home-page/home-page';
import { Routes } from '@angular/router';
import { ProductList } from './product-list/product-list';
import { DetailProduct } from './product-list/detail-product/detail-product';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Personal } from './personal/personal';
import { AuthGuard } from './guards/auth.guard';
import { Search } from './home-page/search/search';
import { FavoriteList } from './personal/favorite-list/favorite-list';
import { PersonalInfor } from './personal/personal-infor/personal-infor';
import { Dashboard } from './admin/dashboard/dashboard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'register',
    component: Register,
  },
  {
    path: '',
    component: HomePage,
  },
  {
    path: 'perfume',
    component: ProductList,
  },
  {
    path: 'detail/:product_id',
    component: DetailProduct,
  },
  {
    path: 'search',
    component: Search,
  },
  {
    path: 'personal',
    component: Personal,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: PersonalInfor,
      },
      {
        path: 'favorites',
        component: FavoriteList,
      },
      {
        path: 'orders',
        component: PersonalInfor,
      }
    ]
  },
  {
    path: 'dashboard',
    component: Dashboard,
    // canActivate: [AuthGuard],
  }
];
