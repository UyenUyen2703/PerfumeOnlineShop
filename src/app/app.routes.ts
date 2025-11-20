import { User } from './../type/user';
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
import { ManageUser } from './admin/manage-user/manage-user';
import { Cart } from './cart/cart';
import { OrdersPersonal } from './personal/orders-personal/orders-personal';
import { ManageOrders } from './admin/manage-orders/manage-orders';
import { AboutUs } from './about-us/about-us';
import { LoginSeller } from './seller/login/login';
import { RegisterSeller } from './seller/register/register';
import { SellerDashboard } from './seller/dashboard/dashboard';
import { Seller } from './seller/seller';

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
    path: 'about',
    component: AboutUs,
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
    path: 'cart',
    component: Cart,
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
        component: OrdersPersonal,
      },
    ],
  },
  {
    path: 'dashboard',
    component: Dashboard,
    // canActivate: [AuthGuard],
  },
  {
    path: 'admin/users',
    component: ManageUser,
    // canActivate: [AuthGuard],
  },

  {
    path: 'admin/orders',
    component: ManageOrders,
    // canActivate: [AuthGuard],
  },
  {
    path: 'login-seller',
    component: LoginSeller,
  },

  {
    path: 'register-seller',
    component: RegisterSeller,
  },
  {
    path: 'seller',
    component: Seller,
    children: [
      {
        path: 'seller-dashboard',
        component: SellerDashboard,
      },

    ],
  },
];
