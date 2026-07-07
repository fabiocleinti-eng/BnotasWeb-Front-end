import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NoteService } from '../../core/services/note.service';

// Visualização pública de nota compartilhada (somente leitura).
// O conteúdo já vem SANITIZADO do servidor (anti-XSS).
@Component({
  selector: 'app-public-note',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="public-page">
      <div class="public-card" *ngIf="note" [style.border-top]="'8px solid ' + (note.cor || '#6200ea')">
        <h1>{{ note.titulo || 'Sem título' }}</h1>
        <div class="public-meta">Nota compartilhada via BnotasWeb · {{ note.dataModificacao | date:'dd/MM/yyyy' }}</div>
        <div class="public-content" [innerHTML]="note.conteudo"></div>
      </div>
      <div class="public-card erro" *ngIf="erro">
        <h1>😕 Nota não encontrada</h1>
        <p>O link pode ter sido revogado pelo dono da nota.</p>
      </div>
      <a routerLink="/login" class="public-cta">📝 Crie suas notas grátis no BnotasWeb</a>
    </div>
  `,
  styles: [`
    .public-page { min-height: 100vh; background: #f0f2f5; padding: 40px 16px; font-family: 'Segoe UI', sans-serif; }
    .public-card { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px 36px; box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
    h1 { margin: 0 0 4px; color: #222; font-size: 1.6rem; }
    .public-meta { font-size: 0.8rem; color: #999; margin-bottom: 20px; }
    .public-content { color: #333; line-height: 1.7; font-size: 1rem; word-wrap: break-word; }
    .erro { text-align: center; color: #666; }
    .public-cta { display: block; text-align: center; margin-top: 24px; color: #6200ea; font-weight: 700; text-decoration: none; }
    .public-cta:hover { text-decoration: underline; }
  `]
})
export class PublicNoteComponent implements OnInit {
  note: any = null;
  erro = false;

  constructor(private route: ActivatedRoute, private noteService: NoteService) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') || '';
    this.noteService.getPublicNote(token).subscribe({
      next: n => this.note = n,
      error: () => this.erro = true
    });
  }
}
