import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; // Usamos direto aqui para simplificar
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  // HTML DIRETO AQUI PARA FACILITAR (mas pode separar se quiser)
  template: `
    <div class="reset-page">
      <div class="reset-container">
        <h2>Nova Senha</h2>
        <p class="subtitle">Digite sua nova senha abaixo.</p>
        
        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
          <div class="input-group">
            <input type="password" formControlName="password" placeholder="Nova Senha" class="rounded-input">
          </div>
          
          <button type="submit" class="btn-submit" [disabled]="resetForm.invalid">REDEFINIR</button>
        </form>

        <div *ngIf="message" class="message" [class.error]="isError">{{ message }}</div>
        
        <a routerLink="/login" class="back-link">Voltar ao Login</a>
      </div>
    </div>
  `,
  // CSS DIRETO AQUI TAMBÉM
  styles: [`
    .reset-page { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; font-family: 'Segoe UI', sans-serif; }
    .reset-container { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 100%; max-width: 350px; text-align: center; }
    h2 { color: #333; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 20px; font-size: 0.9rem; }
    .input-group { margin-bottom: 20px; }
    .rounded-input { width: 100%; padding: 12px 20px; border-radius: 25px; border: 1px solid #ddd; outline: none; box-sizing: border-box; font-size: 1rem; text-align: center; }
    .rounded-input:focus { border-color: #007bff; }
    .btn-submit { width: 100%; padding: 12px; border-radius: 25px; border: none; background-color: #00d2a0; color: white; font-weight: bold; cursor: pointer; transition: transform 0.2s; }
    .btn-submit:hover { transform: scale(1.05); }
    .btn-submit:disabled { background-color: #ccc; cursor: not-allowed; }
    .message { margin-top: 15px; padding: 10px; border-radius: 5px; background: #d4edda; color: #155724; font-size: 0.9rem; }
    .message.error { background: #f8d7da; color: #721c24; }
    .back-link { display: block; margin-top: 20px; color: #007bff; text-decoration: none; font-size: 0.9rem; }
    .back-link:hover { text-decoration: underline; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  token: string = '';
  message: string = '';
  isError: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Pega o token da URL (?token=...)
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.message = 'Link inválido ou expirado.';
        this.isError = true;
        this.resetForm.disable();
      }
    });
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token) return;

    const newPassword = this.resetForm.get('password')?.value;

    // Chama o backend para trocar a senha
    // NOTA: Precisamos criar essa rota no backend no próximo passo
    this.http.post('http://localhost:3000/api/reset-password', { token: this.token, newPassword })
      .subscribe({
        next: () => {
          this.message = 'Senha redefinida com sucesso! Redirecionando...';
          this.isError = false;
          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: (err) => {
          this.message = err.error?.error?.message || 'Erro ao redefinir senha.';
          this.isError = true;
        }
      });
  }
}