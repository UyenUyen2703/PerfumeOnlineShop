import { User } from './../type/user';
import { HomePage } from './home-page/home-page';
import { Routes } from '@angular/router';
import { ProductList } from './product-list/product-list';
import { DetailProduct } from './product-list/detail-product/detail-product';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Personal } from './personal/personal';
import { AuthGuard, canActivateSeller, canActivateAdmin } from './guards/auth.guard';
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
import { OrderManagement } from './seller/order-management/order-management';
import { Admin } from './admin/admin';
import { LoginAdmin } from './admin/login/login';
import { RegisterAdmin } from './admin/register/register';
import { Analyst } from './seller/analyst/analyst';
import { ManageProduct } from './seller/manage-product/manage-product';

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
    path: 'login-admin',
    component: LoginAdmin,
  },

  {
    path: 'register-admin',
    component: RegisterAdmin,
  },
  {
    path: 'admin',
    component: Admin,
    canActivate: [canActivateAdmin],
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
      },
      {
        path: 'users',
        component: ManageUser,
      },
      {
        path: 'orders',
        component: ManageOrders,
      },
    ],
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
    canActivate: [canActivateSeller],
    children: [
      {
        path: 'seller-dashboard',
        component: SellerDashboard,
      },
      {
        path: 'seller-order-management',
        component: OrderManagement,
      },
      {
        path: 'analytics',
        component: Analyst,
      },
      {
        path: 'seller-product-management',
        component: ManageProduct,
      },
    ],
  },
];
