import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { supabase } from '../../env/enviroment';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    try {
      const user = await this.authService.getUser();

      if (user) {
        return true;
      } else {
        this.router.navigate(['/login']);
        return false;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      this.router.navigate(['/login']);
      return false;
    }
  }
}

export const canActivateSeller: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    console.log('Seller guard: Kiểm tra quyền truy cập...');

    const authUser = await authService.getUser();
    console.log('Seller guard: Auth user:', authUser?.id);

    if (!authUser) {
      console.log('Seller guard: Không có user, chuyển hướng về login');
      router.navigate(['/login-seller']);
      return false;
    }

    // Get user data from database to check role - thử cả user_id và email
    let { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    // Nếu không tìm thấy bằng user_id, thử tìm bằng email
    if (error && error.code === 'PGRST116') {
      console.log('Guard: Không tìm thấy bằng user_id, thử tìm bằng email...');
      const result = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single();

      userData = result.data;
      error = result.error;
    }

    console.log('Seller guard: User data từ DB:', { userData, error });

    if (error) {
      console.error('Seller guard: Error fetching user data:', error);
      if (error.code === 'PGRST116') {
        console.log('Seller guard: User không tồn tại trong DB');
      }
      router.navigate(['/login-seller']);
      return false;
    }

    if (userData && userData.role === 'seller') {
      return true;
    }

    console.log('Seller guard: Access denied - role:', userData?.role);
    router.navigate(['/login-seller']);
    return false;
  } catch (error) {
    console.error('Error checking seller authentication:', error);
    router.navigate(['/login-seller']);
    return false;
  }
};

export const canActivateAdmin: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const authUser = await authService.getUser();
    if (!authUser) {
      router.navigate(['/login-admin']);
      return false;
    }

    // Get user data from database to check role
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', authUser.id)
      .single();

    if (error) {
      console.error('Error fetching user data:', error);
      router.navigate(['/login-admin']);
      return false;
    }

    if (userData && userData.role === 'admin') {
      return true;
    }

    router.navigate(['/login-admin']);
    console.warn('Access denied - Admins only');
    return false;
  } catch (error) {
    console.error('Error checking admin authentication:', error);
    router.navigate(['/login-admin']);
    return false;
  }
};
