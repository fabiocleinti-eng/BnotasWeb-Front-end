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

  onLoginSubmit(): void {
    if (this.loginForm.invalid) return;
    this.errorMessage = null;
    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err: any) => { // <--- CORREÇÃO AQUI
        this.errorMessage = err.error?.error?.message || 'Erro ao tentar logar.';
      }
    });
  }

  onRegisterSubmit(): void {
    if (this.registerForm.invalid) return;
    this.errorMessage = null;
    const credentials = this.registerForm.value;

    this.authService.register(credentials).subscribe({
      next: () => {
        alert('Cadastro realizado com sucesso! Faça o login.');
        this.isLoginMode = true;
        this.registerForm.reset();
      },
      error: (err: any) => { // <--- CORREÇÃO AQUI
        this.errorMessage = err.error?.error?.message || 'Erro ao tentar cadastrar.';
      }
    });
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = null;
  }
}