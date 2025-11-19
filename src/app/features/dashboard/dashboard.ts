import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../core/services/note.service';
import { Note } from '../../core/models/note.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  notes: Note[] = [];
  filteredNotes: Note[] = [];
  openNotes: Note[] = []; 
  searchTerm: string = '';

  showToast: boolean = false;
  toastMessage: string = '';
  
  // Cores disponíveis
  availableColors: string[] = [
    '#fff9c4', // Amarelo (Padrão)
    '#ffcdd2', // Vermelho claro
    '#f8bbd0', // Rosa
    '#e1bee7', // Roxo
    '#d1c4e9', // Violeta
    '#c5cae9', // Indigo
    '#bbdefb', // Azul
    '#b3e5fc', // Azul claro
    '#b2dfdb', // Verde água
    '#c8e6c9', // Verde
    '#f0f4c3', // Lima
    '#ffe0b2', // Laranja
    '#f5f5f5'  // Cinza/Branco
  ];

  constructor(private noteService: NoteService) {}

  ngOnInit(): void {
    this.loadNotes();
  }

  displayToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 3000);
  }

  loadNotes(): void {
    this.noteService.getNotes().subscribe({
      next: (data) => {
        // Aplica cor padrão se vier sem cor
        this.notes = data.map(n => ({ ...n, cor: n.cor || '#fff9c4' }));
        this.filterNotes();
      },
      error: (err) => console.error('Erro ao carregar notas', err)
    });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value.toLowerCase();
    this.filterNotes();
  }

  filterNotes(): void {
    if (!this.searchTerm) {
      this.filteredNotes = this.notes;
    } else {
      this.filteredNotes = this.notes.filter(n => 
        n.titulo.toLowerCase().includes(this.searchTerm) || 
        n.conteudo.toLowerCase().includes(this.searchTerm)
      );
    }
  }

  openNote(note: Note): void {
    const alreadyOpen = this.openNotes.find(n => n.id === note.id);
    if (alreadyOpen) return;

    if (this.openNotes.length >= 4) {
      this.displayToast('Máximo de 4 notas abertas!');
      return;
    }
    // Garante cor ao abrir
    this.openNotes.push({ ...note, cor: note.cor || '#fff9c4' }); 
  }

  createNote(): void {
    if (this.openNotes.length >= 4) {
      this.displayToast('Feche uma nota para criar uma nova.');
      return;
    }
    const newNote: Note = { titulo: '', conteudo: '', favorita: false, cor: '#fff9c4' };
    this.openNotes.push(newNote);
  }

  closeNote(index: number): void {
    this.openNotes.splice(index, 1);
  }

  // --- ATUALIZADA: Muda a cor no card E na lista lateral ---
  changeNoteColor(note: Note, color: string): void {
    note.cor = color;
    
    // Procura a nota correspondente na lista principal (Sidebar) pelo ID
    if (note.id) {
      const sidebarNote = this.notes.find(n => n.id === note.id);
      if (sidebarNote) {
        sidebarNote.cor = color; // Atualiza a cor visualmente na sidebar
      }
    }
  }

  deleteFromSidebar(event: Event, note: Note): void {
    event.stopPropagation();
    if (!note.id) return;

    if (confirm(`Excluir "${note.titulo}" permanentemente?`)) {
      this.noteService.deleteNote(note.id).subscribe(() => {
        this.loadNotes();
        const openIndex = this.openNotes.findIndex(n => n.id === note.id);
        if (openIndex !== -1) this.closeNote(openIndex);
        this.displayToast('Nota excluída.');
      });
    }
  }

  saveNote(note: Note): void {
    if (!note.titulo) {
      this.displayToast('O título é obrigatório!');
      return;
    }

    // Separa a cor para não enviar ao backend (se ele não suportar)
    // Se suportar, pode enviar 'note' direto.
    const { cor, ...noteToSend } = note;

    if (note.id) {
      this.noteService.updateNote(note.id, noteToSend).subscribe(() => {
        this.loadNotes(); // Isso vai recarregar a lista do backend (perdendo a cor se não estiver salva lá)
        // Mas como a cor está na memória em 'this.notes' via loadNotes, ela pode resetar.
        // O ideal é que o backend salve a cor. Por enquanto, a cor persiste na sessão.
        this.displayToast('Nota salva!');
      });
    } else {
      this.noteService.createNote(noteToSend).subscribe((createdNote) => {
        note.id = createdNote.id;
        note.dataCriacao = createdNote.dataCriacao;
        this.loadNotes();
        this.displayToast('Nota criada!');
      });
    }
  }

  formatText(command: string, value: string = ''): void {
    document.execCommand(command, false, value);
  }

  updateContent(event: any, note: Note): void {
    note.conteudo = event.target.innerHTML;
  }

  deleteNote(note: Note, index: number): void {
    if (!note.id) {
      this.closeNote(index);
      return;
    }
    if (confirm('Excluir esta nota?')) {
      this.noteService.deleteNote(note.id).subscribe(() => {
        this.closeNote(index);
        this.loadNotes();
        this.displayToast('Nota excluída.');
      });
    }
  }
}