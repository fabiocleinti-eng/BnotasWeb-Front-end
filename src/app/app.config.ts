import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // Adicionado withInterceptors
import { ReactiveFormsModule } from '@angular/forms';
import { authInterceptor } from './core/interceptors/auth.interceptor'; // Importa nosso interceptor

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // AQUI ESTÁ A MUDANÇA PRINCIPAL:
    provideHttpClient(withInterceptors([authInterceptor])), 
    importProvidersFrom(ReactiveFormsModule)
  ]
};