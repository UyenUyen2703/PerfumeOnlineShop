import { User } from './../../../type/user';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Supabase } from '../../supabase';
import { AuthService } from '../../services/auth.service';
import { Order, OrderItem, CartItem } from '../../../type/order';

type OrderStatus = 'outstanding' | 'awaiting' | 'cancelled' | 'delivered' | 'shipped';

// Extended interface để thêm các thuộc tính cần thiết cho UI
interface OrderWithItems extends Order {
  items?: CartItem[];
}

@Component({
  selector: 'app-orders-personal',
  imports: [CommonModule, RouterLink],
  templateUrl: './orders-personal.html',
  styleUrl: './orders-personal.css',
})
export class OrdersPersonal {
  orders: OrderWithItems[] = [];
  activeTab: OrderStatus = 'outstanding';
  filteredOrders: OrderWithItems[] = [];
  showOrderDetail: boolean = false;
  selectedOrder: OrderWithItems | null = null;

  constructor(private supabase: Supabase, private authService: AuthService) {
    this.fetchOrders();

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.showOrderDetail) {
        this.closeOrderDetail();
      }
    });
  }

  private async fetchOrders() {
    try {
      const user = await this.authService.getUser();
      if (!user) {
        console.error('User not authenticated');
        this.orders = [];
        this.updateFilteredOrders();
        return;
      }

      const ordersData = await this.supabase.getCurrentUserOrders();

      this.orders = this.processOrdersData(ordersData || []);
      this.updateFilteredOrders();
    } catch (error) {
      console.error('Error loading orders:', error);
      this.orders = [];
      this.updateFilteredOrders();
    }
  }

  setActiveTab(tab: OrderStatus): void {
    this.activeTab = tab;
    this.updateFilteredOrders();
  }

  private updateFilteredOrders(): void {
    this.filteredOrders = this.getOrdersByStatus(this.activeTab);
  }

  getOrdersByStatus(status: OrderStatus): OrderWithItems[] {
    if (!this.orders) return [];

    switch (status) {
      case 'outstanding':
        return this.orders.filter((order) =>
          ['pending', 'processing', 'confirmed'].includes(order.status.toLowerCase())
        );
      case 'awaiting':
        return this.orders.filter((order) =>
          ['shipped', 'in_transit', 'out_for_delivery'].includes(order.status.toLowerCase())
        );
      case 'cancelled':
        return this.orders.filter((order) =>
          ['cancelled', 'refunded'].includes(order.status.toLowerCase())
        );
      default:
        return this.orders.filter((order) => order.status.toLowerCase() === status);
    }
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      pending: 'Pending',
      processing: 'Processing',
      confirmed: 'Confirmed',
      shipped: 'Shipped',
      in_transit: 'In Transit',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
    };

    return statusLabels[status.toLowerCase()] || status;
  }

  private processOrdersData(rawOrders: any[]): OrderWithItems[] {
    return rawOrders.map((order) => {
      const items =
        order.order_items?.map((item: any) => ({
          product_id: item.product_id,
          name: item.products?.name || 'Unknown Product',
          code: item.product_id,
          options: item.options || '',
          price: item.products?.price || item.unit_price,
          quantity: item.quantity,
          image: this.getProductImageUrl(item.products?.image_url),
        })) || [];

      return {
        ...order,
        items: items,
      };
    });
  }

  private getProductImageUrl(imageUrl?: string): string {
    if (!imageUrl) {
      return 'assets/images/placeholder.jpg';
    }
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    if (imageUrl.startsWith('assets/')) {
      return imageUrl;
    }

    return `assets/images/products/${imageUrl}`;
  }

  async getSpecificOrder(orderId: string) {
    try {
      const user = await this.authService.getUser();
      if (!user) {
        console.error('User not authenticated');
        return null;
      }

      const orderData = await this.supabase.getOrderUserId(orderId, user.id);
      console.log('Specific order data:', orderData);

      if (orderData) {
        return this.processOrdersData([orderData])[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching specific order:', error);
      return null;
    }
  }

  async refreshOrders() {
    await this.fetchOrders();
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/placeholder.jpg';
  }

  formatToCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
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

  customShowIdOrder(orderId: string): string {
    const parts = orderId.split('-');
    return parts[parts.length - 1];
  }

  openOrderDetail(order: OrderWithItems): void {
    this.selectedOrder = order;
    this.showOrderDetail = true;
    document.body.style.overflow = 'hidden';
  }

  closeOrderDetail(): void {
    this.showOrderDetail = false;
    this.selectedOrder = null;
    document.body.style.overflow = 'auto';
  }

  closeOnOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeOrderDetail();
    }
  }

  followOrder(orderId: string): void {
    window.open(`https://tracking.example.com/track/${orderId}`, '_blank');
  }
}
