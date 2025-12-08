import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
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
  isRecoverMode = false;

  passwordCriteria = {
    minLength: false,
    hasUpperCase: false,
    hasSpecialChar: false
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(1)]],
      rememberMe: [false]
    });

    // FORMULÁRIO DE CADASTRO COM TELEFONE
    this.registerForm = this.fb.group({
      nome: ['', Validators.required],
      sobrenome: ['', Validators.required],
      telefone: [''], // <--- NOVO (Opcional, pode deixar vazio se quiser)
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(8)]],
      confirmSenha: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.registerForm.get('senha')?.valueChanges.subscribe(value => {
      this.updatePasswordStrength(value);
    });

    const savedEmail = localStorage.getItem('bnotas_saved_email');
    if (savedEmail) {
      this.loginForm.patchValue({ email: savedEmail, rememberMe: true });
    }
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const senha = control.get('senha')?.value;
    const confirmSenha = control.get('confirmSenha')?.value;
    return senha === confirmSenha ? null : { mismatch: true };
  }

  updatePasswordStrength(password: string): void {
    this.passwordCriteria = {
      minLength: password?.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  }

  get isPasswordStrong(): boolean {
    return this.passwordCriteria.minLength && 
           this.passwordCriteria.hasUpperCase && 
           this.passwordCriteria.hasSpecialChar;
  }

  toggleRecover(): void {
    this.isRecoverMode = !this.isRecoverMode;
    this.errorMessage = null;
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) return;
    const { email, senha, rememberMe } = this.loginForm.value;
    if (rememberMe) localStorage.setItem('bnotas_saved_email', email);
    else localStorage.removeItem('bnotas_saved_email');
    
    this.authService.login({ email, senha }).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err: any) => this.errorMessage = err.error?.error?.message || 'Erro ao logar.'
    });
  }

  onRegisterSubmit(): void {
    if (this.registerForm.invalid || !this.isPasswordStrong) return;

    // Remove a confirmação de senha antes de enviar para o backend
    const { confirmSenha, ...userData } = this.registerForm.value;

    this.authService.register(userData).subscribe({
      next: () => {
        alert('Cadastro realizado! Faça login.');
        this.isLoginMode = true;
        this.registerForm.reset();
      },
      error: (err: any) => this.errorMessage = err.error?.error?.message || 'Erro ao cadastrar.'
    });
  }

  onRecoverSubmit(): void {
    const email = this.loginForm.get('email')?.value;
    if (!email) { this.errorMessage = 'Digite seu email.'; return; }
    this.authService.forgotPassword(email).subscribe({
      next: () => { alert('Link enviado!'); this.toggleRecover(); },
      error: (err: any) => this.errorMessage = err.error?.error?.message || 'Erro ao enviar.'
    });
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = null;
    this.isRecoverMode = false;
  }
}