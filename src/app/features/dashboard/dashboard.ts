import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../core/services/note.service';
import { AuthService } from '../../core/services/auth.service';
import { Note } from '../../core/models/note.model';
import { interval, Subscription } from 'rxjs';

interface NoteGroup {
  color: string;
  notes: Note[];
  isOpen: boolean;
  favCount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  notes: Note[] = [];
  noteGroups: NoteGroup[] = [];
  openNotes: Note[] = [];
  
  // Listas Especiais
  urgentNotes: Note[] = [];
  overdueNotes: Note[] = [];
  
  searchTerm: string = '';
  showToast: boolean = false;
  toastMessage: string = '';

  today: Date = new Date();
  userName: string = 'Usuário';
  scratchpadContent: string = '';

  // Controle do Modal de Alerta
  showUrgentModal: boolean = false;
  criticalNote: Note | null = null;
  private checkerSub: Subscription | undefined;

  // Lista de IDs silenciados na sessão (para o modal não reabrir enquanto edita)
  snoozedSessionIds: Set<number> = new Set();

  availableColors: string[] = [
    '#fff9c4', '#ffcdd2', '#f8bbd0', '#e1bee7',
    '#d1c4e9', '#c5cae9', '#bbdefb', '#b3e5fc',
    '#b2dfdb', '#c8e6c9', '#f0f4c3', '#ffe0b2', '#f5f5f5'
  ];

  constructor(
    private noteService: NoteService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadNotes();
    this.loadScratchpad();
    this.loadUserName();

    // Verifica tarefas críticas a cada 30 segundos
    this.checkerSub = interval(30000).subscribe(() => this.checkCriticalTasks());
  }

  ngOnDestroy(): void {
    if (this.checkerSub) this.checkerSub.unsubscribe();
  }

  loadUserName(): void {
    const user = this.authService.getUser();
    if (user && (user as any).nome) {
      this.userName = (user as any).nome;
    } else if (user && user.email) {
      const namePart = user.email.split('@')[0];
      this.userName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
  }

  get favCount(): number { return this.notes.filter(n => n.favorita).length; }
  get totalNotes(): number { return this.notes.length; }

  loadScratchpad(): void {
    const saved = localStorage.getItem('bnotas_scratchpad');
    if (saved) this.scratchpadContent = saved;
  }

  onScratchpadChange(): void {
    localStorage.setItem('bnotas_scratchpad', this.scratchpadContent);
  }

  displayToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 3000);
  }

  loadNotes(): void {
    this.noteService.getNotes().subscribe({
      next: (data) => {
        this.notes = data.map(n => ({
          ...n,
          cor: n.cor || '#fff9c4',
          isCollapsed: false,
          isDateEditing: false,
          qtdReagendamentos: n.qtdReagendamentos || 0
        }));
        this.organizeGroups();
      },
      error: (err) => console.error('Erro', err)
    });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value.toLowerCase();
    this.organizeGroups();
  }

  organizeGroups(): void {
    let filtered = this.notes;
    if (this.searchTerm) {
      filtered = filtered.filter(n =>
        n.titulo.toLowerCase().includes(this.searchTerm) ||
        n.conteudo.toLowerCase().includes(this.searchTerm)
      );
    }

    const agora = new Date();
    
    // 1. Identifica notas com lembrete
    const comLembrete = filtered.filter(n => n.dataLembrete);

    // 2. Separa Vencidos (Passado) e Urgentes (Futuro)
    this.overdueNotes = comLembrete.filter(n => new Date(n.dataLembrete!) < agora);
    this.urgentNotes = comLembrete.filter(n => new Date(n.dataLembrete!) >= agora);

    // 3. Cria um SET com os IDs que devem sair da lista geral para não duplicar
    const idsEspeciais = new Set([
      ...this.overdueNotes.map(n => n.id), 
      ...this.urgentNotes.map(n => n.id)
    ]);

    // 4. Filtra a lista principal removendo esses IDs
    const notasNormais = filtered.filter(n => !idsEspeciais.has(n.id));

    // 5. Agrupa apenas as notas normais
    const groupsMap: { [key: string]: Note[] } = {};
    notasNormais.forEach(note => {
      const color = note.cor || '#fff9c4';
      if (!groupsMap[color]) groupsMap[color] = [];
      groupsMap[color].push(note);
    });

    this.noteGroups = Object.keys(groupsMap).map(color => {
      const existingGroup = this.noteGroups.find(g => g.color === color);
      const notesInGroup = groupsMap[color];
      const favorites = notesInGroup.filter(n => n.favorita).length;

      return {
        color: color,
        notes: notesInGroup,
        isOpen: existingGroup ? existingGroup.isOpen : true,
        favCount: favorites
      };
    });
    this.noteGroups.sort((a, b) => a.color.localeCompare(b.color));
  }

  // --- LÓGICA DE ALERTAS ---

  checkCriticalTasks(): void {
    const agora = new Date().getTime();
    
    const critical = this.notes.find(n => {
      if (!n.dataLembrete || !n.id) return false;

      // Se já está aberto na tela, ignora (usuário já está vendo)
      const isAlreadyOpen = this.openNotes.some(open => open.id === n.id);
      if (isAlreadyOpen) return false;

      // Se o usuário clicou em "Reagendar" nesta sessão, ignora
      if (this.snoozedSessionIds.has(n.id)) return false;

      const dataLembrete = new Date(n.dataLembrete).getTime();
      const diffMinutos = (dataLembrete - agora) / 1000 / 60;
      
      // Regra crítica: Vencido OU falta menos de 10 minutos
      return diffMinutos < 10; 
    });

    // Abre o modal se tiver nota crítica e ele não estiver aberto
    if (critical && !this.showUrgentModal) {
      this.criticalNote = critical;
      this.showUrgentModal = true;
    }
  }

  markAsDone(): void {
    if (!this.criticalNote) return;
    if (confirm('Marcar como realizada? O lembrete será removido.')) {
      // Remove o lembrete e zera o contador de reagendamentos
      const updatedNote = { ...this.criticalNote, dataLembrete: null, qtdReagendamentos: 0 };
      this.noteService.updateNote(this.criticalNote.id!, updatedNote as any).subscribe(() => {
        this.displayToast('Tarefa concluída! 🎉');
        this.showUrgentModal = false;
        this.criticalNote = null;
        this.loadNotes();
      });
    }
  }

  snoozeTask(): void {
    if (!this.criticalNote || !this.criticalNote.id) return;
    
    // Adiciona na lista de "Silenciados" para o modal não voltar imediatamente
    this.snoozedSessionIds.add(this.criticalNote.id);

    this.showUrgentModal = false;
    this.openNote(this.criticalNote);
    
    // Abre o calendário automaticamente
    setTimeout(() => {
        this.toggleDateEdit(this.criticalNote!, true);
    }, 300);
  }

  deleteCriticalNote(): void {
    if (!this.criticalNote) return;
    if (confirm('Tem certeza que deseja EXCLUIR esta nota permanentemente?')) {
      this.noteService.deleteNote(this.criticalNote.id!).subscribe(() => {
        this.displayToast('Nota excluída.');
        this.showUrgentModal = false;
        this.criticalNote = null;
        this.loadNotes();
      });
    }
  }

  // --- LÓGICA DO DASHBOARD ---

  toggleGroup(group: NoteGroup): void { group.isOpen = !group.isOpen; }

  openNote(note: Note): void {
    const alreadyOpen = this.openNotes.find(n => n.id === note.id);
    if (alreadyOpen) return;
    if (this.openNotes.length >= 4) {
      this.displayToast('Máximo de 4 notas abertas!');
      return;
    }

    let formattedDate = '';
    if (note.dataLembrete) {
      const d = new Date(note.dataLembrete);
      // Ajuste para exibir no input local corretamente
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      formattedDate = d.toISOString().slice(0, 16);
    }

    this.openNotes.push({
      ...note,
      cor: note.cor || '#fff9c4',
      dataLembrete: formattedDate,
      isDateEditing: false
    });
  }

  createNote(): void {
    if (this.openNotes.length >= 4) {
      this.displayToast('Feche uma nota para criar uma nova.');
      return;
    }
    const newNote: Note = { titulo: '', conteudo: '', favorita: false, cor: '#fff9c4' };
    this.openNotes.push(newNote);
  }

  closeNote(index: number): void { this.openNotes.splice(index, 1); }

  changeNoteColor(note: Note, color: string): void {
    note.cor = color;
    if (note.id) {
      const sidebarNote = this.notes.find(n => n.id === note.id);
      if (sidebarNote) sidebarNote.cor = color;
    }
    this.organizeGroups();
  }

  deleteFromSidebar(event: Event, note: Note): void {
    event.stopPropagation();
    if (!note.id) return;
    if (confirm(`Excluir "${note.titulo}"?`)) {
      this.noteService.deleteNote(note.id).subscribe(() => {
        this.loadNotes();
        const openIndex = this.openNotes.findIndex(n => n.id === note.id);
        if (openIndex !== -1) this.closeNote(openIndex);
        this.displayToast('Nota excluída.');
      });
    }
  }

  saveNote(note: Note): void {
    if (!note.titulo) { this.displayToast('Título obrigatório!'); return; }

    let dataFormatada = null;
    if (note.dataLembrete) {
      dataFormatada = new Date(note.dataLembrete).toISOString();
    }

    const noteToSend = { ...note, dataLembrete: dataFormatada };

    const onComplete = () => {
      this.loadNotes();
      this.displayToast('Nota salva com sucesso!');
      
      // Remove da lista de silenciados pois a ação foi concluída/salva
      if (note.id) this.snoozedSessionIds.delete(note.id);
    };

    const onError = (err: any) => {
      console.error('Erro ao salvar:', err);
      this.displayToast('Erro ao salvar. Verifique os dados.');
    };

    if (note.id) {
      this.noteService.updateNote(note.id, noteToSend as any).subscribe({
        next: onComplete,
        error: onError
      });
    } else {
      this.noteService.createNote(noteToSend as any).subscribe({
        next: (created) => {
          note.id = created.id;
          note.dataCriacao = created.dataCriacao;
          note.cor = created.cor || note.cor;
          note.qtdReagendamentos = created.qtdReagendamentos || 0;
          
          this.notes.unshift(note);
          this.organizeGroups();
          this.displayToast('Criado!');
        },
        error: onError
      });
    }
  }

  toggleDateEdit(note: Note, show: boolean): void {
    if (show) {
      note.isDateEditing = true;
      // Pequeno delay para garantir que o input foi renderizado antes de dar foco
      setTimeout(() => {
        const inputId = 'date-input-' + note.id;
        const element = document.getElementById(inputId);
        if (element) {
          (element as HTMLElement).focus();
        }
      }, 100);
    } else {
      // Delay para permitir interações (ex: clicar no calendário)
      setTimeout(() => {
        note.isDateEditing = false;
      }, 200);
    }
  }

  formatText(cmd: string, val: string = '') { document.execCommand(cmd, false, val); }
  updateContent(e: any, n: Note) { n.conteudo = e.target.innerHTML; }

  deleteNote(n: Note, i: number) {
    if(!n.id) { this.closeNote(i); return; }
    if(confirm('Excluir?')) this.noteService.deleteNote(n.id).subscribe(() => { this.closeNote(i); this.loadNotes(); });
  }

  toggleCollapse(event: Event, note: Note): void {
    event.stopPropagation();
    note.isCollapsed = !note.isCollapsed;
  }
}