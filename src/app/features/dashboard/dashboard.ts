import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../core/services/note.service';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { Note } from '../../core/models/note.model';
import { UserPlan, UserSubscription } from '../../core/models/user-plan.model';
import { TiltCardDirective } from '../../shared/directives/tilt-card.directive';
import { AlertManagerService } from '../../core/services/alert-manager.service';

// TIPTAP IMPORTS
import { TiptapEditorDirective } from 'ngx-tiptap';
import { Editor, Mark, mergeAttributes } from '@tiptap/core'; 
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';

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
  activeDrawerTab: 'profile' | 'security' | 'plans' = 'profile';

  // === PLANOS / ASSINATURA ===
  plans: UserPlan[] = [];
  currentSub: UserSubscription | null = null;
  plansLoading: boolean = false;
  planActionInProgress: boolean = false;
  planMsg: string = '';
  planMsgError: boolean = false;

  // === LIXEIRA ===
  isTrashOpen: boolean = false;
  trashNotes: Note[] = [];
  trashLoading: boolean = false;
  trashActionInProgress: boolean = false;

  // Limite do plano gratuito (o servidor é quem barra; aqui só exibimos)
  readonly FREE_NOTE_LIMIT = 10;

  // === SEGURANÇA (alterar senha) ===
  pwdForm = { atual: '', nova: '', confirmar: '' };
  pwdCriteria = { minLength: false, hasUpperCase: false, hasSpecialChar: false };
  pwdSaving: boolean = false;
  pwdMsg: string = '';
  pwdMsgError: boolean = false;

  // === NOTAS PROTEGIDAS ===
  unlockTarget: Note | null = null;   // nota aguardando senha para abrir
  unlockPwd: string = '';
  unlockBusy: boolean = false;
  unlockMsg: string = '';

  // === EXCLUIR CONTA (LGPD) ===
  showDeleteAccount: boolean = false;
  deleteAccountPwd: string = '';
  deleteAccountBusy: boolean = false;
  deleteAccountMsg: string = '';

  private readonly featureLabels: { [key: string]: string } = {
    protected_notes: 'Notas protegidas por senha',
    email_notifications: 'Notificações por e-mail',
    protected_trash: 'Lixeira protegida',
    unlimited_notes: 'Notas ilimitadas',
    export_notes: 'Exportar notas',
    custom_themes: 'Temas customizados',
    voice_access: 'Acesso por voz'
  };

  private readonly freePlanFeatures: string[] = [
    'Até 10 notas',
    'Notas com cores e lembretes',
    'Cards laterais com scroll',
    'Rascunho rápido'
  ];

  isMobileSidebarOpen: boolean = false; 
  isMobileDockExpanded: boolean = false;

  saveInProgress: boolean = false;
  saveSuccess: boolean = false;
  notesLoadError: boolean = false;

  userProfile = {
    name: 'Visitante',
    email: 'usuario@exemplo.com',
    bio: 'Organizando minhas ideias no BnotasWeb.',
    avatarUrl: 'https://ui-avatars.com/api/?name=User&background=6200ea&color=fff'
  };

  private readonly PROFILE_KEY_PREFIX = 'bnotas_profile_';

  constructor(
    private noteService: NoteService,
    private authService: AuthService,
    private subscriptionService: SubscriptionService,
    private alertManager: AlertManagerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user && user.email) {
      this.userName = user.email.split('@')[0];
      this.userProfile.email = user.email;
      this.userProfile.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=6200ea&color=fff`;
      this.loadProfile();
      this.userProfile.name = this.userProfile.name || this.userName;
      this.userName = this.userProfile.name;
    }
    this.loadPlans();
    this.loadSubscription();
    this.loadTrash();
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
  setActiveTab(tab: 'profile' | 'security' | 'plans') {
    this.activeDrawerTab = tab;
    this.planMsg = '';
    this.pwdMsg = '';
  }

  // ==========================================
  // PLANOS / ASSINATURA
  // ==========================================
  loadPlans() {
    this.plansLoading = true;
    this.subscriptionService.getPlans().subscribe({
      next: plans => { this.plans = plans; this.plansLoading = false; this.cdr.detectChanges(); },
      error: () => { this.plansLoading = false; this.cdr.detectChanges(); }
    });
  }

  loadSubscription() {
    this.subscriptionService.getCurrentSubscription().subscribe({
      next: sub => { this.currentSub = sub; this.cdr.detectChanges(); },
      error: () => { /* sem assinatura = plano grátis */ }
    });
  }

  get currentPlanId(): string {
    if (!this.currentSub || this.currentSub.status !== 'active') return 'free';
    return this.currentSub.planId;
  }

  getPlanFeatures(plan: UserPlan): string[] {
    if (!plan.features || plan.features.length === 0) return this.freePlanFeatures;
    return plan.features.map(f => this.featureLabels[f] || f);
  }

  subscribeToPlan(plan: UserPlan) {
    if (plan.id === this.currentPlanId || this.planActionInProgress) return;
    this.planActionInProgress = true;
    this.planMsg = '';
    this.subscriptionService.upgrade(plan.id).subscribe({
      next: sub => {
        this.currentSub = sub;
        this.planActionInProgress = false;
        this.planMsgError = false;
        this.planMsg = plan.price > 0 ? `Plano ${plan.name} ativado! 🎉` : 'Plano alterado para Gratuito.';
        this.cdr.detectChanges();
      },
      error: err => {
        this.planActionInProgress = false;
        this.planMsgError = true;
        this.planMsg = err?.error?.error?.message || 'Não foi possível alterar o plano. Tente novamente.';
        this.cdr.detectChanges();
      }
    });
  }

  cancelSubscription() {
    if (this.planActionInProgress) return;
    if (!confirm('Cancelar sua assinatura e voltar ao plano Gratuito?')) return;
    this.planActionInProgress = true;
    this.planMsg = '';
    this.subscriptionService.cancel().subscribe({
      next: sub => {
        this.currentSub = sub;
        this.planActionInProgress = false;
        this.planMsgError = false;
        this.planMsg = 'Assinatura cancelada. Você está no plano Gratuito.';
        this.cdr.detectChanges();
      },
      error: err => {
        this.planActionInProgress = false;
        this.planMsgError = true;
        this.planMsg = err?.error?.error?.message || 'Não foi possível cancelar. Tente novamente.';
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // EXCLUIR CONTA (LGPD)
  // ==========================================
  toggleDeleteAccount() {
    this.showDeleteAccount = !this.showDeleteAccount;
    this.deleteAccountPwd = '';
    this.deleteAccountMsg = '';
  }

  deleteAccount() {
    if (!this.deleteAccountPwd || this.deleteAccountBusy) return;
    if (!confirm('ATENÇÃO: sua conta e TODAS as suas notas serão excluídas para sempre. Essa ação não pode ser desfeita. Continuar?')) return;
    this.deleteAccountBusy = true;
    this.deleteAccountMsg = '';
    this.authService.deleteAccount(this.deleteAccountPwd).subscribe({
      next: () => {
        alert('Conta excluída. Sentiremos sua falta!');
        this.authService.logout();
      },
      error: err => {
        this.deleteAccountBusy = false;
        this.deleteAccountMsg = err?.error?.error?.message || 'Não foi possível excluir a conta.';
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // LIXEIRA
  // ==========================================
  get notesUsed(): number { return this.totalNotes + this.trashNotes.length; }
  get isFreePlan(): boolean { return this.currentPlanId === 'free'; }

  loadTrash() {
    this.trashLoading = true;
    this.noteService.getTrash().subscribe({
      next: notes => { this.trashNotes = notes; this.trashLoading = false; this.cdr.detectChanges(); },
      error: () => { this.trashLoading = false; this.cdr.detectChanges(); }
    });
  }

  openTrash() {
    this.isTrashOpen = true;
    this.loadTrash();
    if (this.isMobileSidebarOpen) this.isMobileSidebarOpen = false;
  }

  closeTrash() { this.isTrashOpen = false; }

  restoreNote(note: Note) {
    if (!note.id || this.trashActionInProgress) return;
    this.trashActionInProgress = true;
    this.noteService.restoreNote(note.id).subscribe({
      next: () => {
        this.trashNotes = this.trashNotes.filter(n => n.id !== note.id);
        this.trashActionInProgress = false;
        this.loadNotes();
        this.cdr.detectChanges();
      },
      error: () => { this.trashActionInProgress = false; this.cdr.detectChanges(); alert('Não foi possível restaurar a nota.'); }
    });
  }

  deleteNoteForever(note: Note) {
    if (!note.id || this.trashActionInProgress) return;
    if (!confirm(`Excluir "${note.titulo || 'Sem título'}" PERMANENTEMENTE? Essa ação não pode ser desfeita.`)) return;
    this.trashActionInProgress = true;
    this.noteService.deletePermanently(note.id).subscribe({
      next: () => {
        this.trashNotes = this.trashNotes.filter(n => n.id !== note.id);
        this.trashActionInProgress = false;
        this.cdr.detectChanges();
      },
      error: () => { this.trashActionInProgress = false; this.cdr.detectChanges(); alert('Não foi possível excluir a nota.'); }
    });
  }

  // ==========================================
  // SEGURANÇA — ALTERAR SENHA
  // ==========================================
  onNewPasswordInput() {
    const p = this.pwdForm.nova || '';
    this.pwdCriteria = {
      minLength: p.length >= 8,
      hasUpperCase: /[A-Z]/.test(p),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(p)
    };
  }

  get isNewPasswordStrong(): boolean {
    return this.pwdCriteria.minLength && this.pwdCriteria.hasUpperCase && this.pwdCriteria.hasSpecialChar;
  }

  get canSubmitPassword(): boolean {
    return !!this.pwdForm.atual && this.isNewPasswordStrong &&
           this.pwdForm.nova === this.pwdForm.confirmar && !this.pwdSaving;
  }

  changePassword() {
    if (!this.canSubmitPassword) return;
    this.pwdSaving = true;
    this.pwdMsg = '';
    this.authService.changePassword(this.pwdForm.atual, this.pwdForm.nova).subscribe({
      next: () => {
        this.pwdSaving = false;
        this.pwdMsgError = false;
        this.pwdMsg = 'Senha alterada com sucesso! ✓';
        this.pwdForm = { atual: '', nova: '', confirmar: '' };
        this.pwdCriteria = { minLength: false, hasUpperCase: false, hasSpecialChar: false };
        this.cdr.detectChanges();
      },
      error: err => {
        this.pwdSaving = false;
        this.pwdMsgError = true;
        this.pwdMsg = err?.error?.error?.message || 'Não foi possível alterar a senha.';
        this.cdr.detectChanges();
      }
    });
  }

  private getProfileKey(): string {
    const user = this.authService.getUser();
    const safe = user?.email?.replace(/[^a-zA-Z0-9]/g, '') ?? 'visitante';
    return `${this.PROFILE_KEY_PREFIX}${safe}`;
  }

  loadProfile(): void {
    const key = this.getProfileKey();
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw) as { name?: string; bio?: string; avatarUrl?: string };
        if (data.name) this.userProfile.name = data.name;
        if (data.bio != null) this.userProfile.bio = data.bio;
        if (data.avatarUrl) this.userProfile.avatarUrl = data.avatarUrl;
        this.userName = this.userProfile.name;
      }
    } catch (_) {}
  }

  saveProfile(): void {
    if (!this.userProfile.avatarUrl?.trim()) {
      this.userProfile.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userProfile.name || 'User')}&background=6200ea&color=fff`;
    }
    const key = this.getProfileKey();
    const data = {
      name: this.userProfile.name,
      bio: this.userProfile.bio,
      avatarUrl: this.userProfile.avatarUrl
    };
    localStorage.setItem(key, JSON.stringify(data));
    this.userName = this.userProfile.name;
    this.cdr.detectChanges();
    this.closeDrawer();
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
        next: (notes: Note[]) => {
          this.notesLoadError = false;
          this.totalNotes = notes.length;
          this.organizeNotes(notes);
          this.checkAlerts(notes);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.notesLoadError = true;
          this.noteGroups = [];
          this.totalNotes = 0;
          this.cdr.detectChanges();
          console.error('Erro ao carregar notas', err);
        }
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
      if (note.protegida) return '🔒 Conteúdo protegido';
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
      // Nota protegida: o conteúdo não veio na listagem — pede a senha primeiro
      if (note.protegida) {
        this.unlockTarget = note;
        this.unlockPwd = '';
        this.unlockMsg = '';
        if (this.isMobileSidebarOpen) this.isMobileSidebarOpen = false;
        return;
      }
      const noteCopy = { ...note, isDateEditing: !!note.dataLembrete };
      this.addNoteToOpenList(noteCopy);
      if (this.isMobileSidebarOpen) this.isMobileSidebarOpen = false;
  }

  // ==========================================
  // NOTAS PROTEGIDAS
  // ==========================================
  cancelUnlock() { this.unlockTarget = null; this.unlockPwd = ''; this.unlockMsg = ''; }

  confirmUnlock() {
    if (!this.unlockTarget?.id || !this.unlockPwd || this.unlockBusy) return;
    this.unlockBusy = true;
    this.unlockMsg = '';
    this.noteService.verifyNotePassword(this.unlockTarget.id, this.unlockPwd).subscribe({
      next: res => {
        this.unlockBusy = false;
        if (res.valid && res.note) {
          const noteCopy = { ...res.note, isDateEditing: !!res.note.dataLembrete };
          this.addNoteToOpenList(noteCopy);
          this.cancelUnlock();
        } else {
          this.unlockMsg = 'Senha incorreta.';
        }
        this.cdr.detectChanges();
      },
      error: err => {
        this.unlockBusy = false;
        this.unlockMsg = err?.error?.error?.message || 'Erro ao verificar a senha.';
        this.cdr.detectChanges();
      }
    });
  }

  toggleProtectPanel(n: any) {
    if (!n.id) { alert('Salve a nota primeiro para poder protegê-la.'); return; }
    n.showProtectPanel = !n.showProtectPanel;
    n.protMode = n.protMode || 'propria'; // recomendado: senha exclusiva
    n.protPwd = ''; n.protPwd2 = ''; n.protCurrentPwd = ''; n.protMsg = '';
  }

  protectNote(n: any) {
    if (n.protBusy) return;
    const body: any = {};
    if (n.protMode === 'conta') {
      body.usarSenhaConta = true;
    } else {
      if (!n.protPwd || n.protPwd.length < 4) { n.protMsg = 'A senha da nota deve ter pelo menos 4 caracteres.'; return; }
      if (n.protPwd !== n.protPwd2) { n.protMsg = 'As senhas não coincidem.'; return; }
      body.senha = n.protPwd;
    }
    n.protBusy = true; n.protMsg = '';
    this.noteService.updateNote(n.id, body).subscribe({
      next: () => {
        n.protBusy = false; n.protegida = true; n.showProtectPanel = false;
        this.loadNotes();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        n.protBusy = false;
        n.protMsg = err?.error?.error?.message || 'Não foi possível proteger a nota.';
        this.cdr.detectChanges();
      }
    });
  }

  unprotectNote(n: any) {
    if (n.protBusy) return;
    if (!n.protCurrentPwd) { n.protMsg = 'Digite a senha atual da nota para remover a proteção.'; return; }
    n.protBusy = true; n.protMsg = '';
    this.noteService.updateNote(n.id, { senha: null, senhaAtualNota: n.protCurrentPwd } as any).subscribe({
      next: () => {
        n.protBusy = false; n.protegida = false; n.showProtectPanel = false;
        this.loadNotes();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        n.protBusy = false;
        n.protMsg = err?.error?.error?.message || 'Senha incorreta.';
        this.cdr.detectChanges();
      }
    });
  }

  private addNoteToOpenList(note: any) {
    const editor = new Editor({
      extensions: [
        StarterKit, TextStyle, Color,
        Highlight.configure({ multicolor: true }),
        Underline, FontSize,
        TaskList, TaskItem.configure({ nested: true })
      ],
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
      if (this.saveInProgress) return;
      const noteToSave: any = { titulo: item.titulo, conteudo: item.conteudo, favorita: item.favorita || false, cor: item.cor, dataLembrete: item.dataLembrete || null };
      const afterSave = (savedNote: Note) => {
        item.originalContent = item.conteudo;
        if (!item.id && savedNote.id) item.id = savedNote.id;
        if (savedNote.dataCriacao) item.dataCriacao = savedNote.dataCriacao;
        this.saveInProgress = false;
        this.saveSuccess = true;
        setTimeout(() => (this.saveSuccess = false), 2500);
        this.loadNotes();
        this.cdr.detectChanges();
      };
      const onError = (err: any) => {
        this.saveInProgress = false;
        this.cdr.detectChanges();
        const msg = err?.error?.error?.message || err?.message || 'Erro de conexão';
        alert('Não foi possível salvar a nota.\n\n' + msg + '\n\nVerifique se o backend está rodando (npm start em localhost:3000) e se você está logado.');
      };
      this.saveInProgress = true;
      this.notesLoadError = false;
      if (item.id) {
        this.noteService.updateNote(item.id, noteToSave).subscribe({ next: () => afterSave(item), error: onError });
      } else {
        this.noteService.createNote(noteToSave).subscribe({ next: (newNote) => afterSave(newNote), error: onError });
      }
  }

  deleteNote(note: Note) {
    if (confirm('Mover esta nota para a lixeira?')) {
      if (note.id) this.noteService.deleteNote(note.id).subscribe(() => { this.closeNote(note); this.loadNotes(); this.loadTrash(); });
      else this.closeNote(note);
    }
  }

  deleteFromSidebar(event: Event, note: Note) {
    event.stopPropagation();
    if (note.id && confirm('Mover para a lixeira?')) {
      this.noteService.deleteNote(note.id).subscribe(() => { this.loadNotes(); this.loadTrash(); this.openNotes = this.openNotes.filter(n => n.id !== note.id); });
    }
  }

  changeFontSize(editor: Editor, event: any) { editor.chain().focus().setFontSize(event.target.value).run(); }
  changeNoteColor(note: any, color: string) { note.cor = color; }
  toggleDateEdit(note: any) { note.isDateEditing = !note.isDateEditing; }
  updateReminderDate(note: any, newDate: string) { note.dataLembrete = newDate; }
  
  markAsDone(n?: Note) { 
    if(n&&n.id){this.noteService.updateNote(n.id,{dataLembrete:null}).subscribe(()=>{this.loadNotes();if(this.criticalNotes.length===1)this.showUrgentModal=false;});this.criticalNotes=this.criticalNotes.filter(x=>x.id!==n.id);}
    else{this.criticalNotes.forEach(x=>{if(x.id)this.noteService.updateNote(x.id,{dataLembrete:null}).subscribe()});this.criticalNotes=[];this.showUrgentModal=false;setTimeout(()=>this.loadNotes(),500);} 
  }
  snoozeTask() { this.alertManager.snooze(); this.showUrgentModal = false; }
  onSearch(event: any) { const t = event.target.value.toLowerCase(); this.noteService.getNotes().subscribe(all => { if(!t) { this.totalNotes=all.length; this.organizeNotes(all); return; } this.organizeNotes(all.filter(n=>(n.titulo?.toLowerCase().includes(t)||n.conteudo?.toLowerCase().includes(t)))); }); }
}