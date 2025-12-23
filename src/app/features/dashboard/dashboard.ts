import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../core/services/note.service';
import { AuthService } from '../../core/services/auth.service';
import { Note } from '../../core/models/note.model';
import { interval, Subscription } from 'rxjs';
import { AlertManagerService } from '../../core/services/alert-manager.service';
import { TiltCardDirective } from '../../shared/directives/tilt-card.directive';

interface NoteGroup {
  color: string;
  notes: Note[];
  activeIndex: number;
  count: number;
  isOpen: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TiltCardDirective],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  notes: Note[] = [];
  noteGroups: NoteGroup[] = [];
  openNotes: Note[] = [];
  
  availableColors: string[] = ['#fff9c4', '#f50c23ff', '#bbdefb', '#c8e6c9'];
  
  searchTerm: string = '';
  userName: string = 'Usuário';
  scratchpadContent: string = '';

  showUrgentModal: boolean = false;
  criticalNotes: Note[] = [];
  private checkerSub: Subscription | undefined;
  
  private lastWheelTime = 0;

  constructor(
    private noteService: NoteService,
    private authService: AuthService,
    private alertService: AlertManagerService
  ) {}

  ngOnInit(): void {
    this.loadNotes();
    this.loadScratchpad();
    this.loadUserName();
    this.checkerSub = interval(30000).subscribe(() => this.checkCriticalTasks());
    
    document.addEventListener('bnotas:abrir-alerta', () => {
       if (this.criticalNotes.length > 0) this.showUrgentModal = true;
    });
  }

  ngOnDestroy(): void { if (this.checkerSub) this.checkerSub.unsubscribe(); }

  loadNotes(): void {
    this.noteService.getNotes().subscribe({
      next: (data) => {
        this.notes = data.map(n => ({ 
            ...n, 
            cor: this.isValidColor(n.cor) ? n.cor : this.availableColors[0],
            isDateEditing: false 
        }));
        this.organizeGroups();
        this.checkCriticalTasks();
      },
      error: (err) => console.error(err)
    });
  }

  isValidColor(color: string | undefined): boolean {
      if(!color) return false;
      return this.availableColors.includes(color) || color === '#f0f0f0'; 
  }

  organizeGroups(): void {
    let filtered = this.notes;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        (n.titulo && n.titulo.toLowerCase().includes(term)) || 
        (n.conteudo && n.conteudo.toLowerCase().includes(term))
      );
    }

    const groupsMap: { [key: string]: Note[] } = {};
    this.availableColors.forEach(c => groupsMap[c] = []);

    filtered.forEach(note => {
      let color = note.cor || this.availableColors[0];
      if (!groupsMap[color]) color = this.availableColors[0];
      groupsMap[color].push(note);
    });

    this.noteGroups = Object.keys(groupsMap)
        .filter(color => groupsMap[color].length > 0)
        .map(color => {
          const existing = this.noteGroups.find(g => g.color === color);
          // SEGURANÇA DE ÍNDICE
          const count = groupsMap[color].length;
          let newIndex = existing ? existing.activeIndex : 0;
          if(newIndex >= count) newIndex = 0;

          return {
            color: color,
            notes: groupsMap[color],
            count: count,
            activeIndex: newIndex, 
            isOpen: existing ? existing.isOpen : true 
          };
    });
  }

  toggleGroup(group: NoteGroup): void {
    group.isOpen = !group.isOpen;
  }

  // --- LÓGICA DA ROLETA ---
  onDeckWheel(event: WheelEvent, group: NoteGroup): void {
    event.preventDefault();
    event.stopPropagation();

    const now = new Date().getTime();
    if (now - this.lastWheelTime < 150) return; 
    this.lastWheelTime = now;

    if (group.count <= 1) return;

    // SEGURANÇA EXTRA: Se índice estiver quebrado, reseta
    if (group.activeIndex === undefined || group.activeIndex < 0 || group.activeIndex >= group.count) {
        group.activeIndex = 0;
    }

    if (event.deltaY > 0) {
      this.nextCard(group);
    } else {
      this.prevCard(group);
    }
  }

  nextCard(group: NoteGroup) {
    group.activeIndex = (group.activeIndex + 1) % group.count;
  }

  prevCard(group: NoteGroup) {
    group.activeIndex = (group.activeIndex - 1 + group.count) % group.count;
  }

  // Métodos Auxiliares
  onSearch(event: any): void { this.searchTerm = event.target.value; this.organizeGroups(); }
  createNote(): void {
    const newNote: Note = { titulo: '', conteudo: '', cor: this.availableColors[0], favorita: false, isDateEditing: false };
    this.openNotes.push(newNote);
  }
  openNote(note: Note): void {
    if (this.openNotes.find(n => n.id === note.id)) return;
    let formattedDate = undefined;
    if (note.dataLembrete) {
       const d = new Date(note.dataLembrete);
       if(!isNaN(d.getTime())) {
           const offset = d.getTimezoneOffset() * 60000;
           formattedDate = new Date(d.getTime() - offset).toISOString().slice(0, 16);
       }
    }
    this.openNotes.push({ ...note, dataLembrete: formattedDate, isDateEditing: !!note.dataLembrete });
  }
  toggleDateEdit(note: Note): void { note.isDateEditing = !note.isDateEditing; }
  updateReminderDate(note: Note, newDate: string): void { note.dataLembrete = newDate; }
  saveNote(note: Note): void {
    if (!note.titulo) { alert('Título obrigatório!'); return; }
    const noteToSend = { ...note };
    if (note.dataLembrete) noteToSend.dataLembrete = new Date(note.dataLembrete).toISOString();
    else noteToSend.dataLembrete = null as any; 
    if (note.id) {
        this.noteService.updateNote(note.id, noteToSend).subscribe(() => this.loadNotes());
    } else {
        this.noteService.createNote(noteToSend).subscribe((created) => {
            note.id = created.id;
            this.loadNotes();
        });
    }
  }
  deleteNote(note: Note, index: number): void {
    if(!note.id) { this.openNotes.splice(index, 1); return; }
    if(confirm('Excluir esta nota?')) {
       this.noteService.deleteNote(note.id).subscribe(() => {
          this.openNotes.splice(index, 1);
          this.loadNotes();
       });
    }
  }
  deleteFromSidebar(event: Event, note: Note): void {
    event.stopPropagation();
    if(confirm('Excluir nota "' + note.titulo + '"?')) {
        this.noteService.deleteNote(note.id!).subscribe(() => {
            this.loadNotes();
            this.openNotes = this.openNotes.filter(n => n.id !== note.id);
        });
    }
  }
  closeNote(index: number): void { this.openNotes.splice(index, 1); }
  changeNoteColor(note: Note, color: string): void { note.cor = color; }
  getCardBackground(color: string | undefined): string { return color || '#ffffff'; }
  isExpired(note: Note): boolean {
    if (!note.dataLembrete) return false;
    const d = new Date(note.dataLembrete);
    return !isNaN(d.getTime()) && d.getTime() < new Date().getTime();
  }
  isUrgent(note: Note): boolean {
      if (!note.dataLembrete) return false;
      const d = new Date(note.dataLembrete).getTime();
      const now = new Date().getTime();
      return d < now || (d - now) < (24 * 60 * 60 * 1000); 
  }
  getPreview(note: Note): string {
    const txt = note.conteudo || '';
    return txt.replace(/<[^>]*>/g, '').substring(0, 50) + (txt.length > 50 ? '...' : '');
  }
  get totalNotes(): number { return this.notes ? this.notes.length : 0; }
  loadUserName() { 
    const user = this.authService.getUser();
    if (user) this.userName = (user as any).nome || user.email;
  }
  loadScratchpad() { this.scratchpadContent = localStorage.getItem('bnotas_scratchpad') || ''; }
  onScratchpadChange() { localStorage.setItem('bnotas_scratchpad', this.scratchpadContent); }
  checkCriticalTasks(force: boolean = false) {
    const agora = new Date().getTime();
    this.criticalNotes = this.notes.filter(n => {
      if (!n.dataLembrete || !n.id) return false;
      const dataLembrete = new Date(n.dataLembrete).getTime();
      const diffMinutos = (dataLembrete - agora) / 1000 / 60;
      return diffMinutos < 10 && diffMinutos > -60;
    });
    if (this.criticalNotes.length > 0) {
      this.alertService.ativarAlerta(true);
      if (force || (this.alertService.deveAbrirModal() && !this.showUrgentModal)) {
        this.showUrgentModal = true;
      }
    } else {
      this.alertService.ativarAlerta(false);
      this.criticalNotes = [];
    }
  }
  markAsDone(note?: Note) { 
      if(note) { this.updateNoteAsDone(note); } else { [...this.criticalNotes].forEach(n => this.updateNoteAsDone(n)); }
  } 
  private updateNoteAsDone(note: Note) {
      if(!note.id) return;
      const updated = { ...note, dataLembrete: null };
      this.noteService.updateNote(note.id, updated as any).subscribe(() => {
          this.loadNotes();
          this.criticalNotes = this.criticalNotes.filter(n => n.id !== note.id);
          if(this.criticalNotes.length === 0) {
              this.alertService.limpar();
              this.showUrgentModal = false;
          }
      });
  }
  snoozeTask() { this.alertService.snooze(); this.showUrgentModal = false; }
}