import { filter } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Supabase } from '../../supabase';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../type/user';
import { supabase } from '../../../env/enviroment';
import Croppie from 'croppie';

@Component({
  selector: 'app-personal-infor',
  imports: [CommonModule, FormsModule],
  templateUrl: './personal-infor.html',
  styleUrl: './personal-infor.css',
})
export class PersonalInfor implements OnInit {
  user: any;
  userProfile: User | null = null;
  isUploading = false;
  uploadError: string | null = null;
  isEditing: boolean = false;
  showCrop: boolean = false;
  croppie: any = null;
  selectedImageBase64: string | null = null;

  constructor(
    private authService: AuthService,
    private supabase: Supabase,
    private router: Router
  ) {}

  // Edit state management
  editableFields = {
    full_name: false,
    email: false,
    phone: false,
    address: false,
    gender: false,
  };

  // Gender options
  genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  // Temporary data for editing
  tempUserData: Partial<User> = {
    full_name: '',
    email: '',
    phone: '',
    address: '',
    gender: '',
  };

  showEditButton: string = '';

  // Validation errors
  validationErrors: { [key: string]: string } = {};

  ngOnInit() {
    this.loadUser();
  }

  cancelCrop() {
    this.showCrop = false;
    this.croppie?.destroy();
    this.croppie = null;
  }

  async confirmCrop() {
    if (!this.croppie) return;

    try {
      const blob: Blob = await this.croppie.result({
        type: 'blob',
        size: { width: 400, height: 400 },
        format: 'png',
        quality: 1,
      });

      if (!blob) {
        throw new Error('Crop result is empty');
      }

      const file = new File([blob], `avatars/${Date.now()}.png`, { type: 'image/png' });

      this.showCrop = false;
      this.croppie.destroy();
      this.croppie = null;

      await this.uploadAvatar(file);
    } catch (err) {
      console.error('Crop error:', err);
      this.uploadError = 'Crop failed';
    }
  }

  private base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  // Validation methods
  validatePhone(phone: string | number): boolean {
    if (!phone || phone.toString().trim().length === 0) {
      this.validationErrors['phone'] = 'Phone number is required';
      return false;
    }

    const phoneStr = phone.toString();
    const cleanPhone = phoneStr.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      this.validationErrors['phone'] = 'Phone number must be at least 10 digits';
      return false;
    }

    const validPrefixes = ['03', '05', '07', '08', '09'];
    const prefix = cleanPhone.substring(0, 2);

    if (!validPrefixes.includes(prefix)) {
      this.validationErrors['phone'] = 'Invalid Vietnamese phone number format';
      return false;
    }

    delete this.validationErrors['phone'];
    return true;
  }

  validateAddress(address: string): boolean {
    if (!address || address.trim().length === 0) {
      this.validationErrors['address'] = 'Address is required';
      return false;
    }
    if (address.trim().length < 5) {
      this.validationErrors['address'] = 'Address must be at least 5 characters long';
      return false;
    }

    delete this.validationErrors['address'];
    return true;
  }

  validateAddress_old(address: string): boolean {
    if (!address || address.trim().length === 0) {
      this.validationErrors['address'] = 'Address is required';
      return false;
    }

    if (address.trim().length < 10) {
      this.validationErrors['address'] = 'Address must be at least 10 characters long';
      return false;
    }

    const addressPattern = /^[a-zA-ZÀ-ÿĂăÂâÊêÔôƠơƯưĐđ0-9\s,.-]+$/;

    if (!addressPattern.test(address)) {
      this.validationErrors['address'] = 'Address contains invalid characters';
      return false;
    }

    const vietnameseAddressKeywords = [
      'đường',
      'phố',
      'quận',
      'huyện',
      'phường',
      'xã',
      'thành phố',
      'tỉnh',
      'số',
      'ngõ',
      'tòa',
      'chung cư',
      'khu',
      'thôn',
      'ấp',
      'street',
      'ward',
      'district',
    ];

    const hasAddressKeyword = vietnameseAddressKeywords.some((keyword) =>
      address.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!hasAddressKeyword) {
      this.validationErrors['address'] =
        'Address should include location details (street, ward, district, etc.)';
      return false;
    }

    delete this.validationErrors['address'];
    return true;
  }

  validateFullName(name: string): boolean {
    if (!name || name.trim().length === 0) {
      this.validationErrors['full_name'] = 'Full name is required';
      return false;
    }

    if (name.trim().length < 2) {
      this.validationErrors['full_name'] = 'Full name must be at least 2 characters long';
      return false;
    }

    const namePattern = /^[a-zA-ZÀ-ÿĂăÂâÊêÔôƠơƯưĐđ\s]+$/;

    if (!namePattern.test(name)) {
      this.validationErrors['full_name'] = 'Full name can only contain letters and spaces';
      return false;
    }

    delete this.validationErrors['full_name'];
    return true;
  }

  private async loadUser() {
    try {
      this.user = await this.authService.getUser();

      if (this.user) {
        const profiles = await this.supabase.getData('users');
        this.userProfile = profiles?.find((profile: any) => profile.user_id === this.user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  getAvatarUrl(): string | null {
    if (this.userProfile?.avatar_url) {
      if (!this.userProfile.avatar_url.startsWith('http')) {
        return this.authService.getAvatarUrl(this.userProfile.avatar_url);
      }
      return this.userProfile.avatar_url;
    }

    if (this.user?.user_metadata?.avatar_url) {
      return this.user.user_metadata.avatar_url;
    }
    return '/assets/default-avatar.png';
  }

  onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = () => {
      this.showCrop = true;

      setTimeout(() => {
        this.croppie = new Croppie(document.getElementById('croppie-container')!, {
          viewport: { width: 250, height: 250, type: 'circle' },
          boundary: { width: 300, height: 300 },
          enableExif: true,
        });

        this.croppie.bind({
          url: reader.result,
        });
      });
    };

    reader.readAsDataURL(file);
  }

  openCropper(base64: string) {
    this.showCrop = true;

    setTimeout(() => {
      const el = document.getElementById('croppie-container');
      if (!el) return;

      this.croppie?.destroy();

      this.croppie = new Croppie(el, {
        viewport: { width: 180, height: 180, type: 'circle' },
        boundary: { width: 300, height: 300 },
        showZoomer: true,
        enableExif: true,
      });

      this.croppie.bind({
        url: base64,
      });
    });
  }

  private async uploadAvatar(file: File) {
    if (!this.user) {
      this.uploadError = 'User not authenticated';
      return;
    }
    this.isUploading = true;
    this.uploadError = null;

    try {
      const newAvatarUrl = await this.authService.uploadAvatarFromFile(this.user.id, file);

      if (newAvatarUrl) {
        if (this.userProfile?.avatar_url && !this.userProfile.avatar_url.startsWith('http')) {
          await this.authService.deleteAvatarFromStorage(this.userProfile.avatar_url);
        }

        const success = await this.authService.updateUserAvatar(this.user.id, newAvatarUrl);
        if (success) {
          if (this.userProfile) {
            this.userProfile.avatar_url = newAvatarUrl;
          }
          await this.loadUser();
        } else {
          this.uploadError = 'Failed to update avatar in database';
        }
      } else {
        this.uploadError = 'Failed to upload avatar';
      }
    } catch (error: any) {
      this.uploadError = error.message || 'Error uploading avatar';
      console.error('Upload avatar error:', error);
    } finally {
      this.isUploading = false;
    }
  }

  async signOut() {
    await this.authService.signOut();
    this.user = null;
    this.userProfile = null;
    this.router.navigate(['/login']);
    localStorage.removeItem('persist:supabase-auth-helpers');
    localStorage.clear();
  }

  getGenderLabel(value: string | null): string {
    if (!value) return '';
    const option = this.genderOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  }

  enableEdit(field: keyof Pick<User, 'full_name' | 'phone' | 'address' | 'gender'>) {
    this.editableFields[field] = true;
    const fieldValue = this.userProfile?.[field];
    this.tempUserData[field] = fieldValue ? fieldValue.toString() : '';
  }

  cancelEdit(field: keyof Pick<User, 'full_name' | 'phone' | 'address' | 'gender'>) {
    this.editableFields[field] = false;
    this.tempUserData[field] = '';
    this.showEditButton = '';
  }

  async saveEdit(field: keyof Pick<User, 'full_name' | 'phone' | 'address' | 'gender'>) {
    if (!this.userProfile) {
      console.error('No user profile found');
      return;
    }

    const value = this.tempUserData[field] || '';
    const valueStr = value.toString();
    let isValid = true;

    switch (field) {
      case 'phone':
        isValid = this.validatePhone(value);
        break;
      case 'address':
        isValid = this.validateAddress(valueStr);
        break;
      case 'full_name':
        isValid = this.validateFullName(valueStr);
        break;
      case 'gender':
        isValid = valueStr !== '';
        if (!isValid) {
          this.validationErrors['gender'] = 'Please select a gender';
        } else {
          delete this.validationErrors['gender'];
        }
        break;
    }

    if (!isValid) {
      console.error('Validation failed for field:', field, this.validationErrors[field]);
      return;
    }

    try {
      const updateData: Partial<User> = {
        [field]: this.tempUserData[field],
        updated_at: new Date().toISOString(),
      };

      if (field === 'phone' && this.tempUserData.phone) {
        const phoneStr = this.tempUserData.phone.toString();
        const cleanPhone = phoneStr.replace(/\D/g, '');
        updateData.phone = cleanPhone;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', this.userProfile.user_id)
        .select();

      if (!error) {
        const newValue = this.tempUserData[field];
        (this.userProfile as any)[field] = newValue;
        this.userProfile.updated_at = new Date().toISOString();

        this.editableFields[field] = false;
        this.tempUserData[field] = '';
        this.showEditButton = '';
      } else {
        console.error('Failed to update profile:', error);
        alert('Failed to update profile: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('An error occurred while saving. Check console for details.');
    }
  }

  formatPhoneNumber(phone: string | number | null): string {
    if (!phone) return 'Not provided';

    const phoneStr = phone.toString();
    const digits = phoneStr.replace(/\D/g, '');

    if (digits.length === 10 && digits.startsWith('0')) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }

    if (digits.length === 11 && digits.startsWith('84')) {
      return `+84 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }

    return phoneStr;
  }
}
