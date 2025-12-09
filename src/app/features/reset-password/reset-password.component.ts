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
          
          <input 
            type="password" 
            formControlName="password" 
            placeholder="Nova Senha" 
            class="input-pass"
            [class.invalid]="resetForm.get('password')?.dirty && !isPasswordStrong">
          
          <div class="strength-section" *ngIf="resetForm.get('password')?.dirty">
            <div class="strength-label" [style.color]="strengthColor">
              Força da senha: <strong>{{ strengthLabel }}</strong>
            </div>
            <div class="strength-track">
              <div class="strength-fill" [style.width]="strengthPercent + '%'" [style.backgroundColor]="strengthColor"></div>
            </div>
          </div>

          <div class="password-requirements" *ngIf="resetForm.get('password')?.dirty">
            <ul>
              <li [class.valid]="passwordCriteria.minLength">Min. 8 caracteres</li>
              <li [class.valid]="passwordCriteria.hasUpperCase">1 Letra Maiúscula</li>
              <li [class.valid]="passwordCriteria.hasSpecialChar">1 Caracter Especial (@#$%)</li>
            </ul>
          </div>

          <div *ngIf="message" class="msg" [class.error]="isError">{{ message }}</div>
          
          <button type="submit" [disabled]="resetForm.invalid || !isPasswordStrong">SALVAR NOVA SENHA</button>
        </form>

        <a routerLink="/login" class="back">Voltar ao Login</a>
      </div>
    </div>
  `,
  styles: [`
    .reset-page { display: flex; height: 100vh; justify-content: center; align-items: center; background: #f0f2f5; font-family: sans-serif; }
    .reset-container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; width: 320px; }
    h2 { margin-top: 0; color: #333; }
    p { color: #666; font-size: 0.9rem; margin-bottom: 20px; }
    
    .input-pass { 
      width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 5px; 
      border: 1px solid #ddd; box-sizing: border-box; transition: border 0.3s;
    }
    .input-pass.invalid { border-color: #ff5252; }

    /* --- FORÇA DA SENHA (NOVO) --- */
    .strength-section { margin-bottom: 10px; text-align: left; }
    .strength-label { font-size: 0.85rem; margin-bottom: 4px; transition: color 0.3s; }
    .strength-track { height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
    .strength-fill { height: 100%; transition: all 0.3s ease; }

    /* --- REQUISITOS --- */
    .password-requirements {
      background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px;
      margin-bottom: 15px; text-align: left; font-size: 0.8rem;
    }
    .password-requirements ul { list-style: none; padding: 0; margin: 0; }
    .password-requirements li { padding-left: 20px; position: relative; color: #ff5252; margin-bottom: 2px; transition: color 0.3s; }
    .password-requirements li::before { content: '✕'; position: absolute; left: 0; font-weight: bold; }
    .password-requirements li.valid { color: #28a745; }
    .password-requirements li.valid::before { content: '✓'; }

    button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 10px; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .msg { margin: 15px 0; font-size: 0.85rem; color: green; background: #e8f5e9; padding: 8px; border-radius: 4px; }
    .msg.error { color: #d32f2f; background: #ffebee; }
    .back { display: block; margin-top: 20px; font-size: 0.8rem; color: #007bff; text-decoration: none; }
    .back:hover { text-decoration: underline; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  token: string = '';
  message: string = '';
  isError: boolean = false;

  passwordCriteria = {
    minLength: false,
    hasUpperCase: false,
    hasSpecialChar: false
  };

  // Propriedades visuais da força
  strengthLabel: string = 'Fraca';
  strengthColor: string = '#ff5252';
  strengthPercent: number = 0;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required]] 
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'];
    
    if (!this.token) {
      this.message = 'Token inválido ou não encontrado.';
      this.isError = true;
      this.resetForm.disable();
    }

    this.resetForm.get('password')?.valueChanges.subscribe(value => {
      this.updatePasswordStrength(value || '');
    });
  }

  updatePasswordStrength(password: string): void {
    // 1. Atualiza os critérios individuais
    this.passwordCriteria = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    // 2. Calcula a força (0 a 3)
    const criteriaMet = [
      this.passwordCriteria.minLength,
      this.passwordCriteria.hasUpperCase,
      this.passwordCriteria.hasSpecialChar
    ].filter(Boolean).length; // Conta quantos são true

    // 3. Define texto e cor com base na quantidade de critérios
    if (password.length === 0) {
      this.strengthLabel = '';
      this.strengthPercent = 0;
    } else if (criteriaMet <= 1) {
      this.strengthLabel = 'Fraca';
      this.strengthColor = '#ff5252'; // Vermelho
      this.strengthPercent = 33;
    } else if (criteriaMet === 2) {
      this.strengthLabel = 'Média';
      this.strengthColor = '#ffc107'; // Laranja
      this.strengthPercent = 66;
    } else {
      this.strengthLabel = 'Forte';
      this.strengthColor = '#28a745'; // Verde
      this.strengthPercent = 100;
    }
  }

  get isPasswordStrong(): boolean {
    return this.passwordCriteria.minLength && 
           this.passwordCriteria.hasUpperCase && 
           this.passwordCriteria.hasSpecialChar;
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token || !this.isPasswordStrong) return;

    const newPassword = this.resetForm.get('password')?.value;

    this.http.post('http://localhost:3000/api/reset-password', { token: this.token, newPassword })
      .subscribe({
        next: () => {
          this.message = 'Senha alterada com sucesso! Redirecionando...';
          this.isError = false;
          this.resetForm.disable();
          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: (err) => {
          this.message = err.error?.error?.message || 'Erro ao alterar senha.';
          this.isError = true;
        }
      });
  }
}