import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginSeller {
  loginData = {
    email: '',
    password: ''
  };

  rememberMe = false;

  constructor(private router: Router) {}

  onSubmit() {
    if (this.loginData.email && this.loginData.password) {
      alert('Đăng nhập thành công!');
      this.router.navigate(['/seller/seller-dashboard']);
    } else {
      alert('Vui lòng nhập đầy đủ thông tin!');
    }
  }
}
