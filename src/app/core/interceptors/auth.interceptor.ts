import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      // Token inválido/expirado: encerra a sessão e volta ao login,
      // exceto nas rotas públicas de autenticação (401 ali é senha errada)
      const isAuthRoute = /\/(login|usuarios|forgot-password|reset-password)$/.test(req.url);
      if (err.status === 401 && token && !isAuthRoute) {
        authService.logout();
      }
      return throwError(() => err);
    })
  );
};
