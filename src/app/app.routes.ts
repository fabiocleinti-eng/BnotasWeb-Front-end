import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { LayoutComponent } from './core/layout/layout/layout';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component')
      .then(m => m.LoginComponent)
  },
  // --- NOVA ROTA AQUI ---
  {
    path: 'reset-password',
    loadComponent: () => import('./features/reset-password/reset-password.component')
      .then(m => m.ResetPasswordComponent)
  },
  // ---------------------
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];