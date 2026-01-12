import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
// AQUI ESTAVA O ERRO: O arquivo é '../header/header', mas a classe é 'HeaderComponent'
import { HeaderComponent } from '../header/header'; 

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent], 
  template: `
    <app-header></app-header>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    main { 
      padding: 0;
      margin: 0;
      height: 100%;
      overflow: hidden;
    }
  `]
})
export class LayoutComponent {}