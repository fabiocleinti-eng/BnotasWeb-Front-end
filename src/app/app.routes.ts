import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard'; // 1. Importa o Guarda
import { Layout } from './core/layout/layout/layout'; // 2. Importa o Layout

export const routes: Routes = [
  {
    path: 'login',
    // 3. Carrega o LoginComponent (que vamos consertar a seguir)
    loadComponent: () => import('./features/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: '', // Rota principal (ex: http://localhost:4200/)
    component: Layout, // 4. Carrega a "casca"
    canActivate: [authGuard], // 5. PROTEGE esta rota e suas filhas
    children: [
      {
        path: '', // Rota filha padrão
        redirectTo: 'dashboard', // Redireciona para o dashboard
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        // 6. Carrega o DashboardComponent (que vamos consertar a seguir)
        loadComponent: () => import('./features/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      }
      // Aqui poderíamos adicionar a rota de "Editar Anotação" no futuro
    ]
  },
  // Rota "catch-all" para redirecionar para o login se a URL não existir
  {
    path: '**',
    redirectTo: 'login'
  }
];