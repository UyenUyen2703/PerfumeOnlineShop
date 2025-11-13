import { filter } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Supabase } from '../../supabase';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../type/user';
import { supabase } from '../../../env/enviroment';

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

  // Validation methods
  validatePhone(phone: string | number): boolean {
    if (!phone || phone.toString().trim().length === 0) {
      this.validationErrors['phone'] = 'Phone number is required';
      return false;
    }

    // Convert to string and remove all non-digit characters
    const phoneStr = phone.toString();
    const cleanPhone = phoneStr.replace(/\D/g, '');

    // Check if at least 10 digits (more flexible)
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

    // Check for some common Vietnamese address keywords
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

    // Only allow letters, spaces, and Vietnamese characters
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
    if (this.userProfile?.avatar_URL) {
      return this.authService.getAvatarUrl(this.userProfile.avatar_URL);
    }
    if (this.user?.user_metadata?.avatar_url) {
      return this.user.user_metadata.avatar_url;
    }
    return '/assets/default-avatar.png';
  }

  onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadAvatar(input.files[0]);
    }
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
        if (this.userProfile?.avatar_URL && !this.userProfile.avatar_URL.startsWith('http')) {
          await this.authService.deleteAvatarFromStorage(this.userProfile.avatar_URL);
        }

        const success = await this.authService.updateUserAvatar(this.user.id, newAvatarUrl);
        if (success) {
          if (this.userProfile) {
            this.userProfile.avatar_URL = newAvatarUrl;
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

    // Validate based on field type
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
        isValid = valueStr !== ''; // Gender just needs to be selected
        if (!isValid) {
          this.validationErrors['gender'] = 'Please select a gender';
        } else {
          delete this.validationErrors['gender'];
        }
        break;
    }

    // If validation fails, don't save
    if (!isValid) {
      console.error('Validation failed for field:', field, this.validationErrors[field]);
      return;
    }

    try {
      const updateData: Partial<User> = {
        [field]: this.tempUserData[field],
        updated_at: new Date().toISOString(),
      };

      // For phone, save clean digits as string (preserve leading zeros)
      if (field === 'phone' && this.tempUserData.phone) {
        const phoneStr = this.tempUserData.phone.toString();
        const cleanPhone = phoneStr.replace(/\D/g, '');
        updateData.phone = cleanPhone; // Keep as string to preserve leading zero
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

    // Convert to string first to handle both string and number inputs
    const phoneStr = phone.toString();
    const digits = phoneStr.replace(/\D/g, '');

    // Format Vietnamese phone number: 0xxx xxx xxx
    if (digits.length === 10 && digits.startsWith('0')) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }

    // If 11 digits (with country code): +84 xxx xxx xxx
    if (digits.length === 11 && digits.startsWith('84')) {
      return `+84 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }

    return phoneStr;
  }
}
