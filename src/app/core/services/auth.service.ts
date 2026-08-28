import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { API_URL } from '../api.config';

interface LoginResponse {
  token: string;
  user: { id: number; email: string; nome?: string; sobrenome?: string; telefone?: string; isAdmin?: boolean };
}

export interface RegisterData {
  nome: string;
  sobrenome: string;
  telefone?: string;
  email: string;
  senha: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'bnotas_token';
  private readonly USER_KEY = 'bnotas_user'; // Chave para salvar o usuário

  constructor(private http: HttpClient, private router: Router) { }

  // Resposta pode ser o login completo OU um pedido de 2FA (requires2FA + tempToken)
  login(credentials: { email: string, senha: string }): Observable<LoginResponse & { requires2FA?: boolean; tempToken?: string }> {
    return this.http.post<LoginResponse & { requires2FA?: boolean; tempToken?: string }>(`${API_URL}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          this.saveToken(response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        }
      })
    );
  }

  // === 2FA ===
  login2FA(tempToken: string, codigo: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/login/2fa`, { tempToken, codigo }).pipe(
      tap(response => {
        this.saveToken(response.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
      })
    );
  }

  get2FAStatus(): Observable<{ enabled: boolean }> {
    return this.http.get<{ enabled: boolean }>(`${API_URL}/usuarios/2fa/status`);
  }

  setup2FA(): Observable<{ qrCode: string; secret: string }> {
    return this.http.post<{ qrCode: string; secret: string }>(`${API_URL}/usuarios/2fa/setup`, {});
  }

  enable2FA(codigo: string): Observable<{ enabled: boolean; backupCodes?: string[] }> {
    return this.http.post<{ enabled: boolean; backupCodes?: string[] }>(`${API_URL}/usuarios/2fa/enable`, { codigo });
  }

  // === VERIFICAÇÃO DE E-MAIL ===
  verificarEmail(token: string): Observable<{ verificado: boolean; email: string }> {
    return this.http.post<{ verificado: boolean; email: string }>(`${API_URL}/verificar-email`, { token });
  }

  reenviarVerificacao(): Observable<{ enviado: boolean }> {
    return this.http.post<{ enviado: boolean }>(`${API_URL}/usuarios/reenviar-verificacao`, {});
  }

  // === PERFIL (no servidor) ===
  getPerfil(): Observable<{ nome: string; sobrenome: string; email: string; telefone?: string; bio?: string; avatarUrl?: string; isAdmin?: boolean; emailVerificado?: boolean }> {
    return this.http.get<any>(`${API_URL}/usuarios/perfil`);
  }

  updatePerfil(data: { nome?: string; bio?: string | null; avatarUrl?: string | null }): Observable<any> {
    return this.http.put(`${API_URL}/usuarios/perfil`, data);
  }

  disable2FA(senha: string, codigo: string): Observable<{ enabled: boolean }> {
    return this.http.post<{ enabled: boolean }>(`${API_URL}/usuarios/2fa/disable`, { senha, codigo });
  }

  register(data: RegisterData): Observable<any> {
    return this.http.post(`${API_URL}/usuarios`, data);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${API_URL}/forgot-password`, { email });
  }

  changePassword(senhaAtual: string, novaSenha: string): Observable<any> {
    return this.http.put(`${API_URL}/usuarios/senha`, { senhaAtual, novaSenha });
  }

  // Exclusão de conta (LGPD) — exige a senha para confirmar
  deleteAccount(senha: string): Observable<any> {
    return this.http.delete(`${API_URL}/usuarios/me`, { body: { senha } });
  }

  private saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // NOVO: Recupera o usuário salvo
  getUser(): { id: number, email: string, isAdmin?: boolean } | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY); // Limpa o usuário ao sair
    this.router.navigate(['/login']);
  }
}
