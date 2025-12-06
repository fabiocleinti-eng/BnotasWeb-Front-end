import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="reset-page">
      <div class="reset-container">
        <h2>Redefinir Senha</h2>
        <p>Crie sua nova senha de acesso.</p>
        
        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
          <input type="password" formControlName="password" placeholder="Nova Senha" class="input-pass">
          
          <div *ngIf="message" class="msg" [class.error]="isError">{{ message }}</div>
          
          <button type="submit" [disabled]="resetForm.invalid">SALVAR NOVA SENHA</button>
        </form>

        <a routerLink="/login" class="back">Voltar ao Login</a>
      </div>
    </div>
  `,
  styles: [`
    .reset-page { display: flex; height: 100vh; justify-content: center; align-items: center; background: #f0f2f5; font-family: sans-serif; }
    .reset-container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; width: 300px; }
    h2 { margin-top: 0; color: #333; }
    p { color: #666; font-size: 0.9rem; margin-bottom: 20px; }
    .input-pass { width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #ddd; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
    button:disabled { background: #ccc; }
    .msg { margin: 10px 0; font-size: 0.85rem; color: green; }
    .msg.error { color: red; }
    .back { display: block; margin-top: 20px; font-size: 0.8rem; color: #007bff; text-decoration: none; }
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
    // Captura o token da URL (que veio do email)
    this.token = this.route.snapshot.queryParams['token'];
    if (!this.token) {
      this.message = 'Token inválido ou não encontrado.';
      this.isError = true;
      this.resetForm.disable();
    }
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token) return;

    const newPassword = this.resetForm.get('password')?.value;

    // Chama o backend para trocar a senha
    this.http.post('http://localhost:3000/api/reset-password', { token: this.token, newPassword })
      .subscribe({
        next: () => {
          this.message = 'Senha alterada com sucesso! Redirecionando...';
          this.isError = false;
          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: (err) => {
          this.message = 'Erro ao alterar senha. Token pode ter expirado.';
          this.isError = true;
        }
      });
  }
}