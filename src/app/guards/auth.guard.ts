import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { supabase } from '../../env/enviroment';
import { AuthService } from '../services/auth.service';

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

export const canActivateSeller: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const cachedUser = localStorage.getItem('user');
    let authUser = await authService.getUser();

    if (!authUser && cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        authUser = parsedUser;
      } catch (e) {
        localStorage.removeItem('user');
      }
    }

    if (!authUser) {
      console.log('Seller guard: Không có user, chuyển hướng về login');
      router.navigate(['/login-seller']);
      return false;
    }

    let { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (error && error.code === 'PGRST116') {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single();

      userData = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Seller guard: Error fetching user data:', error);
      if (error.code === 'PGRST116') {
      }
      router.navigate(['/login-seller']);
      return false;
    }

    if (userData && userData.role === 'seller') {
      return true;
    }

    router.navigate(['/login-seller']);
    return false;
  } catch (error) {
    console.error('Error checking seller authentication:', error);
    router.navigate(['/login-seller']);
    return false;
  }
};

export const canActivateAdmin: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const authUser = await authService.getUser();
    if (!authUser) {
      router.navigate(['/login-admin']);
      return false;
    }
    let { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (error && error.code === 'PGRST116') {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single();

      userData = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Admin guard: Error fetching user data:', error);
      if (error.code === 'PGRST116') {
        console.log('Admin guard: User không tồn tại trong DB');
      }
      router.navigate(['/login-admin']);
      return false;
    }

    if (userData && userData.role === 'admin') {
      console.log('Admin guard: Access granted - User is admin');
      return true;
    }
    router.navigate(['/login-admin']);
    return false;
  } catch (error) {
    console.error('Error checking admin authentication:', error);
    router.navigate(['/login-admin']);
    return false;
  }
};
