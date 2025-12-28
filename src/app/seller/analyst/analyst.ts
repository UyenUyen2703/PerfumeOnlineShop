import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Supabase } from '../../supabase';
import { Order } from '../../../type/order';
import { User } from '../../../type/user';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExportService } from '../../services/export.service';
import { AuthService } from '../../services/auth.service';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { supabase } from '../../../env/enviroment';

interface UploadedFile {
  name: string;
  size: number;
  type: 'pdf' | 'excel' | 'word' | 'image';
  file: File;
  thumbnail: string;
  url?: string;
  safeUrl?: SafeResourceUrl;
  htmlContent?: SafeHtml;
  excelData?: {
    sheets: string[];
    activeSheet: string;
    htmlContent: SafeHtml;
  };
}

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

  // File Upload Properties
  showUploadModal: boolean = false;
  showPreviewModal: boolean = false;
  isDragOver: boolean = false;
  uploadedFiles: UploadedFile[] = [];
  selectedFile: UploadedFile | null = null;
  isProcessingFiles: boolean = false;

  // Storage File Properties
  storageFiles: any[] = [];
  isLoadingStorageFiles: boolean = false;
  showStorageModal: boolean = false;

  constructor(
    private supabase: Supabase,
    private exportService: ExportService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
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
    await this.loadStorageFiles();
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

      // Get monthly KPI (can be from database or configuration)
      this.monthlyKPI = await this.getMonthlyKPI(currentMonth + 1, currentYear);

      // Calculate achievement percentage
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

  // Storage File Methods
  async loadStorageFiles() {
    if (!this.currentSellerId) {
      return;
    }

    this.isLoadingStorageFiles = true;
    try {
      const { data, error } = await supabase.storage
        .from('fileReport')
        .list('reports', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error loading storage files:', error);
        return;
      }

      this.storageFiles = data || [];
    } catch (error) {
      console.error('Error loading storage files:', error);
    } finally {
      this.isLoadingStorageFiles = false;
    }
  }

  async downloadStorageFile(fileName: string, originalName?: string) {
    if (!this.currentSellerId) {
      alert('Please log in to download files.');
      return;
    }

    try {
      const filePath = `reports/${fileName}`;
      const { data, error } = await supabase.storage
        .from('fileReport')
        .download(filePath);

      if (error) {
        console.error('Error downloading file:', error);
        alert('Error downloading file. Please try again.');
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName || fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  }

  async deleteStorageFile(fileName: string) {
    if (!this.currentSellerId) {
      alert('Please log in to delete files.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      const filePath = `reports/${fileName}`;
      const { error } = await supabase.storage
        .from('fileReport')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
        alert('Error deleting file. Please try again.');
        return;
      }

      await this.loadStorageFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file. Please try again.');
    }
  }

  async previewStorageFile(fileName: string) {
    if (!this.currentSellerId) {
      alert('Please log in to preview files.');
      return;
    }

    try {
      const filePath = `reports/${fileName}`;
      const { data: publicData } = supabase.storage
        .from('fileReport')
        .getPublicUrl(filePath);

      if (publicData && publicData.publicUrl) {
        // Open in new tab for preview
        window.open(publicData.publicUrl, '_blank');
      } else {
        alert('Unable to generate preview URL.');
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      alert('Error previewing file. Please try again.');
    }
  }

  openStorageModal() {
    this.showStorageModal = true;
    this.loadStorageFiles(); // Refresh files when opening modal
  }

  closeStorageModal() {
    this.showStorageModal = false;
  }

  getFileTypeIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return '🖼️';
      default:
        return '📎';
    }
  }

  getOriginalFileName(fileName: string): string {
    // Remove timestamp prefix from filename
    const parts = fileName.split('_');
    if (parts.length > 1) {
      return parts.slice(1).join('_');
    }
    return fileName;
  }

  formatFileDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  // File Upload Methods
  openFileUploadModal() {
    this.showUploadModal = true;
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.isDragOver = false;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;

    if (event.dataTransfer && event.dataTransfer.files) {
      this.processFiles(event.dataTransfer.files);
    }
  }

  onFileSelect(event: any) {
    if (event.target.files) {
      this.processFiles(event.target.files);
      event.target.value = '';
    }
  }

  async processFiles(files: FileList) {
    this.isProcessingFiles = true;
    let processedCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check file size (limit to 50MB for better PDF support)
        if (file.size > 50 * 1024 * 1024) {
          alert(`File "${file.name}" is too large. Maximum size is 50MB.`);
          errorCount++;
          continue;
        }

        // Check if file already exists
        if (this.uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
          alert(`File "${file.name}" already exists.`);
          errorCount++;
          continue;
        }

        const uploadedFile = await this.createUploadedFile(file);
        if (uploadedFile) {
          this.uploadedFiles.push(uploadedFile);
          processedCount++;
        } else {
          errorCount++;
        }
      }

      // Show summary message
      if (processedCount > 0) {
      }
      if (errorCount > 0) {
      }
    } finally {
      this.isProcessingFiles = false;
    }
  }

  async createUploadedFile(file: File): Promise<UploadedFile | null> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let fileType: 'pdf' | 'excel' | 'word' | 'image' = 'pdf';

      // Determine file type
      if (fileExtension === 'pdf') {
        fileType = 'pdf';
      } else if (['xls', 'xlsx'].includes(fileExtension || '')) {
        fileType = 'excel';
      } else if (['doc', 'docx'].includes(fileExtension || '')) {
        fileType = 'word';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '')) {
        fileType = 'image';
      } else {
        alert(`File type not supported: ${fileExtension}. Supported types: PDF, Excel, Word, Images`);
        return null;
      }

      // Create proper blob URL for preview
      let fileUrl: string | undefined = undefined;
      let htmlContent: SafeHtml | undefined = undefined;
      let excelData: { sheets: string[]; activeSheet: string; htmlContent: SafeHtml } | undefined = undefined;

      if (fileType === 'pdf') {
        const blob = new Blob([file], { type: 'application/pdf' });
        fileUrl = URL.createObjectURL(blob);
      } else if (fileType === 'word') {
        // Convert Word document to HTML using mammoth
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
          htmlContent = this.sanitizer.bypassSecurityTrustHtml(result.value);
          console.log('Word document converted to HTML successfully');
          if (result.messages.length > 0) {
            console.log('Conversion messages:', result.messages);
          }
        } catch (error) {
          console.error('Error converting Word document:', error);
          // Fallback to blob URL
          const blob = new Blob([file], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          fileUrl = URL.createObjectURL(blob);
        }
      } else if (fileType === 'excel') {
        // Convert Excel document to HTML table using xlsx
        try {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });

          // Get first worksheet or active worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to HTML table
          const htmlTable = XLSX.utils.sheet_to_html(worksheet, {
            id: 'excel-table',
            editable: false
          });

          // Create styled HTML content
          const styledHtml = `
            <div class="excel-info">
              <div class="excel-header">
                <h3>${file.name}</h3>
                <p>Sheet: ${firstSheetName} (${workbook.SheetNames.length} sheets total)</p>
              </div>
            </div>
            <div class="excel-content">
              ${htmlTable}
            </div>
          `;

          htmlContent = this.sanitizer.bypassSecurityTrustHtml(styledHtml);

          // Store Excel data for potential sheet switching
          excelData = {
            sheets: workbook.SheetNames,
            activeSheet: firstSheetName,
            htmlContent: htmlContent
          };

          console.log('Excel document converted to HTML successfully');
          console.log('Available sheets:', workbook.SheetNames);

          // Also create blob URL as fallback
          const blob = new Blob([file], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          fileUrl = URL.createObjectURL(blob);
        } catch (error) {
          console.error('Error converting Excel document:', error);
          // Fallback to blob URL
          const blob = new Blob([file], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          fileUrl = URL.createObjectURL(blob);
        }
      }

      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: fileType,
        file: file,
        thumbnail: await this.generateThumbnail(file, fileType),
        url: fileUrl,
        htmlContent: htmlContent,
        excelData: excelData
      };

      console.log(`File processed successfully:`, uploadedFile);
      return uploadedFile;
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Error processing file "${file.name}": ${error}`);
      return null;
    }
  }

  async generateThumbnail(file: File, fileType: string): Promise<string> {
    return new Promise((resolve) => {
      if (fileType === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // For non-image files, return a placeholder or icon
        resolve('');
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  openFilePreview(file: UploadedFile) {
    this.selectedFile = file;

    // Create safe URL for preview
    if (file.url) {
      if (file.type === 'pdf') {
        file.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(file.url);
      } else if (file.type === 'excel') {
      }
    }
    if (file.type === 'word' && file.htmlContent) {
    }

    this.showPreviewModal = true;
  }

  openPdfInNewTab(file: UploadedFile) {
    if (file.url) {
      const newWindow = window.open(file.url, '_blank');
      if (!newWindow) {
        alert('Please allow popups to view PDF in new tab');
      }
    }
  }
  openOfficeInNewTab(file: UploadedFile) {
    if (file.url) {
      // Try to use Google Docs Viewer
      const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(file.url)}&embedded=false`;
      const newWindow = window.open(googleViewerUrl, '_blank');
      if (!newWindow) {
        alert('Please allow popups to view document in new tab');
      }
    }
  }

  closePreviewModal() {
    this.showPreviewModal = false;
    this.selectedFile = null;
  }


  downloadFile(file: UploadedFile) {
    const url = URL.createObjectURL(file.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  removeFile(index: number) {
    this.uploadedFiles.splice(index, 1);
  }

  async confirmUpload() {
    if (this.uploadedFiles.length === 0) return;

    if (!this.currentSellerId) {
      this.currentSellerId = await this.authService.getUserId();
      if (!this.currentSellerId) {
        alert('Please log in to upload files.');
        return;
      }
    }

    this.isProcessingFiles = true;
    let uploadedCount = 0;
    let failedCount = 0;

    try {
      for (const file of this.uploadedFiles) {
        try {
          const timestamp = new Date().getTime();
          const fileExtension = file.name.split('.').pop();
          const fileName = `/reports/${timestamp}_${file.name}`;

          const { data, error } = await supabase.storage
            .from('fileReport')
            .upload(fileName, file.file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) {
            console.error('Error uploading file:', file.name, error);
            failedCount++;
          } else {
            uploadedCount++;

            const { data: publicData } = supabase.storage
              .from('fileReport')
              .getPublicUrl(fileName);

            if (publicData) {
            }
          }
        } catch (error) {
          console.error('Error uploading file:', file.name, error);
          failedCount++;
        }
      }

      // Show result message
      let message = '';
      if (uploadedCount > 0) {
        message += `Successfully uploaded ${uploadedCount} file(s) to Supabase storage.`;
        alert(message);

        // Reload storage files to show newly uploaded files
        await this.loadStorageFiles();
      }
      if (failedCount > 0) {
        message += ` Failed to upload ${failedCount} file(s).`;
        if (uploadedCount === 0) {
          alert(message);
        }
      }
    } catch (error) {
      console.error('Error in upload process:', error);
      alert('Error uploading files. Please try again.');
    } finally {
      this.isProcessingFiles = false;
      this.closeUploadModal();
    }
  }

  clearAllFiles() {
    if (confirm('Are you sure you want to remove all uploaded files?')) {
      // Clean up URLs to prevent memory leaks
      this.uploadedFiles.forEach(file => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
      this.uploadedFiles = [];
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

    // Clean up file URLs to prevent memory leaks
    this.uploadedFiles.forEach(file => {
      if (file.url) {
        URL.revokeObjectURL(file.url);
      }
    });
  }
}
