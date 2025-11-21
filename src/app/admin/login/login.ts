import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginAdmin {
  loginData = {
    email: '',
    password: '',
  };

  rememberMe = false;

  constructor(private router: Router) {}

  onSubmit() {
    if (this.loginData.email && this.loginData.password) {
      alert('Đăng nhập thành công!');
      this.router.navigate(['/admin/dashboard']);
    } else {
      alert('Vui lòng nhập đầy đủ thông tin!');
    }
  }
}
