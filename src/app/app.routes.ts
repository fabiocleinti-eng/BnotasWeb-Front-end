import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
// CORREÇÃO: Importar o nome correto da classe
import { LayoutComponent } from './core/layout/layout/layout';

export const routes: Routes = [
  // ROTA PÚBLICA: Login
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component')
      .then(m => m.LoginComponent)
  },
  // ROTA PÚBLICA: Redefinir Senha
  {
    path: 'reset-password',
    loadComponent: () => import('./features/reset-password/reset-password.component')
      .then(m => m.ResetPasswordComponent)
  },
  
  // ROTAS PROTEGIDAS (Exigem Login)
  {
    path: '',
    component: LayoutComponent, // <--- CORREÇÃO AQUI (Usar LayoutComponent)
    canActivate: [authGuard], 
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      }
    ]
  },
  
  // ROTA DE ERRO
  {
    path: '**',
    redirectTo: 'login'
  }
];