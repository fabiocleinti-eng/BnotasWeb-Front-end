import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../core/services/note.service';
import { AuthService } from '../../core/services/auth.service';
import { Note } from '../../core/models/note.model';
import { TiltCardDirective } from '../../shared/directives/tilt-card.directive';
import { AlertManagerService } from '../../core/services/alert-manager.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TiltCardDirective],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  userName: string = 'Visitante';
  totalNotes: number = 0;
  
  scratchpadContent: string = '';
  noteGroups: any[] = [];
  openNotes: any[] = [];
  
  availableColors: string[] = ['#fff9c4', '#ffcdd2', '#b3e5fc', '#c8e6c9'];
  showUrgentModal: boolean = false;
  criticalNotes: Note[] = [];

  showHighlightMenu: boolean = false;
  
  // RASTREAMENTO DE FOCO
  activeNote: Note | null = null; 

  // ESTADO DE INTENÇÃO
  desiredState = {
      bold: false,
      italic: false,
      underline: false,
      highlight: false,
      highlightColor: 'transparent',
      fontSize: 'medium',
      foreColor: '#000000'
  };

  // Variáveis para HTML
  isBold = false;
  isItalic = false;
  isUnderline = false;
  isHighlightActive = false;
  currentHighlightColor = 'transparent';

  private savedRange: Range | null = null;
  private skipNextStatusCheck = false;

  constructor(
    private noteService: NoteService,
    private authService: AuthService,
    private alertManager: AlertManagerService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user && user.email) {
      this.userName = user.email.split('@')[0];
    }
    this.loadScratchpad();
    this.loadNotes();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showHighlightMenu) {
      const target = event.target as HTMLElement;
      if (!target.closest('.hilite-group')) {
        this.showHighlightMenu = false;
      }
    }
  }

  setActiveNote(note: Note) {
      this.activeNote = note;
      this.checkToolbarStatus();
  }

  // --- CONTROLE DE MOUSE ---
  onToolbarMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Cast (target as HTMLInputElement) para evitar erro TS2339
    if (target.tagName !== 'SELECT' && target.tagName !== 'OPTION' && (target as HTMLInputElement).type !== 'color') {
        event.preventDefault(); 
    }
  }

  // --- DIGITAÇÃO ---
  @HostListener('keyup', ['$event'])
  onEditorKeyUp(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('postit-content-editable')) return;

    if (event.key === 'Backspace' || event.key === 'Delete') {
        const content = target.textContent || '';
        const hasVisibleText = content.replace(/[\u200B\s\n\r]/g, '').length > 0;

        if (!hasVisibleText) { 
            document.execCommand('removeFormat', false, '');
            target.innerHTML = ''; 
            this.resetDesiredState(); 
        }
    }
    this.saveSelection();
    this.checkToolbarStatus();
  }

  @HostListener('mouseup', ['$event'])
  @HostListener('click', ['$event'])
  onMouseInteraction(event: Event) {
      const target = event.target as HTMLElement;
      if (target.closest('.postit-content-editable')) {
          this.checkToolbarStatus();
          this.saveSelection();
      }
  }

  // --- CHECK STATUS ATUALIZADO (LÊ A COR DO NAVEGADOR) ---
  checkToolbarStatus() {
    setTimeout(() => {
        if (this.skipNextStatusCheck) {
            this.skipNextStatusCheck = false;
            return;
        }

        const doc = document;
        const selection = window.getSelection();
        
        if (selection && !selection.isCollapsed) { // Ou isCollapsed, queremos checar sempre
             // 1. Estilos Básicos
             this.desiredState.bold = doc.queryCommandState('bold');
             this.desiredState.italic = doc.queryCommandState('italic');
             this.desiredState.underline = doc.queryCommandState('underline');
             
             // 2. Marca Texto
             const hlColor = doc.queryCommandValue('backColor');
             const hasHl = !!hlColor && hlColor !== 'transparent' && hlColor !== 'rgba(0, 0, 0, 0)' && hlColor !== 'rgb(255, 255, 255)';
             this.desiredState.highlight = hasHl;
             this.desiredState.highlightColor = hasHl ? hlColor : 'transparent';

             // 3. Tamanho da Fonte
             const fontSizeVal = doc.queryCommandValue('fontSize'); 
             this.desiredState.fontSize = this.mapBrowserSizeToApp(fontSizeVal);

             // 4. Cor da Fonte
             const foreColorVal = doc.queryCommandValue('foreColor');
             this.desiredState.foreColor = this.rgbToHex(foreColorVal) || '#000000';
        }
        this.syncUiFromState();
    }, 0);
  }

  syncUiFromState() {
      this.isBold = this.desiredState.bold;
      this.isItalic = this.desiredState.italic;
      this.isUnderline = this.desiredState.underline;
      this.isHighlightActive = this.desiredState.highlight;
      this.currentHighlightColor = this.desiredState.highlightColor;
  }

  resetDesiredState() {
      this.desiredState = {
        bold: false, italic: false, underline: false,
        highlight: false, highlightColor: 'transparent', 
        fontSize: 'medium', foreColor: '#000000'
      };
      this.syncUiFromState();
  }

  // --- HELPERS (NOVOS: PARA ATUALIZAR OS BOTÕES) ---
  mapBrowserSizeToApp(val: string): string {
      if (!val) return 'medium';
      if (val === '7') return 'large';
      if (val === '1' || val === '2') return 'small';
      if (val.includes('px')) {
          const px = parseInt(val, 10);
          if (px >= 20) return 'large';
          if (px <= 14) return 'small';
      }
      return 'medium';
  }

  rgbToHex(rgb: string): string {
      if (!rgb) return '#000000';
      if (rgb.startsWith('#')) return rgb;
      const rgbValues = rgb.match(/\d+/g);
      if (!rgbValues || rgbValues.length < 3) return '#000000';
      const r = parseInt(rgbValues[0]).toString(16).padStart(2, '0');
      const g = parseInt(rgbValues[1]).toString(16).padStart(2, '0');
      const b = parseInt(rgbValues[2]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
  }

  // --- FORMAT ---
  format(command: string, value: string) {
    this.restoreSelection();
    this.skipNextStatusCheck = true; 

    // Atualiza Intenção
    if (command === 'bold') this.desiredState.bold = !this.desiredState.bold;
    if (command === 'italic') this.desiredState.italic = !this.desiredState.italic;
    if (command === 'underline') this.desiredState.underline = !this.desiredState.underline;
    if (command === 'foreColor') this.desiredState.foreColor = value;

    if (command === 'backColor') {
        if (value === 'transparent') {
             this.desiredState.highlight = false;
             this.desiredState.highlightColor = 'transparent';
             this.showHighlightMenu = false;
             this.syncUiFromState();
             
             this.performEscape('highlight'); 
             this.saveSelection();
             return; 
        } else {
            this.desiredState.highlight = true;
            this.desiredState.highlightColor = value;
        }
        this.showHighlightMenu = false;
    }

    this.syncUiFromState();

    const selection = window.getSelection();
    const isCollapsed = selection && selection.isCollapsed;

    // Fuga Física para B/I/U se estiver desligando
    if (isCollapsed) {
        if (command === 'bold' && !this.desiredState.bold) { this.escapeSpecificTag(['B', 'STRONG']); this.saveSelection(); return; }
        if (command === 'italic' && !this.desiredState.italic) { this.escapeSpecificTag(['I', 'EM']); this.saveSelection(); return; }
        if (command === 'underline' && !this.desiredState.underline) { this.escapeSpecificTag(['U']); this.saveSelection(); return; }
    }

    // --- CORREÇÃO DE COR DA LETRA (Início Absoluto) ---
    if (command === 'foreColor' && isCollapsed) {
        this.applyStyleAtCursor('color', value);
        this.saveSelection();
        return;
    }

    // Marca-Texto em cursor parado
    if (command === 'backColor' && isCollapsed && value !== 'transparent') {
        this.applyStyleAtCursor('backgroundColor', value);
        this.saveSelection();
        return;
    }

    // Execução Padrão
    if (command === 'backColor' || command === 'foreColor') {
        document.execCommand('styleWithCSS', false, 'true');
    } else {
        document.execCommand('styleWithCSS', false, 'false');
    }
    document.execCommand(command, false, value);
    
    this.saveSelection();
  }

  // --- SET FONT SIZE (Versão Blindada para Início) ---
  setFontSize(size: string) {
    this.restoreSelection();
    this.skipNextStatusCheck = true;
    this.desiredState.fontSize = size;
    
    const sizeMap: any = { small: '13px', medium: '16px', large: '24px' };
    const cssSize = sizeMap[size];

    const selection = window.getSelection();
    
    // 1. Cursor Parado -> FORÇA SPAN
    if (selection && selection.isCollapsed) {
        this.applyStyleAtCursor('fontSize', cssSize);
    } 
    // 2. Texto Selecionado
    else {
        document.execCommand('styleWithCSS', false, 'false');
        document.execCommand('fontSize', false, '7');
        const fontElements = document.getElementsByTagName('font');
        for (let i = fontElements.length - 1; i >= 0; i--) {
            const font = fontElements[i];
            if (font.getAttribute('size') === '7') {
                const span = document.createElement('span');
                span.style.fontSize = cssSize;
                while (font.firstChild) { span.appendChild(font.firstChild); }
                if (font.parentNode) {
                    font.parentNode.replaceChild(span, font);
                    const range = document.createRange();
                    range.selectNodeContents(span);
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                }
            }
        }
    }
    this.saveSelection();
  }

  // --- FUNÇÕES DE AUXÍLIO E FUGA ---
  escapeSpecificTag(tagNames: string[]) {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      let currentNode: Node | null = range.startContainer;
      while (currentNode && currentNode.nodeName !== 'DIV' && !((currentNode as Element).classList && (currentNode as Element).classList.contains('postit-content-editable'))) {
          if (currentNode.nodeType === 1 && tagNames.includes(currentNode.nodeName)) {
              const zws = document.createTextNode('\u200B');
              if (currentNode.nextSibling) currentNode.parentNode?.insertBefore(zws, currentNode.nextSibling);
              else currentNode.parentNode?.appendChild(zws);
              const newRange = document.createRange();
              newRange.setStart(zws, 1);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              return; 
          }
          currentNode = currentNode.parentNode;
      }
      document.execCommand('removeFormat', false, '');
  }

  applyStyleAtCursor(styleProp: string, value: string) {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      const span = document.createElement('span');
      (span.style as any)[styleProp] = value;
      span.appendChild(document.createTextNode('\u200B'));
      const range = selection.getRangeAt(0);
      range.insertNode(span);
      const newRange = document.createRange();
      newRange.setStart(span.firstChild!, 1);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
  }

  performEscape(mode: string) {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      if (mode === 'all') {
          const anchorNode = selection.anchorNode;
          let editor = anchorNode ? (anchorNode.nodeType === 3 ? anchorNode.parentNode : anchorNode) as HTMLElement : null;
          while(editor && !editor.classList?.contains('postit-content-editable')) { editor = editor.parentElement; }
          if (editor) {
              const content = editor.textContent || '';
              const hasVisibleText = content.replace(/[\u200B\s\n\r]/g, '').length > 0;
              if (!hasVisibleText) {
                  editor.innerHTML = ''; 
                  this.resetDesiredState();
                  return;
              }
          }
      }
      const range = selection.getRangeAt(0);
      const zws = document.createTextNode('\u200B');
      range.insertNode(zws);
      const newRange = document.createRange();
      newRange.selectNode(zws);
      selection.removeAllRanges();
      selection.addRange(newRange);
      if (mode === 'all') {
          document.execCommand('removeFormat', false, '');
          document.execCommand('backColor', false, 'rgba(0,0,0,0)');
          document.execCommand('foreColor', false, '#000000');
      } else if (mode === 'highlight') {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand('backColor', false, 'rgba(0,0,0,0)');
      } else { document.execCommand(mode, false, ''); }
      selection.collapseToEnd();
  }

  resetFormatting() {
    this.restoreSelection();
    this.skipNextStatusCheck = true;
    this.resetDesiredState();
    this.performEscape('all');
    this.saveSelection();
  }

  insertSpanWithStyle(styleProp: string, value: string) { this.applyStyleAtCursor(styleProp, value); }
  
  toggleHighlightMenu(event?: MouseEvent) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    this.restoreSelection();
    this.showHighlightMenu = !this.showHighlightMenu;
    this.saveSelection();
  }

  saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer as HTMLElement;
      if (container.nodeType !== 1 && container.parentElement) container = container.parentElement;
      let insideEditor = false;
      let el: HTMLElement | null = container;
      while (el) {
        if (el.classList && el.classList.contains('postit-content-editable')) { insideEditor = true; break; }
        el = el.parentElement;
      }
      if (insideEditor) { this.savedRange = range.cloneRange(); }
    }
  }

  restoreSelection() {
    if (this.savedRange) {
      const selection = window.getSelection();
      if (selection) { selection.removeAllRanges(); selection.addRange(this.savedRange.cloneRange()); }
    }
  }

  updateContent(event: any, note: Note) { note.conteudo = event.target.innerHTML; }
  
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
  createNote() {
      const newNote: Note = { titulo: '', conteudo: '', cor: '#fff9c4', favorita: false, dataCriacao: new Date(), dataLembrete: null, isDateEditing: false };
      this.openNotes.unshift(newNote);
      this.activeNote = newNote;
      this.initializeEditors();
  }
  openNote(note: Note) {
      const alreadyOpen = this.openNotes.find(n => n.id === note.id);
      this.activeNote = note;
      if (!alreadyOpen) {
        const noteCopy = { ...note, isDateEditing: !!note.dataLembrete };
        this.openNotes.unshift(noteCopy);
        this.initializeEditors();
      }
  }
  initializeEditors() {
      setTimeout(() => {
        document.execCommand('defaultParagraphSeparator', false, 'br');
        const editors = document.querySelectorAll('.postit-content-editable');
        editors.forEach((el, idx) => {
          if (this.openNotes[idx] && el.innerHTML.trim() === '' && this.openNotes[idx].conteudo) {
               el.innerHTML = this.openNotes[idx].conteudo;
          }
        });
      }, 50);
  }
  closeNote(index: number) { this.openNotes.splice(index, 1); }
  saveNote(note: Note) {
      const noteToSave = { titulo: note.titulo, conteudo: note.conteudo, favorita: note.favorita || false, cor: note.cor, dataLembrete: note.dataLembrete };
      if (note.id) { this.noteService.updateNote(note.id, noteToSave).subscribe(() => this.loadNotes()); } 
      else { this.noteService.createNote(noteToSave).subscribe(() => { this.loadNotes(); this.closeNote(0); }); }
  }
  deleteNote(note: Note, index: number) { if (confirm('Tem certeza?')) { if (note.id) this.noteService.deleteNote(note.id).subscribe(() => { this.closeNote(index); this.loadNotes(); }); else this.closeNote(index); } }
  deleteFromSidebar(event: Event, note: Note) { event.stopPropagation(); if (note.id && confirm('Excluir?')) { this.noteService.deleteNote(note.id).subscribe(() => { this.loadNotes(); const idx = this.openNotes.findIndex(n => n.id === note.id); if (idx !== -1) this.closeNote(idx); }); } }
  changeNoteColor(note: Note, color: string) { note.cor = color; }
  toggleDateEdit(note: any) { note.isDateEditing = !note.isDateEditing; }
  updateReminderDate(note: any, newDate: string) { note.dataLembrete = newDate; }
  markAsDone(n?: Note) { if(n && n.id) { this.noteService.updateNote(n.id, {dataLembrete: null}).subscribe(()=>{this.loadNotes(); if(this.criticalNotes.length===1) this.showUrgentModal=false;}); this.criticalNotes=this.criticalNotes.filter(x=>x.id!==n.id); } else { this.criticalNotes.forEach(x=>{if(x.id)this.noteService.updateNote(x.id,{dataLembrete:null}).subscribe()}); this.criticalNotes=[]; this.showUrgentModal=false; setTimeout(()=>this.loadNotes(),500); } }
  snoozeTask() { this.alertManager.snooze(); this.showUrgentModal = false; }
  onSearch(event: any) { const t = event.target.value.toLowerCase(); this.noteService.getNotes().subscribe(all => { if(!t) { this.totalNotes=all.length; this.organizeNotes(all); return; } this.organizeNotes(all.filter(n=>(n.titulo?.toLowerCase().includes(t)||n.conteudo?.toLowerCase().includes(t)))); }); }
  getSafeHtml(html: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(html); }
}