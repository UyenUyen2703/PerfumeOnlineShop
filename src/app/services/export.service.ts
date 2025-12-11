import { Product } from './../../type/product';
import { Order, OrderItem } from './../../type/order';
import { supabase } from './../../env/enviroment';
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
@Injectable({
  providedIn: 'root',
})
export class ExportService {
  exportToExcel(data: any[], fileName: string): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  getImageUrl(relativePath: string): string {
    if (!relativePath) return '';
    if (relativePath.startsWith('http')) return relativePath; // Nếu đã là URL đầy đủ
    return supabase.storage.from('images-storage').getPublicUrl(relativePath).data.publicUrl;
  }

  private async getSellerIdBySellerId(sellerIdentifier: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('users')
      .select('user_id')
      .eq('role', 'seller')
      .or(`email.eq.${sellerIdentifier},full_name.eq.${sellerIdentifier}`)
      .single();

    if (error || !data) {
      console.error('Error fetching seller ID:', error);
      return null;
    }
    return data.user_id;
  }

  private async getBrandIdByName(brandName: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('brands')
      .select('brand_id')
      .eq('name', brandName)
      .single();
      console.log('Brand fetch result:', data);
    if (error || !data) {
      console.error('Error fetching brand ID:', error);
      return null;
    }
    return data.brand_id;
  }

  private async getCategoryIdByName(categoryName: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('category_id')
      .eq('name', categoryName)
      .single();
      console.log('Category fetch result:', data);
    if (error || !data) {
      console.error('Error fetching category ID:', error);
      return null;
    }
    return data.category_id;
  }

  async onFileChange(event: any, type: string): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (type === 'brand') {
      await this.importBrand(rows);
      return;
    }

    if (type === 'category') {
      await this.importCategory(rows);
      return;
    }

    if (type === 'product') {
      await this.importProduct(rows);
      return;
    }
  }

  private async uploadImageFromUrl(imageUrl: string): Promise<string> {
    const blob = await fetch(imageUrl).then((res) => res.blob());
    const fileName = `/products/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from('images-storage').upload(fileName, blob, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      console.error('Error uploading image:', error);
      return '';
    }
    return fileName;
  }

  private async importProduct(rows: any[]) {
    const products = [];

    for (const row of rows) {
      const brandId = await this.getBrandIdByName(row['brand_id']);
      const categoryId = await this.getCategoryIdByName(row['category_id']);
      const sellerId = await this.getSellerIdBySellerId(row['seller_id']);

      if (!sellerId) {
        console.warn('Seller not found for:', row['seller_id']);
        continue;
      }

      let uploadedImage = '';
      const imgUrl = row['image_url'];

      if (imgUrl && (imgUrl.startsWith('http') || imgUrl.startsWith('https'))) {
        try {
          uploadedImage = await this.uploadImageFromUrl(imgUrl);
        } catch (e) {
          console.warn('CORS error when uploading image:', imgUrl);
        }
      }

      if(row.name == products.find(p => p.name === row.name)) {
        console.warn('Duplicate product name found, skipping:', row.name);
        continue;
      }

      products.push({
        ...row,
        brand_id: brandId,
        category_id: categoryId,
        image_url: uploadedImage,
        seller_id: sellerId,
      });
    }

    await this.importFromExcel(products);
  }

  private async importBrand(rows: any[]) {
    const { error } = await supabase.from('brands').insert(rows);
    if (error) console.error('Error importing brands:', error);
    else console.log('Brands imported successfully');
  }

  private async importCategory(rows: any[]) {
    const { error } = await supabase.from('categories').insert(rows);
    if (error) console.error('Error importing categories:', error);
    else console.log('Categories imported successfully');
  }

  private async importFromExcel(products: any[]) {
    const { error } = await supabase.from('products').insert(products);
    if (error) console.error('Error importing products:', error);
    else console.log('Products imported successfully');
  }

  async generateSellerOrdersReport(sellerId: string, dateFrom?: string, dateTo?: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            product_id,
            quantity,
            unit_price,
            products (
              name,
              image_url,
              seller_id
            )
          ),
          users (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data: allOrders, error } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      console.log('Total orders fetched:', allOrders?.length || 0);

      // Filter orders that contain products from the current seller
      const sellerOrders = (allOrders || []).filter((order: any) => {
        return order.order_items && order.order_items.some((item: any) =>
          item.products && item.products.seller_id === sellerId
        );
      });

      console.log('Seller orders found:', sellerOrders.length);

      // Filter order_items to only include items from the current seller
      const filteredOrders = sellerOrders.map((order: any) => ({
        ...order,
        order_items: order.order_items.filter((item: any) =>
          item.products && item.products.seller_id === sellerId
        )
      }));

      console.log('Generating HTML report...');
      const htmlContent = this.generateOrdersReportHTML(filteredOrders, dateFrom, dateTo);

      console.log('Creating blob and downloading...');
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const fileName = `BaoCao_DonHang_${new Date().toISOString().split('T')[0]}.doc`;
      saveAs(blob, fileName);

    } catch (error) {
      console.error('Error generating orders report:', error);
      throw error;
    }
  }

  async generateSellerProductsReport(sellerId: string): Promise<void> {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          brands (name),
          categories (name)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      const htmlContent = this.generateProductsReportHTML(products || []);
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const fileName = `BaoCao_SanPham_${new Date().toISOString().split('T')[0]}.doc`;
      saveAs(blob, fileName);

    } catch (error) {
      console.error('Error generating products report:', error);
    }
  }

  async generateSellerRevenueReport(sellerId: string, year: number): Promise<void> {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', sellerId)
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${year + 1}-01-01`)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching revenue data:', error);
        return;
      }

      const monthlyRevenue = new Array(12).fill(0);
      const monthlyOrders = new Array(12).fill(0);

      orders?.forEach(order => {
        const month = new Date(order.created_at).getMonth();
        monthlyRevenue[month] += order.total_amount;
        monthlyOrders[month]++;
      });

      const htmlContent = this.generateRevenueReportHTML(monthlyRevenue, monthlyOrders, year);
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const fileName = `Report_Revenue_${year}.doc`;
      saveAs(blob, fileName);

    } catch (error) {
      console.error('Error generating revenue report:', error);
    }
  }

  async generateComprehensiveSellerReport(sellerId: string): Promise<void> {
    try {
      const [ordersResult, productsResult, userResult] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            *,
            order_items (
              product_id,
              quantity,
              unit_price
            )
          `)
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false }),

        supabase
          .from('products')
          .select(`
            *,
            brands (name),
            categories (name)
          `)
          .eq('seller_id', sellerId),

        supabase
          .from('users')
          .select('full_name, email')
          .eq('user_id', sellerId)
          .single()
      ]);

      const orders = ordersResult.data || [];
      const products = productsResult.data || [];
      const seller = userResult.data;

      const htmlContent = this.generateComprehensiveReportHTML(orders, products, seller);
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const fileName = `Report_Comprehensive_${new Date().toISOString().split('T')[0]}.doc`;
      saveAs(blob, fileName);

    } catch (error) {
      console.error('Error generating comprehensive report:', error);
    }
  }

  private generateOrdersReportHTML(orders: any[], dateFrom?: string, dateTo?: string): string {
    // Calculate total revenue from seller's products only
    const totalRevenue = orders.reduce((sum, order) => {
      const orderRevenue = order.order_items.reduce((itemSum: number, item: any) => {
        return itemSum + (item.unit_price * item.quantity);
      }, 0);
      return sum + orderRevenue;
    }, 0);

    const dateRangeText = dateFrom && dateTo ?
      `From ${new Date(dateFrom).toLocaleDateString('en-US')} to ${new Date(dateTo).toLocaleDateString('en-US')}` :
      'All time';

    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Orders Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #2c3e50; }
            .date { text-align: right; color: #666; margin-bottom: 20px; }
            .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #3498db; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .status-delivered { color: #27ae60; font-weight: bold; }
            .status-pending { color: #f39c12; font-weight: bold; }
            .status-cancelled { color: #e74c3c; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">SELLER ORDERS REPORT</div>
          </div>
          <div class="date">Report Date: ${new Date().toLocaleDateString('en-US')}</div>
          <div class="summary">
            <p><strong>Time Period:</strong> ${dateRangeText}</p>
            <p><strong>Total Orders:</strong> ${orders.length}</p>
            <p><strong>Total Revenue:</strong> ${this.formatCurrency(totalRevenue)}</p>
          </div>
          <h2>Order Details</h2>
          ${this.createOrdersTableHTML(orders)}
        </body>
      </html>
    `;
  }

  private generateProductsReportHTML(products: any[]): string {
    const totalValue = products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    const lowStockProducts = products.filter(p => p.quantity < 10).length;

    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Products Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #2c3e50; }
            .date { text-align: right; color: #666; margin-bottom: 20px; }
            .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #3498db; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .low-stock { background-color: #f8d7da !important; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">SELLER PRODUCTS REPORT</div>
          </div>
          <div class="date">Report Date: ${new Date().toLocaleDateString('en-US')}</div>
          <div class="summary">
            <p><strong>Total Products:</strong> ${products.length}</p>
            <p><strong>Low Stock Products:</strong> ${lowStockProducts}</p>
            <p><strong>Total Inventory Value:</strong> ${this.formatCurrency(totalValue)}</p>
          </div>
          <h2>Product Details</h2>
          ${this.createProductsTableHTML(products)}
        </body>
      </html>
    `;
  }

  private generateRevenueReportHTML(monthlyRevenue: number[], monthlyOrders: number[], year: number): string {
    const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);
    const totalOrders = monthlyOrders.reduce((a, b) => a + b, 0);

    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Revenue Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #2c3e50; }
            .year { font-size: 18px; color: #3498db; margin-bottom: 10px; }
            .date { text-align: right; color: #666; margin-bottom: 20px; }
            .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: center; }
            th { background-color: #3498db; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .total-row { background-color: #e8f4f8 !important; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">SELLER REVENUE REPORT</div>
            <div class="year">Year ${year}</div>
          </div>
          <div class="date">Report Date: ${new Date().toLocaleDateString('en-US')}</div>
          <div class="summary">
            <p><strong>Total Revenue for the Year:</strong> ${this.formatCurrency(totalRevenue)}</p>
            <p><strong>Total Completed Orders:</strong> ${totalOrders}</p>
          </div>
          <h2>Monthly Revenue</h2>
          ${this.createRevenueTableHTML(monthlyRevenue, monthlyOrders)}
        </body>
      </html>
    `;
  }

  private generateComprehensiveReportHTML(orders: any[], products: any[], seller: any): string {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalProductValue = products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    const lowStockProducts = products.filter(p => p.quantity < 10);

    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Comprehensive Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #2c3e50; }
            .seller-info { font-size: 16px; color: #3498db; margin-bottom: 5px; }
            .date { text-align: right; color: #666; margin-bottom: 20px; }
            .overview { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
            .overview h3 { color: #2c3e50; margin-top: 0; }
            .overview ul { list-style: none; padding: 0; }
            .overview li { padding: 5px 0; border-bottom: 1px solid #eee; }
            .section { margin: 30px 0; }
            .section h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #3498db; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .low-stock { background-color: #f8d7da !important; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">COMPREHENSIVE SELLER REPORT</div>
            <div class="seller-info">Seller: ${seller?.full_name || 'N/A'}</div>
            <div class="seller-info">Email: ${seller?.email || 'N/A'}</div>
          </div>
          <div class="date">Report Date: ${new Date().toLocaleDateString('en-US')}</div>
          <div class="overview">
            <h3>OVERVIEW</h3>
            <ul>
              <li><strong>Total Orders:</strong> ${orders.length}</li>
              <li><strong>Completed Orders:</strong> ${completedOrders}</li>
              <li><strong>Pending Orders:</strong> ${pendingOrders}</li>
              <li><strong>Total Revenue:</strong> ${this.formatCurrency(totalRevenue)}</li>
              <li><strong>Total Products:</strong> ${products.length}</li>
              <li><strong>Low Stock Products:</strong> ${lowStockProducts.length}</li>
              <li><strong>Total Inventory Value:</strong> ${this.formatCurrency(totalProductValue)}</li>
            </ul>
          </div>

          <div class="section">
            <h2>RECENT ORDERS (10 most recent)</h2>
            ${this.createOrdersTableHTML(orders.slice(0, 10))}
          </div>

          <div class="section">
            <h2>LOW STOCK PRODUCTS</h2>
            ${this.createProductsTableHTML(lowStockProducts)}
          </div>
        </body>
      </html>
    `;
  }

  private createOrdersTableHTML(orders: any[]): string {
    if (orders.length === 0) {
      return '<p>No orders available.</p>';
    }

    const rows = orders.map(order => {
      // Calculate seller's revenue for this order
      const sellerRevenue = order.order_items.reduce((sum: number, item: any) => {
        return sum + (item.unit_price * item.quantity);
      }, 0);

      return `
        <tr>
          <td>${order.order_id?.substring(0, 8) || 'N/A'}</td>
          <td>${new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
          <td>${order.recipient_Name || 'N/A'}</td>
          <td>${this.formatCurrency(sellerRevenue)}</td>
          <td class="status-${order.status}">${this.getStatusText(order.status)}</td>
        </tr>
      `;
    }).join('');

    return `
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Order Date</th>
            <th>Customer</th>
            <th>Total Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  private createProductsTableHTML(products: any[]): string {
    if (products.length === 0) {
      return '<p>No products available.</p>';
    }

    const rows = products.map(product => `
      <tr class="${product.quantity < 10 ? 'low-stock' : ''}">
        <td>${product.name || 'N/A'}</td>
        <td>${product.brands?.name || 'N/A'}</td>
        <td>${product.categories?.name || 'N/A'}</td>
        <td>${this.formatCurrency(product.price)}</td>
        <td>${product.quantity || 0}</td>
      </tr>
    `).join('');

    return `
      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Brand</th>
            <th>Category</th>
            <th>Price</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  private createRevenueTableHTML(monthlyRevenue: number[], monthlyOrders: number[]): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const rows = months.map((month, index) => `
      <tr>
        <td>${month}</td>
        <td>${monthlyOrders[index]}</td>
        <td>${this.formatCurrency(monthlyRevenue[index])}</td>
      </tr>
    `).join('');

    const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);
    const totalOrders = monthlyOrders.reduce((a, b) => a + b, 0);

    return `
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th></th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td><strong>${totalOrders}</strong></td>
            <td><strong>${this.formatCurrency(totalRevenue)}</strong></td>
          </tr>
        </tbody>
      </table>
    `;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  private getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pending',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }
}
