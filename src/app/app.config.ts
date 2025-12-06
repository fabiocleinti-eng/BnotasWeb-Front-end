import { ApplicationConfig, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { authInterceptor } from './core/interceptors/auth.interceptor';

// --- CONFIGURAÇÃO DE IDIOMA PT-BR ---
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
registerLocaleData(localePt);
// ------------------------------------

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(ReactiveFormsModule),
    { provide: LOCALE_ID, useValue: 'pt-BR' } // Define Português como padrão
  ]
};