import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { supabase } from '../../../env/enviroment';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { SellerNotification } from '../../../type/order';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-center',
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-center.html',
  styleUrl: './notification-center.css',
})
export class NotificationCenter implements OnInit, OnDestroy {
  notifications: SellerNotification[] = [];
  filteredNotifications: SellerNotification[] = [];
  filterType: string = 'all'; // all, read, unread
  searchTerm: string = '';
  isLoading: boolean = false;
  currentUser: any = null;
  private refreshSubscription?: Subscription;

  selectedOrderId: string | null = null;
  orderDetails: any = null;
  orderItems: any[] = [];
  isLoadingOrderDetails: boolean = false;
  showOrderModal: boolean = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  private async initializeComponent(): Promise<void> {
    try {
      this.currentUser = await this.authService.getUser();
      if (this.currentUser) {
        await this.loadNotifications();
        this.setupRealtimeSubscription();
      }
    } catch (error) {
      console.error('Error initializing notification center:', error);
    }
  }

  private async loadNotifications(): Promise<void> {
    if (!this.currentUser) return;

    this.isLoading = true;
    try {
      const { data, error } = await supabase
        .from('seller_notifications')
        .select('*')
        .eq('seller_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      this.notifications = data as SellerNotification[];
      this.applyFilters();
      this.updateUnreadCountService();
    } catch (error) {
      console.error('Error in loadNotifications:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private setupRealtimeSubscription(): void {
    if (!this.currentUser) return;

    const channel = supabase
      .channel(`seller_notifications:${this.currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seller_notifications',
          filter: `seller_id=eq.${this.currentUser.id}`,
        },
        () => {
          this.loadNotifications();
        }
      )
      .subscribe();
  }

  applyFilters(): void {
    let filtered = [...this.notifications];

    if (this.filterType === 'read') {
      filtered = filtered.filter(n => n.is_read === true);
    } else if (this.filterType === 'unread') {
      filtered = filtered.filter(n => n.is_read === false);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(term) ||
        n.content.toLowerCase().includes(term)
      );
    }

    this.filteredNotifications = filtered;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  async markAsRead(notification: SellerNotification): Promise<void> {
    if (!notification.id) return;

    try {
      const { error } = await supabase
        .from('seller_notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      notification.is_read = true;
      this.applyFilters();
      this.updateUnreadCountService();
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }

  async markAsUnread(notification: SellerNotification): Promise<void> {
    if (!notification.id) return;

    try {
      const { error } = await supabase
        .from('seller_notifications')
        .update({ is_read: false })
        .eq('id', notification.id);

      if (error) {
        console.error('Error marking notification as unread:', error);
        return;
      }

      notification.is_read = false;
      this.applyFilters();
      this.updateUnreadCountService();
    } catch (error) {
      console.error('Error in markAsUnread:', error);
    }
  }

  async deleteNotification(notification: SellerNotification): Promise<void> {
    if (!notification.id) return;

    try {
      const { error } = await supabase
        .from('seller_notifications')
        .delete()
        .eq('id', notification.id);

      if (error) {
        console.error('Error deleting notification:', error);
        return;
      }

      this.notifications = this.notifications.filter(n => n.id !== notification.id);
      this.applyFilters();
      this.updateUnreadCountService();
    } catch (error) {
      console.error('Error in deleteNotification:', error);
    }
  }

  async markAllAsRead(): Promise<void> {
    if (this.notifications.length === 0) return;

    try {
      const unreadIds = this.notifications
        .filter(n => !n.is_read && n.id)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('seller_notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) {
        console.error('Error marking all as read:', error);
        return;
      }

      this.notifications.forEach(n => n.is_read = true);
      this.applyFilters();
      this.updateUnreadCountService();
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.is_read).length;
  }

  private updateUnreadCountService(): void {
    const unreadCount = this.getUnreadCount();
    this.notificationService.updateUnreadCount(unreadCount);
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'new_order':
        return '🛒';
      case 'order_shipped':
        return '📦';
      case 'order_delivered':
        return '✅';
      case 'order_cancelled':
        return '❌';
      default:
        return '🔔';
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatOrderId(orderId: string): string {
    const parts = orderId.split('-');
    return parts[parts.length - 1];
  }

  async viewOrderDetails(notification: SellerNotification): Promise<void> {
    if (!notification.metadata?.orderId) {
      console.error('No order ID in notification metadata');
      return;
    }

    if (!notification.is_read && notification.id) {
      try {
        await this.markAsRead(notification);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    this.selectedOrderId = notification.metadata.orderId;
    this.isLoadingOrderDetails = true;
    this.showOrderModal = true;


    try {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', this.selectedOrderId)
        .single();

      if (orderError) {
        console.error('Error loading order details:', orderError);
        return;
      }

      this.orderDetails = order;

      // Fetch order items
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', this.selectedOrderId);

      if (itemsError) {
        console.error('Error loading order items:', itemsError);
        return;
      }

      // Fetch product details for each item
      this.orderItems = await Promise.all(
        (items || []).map(async (item) => {
          const { data: product } = await supabase
            .from('products')
            .select('name, image_url')
            .eq('product_id', item.product_id)
            .single();

          return {
            ...item,
            product_name: product?.name || 'Unknown Product',
            product_image: product?.image_url || 'assets/images/default-product.jpg',
          };
        })
      );
    } catch (error) {
      console.error('Error in viewOrderDetails:', error);
    } finally {
      this.isLoadingOrderDetails = false;
    }
  }

  closeOrderModal(): void {
    this.showOrderModal = false;
    this.selectedOrderId = null;
    this.orderDetails = null;
    this.orderItems = [];
  }

  getOrderStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Pending':
        return 'badge-pending';
      case 'Confirmed':
        return 'badge-confirmed';
      case 'Processing':
        return 'badge-processing';
      case 'Shipped':
        return 'badge-shipped';
      case 'Delivered':
        return 'badge-delivered';
      case 'Cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-default';
    }
  }
}

