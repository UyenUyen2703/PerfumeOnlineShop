import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Supabase } from '../../supabase';
import { Order } from '../../../type/order';
import { User } from '../../../type/user';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analyst',
  imports: [CommonModule],
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

  constructor(private supabase: Supabase) {
    Chart.register(...registerables);
  }

  ngOnInit() {
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
      }, 100);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }

  async loadOrdersData() {
    try {
      const orders: Order[] = await this.supabase.getData('orders');
      this.totalOrders = orders.length;
      this.totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

      // Tính order của tháng hiện tại
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      this.currentMonthOrders = orders.filter(order => {
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
      this.totalProducts = products.length;
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
      // Tạm thời dùng KPI mặc định theo tháng
      // Sau này có thể tạo bảng monthly_kpi trong database
      const defaultKPI: { [key: number]: number } = {
        1: 80, 2: 75, 3: 90, 4: 85, 5: 100, 6: 95,
        7: 110, 8: 105, 9: 90, 10: 100, 11: 120, 12: 150
      };

      return defaultKPI[month] || 100;
    } catch (error) {
      console.error('Error getting monthly KPI:', error);
      return 100; // KPI mặc định
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
            text: 'Monthly Revenue'
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
      const monthlyRevenue: { [key: string]: number } = {};

      orders.forEach(order => {
        if (order.created_at) {
          const date = new Date(order.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (order.total_amount || 0);
        }
      });

      const sortedMonths = Object.keys(monthlyRevenue).sort();
      const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return `Tháng ${monthNum}/${year}`;
      });
      const revenues = sortedMonths.map(month => monthlyRevenue[month]);

      return { labels, revenues };
    } catch (error) {
      console.error('Error getting monthly revenue data:', error);
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

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.monthlyRevenueChart) {
      this.monthlyRevenueChart.destroy();
    }
  }
}
