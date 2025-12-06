import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../core/services/note.service';
import { AuthService } from '../../core/services/auth.service'; // Importado AuthService
import { Note } from '../../core/models/note.model';

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
export class DashboardComponent implements OnInit {
  notes: Note[] = [];
  noteGroups: NoteGroup[] = []; 
  openNotes: Note[] = []; 
  searchTerm: string = '';

  showToast: boolean = false;
  toastMessage: string = '';
  
  today: Date = new Date();
  userName: string = 'Usuário'; // Padrão
  scratchpadContent: string = '';

  availableColors: string[] = [
    '#fff9c4', '#ffcdd2', '#f8bbd0', '#e1bee7', 
    '#d1c4e9', '#c5cae9', '#bbdefb', '#b3e5fc', 
    '#b2dfdb', '#c8e6c9', '#f0f4c3', '#ffe0b2', '#f5f5f5'
  ];

  constructor(
    private noteService: NoteService,
    private authService: AuthService // Injetado aqui
  ) {}

  ngOnInit(): void {
    this.loadNotes();
    this.loadScratchpad();
    this.loadUserName(); // Carrega o nome
  }

  // --- LÓGICA PARA EXIBIR O NOME REAL ---
  loadUserName(): void {
    const user = this.authService.getUser();
    
    // Tenta pegar o 'nome' se existir
    if (user && (user as any).nome) {
      this.userName = (user as any).nome;
    } 
    // Se não tiver nome (usuário antigo), pega do email
    else if (user && user.email) {
      const namePart = user.email.split('@')[0];
      this.userName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
  }

  get favCount(): number {
    return this.notes.filter(n => n.favorita).length;
  }
  
  get totalNotes(): number {
    return this.notes.length;
  }

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
          isCollapsed: false 
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

    const groupsMap: { [key: string]: Note[] } = {};
    
    filtered.forEach(note => {
      const color = note.cor || '#fff9c4';
      if (!groupsMap[color]) {
        groupsMap[color] = [];
      }
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

  toggleGroup(group: NoteGroup): void {
    group.isOpen = !group.isOpen;
  }

  openNote(note: Note): void {
    const alreadyOpen = this.openNotes.find(n => n.id === note.id);
    if (alreadyOpen) return;
    if (this.openNotes.length >= 4) {
      this.displayToast('Máximo de 4 notas abertas!');
      return;
    }
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
    const noteToSend = { ...note };

    if (note.id) {
      this.noteService.updateNote(note.id, noteToSend).subscribe(() => {
        this.loadNotes(); 
        this.displayToast('Nota salva!');
      });
    } else {
      this.noteService.createNote(noteToSend).subscribe((created) => {
        note.id = created.id;
        note.dataCriacao = created.dataCriacao;
        note.cor = created.cor || note.cor;
        
        this.notes.unshift(note);
        this.organizeGroups();
        this.displayToast('Criado!');
      });
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