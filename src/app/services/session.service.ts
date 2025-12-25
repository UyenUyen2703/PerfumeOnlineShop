import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { supabase } from '../../env/enviroment';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly SESSION_LIMIT = 30 * 60 * 1000;
  private KEY = 'force_logout_at';

  constructor(private router: Router) {}
  startSessionTimer() {
    const expireAt = Date.now() + this.SESSION_LIMIT;
    localStorage.setItem(this.KEY, expireAt.toString());
  }

  async checkSession() {
    const expireAt = localStorage.getItem(this.KEY);
    if (expireAt && Date.now() > +expireAt) {
      await supabase.auth.signOut();
      localStorage.removeItem(this.KEY);
      this.router.navigate(['/login']);
    }
  }

  clearSession() {
    localStorage.removeItem(this.KEY);
  }
}
