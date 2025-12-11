import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Supabase } from '../../supabase';
import { Order } from '../../../type/order';
import { User } from '../../../type/user';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExportService } from '../../services/export.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-analyst',
  imports: [CommonModule, FormsModule],
  templateUrl: './analyst.html',
  styleUrl: './analyst.css',
})
export class Analyst implements OnInit, AfterViewInit, OnDestroy {
  totalOrders: number = 0;
  totalRevenue: number = 0;
  totalProducts: number = 0;
  totalCustomers: number = 0;
  currentMonthOrders: number = 0;
  monthlyKPI: number = 0;
  achievementPercentage: number = 0;

  chart: Chart | null = null;
  monthlyRevenueChart: Chart | null = null;
  yearlyRevenueChart: Chart | null = null;

  // Export Reports Properties
  dateFrom: string = '';
  dateTo: string = '';
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];
  isExporting: boolean = false;
  currentSellerId: string | null = null;

  constructor(
    private supabase: Supabase,
    private exportService: ExportService,
    private authService: AuthService
  ) {
    Chart.register(...registerables);
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      this.availableYears.push(i);
    }
  }

  async ngOnInit() {
    this.currentSellerId = await this.authService.getUserId();
    this.loadStatistics();
  }

  ngAfterViewInit() {
  }

  async loadStatistics() {
    try {
      await this.loadOrdersData();
      await this.loadProductsData();
      await this.loadCustomersData();
      setTimeout(() => {
        this.createOverviewChart();
        this.createMonthlyRevenueChart();
        this.createYearlyRevenueChart();
      }, 300);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }

  async loadOrdersData() {
    try {
      const orders: Order[] = await this.supabase.getData('orders');
      const orderItems = await this.supabase.getData('order_items');
      const products = await this.supabase.getData('products');

      // Filter orders by current seller through order items and products
      const sellerOrders = orders.filter(order => {
        const relatedOrderItems = orderItems.filter((item: any) => item.order_id === order.order_id);
        return relatedOrderItems.some((item: any) => {
          const product = products.find((p: any) => p.product_id === item.product_id);
          return product && product.seller_id === this.currentSellerId;
        });
      });

      this.totalOrders = sellerOrders.length;
      this.totalRevenue = sellerOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

      // Tính order của tháng hiện tại
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      this.currentMonthOrders = sellerOrders.filter(order => {
        if (order.created_at) {
          const orderDate = new Date(order.created_at);
          return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        }
        return false;
      }).length;

      // Lấy KPI của tháng (có thể từ database hoặc cấu hình)
      this.monthlyKPI = await this.getMonthlyKPI(currentMonth + 1, currentYear);

      // Tính phần trăm đạt được
      this.achievementPercentage = this.monthlyKPI > 0 ?
        Math.round((this.currentMonthOrders / this.monthlyKPI) * 100) : 0;

    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  async loadProductsData() {
    try {
      const products = await this.supabase.getData('products');
      // Filter products by current seller
      const sellerProducts = products.filter((product: any) => product.seller_id === this.currentSellerId);
      this.totalProducts = sellerProducts.length;
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  async loadCustomersData() {
    try {
      const users: User[] = await this.supabase.getData('users');
      this.totalCustomers = users.filter(user => user.role === 'customer').length;
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  async getMonthlyKPI(month: number, year: number): Promise<number> {
    try {
      const defaultKPI: { [key: number]: number } = {
        1: 80, 2: 75, 3: 90, 4: 85, 5: 100, 6: 95,
        7: 110, 8: 105, 9: 90, 10: 100, 11: 120, 12: 150
      };

      return defaultKPI[month] || 100;
    } catch (error) {
      console.error('Error getting monthly KPI:', error);
      return 100;
    }
  }

  createOverviewChart() {
    const canvas = document.getElementById('overviewChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const chartData = this.achievementPercentage >= 100
      ? [this.monthlyKPI, this.currentMonthOrders - this.monthlyKPI]
      : [this.currentMonthOrders, this.monthlyKPI - this.currentMonthOrders];

    const chartLabels = this.achievementPercentage >= 100
      ? ['Target KPI', 'Over Achievement']
      : ['Achieved', 'Remaining'];

    const chartColors = this.achievementPercentage >= 100
      ? ['#4CAF50', '#2E7D32']
      : [this.achievementPercentage >= 80 ? '#4CAF50' : this.achievementPercentage >= 50 ? '#FF9800' : '#f44336', '#E0E0E0'];

    this.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          label: 'KPI Achievement',
          data: chartData,
          backgroundColor: chartColors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Monthly KPI Achievement: ${this.achievementPercentage}%`
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const label = context.label || '';
                const value = context.parsed;
                return `${label}: ${value} orders`;
              },
              afterLabel: function(context: any) {
                const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `Percentage: ${percentage}%`;
              }
            }
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          }
        }
      }
    });
  }

  async createMonthlyRevenueChart() {
    const canvas = document.getElementById('monthlyRevenueChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.monthlyRevenueChart) {
      this.monthlyRevenueChart.destroy();
      this.monthlyRevenueChart = null;
    }

    const monthlyData = await this.getMonthlyRevenueData();

    this.monthlyRevenueChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: monthlyData.labels,
        datasets: [{
          label: 'Revenue (VND)',
          data: monthlyData.revenues,
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Daily Revenue - ${this.getCurrentMonthName()} ${this.getCurrentYear()}`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(value as number);
              }
            }
          }
        }
      }
    });
  }

  async createYearlyRevenueChart() {
    const canvas = document.getElementById('yearlyRevenueChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.yearlyRevenueChart) {
      this.yearlyRevenueChart.destroy();
    }

    const yearlyData = await this.getYearlyRevenueData();

    this.yearlyRevenueChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: yearlyData.labels,
        datasets: [{
          label: 'Monthly Revenue (VND)',
          data: yearlyData.revenues,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: '#36A2EB',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Monthly Revenue - ${this.getCurrentYear()}`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(value as number);
              }
            }
          }
        }
      }
    });
  }

  async getMonthlyRevenueData() {
    try {
      const orders: Order[] = await this.supabase.getData('orders');
      const orderItems = await this.supabase.getData('order_items');
      const products = await this.supabase.getData('products');

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      // Lấy số ngày trong tháng hiện tại
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      // Khởi tạo dữ liệu cho mỗi ngày trong tháng với giá trị 0
      const dailyRevenue: number[] = new Array(daysInMonth).fill(0);
      const labels: string[] = [];

      // Tạo labels cho từng ngày trong tháng
      for (let day = 1; day <= daysInMonth; day++) {
        labels.push(`${day}/${currentMonth + 1}`);
      }

      // Filter orders by current seller through order items and products
      const sellerOrders = orders.filter(order => {
        const relatedOrderItems = orderItems.filter((item: any) => item.order_id === order.order_id);
        return relatedOrderItems.some((item: any) => {
          const product = products.find((p: any) => p.product_id === item.product_id);
          return product && product.seller_id === this.currentSellerId;
        });
      });

      // Tính tổng doanh thu cho từng ngày trong tháng hiện tại (chỉ orders của seller hiện tại)
      sellerOrders.forEach(order => {
        if (order.created_at) {
          const orderDate = new Date(order.created_at);

          if (orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth) {
            const dayOfMonth = orderDate.getDate();

            // Tính revenue chỉ từ các sản phẩm của seller hiện tại trong order này
            const relatedOrderItems = orderItems.filter((item: any) => item.order_id === order.order_id);
            let sellerRevenue = 0;

            relatedOrderItems.forEach((item: any) => {
              const product = products.find((p: any) => p.product_id === item.product_id);
              if (product && product.seller_id === this.currentSellerId) {
                sellerRevenue += item.unit_price * item.quantity;
              }
            });

            dailyRevenue[dayOfMonth - 1] += sellerRevenue;
          }
        }
      });

      return { labels, revenues: dailyRevenue };
    } catch (error) {
      console.error('Error getting monthly revenue data:', error);
      return { labels: [], revenues: [] };
    }
  }

  async getYearlyRevenueData() {
    try {
      const orders: Order[] = await this.supabase.getData('orders');
      const orderItems = await this.supabase.getData('order_items');
      const products = await this.supabase.getData('products');

      const currentYear = new Date().getFullYear();

      // Khởi tạo dữ liệu cho 12 tháng với giá trị 0
      const monthlyRevenue: number[] = new Array(12).fill(0);
      const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
      ];

      // Filter orders by current seller through order items and products
      const sellerOrders = orders.filter(order => {
        const relatedOrderItems = orderItems.filter((item: any) => item.order_id === order.order_id);
        return relatedOrderItems.some((item: any) => {
          const product = products.find((p: any) => p.product_id === item.product_id);
          return product && product.seller_id === this.currentSellerId;
        });
      });

      // Tính tổng doanh thu cho từng tháng trong năm hiện tại (chỉ orders của seller hiện tại)
      sellerOrders.forEach(order => {
        if (order.created_at && order.status === 'delivered') {
          const orderDate = new Date(order.created_at);
          if (orderDate.getFullYear() === currentYear) {
            const monthIndex = orderDate.getMonth();

            // Tính revenue chỉ từ các sản phẩm của seller hiện tại trong order này
            const relatedOrderItems = orderItems.filter((item: any) => item.order_id === order.order_id);
            let sellerRevenue = 0;

            relatedOrderItems.forEach((item: any) => {
              const product = products.find((p: any) => p.product_id === item.product_id);
              if (product && product.seller_id === this.currentSellerId) {
                sellerRevenue += item.unit_price * item.quantity;
              }
            });

            monthlyRevenue[monthIndex] += sellerRevenue;
          }
        }
      });

      return { labels: monthNames, revenues: monthlyRevenue };
    } catch (error) {
      console.error('Error getting yearly revenue data:', error);
      return { labels: [], revenues: [] };
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getCurrentMonthName(): string {
    const months = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return months[new Date().getMonth()];
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  // ==================== EXPORT REPORT METHODS ====================

  async exportOrdersReport() {
    if (!this.currentSellerId) {
      this.currentSellerId = await this.authService.getUserId();
      if (!this.currentSellerId) {
        alert('Please log in to export reports.');
        return;
      }
    }

    this.isExporting = true;
    try {
      await this.exportService.generateSellerOrdersReport(
        this.currentSellerId,
        this.dateFrom || undefined,
        this.dateTo || undefined
      );
    } catch (error) {
      console.error('Error exporting orders report:', error);
      alert('Failed to export orders report. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }

  async exportProductsReport() {
    if (!this.currentSellerId) {
      this.currentSellerId = await this.authService.getUserId();
      if (!this.currentSellerId) {
        alert('Please log in to export reports.');
        return;
      }
    }

    this.isExporting = true;
    try {
      await this.exportService.generateSellerProductsReport(this.currentSellerId);
    } catch (error) {
      console.error('Error exporting products report:', error);
      alert('Failed to export products report. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }

  async exportRevenueReport() {
    if (!this.currentSellerId) {
      this.currentSellerId = await this.authService.getUserId();
      if (!this.currentSellerId) {
        alert('Please log in to export reports.');
        return;
      }
    }

    this.isExporting = true;
    try {
      await this.exportService.generateSellerRevenueReport(this.currentSellerId, this.selectedYear);
    } catch (error) {
      console.error('Error exporting revenue report:', error);
      alert('Failed to export revenue report. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }

  async exportComprehensiveReport() {
    if (!this.currentSellerId) {
      this.currentSellerId = await this.authService.getUserId();
      if (!this.currentSellerId) {
        alert('Please log in to export reports.');
        return;
      }
    }

    this.isExporting = true;
    try {
      await this.exportService.generateComprehensiveSellerReport(this.currentSellerId);
    } catch (error) {
      console.error('Error exporting comprehensive report:', error);
      alert('Failed to export comprehensive report. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.monthlyRevenueChart) {
      this.monthlyRevenueChart.destroy();
    }
    if (this.yearlyRevenueChart) {
      this.yearlyRevenueChart.destroy();
    }
  }
}
