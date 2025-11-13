import { Component, OnInit } from '@angular/core';
import { supabase } from '../../../env/enviroment';
import { IgxGridComponent, IgxColumnComponent, IgxGridModule } from "igniteui-angular";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manage-user',
  imports: [IgxGridComponent, IgxColumnComponent, IgxGridModule, CommonModule],
  templateUrl: './manage-user.html',
  styleUrl: './manage-user.css',
})
export class ManageUser implements OnInit {

  userData: any[] = [];

  constructor() {}

  ngOnInit(): void {
    this.loadUsers();
  }

  private async loadUsers() {
    try {
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*');
      if (error) throw error;
      this.userData = usersData || [];
      console.log('Users loaded:', this.userData);
    } catch (error) {
      console.error('Error loading users:', error);
      this.userData = [];
    }
  }
}
