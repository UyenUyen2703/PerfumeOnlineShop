import { Component } from '@angular/core';
import { IgcFormsModule, IgxGridComponent, IgxGridModule } from 'igniteui-angular';
import { supabase } from '../../../env/enviroment';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manage-orders',
  imports: [IgxGridModule, IgxGridComponent, CommonModule],
  templateUrl: './manage-orders.html',
  styleUrl: './manage-orders.css',
})
export class ManageOrders {
  order: any[] = [];
  constructor() {}
  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  ngOnInit() {
    this.loadOrders();
  }

  private async loadOrders() {
    try {
      const { data: ordersData, error } = await supabase.from('orders').select('*');
      if (error) throw error;
      this.order = ordersData || [];
      console.log('Orders loaded:', this.order);
    } catch (error) {
      console.error('Error loading orders:', error);
      this.order = [];
    }
  }

  formatToCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  }

  // Utility function for template type casting
  $any(value: any): any {
    return value;
  }

  async updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('order_id', orderId);
      if (error) throw error;

      const orderIndex = this.order.findIndex((order) => order.order_id === orderId);
      if (orderIndex !== -1) {
        this.order[orderIndex].status = newStatus;
      }
      console.log('Order status updated:', data);
      this.loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  }
}
