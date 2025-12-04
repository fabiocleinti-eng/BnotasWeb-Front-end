import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

const API_URL = 'http://localhost:3000/api';

interface LoginResponse {
  token: string;
  user: { id: number; email: string };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'bnotas_token';

  constructor(private http: HttpClient, private router: Router) { }

  login(credentials: { email: string, senha: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/login`, credentials).pipe(
      tap(response => {
        this.saveToken(response.token);
      })
    );
  }

  register(credentials: { email: string, senha: string }): Observable<any> {
    return this.http.post(`${API_URL}/usuarios`, credentials);
  }

  // --- NOVO MÉTODO ---
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${API_URL}/forgot-password`, { email });
  }

  private saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }
}