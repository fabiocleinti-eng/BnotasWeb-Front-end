import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true, // <--- ISSO É CRUCIAL
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header {
  constructor(private authService: AuthService) { }

  logout() {
    this.authService.logout();
  }
}