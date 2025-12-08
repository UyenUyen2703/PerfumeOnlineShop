import { Product } from './../../type/product';
import { supabase } from './../../env/enviroment';
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
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

  // Helper function để convert đường dẫn tương đối thành URL đầy đủ
  getImageUrl(relativePath: string): string {
    if (!relativePath) return '';
    if (relativePath.startsWith('http')) return relativePath; // Nếu đã là URL đầy đủ
    return supabase.storage.from('images-storage').getPublicUrl(relativePath).data.publicUrl;
  }

  //import
  private async getSellerIdBySellerId(sellerIdentifier: string): Promise<string | null> {
    // Hàm này lấy user_id của seller từ tên hoặc email
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

      // Nếu không tìm thấy seller, bỏ qua row này
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
}
