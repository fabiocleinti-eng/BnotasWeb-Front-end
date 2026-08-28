import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

// Página aberta pelo link do e-mail de confirmação (/verificar-email?token=...)
@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="verif-page">
      <div class="verif-card">
        <div class="verif-icone">{{ estado === 'ok' ? '✅' : estado === 'erro' ? '⚠️' : '⏳' }}</div>

        <h1 *ngIf="estado === 'carregando'">Confirmando seu e-mail...</h1>
        <h1 *ngIf="estado === 'ok'">E-mail confirmado!</h1>
        <h1 *ngIf="estado === 'erro'">Não foi possível confirmar</h1>

        <p *ngIf="estado === 'ok'">
          Tudo certo, <b>{{ email }}</b>. Agora você recebe os lembretes das suas notas por e-mail.
        </p>
        <p *ngIf="estado === 'erro'">{{ mensagem }}</p>
        <p *ngIf="estado === 'erro'" class="verif-dica">
          Entre na sua conta e peça um novo e-mail de confirmação.
        </p>

        <a routerLink="/login" class="verif-botao" *ngIf="estado !== 'carregando'">Ir para o login</a>
      </div>
    </div>
  `,
  styles: [`
    .verif-page { min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #f0f2f5; padding: 20px; font-family: 'Segoe UI', sans-serif; }
    .verif-card { background: #fff; border-radius: 16px; padding: 40px; max-width: 420px; width: 100%;
      text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
    .verif-icone { font-size: 3.5rem; margin-bottom: 8px; }
    h1 { font-size: 1.4rem; color: #333; margin: 0 0 12px; }
    p { color: #666; line-height: 1.6; margin: 0 0 8px; }
    .verif-dica { font-size: 0.85rem; color: #999; }
    .verif-botao { display: inline-block; margin-top: 20px; background: #6200ea; color: #fff;
      padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; }
    .verif-botao:hover { background: #5000c4; }
  `]
})
export class VerificarEmailComponent implements OnInit {
  estado: 'carregando' | 'ok' | 'erro' = 'carregando';
  email = '';
  mensagem = '';

  constructor(private route: ActivatedRoute, private auth: AuthService) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.estado = 'erro';
      this.mensagem = 'O link está incompleto — use o botão do e-mail que enviamos.';
      return;
    }

    this.auth.verificarEmail(token).subscribe({
      next: (r) => { this.estado = 'ok'; this.email = r.email; },
      error: (err) => {
        this.estado = 'erro';
        this.mensagem = err?.error?.error?.message || 'Link inválido ou expirado.';
      }
    });
  }
}
