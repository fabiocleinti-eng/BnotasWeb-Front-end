import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../core/services/note.service';
import { Note } from '../../core/models/note.model';

// Interface para o Grupo de Cores
interface NoteGroup {
  color: string;
  notes: Note[];
  isOpen: boolean;
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
  noteGroups: NoteGroup[] = []; // Lista de grupos em vez de lista plana
  openNotes: Note[] = []; 
  searchTerm: string = '';
  showToast: boolean = false;
  toastMessage: string = '';
  
  availableColors: string[] = [
    '#fff9c4', '#ffcdd2', '#f8bbd0', '#e1bee7', 
    '#d1c4e9', '#c5cae9', '#bbdefb', '#b3e5fc', 
    '#b2dfdb', '#c8e6c9', '#f0f4c3', '#ffe0b2', '#f5f5f5'
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
        this.notes = data.map(n => ({ 
          ...n, 
          cor: n.cor || '#fff9c4',
          isCollapsed: false 
        }));
        this.organizeGroups(); // Agrupa assim que carrega
      },
      error: (err) => console.error('Erro', err)
    });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value.toLowerCase();
    this.organizeGroups();
  }

  // --- LÓGICA DE AGRUPAMENTO ---
  organizeGroups(): void {
    let filtered = this.notes;

    if (this.searchTerm) {
      filtered = filtered.filter(n => 
        n.titulo.toLowerCase().includes(this.searchTerm) || 
        n.conteudo.toLowerCase().includes(this.searchTerm)
      );
    }

    const groupsMap: { [key: string]: Note[] } = {};
    
    // Separa as notas em baldes por cor
    filtered.forEach(note => {
      const color = note.cor || '#fff9c4';
      if (!groupsMap[color]) {
        groupsMap[color] = [];
      }
      groupsMap[color].push(note);
    });

    // Cria o array de grupos
    this.noteGroups = Object.keys(groupsMap).map(color => {
      // Tenta manter o estado aberto/fechado se o grupo já existia
      const existingGroup = this.noteGroups.find(g => g.color === color);
      return {
        color: color,
        notes: groupsMap[color],
        isOpen: existingGroup ? existingGroup.isOpen : true // Padrão: Aberto
      };
    });

    // Ordena os grupos para que as cores fiquem sempre na mesma ordem
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
    this.organizeGroups(); // Reagrupa imediatamente
  }

  saveNote(note: Note): void {
    if (!note.titulo) { this.displayToast('Título obrigatório!'); return; }
    const { cor, ...noteToSend } = note; // O backend já aceita cor, mas mantemos compatibilidade

    // Como atualizamos o backend para aceitar cor, podemos enviar o objeto completo se quiser
    // Mas vamos manter seguro:
    const payload = { ...noteToSend, cor: note.cor };

    if (note.id) {
      this.noteService.updateNote(note.id, payload).subscribe(() => {
        this.loadNotes();
        this.displayToast('Nota salva!');
      });
    } else {
      this.noteService.createNote(payload).subscribe((created) => {
        note.id = created.id;
        note.dataCriacao = created.dataCriacao;
        note.cor = created.cor || note.cor;
        
        this.notes.unshift(note);
        this.organizeGroups();
        this.displayToast('Criado!');
      });
    }
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

  deleteNote(note: Note, index: number): void {
    if(!note.id) { this.closeNote(index); return; }
    if(confirm('Excluir?')) this.noteService.deleteNote(note.id).subscribe(() => { this.closeNote(index); this.loadNotes(); });
  }

  formatText(cmd: string, val: string = '') { document.execCommand(cmd, false, val); }
  updateContent(e: any, n: Note) { n.conteudo = e.target.innerHTML; }
  toggleCollapse(e: Event, n: Note) { e.stopPropagation(); n.isCollapsed = !n.isCollapsed; }
}