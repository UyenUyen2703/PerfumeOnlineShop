import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { supabase } from '../../../env/enviroment';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { SellerNotification } from '../../../type/order';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notification-dropdown.html',
  styleUrl: './notification-dropdown.css',
})
export class NotificationDropdown implements OnInit, OnDestroy {
  notifications: SellerNotification[] = [];
  displayedNotifications: SellerNotification[] = [];
  dropdownOpen = false;
  isLoading = false;
  currentUser: any = null;
  unreadCount = 0;
  private readonly DISPLAY_LIMIT = 3;

  constructor(private authService: AuthService, private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private async initializeComponent(): Promise<void> {
    try {
      this.currentUser = await this.authService.getUser();
      if (this.currentUser) {
        await this.loadNotifications();
        this.setupRealtimeSubscription();
      }
    } catch (error) {
      console.error('Error initializing notification dropdown:', error);
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
      this.updateDisplayedNotifications();
      this.updateUnreadCount();
    } catch (error) {
      console.error('Error in loadNotifications:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private updateDisplayedNotifications(): void {
    this.displayedNotifications = this.notifications.slice(0, this.DISPLAY_LIMIT);
  }

  private updateUnreadCount(): void {
    this.unreadCount = this.notifications.filter((n) => !n.is_read).length;
    // Emit the updated count to other components
    this.notificationService.updateUnreadCount(this.unreadCount);
  }

  private setupRealtimeSubscription(): void {
    if (!this.currentUser) return;

    const channel = supabase
      .channel(`seller_notifications_dropdown:${this.currentUser.id}`)
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

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  async markAsRead(notification: SellerNotification, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    if (!notification.id || notification.is_read) return;

    try {
      const { error } = await supabase
        .from('seller_notifications')
        .update({ is_read: true, 'updated_at': new Date().toISOString() })
        .eq('id', notification.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local array immediately
      const index = this.notifications.findIndex((n) => n.id === notification.id);
      if (index !== -1) {
        this.notifications[index].is_read = true;
      }

      this.updateDisplayedNotifications();
      this.updateUnreadCount();
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }

  async deleteNotification(notification: SellerNotification, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

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

      this.notifications = this.notifications.filter((n) => n.id !== notification.id);
      this.updateDisplayedNotifications();
      this.updateUnreadCount();
    } catch (error) {
      console.error('Error in deleteNotification:', error);
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'order':
        return '<i class="fas fa-shopping-cart"></i>';

      case 'new_order':
        return '<i class="fas fa-cart-plus text-primary"></i>';

      case 'order_shipped':
        return '<i class="fas fa-truck text-info"></i>';

      case 'order_delivered':
        return '<i class="fas fa-check-circle text-success"></i>';

      case 'order_cancelled':
        return '<i class="fas fa-times-circle text-danger"></i>';

      case 'payment_success':
        return '<i class="fas fa-credit-card text-success"></i>';

      case 'payment_failed':
        return '<i class="fas fa-exclamation-triangle text-warning"></i>';

      case 'message':
        return '<i class="fas fa-envelope"></i>';

      default:
        return '<i class="fas fa-bell"></i>';
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

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const notificationDropdown = target.closest('.notification-dropdown-container');
    if (!notificationDropdown) {
      this.closeDropdown();
    }
  }
}
