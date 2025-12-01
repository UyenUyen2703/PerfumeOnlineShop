import { FormsModule } from '@angular/forms';
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { IgxGridComponent, IgxColumnComponent, IgxGridModule } from 'igniteui-angular';
import { CommonModule } from '@angular/common';
import { supabase } from '../../../env/enviroment';
import { AuthService } from '../../services/auth.service';
import { CarouselModule } from 'ngx-owl-carousel-o';

@Component({
  selector: 'app-order-management',
  imports: [
    FormsModule,
    CommonModule,
    IgxGridModule,
    IgxGridComponent,
    IgxColumnComponent,
    CarouselModule,
  ],
  templateUrl: './order-management.html',
  styleUrl: './order-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderManagement implements OnInit, OnDestroy {
  order: any[] = [];
  currentSellerId: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  isUpdating = false; // Prevent multiple simultaneous updates
  private updateTimeout: any = null;

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef) {}
  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  async ngOnInit() {
    const resizeObserverErr = (e: any) => {
      if (e.target === window && e.message === 'ResizeObserver loop limit exceeded') {
        return;
      }
    };
    window.addEventListener('error', resizeObserverErr);
    this.loadOrders();
  }

  ngOnDestroy() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
  }

  clearError() {
    this.errorMessage = null;
  }

  async loadOrders() {
    try {
      this.isLoading = true;
      this.errorMessage = null;

      this.currentSellerId = await this.authService.getUserId();
      if (!this.currentSellerId) {
        this.errorMessage = 'Please log in to view orders.';
        return;
      }
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      this.order = ordersData || [];
    } catch (error) {
      console.error('Error loading orders:', error);
      this.errorMessage = 'Failed to load orders. Please try again.';
      this.order = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  formatToCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  }

  formatPhoneNumber(value: string): string {
    if (!value) return '';
    let phone = value.toString().replace(/\D/g, '');
    if (!phone.startsWith('0')) {
      phone = '0' + phone;
    }
    if (phone.length === 10) {
      return phone.replace(/^0(\d{3})(\d{3})(\d{3})$/, '0$1 $2 $3');
    } else if (phone.length === 11) {
      return phone.replace(/^0(\d{2})(\d{4})(\d{4})$/, '0$1 $2 $3');
    } else if (phone.length === 9 && phone.startsWith('0')) {
      return phone.replace(/^0(\d{2})(\d{3})(\d{3})$/, '0$1 $2 $3');
    }
    return phone;
  }

  $any(value: any): any {
    return value;
  }

  updateOrderStatus(orderId: string, newStatus: string) {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = setTimeout(() => {
      this.performOrderStatusUpdate(orderId, newStatus);
    }, 300);
  }

  private async performOrderStatusUpdate(orderId: string, newStatus: string) {
    if (this.isUpdating) {
      return;
    }

    try {
      this.isUpdating = true;
      this.errorMessage = null;

      const order = this.order.find((o) => o.order_id === orderId);
      if (!order) {
        console.error('Order not found:', orderId);
        return;
      }

      if (order.status === newStatus) {
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('order_id', orderId);

      if (error) throw error;
      this.order = this.order.map((order) =>
        order.order_id === orderId ? { ...order, status: newStatus } : order
      );
      this.cdr.detectChanges();
      setTimeout(() => {
        this.loadOrders();
      }, 1000);
    } catch (error) {
      console.error('Error updating order status:', error);
      this.errorMessage = 'Failed to update order status. Please try again.';
      this.loadOrders();
    } finally {
      this.isUpdating = false;
    }
  }
}
