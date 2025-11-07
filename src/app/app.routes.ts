import { HomePage } from './home-page/home-page';
import { Routes } from '@angular/router';
import { ProductList } from './product-list/product-list';
import { DetailProduct } from './product-list/detail-product/detail-product';

export const routes: Routes = [

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
