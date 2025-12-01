import { Order } from './../../type/order';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { supabase } from '../../env/enviroment';
import { CartItem } from '../../type/order';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  orderNote: string = '';
  agreeToTerms: boolean = false;
  orderAddress: string = '';
  address: string = '';
  recipientName: string = '';
  recipientPhone: string = '';
  private cartSubscription?: Subscription;

  showInvoiceOverlay: boolean = false;
  invoiceData: any = null;

  phoneError: string = '';
  addressError: string = '';
  nameError: string = '';
  isProcessing: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.cartSubscription = this.cartService.cartItems$.subscribe(
      items => {
        this.cartItems = items;
      }
    );

  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }


  getItemTotal(item: CartItem): number {
    return this.cartService.getItemTotal(item);
  }

  getCartTotal(): string {
    return this.formatToCurrency(this.cartService.getCartTotal());
  }

  increaseQuantity(itemId: string): void {
    this.cartService.increaseQuantity(itemId);
  }

  decreaseQuantity(itemId: string): void {
    this.cartService.decreaseQuantity(itemId);
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  addToCart(product: any): void {
    this.cartService.addToCart(product);
  }

  async checkout(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    if (!this.agreeToTerms) {
      alert('Please agree to the terms and conditions before proceeding.');
      return;
    }

    if (this.cartService.isCartEmpty()) {
      alert('Cart is empty!');
      return;
    }

    const isNameValid = this.validateName();
    const isPhoneValid = this.validatePhoneNumber();
    const isAddressValid = this.validateAddress();

    if (!isNameValid || !isPhoneValid || !isAddressValid) {
      return;
    }

    this.isProcessing = true;

    try {
      const customerInfo = {
        recipientName: this.recipientName.trim(),
        recipientPhone: this.recipientPhone.trim(),
        address: this.address.trim(),
        orderNote: this.orderNote.trim()
      };

      const orderInfo = await this.cartService.paymentProcess(
        customerInfo.address,
        customerInfo.recipientName,
        customerInfo.recipientPhone,
        customerInfo.orderNote
      );

      this.invoiceData = {
        orderId: orderInfo.orderId || 'N/A',
        items: orderInfo.items || [],
        total: orderInfo.total || 0,
        recipientName: customerInfo.recipientName || 'N/A',
        recipientPhone: customerInfo.recipientPhone || 'N/A',
        address: customerInfo.address || 'N/A',
        note: customerInfo.orderNote || '',
        orderDate: new Date().toLocaleDateString('vi-VN')
      };

      if (!this.invoiceData.recipientName || this.invoiceData.recipientName === 'N/A') {
        console.error('Invoice missing recipient name!', customerInfo);
      }
      if (!this.invoiceData.recipientPhone || this.invoiceData.recipientPhone === 'N/A') {
        console.error('Invoice missing recipient phone!', customerInfo);
      }
      if (!this.invoiceData.address || this.invoiceData.address === 'N/A') {
        console.error('Invoice missing address!', customerInfo);
      }

      this.showInvoiceOverlay = true;

      this.orderNote = '';
      this.address = '';
      this.recipientName = '';
      this.recipientPhone = '';
      this.agreeToTerms = false;

    } catch (error) {
      console.error('Checkout error:', error);
      if (error instanceof Error) {
        alert(`Đặt hàng thất bại: ${error.message}`);
      } else {
        alert('An error occurred while processing your order. Please try again.');
      }
    } finally {
      this.isProcessing = false;
    }
  }

  closeInvoiceOverlay(): void {
    this.showInvoiceOverlay = false;
    this.invoiceData = null;
  }

  printInvoice(): void {
    window.print();
  }

  isCartEmpty(): boolean {
    return this.cartService.isCartEmpty();
  }

  getTotalItemCount(): number {
    return this.cartService.getTotalItemCount();
  }

  formatToCurrency(amount: number): string {
    return amount.toLocaleString('vn-VN', { style: 'currency', currency: 'VND' });
  }

  validatePhoneNumber(): boolean {
    this.phoneError = '';

    if (!this.recipientPhone.trim()) {
      this.phoneError = '❌ Vui lòng nhập số điện thoại';
      return false;
    }

    const cleanPhone = this.recipientPhone.replace(/\D/g, '');

    if (cleanPhone.length === 0) {
      this.phoneError = '❌ Số điện thoại không được để trống';
      return false;
    }

    if (cleanPhone.length < 10) {
      this.phoneError = `❌ Số điện thoại chưa đủ 10 số (hiện tại: ${cleanPhone.length}/10)`;
      return false;
    }

    if (cleanPhone.length > 10) {
      this.phoneError = `❌ Số điện thoại vượt quá 10 số (hiện tại: ${cleanPhone.length}/10)`;
      return false;
    }

    if (!cleanPhone.startsWith('0')) {
      this.phoneError = '❌ Số điện thoại phải bắt đầu bằng số 0';
      return false;
    }

    const secondDigit = cleanPhone.charAt(1);
    if (!/[3-9]/.test(secondDigit)) {
      this.phoneError = '❌ Số thứ 2 phải từ 3-9 (định dạng SĐT Việt Nam)';
      return false;
    }

    this.recipientPhone = cleanPhone;
    return true;
  }

  validateAddress(): boolean {
    this.addressError = '';

    if (!this.address.trim()) {
      this.addressError = '❌ Vui lòng nhập địa chỉ giao hàng';
      return false;
    }

    const address = this.address.trim().toLowerCase();

    if (address.length < 10) {
      this.addressError = '❌ Địa chỉ quá ngắn, vui lòng nhập đầy đủ thông tin';
      return false;
    }

    const wardKeywords = ['phường', 'xã', 'thị trấn', 'khóm', 'tt.'];
    const cityKeywords = ['quận', 'huyện', 'thành phố', 'tỉnh', 'tp.', 'tp', 'q.', 'h.'];

    const hasWard = wardKeywords.some(keyword => address.includes(keyword));
    const hasCity = cityKeywords.some(keyword => address.includes(keyword));

    let missingParts = [];

    if (!hasWard) {
      missingParts.push('phường/xã');
    }

    if (!hasCity) {
      missingParts.push('quận/huyện/thành phố');
    }

    if (missingParts.length > 0) {
      this.addressError = `❌ Thiếu thông tin: ${missingParts.join(', ')}`;
      return false;
    }

    return true;
  }

  validateName(): boolean {
    this.nameError = '';

    if (!this.recipientName.trim()) {
      this.nameError = '❌ Vui lòng nhập tên người nhận hàng';
      return false;
    }

    const name = this.recipientName.trim();

    if (name.length < 2) {
      this.nameError = `❌ Tên quá ngắn (hiện tại: ${name.length}/2 ký tự tối thiểu)`;
      return false;
    }

    if (name.length > 50) {
      this.nameError = `❌ Tên quá dài (hiện tại: ${name.length}/50 ký tự tối đa)`;
      return false;
    }

    const validNameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/;

    if (!validNameRegex.test(name)) {
      this.nameError = '❌ Tên chỉ được chứa chữ cái và khoảng trắng';
      return false;
    }

    return true;
  }

  onPhoneInput(): void {
    this.validatePhoneNumber();
  }

  onAddressInput(): void {
    this.validateAddress();
  }

  onNameInput(): void {
    this.validateName();
  }

  isFormValid(): boolean {
    return !this.nameError && !this.phoneError && !this.addressError &&
           !!this.recipientName.trim() && !!this.recipientPhone.trim() && !!this.address.trim();
  }
}
