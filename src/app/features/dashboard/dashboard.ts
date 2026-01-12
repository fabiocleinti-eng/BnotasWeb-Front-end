import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../core/services/note.service';
import { AuthService } from '../../core/services/auth.service';
import { Note } from '../../core/models/note.model';
import { TiltCardDirective } from '../../shared/directives/tilt-card.directive';
import { AlertManagerService } from '../../core/services/alert-manager.service';
import { DomSanitizer } from '@angular/platform-browser';

// TIPTAP IMPORTS
import { TiptapEditorDirective } from 'ngx-tiptap';
import { Editor, Mark, mergeAttributes } from '@tiptap/core'; 
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline'; 

const FontSize = Mark.create({
  name: 'fontSize',
  addOptions() { return { HTMLAttributes: {} } },
  parseHTML() { return [{ tag: 'span', getAttrs: (element) => (element as HTMLElement).style.fontSize ? {} : false }] },
  renderHTML({ HTMLAttributes }) { return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0] },
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: element => element.style.fontSize.replace('px', ''),
        renderHTML: attributes => { if (!attributes['size']) return {}; return { style: `font-size: ${attributes['size']}px` } },
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
  stackIndices: { [color: string]: number } = {};

  showUrgentModal: boolean = false;
  criticalNotes: Note[] = [];
  fontSizes: string[] = ['12', '14', '16', '18', '20', '24', '30'];

  isDrawerOpen: boolean = false;
  activeDrawerTab: 'profile' | 'security' | 'stats' | 'plans' | 'trash' = 'profile';
  isDarkMode: boolean = false;
  trashNotes: Note[] = [];

  isMobileSidebarOpen: boolean = false; 
  isMobileDockExpanded: boolean = false;

  userProfile = {
    name: 'Visitante',
    email: 'usuario@exemplo.com',
    bio: 'Organizando minhas ideias no BnotasWeb.',
    avatarUrl: 'https://ui-avatars.com/api/?name=User&background=6200ea&color=fff'
  };

  availablePlans = [
    {
      name: 'Gratuito',
      price: '0',
      period: 'mês',
      features: ['Até 50 notas', '1GB de armazenamento', 'Suporte básico'],
      current: true,
      featured: false
    },
    {
      name: 'Premium',
      price: '9,90',
      period: 'mês',
      features: ['Notas ilimitadas', '10GB de armazenamento', 'Suporte prioritário', 'Temas exclusivos', 'Backup automático'],
      current: false,
      featured: true
    },
    {
      name: 'Pro',
      price: '19,90',
      period: 'mês',
      features: ['Tudo do Premium', '100GB de armazenamento', 'Suporte 24/7', 'API de integração', 'Colaboração em equipe'],
      current: false,
      featured: false
    }
  ];

  get stats() {
    return {
      totalNotes: this.totalNotes,
      totalWords: this.openNotes.reduce((acc, note) => acc + (note.conteudo ? note.conteudo.length : 0), 0),
      mostUsedColor: this.getMostUsedColor()
    };
  }

  constructor(
    private noteService: NoteService,
    private authService: AuthService,
    private alertManager: AlertManagerService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef // <--- INJETADO
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user && user.email) { 
        this.userName = user.email.split('@')[0];
        this.userProfile.name = this.userName;
        this.userProfile.email = user.email;
        this.userProfile.avatarUrl = `https://ui-avatars.com/api/?name=${this.userName}&background=6200ea&color=fff`;
    }
    
    this.loadDarkMode();
    this.loadScratchpad();
    this.loadNotes();
    this.availableColors.forEach(c => this.stackIndices[c] = 0);
  }

  ngOnDestroy(): void {
    this.openNotes.forEach(note => { if (note.editor) note.editor.destroy(); });
  }

  toggleMobileSidebar() { this.isMobileSidebarOpen = !this.isMobileSidebarOpen; }
  toggleMobileDock() { this.isMobileDockExpanded = !this.isMobileDockExpanded; }

  toggleDrawer() { this.isDrawerOpen = !this.isDrawerOpen; }
  closeDrawer() { this.isDrawerOpen = false; }
  setActiveTab(tab: 'profile' | 'security' | 'stats' | 'plans' | 'trash') { 
    this.activeDrawerTab = tab; 
    if (tab === 'trash') {
      this.loadTrash();
    }
  }

  loadDarkMode() {
    const saved = localStorage.getItem('darkMode');
    this.isDarkMode = saved === 'true';
    this.applyDarkMode();
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    this.applyDarkMode();
  }

  applyDarkMode() {
    const body = document.body;
    const html = document.documentElement;
    if (this.isDarkMode) {
      body.classList.add('dark-mode');
      html.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
      html.classList.remove('dark-mode');
    }
  }

  selectPlan(plan: any) {
    if (plan.current) return;
    // Aqui você pode adicionar a lógica de seleção de plano
    console.log('Plano selecionado:', plan.name);
    alert(`Plano ${plan.name} selecionado! (Funcionalidade em desenvolvimento)`);
  }

  onAvatarChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.userProfile.avatarUrl = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile() {
    // Aqui você pode adicionar a lógica para salvar o perfil no backend
    console.log('Salvando perfil:', this.userProfile);
    // Por enquanto, salvar no localStorage
    localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
    alert('Perfil salvo com sucesso!');
    this.closeDrawer();
  }

  loadTrash() {
    this.noteService.getTrash().subscribe({
      next: (notes: Note[]) => {
        this.trashNotes = notes;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar lixeira:', err);
      }
    });
  }

  restoreFromTrash(note: Note) {
    if (!note.id) return;
    this.noteService.restoreNote(note.id).subscribe({
      next: () => {
        this.loadTrash();
        this.loadNotes();
        alert('Nota restaurada com sucesso!');
      },
      error: (err) => {
        console.error('Erro ao restaurar nota:', err);
        alert('Erro ao restaurar nota. Tente novamente.');
      }
    });
  }

  deletePermanentlyFromTrash(note: Note) {
    if (!note.id) return;
    if (confirm('Tem certeza que deseja excluir permanentemente? Esta ação não pode ser desfeita!')) {
      this.noteService.deletePermanently(note.id).subscribe({
        next: () => {
          this.loadTrash();
          alert('Nota excluída permanentemente.');
        },
        error: (err) => {
          console.error('Erro ao excluir permanentemente:', err);
          alert('Erro ao excluir nota. Tente novamente.');
        }
      });
    }
  }

  getDaysSinceDeletion(dataExclusao: Date | string | undefined): number {
    if (!dataExclusao) return 0;
    const deletionDate = new Date(dataExclusao);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deletionDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getMostUsedColor(): string {
    if (this.openNotes.length === 0) return '#ccc';
    const counts: any = {};
    this.openNotes.forEach(n => counts[n.cor || '#fff'] = (counts[n.cor || '#fff'] || 0) + 1);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  logout() { if(confirm('Tem certeza que deseja sair?')) { this.authService.logout(); } }

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

  get visibleNotes() { return this.openNotes.filter(n => !n.minimized); }
  get minimizedNotes() { return this.openNotes.filter(n => n.minimized); }
  getMinimizedByColor(color: string) { return this.minimizedNotes.filter(n => n.cor === color); }

  getActiveStackNote(color: string) {
    const stack = this.getMinimizedByColor(color);
    if (stack.length === 0) return null;

    if (this.stackIndices[color] === undefined) { this.stackIndices[color] = 0; }
    if (this.stackIndices[color] >= stack.length) { this.stackIndices[color] = 0; }

    return stack[this.stackIndices[color]];
  }

  // === ROLETA DO MOUSE CORRIGIDA ===
  onStackWheel(event: WheelEvent, color: string) {
    event.preventDefault();
    event.stopPropagation();

    const stack = this.getMinimizedByColor(color);
    if (stack.length <= 1) return; 

    let index = this.stackIndices[color] || 0;

    // Detecta Vertical ou Horizontal
    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

    if (delta > 0) {
      index = (index + 1) % stack.length;
    } else {
      index = (index - 1 + stack.length) % stack.length;
    }

    this.stackIndices[color] = index;
    
    // Força atualização da UI
    this.cdr.detectChanges();
  }

  restoreFromStack(color: string) {
    const noteToRestore = this.getActiveStackNote(color);
    if (noteToRestore) {
      noteToRestore.minimized = false;
      this.cdr.detectChanges();
    }
  }

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
      event.stopPropagation();
      if (group.count <= 1) return;
      
      const oldIndex = group.activeIndex;
      if (event.deltaY > 0) {
        group.activeIndex = (group.activeIndex + 1) % group.count;
      } else {
        group.activeIndex = (group.activeIndex - 1 + group.count) % group.count;
      }
      
      // Força atualização se o índice mudou
      if (oldIndex !== group.activeIndex) {
        this.cdr.detectChanges();
      }
  }

  getCardBackground(color: string): string { 
    // Retorna a cor para preencher o card completamente
    return color || '#fff'; 
  }
  
  getPreview(note: Note): string {
      if (!note.conteudo) return 'Nova nota...';
      const tempDiv = document.createElement('div');
      let htmlTratado = note.conteudo.replace(/<\/p>/gi, ' ').replace(/<br\s*\/?>/gi, ' ');
      tempDiv.innerHTML = htmlTratado;
      let text = tempDiv.textContent || tempDiv.innerText || '';
      return text.length > 40 ? text.substring(0, 40) + '...' : (text || 'Nova nota...');
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

  createNote() {
      const newNote: Note = { titulo: '', conteudo: '', cor: '#fff9c4', favorita: false, dataCriacao: new Date(), dataLembrete: null, isDateEditing: false };
      this.addNoteToOpenList(newNote);
  }

  openNote(note: Note) {
      const existing = this.openNotes.find(n => n.id === note.id);
      if (existing) {
        existing.minimized = false; 
        return;
      }
      const noteCopy = { ...note, isDateEditing: !!note.dataLembrete };
      this.addNoteToOpenList(noteCopy);
      if (this.isMobileSidebarOpen) this.isMobileSidebarOpen = false;
  }

  private addNoteToOpenList(note: any) {
    const editor = new Editor({
      extensions: [StarterKit, TextStyle, Color, Highlight.configure({ multicolor: true }), Underline, FontSize], 
      content: note.conteudo || '',
      onUpdate: ({ editor }) => { note.conteudo = editor.getHTML(); }
    });

    this.openNotes.push({ ...note, editor: editor, minimized: false, originalContent: note.conteudo });
  }

  toggleMinimize(note: any) { note.minimized = !note.minimized; }

  closeNote(note: any) {
      const atual = note.conteudo || '';
      const original = note.originalContent || '';
      if (atual !== original) { if (!confirm('Fechar sem salvar? Alterações serão perdidas.')) return; }
      if (note.editor) note.editor.destroy();
      this.openNotes = this.openNotes.filter(n => n !== note);
  }

  saveNote(item: any) {
      if (!item.editor) {
        console.error('Editor não encontrado para a nota');
        return;
      }

      // Garante que o conteúdo está atualizado do editor
      const conteudoAtualizado = item.editor.getHTML();
      item.conteudo = conteudoAtualizado;

      const noteToSave: any = { 
        titulo: item.titulo || '', 
        conteudo: item.conteudo || '', 
        favorita: item.favorita || false, 
        cor: item.cor || '#fff9c4', 
        dataLembrete: item.dataLembrete || null 
      };

      const afterSave = (savedNote: Note) => {
        item.originalContent = item.conteudo;
        if (!item.id && savedNote.id) {
          item.id = savedNote.id;
        }
        // Atualiza a nota na lista aberta com os dados do servidor
        const index = this.openNotes.findIndex(n => n === item);
        if (index !== -1) {
          this.openNotes[index] = { ...item, ...savedNote };
        }
        this.loadNotes();
        this.cdr.detectChanges();
      };

      const onError = (error: any) => {
        console.error('Erro ao salvar nota:', error);
        alert('Erro ao salvar nota. Tente novamente.');
      };

      if (item.id) { 
        this.noteService.updateNote(item.id, noteToSave).subscribe({
          next: (savedNote) => afterSave(savedNote),
          error: onError
        }); 
      } else { 
        this.noteService.createNote(noteToSave).subscribe({
          next: (newNote) => afterSave(newNote),
          error: onError
        }); 
      }
  }

  deleteNote(note: Note) { 
    if (confirm('Mover para lixeira? A nota será mantida por 30 dias.')) { 
      if (note.id) {
        this.noteService.deleteNote(note.id).subscribe({
          next: () => { 
            this.closeNote(note); 
            this.loadNotes(); 
          },
          error: (err) => {
            console.error('Erro ao excluir nota:', err);
            alert('Erro ao excluir nota. Tente novamente.');
          }
        }); 
      } else {
        this.closeNote(note); 
      }
    } 
  }

  deleteFromSidebar(event: Event, note: Note) { 
    event.stopPropagation(); 
    if (note.id && confirm('Excluir?')) { 
      this.noteService.deleteNote(note.id).subscribe(() => { this.loadNotes(); this.openNotes = this.openNotes.filter(n => n.id !== note.id); }); 
    } 
  }

  changeFontSize(editor: Editor, event: any) { editor.chain().focus().setFontSize(event.target.value).run(); }
  changeNoteColor(note: any, color: string) { note.cor = color; }
  toggleDateEdit(note: any) { note.isDateEditing = !note.isDateEditing; }
  updateReminderDate(note: any, newDate: string) { note.dataLembrete = newDate; }
  toggleFavorite(note: any) { 
    note.favorita = !note.favorita;
    // Salvar automaticamente ao favoritar
    if (note.id) {
      this.saveNote(note);
    }
  }
  
  markAsDone(n?: Note) { 
    if(n&&n.id){this.noteService.updateNote(n.id,{dataLembrete:null}).subscribe(()=>{this.loadNotes();if(this.criticalNotes.length===1)this.showUrgentModal=false;});this.criticalNotes=this.criticalNotes.filter(x=>x.id!==n.id);}
    else{this.criticalNotes.forEach(x=>{if(x.id)this.noteService.updateNote(x.id,{dataLembrete:null}).subscribe()});this.criticalNotes=[];this.showUrgentModal=false;setTimeout(()=>this.loadNotes(),500);} 
  }
  snoozeTask() { this.alertManager.snooze(); this.showUrgentModal = false; }
  onSearch(event: any) { const t = event.target.value.toLowerCase(); this.noteService.getNotes().subscribe(all => { if(!t) { this.totalNotes=all.length; this.organizeNotes(all); return; } this.organizeNotes(all.filter(n=>(n.titulo?.toLowerCase().includes(t)||n.conteudo?.toLowerCase().includes(t)))); }); }
}