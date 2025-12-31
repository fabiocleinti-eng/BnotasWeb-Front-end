import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../core/services/note.service';
import { AuthService } from '../../core/services/auth.service';
import { Note } from '../../core/models/note.model';
import { TiltCardDirective } from '../../shared/directives/tilt-card.directive';
import { AlertManagerService } from '../../core/services/alert-manager.service';
import { DomSanitizer } from '@angular/platform-browser';

// --- TIPTAP IMPORTS ---
import { TiptapEditorDirective } from 'ngx-tiptap';
import { Editor, Mark, mergeAttributes } from '@tiptap/core'; 
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline'; 
// ----------------------

// --- EXTENSÃO OTIMIZADA PARA TAMANHO DA FONTE (MARK) ---
const FontSize = Mark.create({
  name: 'fontSize',
  addOptions() { return { HTMLAttributes: {} } },
  parseHTML() {
    return [{ tag: 'span', getAttrs: (element) => (element as HTMLElement).style.fontSize ? {} : false }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: element => element.style.fontSize.replace('px', ''),
        renderHTML: attributes => {
          // Acessando com colchetes para evitar erro de TS
          if (!attributes['size']) return {};
          return { style: `font-size: ${attributes['size']}px` }
        },
      },
    }
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ commands }: any) => commands.setMark(this.name, { size: size }),
      unsetFontSize: () => ({ commands }: any) => commands.unsetMark(this.name),
    }
  },
});
// -------------------------------------------------------

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TiltCardDirective, TiptapEditorDirective], 
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  userName: string = 'Visitante';
  totalNotes: number = 0;
  
  scratchpadContent: string = '';
  noteGroups: any[] = [];
  openNotes: any[] = [];
  
  availableColors: string[] = ['#fff9c4', '#ffcdd2', '#b3e5fc', '#c8e6c9'];
  showUrgentModal: boolean = false;
  criticalNotes: Note[] = [];

  fontSizes: string[] = ['12', '14', '16', '18', '20', '24', '30'];

  constructor(
    private noteService: NoteService,
    private authService: AuthService,
    private alertManager: AlertManagerService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user && user.email) { this.userName = user.email.split('@')[0]; }
    this.loadScratchpad();
    this.loadNotes();
  }

  ngOnDestroy(): void {
    this.openNotes.forEach(note => { if (note.editor) note.editor.destroy(); });
  }

  // --- RASCUNHO ---
  private get scratchpadKey(): string {
      const user = this.authService.getUser();
      const safeKey = user && user.email ? user.email.replace(/[^a-zA-Z0-9]/g, '') : 'visitante';
      return `rascunho_${safeKey}`;
  }
  loadScratchpad() {
      const saved = localStorage.getItem(this.scratchpadKey);
      this.scratchpadContent = saved ? saved : '';
  }
  onScratchpadChange() { localStorage.setItem(this.scratchpadKey, this.scratchpadContent); }

  // --- NOTAS ---
  loadNotes() {
      this.noteService.getNotes().subscribe({
        next: (notes: Note[]) => { this.totalNotes = notes.length; this.organizeNotes(notes); this.checkAlerts(notes); },
        error: (err) => console.error('Erro ao carregar notas', err)
      });
  }

  organizeNotes(notes: Note[]) {
      const groups: any = {};
      notes.forEach(note => {
        const color = note.cor || '#fff';
        if (!groups[color]) { groups[color] = { color: color, notes: [], count: 0, isOpen: false, activeIndex: 0 }; }
        groups[color].notes.push(note);
        groups[color].count++;
      });
      this.noteGroups = Object.values(groups);
      if (this.noteGroups.length > 0) this.noteGroups[0].isOpen = true;
  }

  toggleGroup(group: any) { group.isOpen = !group.isOpen; }
  
  onDeckWheel(event: WheelEvent, group: any) {
      event.preventDefault();
      if (group.count <= 1) return;
      if (event.deltaY > 0) group.activeIndex = (group.activeIndex + 1) % group.count;
      else group.activeIndex = (group.activeIndex - 1 + group.count) % group.count;
  }

  getCardBackground(color: string): string { return color; }
  
  getPreview(note: Note): string {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = note.conteudo || '';
      const text = tempDiv.textContent || tempDiv.innerText || '';
      return text.length > 30 ? text.substring(0, 30) + '...' : (text || 'Nova nota...');
  }

  checkAlerts(notes: Note[]) {
      const agora = new Date();
      const alertas = notes.filter(n => {
        if (!n.dataLembrete) return false;
        const dataLembrete = new Date(n.dataLembrete);
        return dataLembrete < agora;
      });
      if (alertas.length > 0 && this.alertManager.deveAbrirModal()) {
        this.criticalNotes = alertas;
        this.showUrgentModal = true;
      }
  }

  // --- EDITOR SETUP ---
  createNote() {
      const newNote: Note = { titulo: '', conteudo: '', cor: '#fff9c4', favorita: false, dataCriacao: new Date(), dataLembrete: null, isDateEditing: false };
      this.addNoteToOpenList(newNote);
  }

  openNote(note: Note) {
      const alreadyOpen = this.openNotes.find(n => n.id === note.id);
      if (!alreadyOpen) {
        const noteCopy = { ...note, isDateEditing: !!note.dataLembrete };
        this.addNoteToOpenList(noteCopy);
      }
  }

  private addNoteToOpenList(note: any) {
    const editor = new Editor({
      extensions: [StarterKit, TextStyle, Color, Highlight.configure({ multicolor: true }), Underline, FontSize], 
      content: note.conteudo || '',
      onUpdate: ({ editor }) => { note.conteudo = editor.getHTML(); }
    });

    this.openNotes.unshift({ 
      ...note, 
      editor: editor,
      isMaximized: false 
    });
  }

  toggleMaximize(note: any) {
    note.isMaximized = !note.isMaximized;
  }

  changeFontSize(editor: Editor, event: any) {
    editor.chain().focus().setFontSize(event.target.value).run();
  }

  closeNote(index: number) {
      if (this.openNotes[index].editor) { this.openNotes[index].editor.destroy(); }
      this.openNotes.splice(index, 1); 
  }

  saveNote(item: any) {
      const noteToSave: any = { 
        titulo: item.titulo, conteudo: item.conteudo, favorita: item.favorita || false, 
        cor: item.cor, dataLembrete: item.dataLembrete 
      };

      if (item.id) { 
        this.noteService.updateNote(item.id, noteToSave).subscribe(() => this.loadNotes()); 
      } else { 
        this.noteService.createNote(noteToSave).subscribe(() => { this.loadNotes(); this.closeNote(0); }); 
      }
  }

  deleteNote(note: Note, index: number) { 
    if (confirm('Tem certeza?')) { 
      if (note.id) this.noteService.deleteNote(note.id).subscribe(() => { this.closeNote(index); this.loadNotes(); }); 
      else this.closeNote(index); 
    } 
  }

  deleteFromSidebar(event: Event, note: Note) { 
    event.stopPropagation(); 
    if (note.id && confirm('Excluir?')) { 
      this.noteService.deleteNote(note.id).subscribe(() => { 
        this.loadNotes(); 
        const idx = this.openNotes.findIndex(n => n.id === note.id); 
        if (idx !== -1) this.closeNote(idx); 
      }); 
    } 
  }

  changeNoteColor(note: any, color: string) { note.cor = color; }
  toggleDateEdit(note: any) { note.isDateEditing = !note.isDateEditing; }
  updateReminderDate(note: any, newDate: string) { note.dataLembrete = newDate; }

  markAsDone(n?: Note) { 
    if(n && n.id) { 
      this.noteService.updateNote(n.id, {dataLembrete: null}).subscribe(()=>{this.loadNotes(); if(this.criticalNotes.length===1) this.showUrgentModal=false;}); 
      this.criticalNotes=this.criticalNotes.filter(x=>x.id!==n.id); 
    } else { 
      this.criticalNotes.forEach(x=>{if(x.id)this.noteService.updateNote(x.id,{dataLembrete:null}).subscribe()}); 
      this.criticalNotes=[]; this.showUrgentModal=false; setTimeout(()=>this.loadNotes(),500); 
    } 
  }

  snoozeTask() { this.alertManager.snooze(); this.showUrgentModal = false; }

  onSearch(event: any) { 
    const t = event.target.value.toLowerCase(); 
    this.noteService.getNotes().subscribe(all => { 
      if(!t) { this.totalNotes=all.length; this.organizeNotes(all); return; } 
      this.organizeNotes(all.filter(n=>(n.titulo?.toLowerCase().includes(t)||n.conteudo?.toLowerCase().includes(t)))); 
    }); 
  }
}