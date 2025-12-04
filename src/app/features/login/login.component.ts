import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  errorMessage: string | null = null;
  
  isLoginMode = true;
  isRecoverMode = false; // --- NOVO ESTADO

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(1)]]
    });

    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // --- ALTERNAR PARA MODO RECUPERAÇÃO ---
  toggleRecover(): void {
    this.isRecoverMode = !this.isRecoverMode;
    this.errorMessage = null;
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) return;
    this.errorMessage = null;
    
    this.authService.login(this.loginForm.value).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err: any) => this.errorMessage = err.error?.error?.message || 'Erro ao logar.'
    });
  }

  onRegisterSubmit(): void {
    if (this.registerForm.invalid) return;
    this.errorMessage = null;

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        alert('Cadastro realizado! Faça login.');
        this.isLoginMode = true;
        this.registerForm.reset();
      },
      error: (err: any) => this.errorMessage = err.error?.error?.message || 'Erro ao cadastrar.'
    });
  }

  // --- ENVIAR EMAIL DE RECUPERAÇÃO ---
  onRecoverSubmit(): void {
    const email = this.loginForm.get('email')?.value;
    if (!email) {
      this.errorMessage = 'Por favor, digite seu email no campo acima.';
      return;
    }

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        alert('Link de recuperação enviado para o seu e-mail!');
        this.toggleRecover(); // Volta para o login
      },
      error: (err: any) => this.errorMessage = err.error?.error?.message || 'Erro ao enviar e-mail.'
    });
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = null;
    this.isRecoverMode = false;
  }
}