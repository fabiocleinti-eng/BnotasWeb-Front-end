import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AlertManagerService } from '../../services/alert-manager.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class HeaderComponent implements OnInit {
  
  temUrgencia: boolean = false;

  constructor(
    private alertService: AlertManagerService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Escuta o serviço para saber se deve ligar o sino
    this.alertService.temUrgencia$.subscribe(status => {
      this.temUrgencia = status;
    });
  }

  // Ao clicar no sino, força a abertura do modal no Dashboard
  abrirModalManual(): void {
    document.dispatchEvent(new Event('bnotas:abrir-alerta'));
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}