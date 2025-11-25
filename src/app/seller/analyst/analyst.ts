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

  chart: Chart | null = null;
  monthlyRevenueChart: Chart | null = null;

  constructor(private supabase: Supabase) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.loadStatistics();
  }

  ngAfterViewInit() {
    // Charts sẽ được tạo sau khi dữ liệu được load
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

  createOverviewChart() {
    const canvas = document.getElementById('overviewChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Orders', 'Products', 'Customers'],
        datasets: [{
          label: 'Overview Statistics',
          data: [this.totalOrders, this.totalProducts, this.totalCustomers],
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Overview Statistics'
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

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.monthlyRevenueChart) {
      this.monthlyRevenueChart.destroy();
    }
  }
}
