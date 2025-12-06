import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { Layout } from './core/layout/layout/layout';

export const routes: Routes = [
  // ROTA PÚBLICA: Login
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component')
      .then(m => m.LoginComponent)
  },
  // ROTA PÚBLICA: Redefinir Senha (Esta deve estar aqui, fora do AuthGuard!)
  {
    path: 'reset-password',
    loadComponent: () => import('./features/reset-password/reset-password.component')
      .then(m => m.ResetPasswordComponent)
  },
  
  // ROTAS PROTEGIDAS (Exigem Login)
  {
    path: '',
    component: Layout,
    canActivate: [authGuard], // O "porteiro" fica aqui
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
  
  // ROTA DE ERRO (Redireciona para login se não achar nada)
  {
    path: '**',
    redirectTo: 'login'
  }
];