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

  // === URGÊNCIA DOS LEMBRETES ===
  // "agora" é atualizado por um relógio interno para os avisos mudarem sozinhos,
  // sem precisar recarregar a página.
  agora: number = Date.now();
  private relogio: any = null;
  private readonly UMA_HORA = 3600 * 1000;
  private readonly UM_DIA = 24 * this.UMA_HORA;
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

  // === ADMIN (conta de testes — flag vem do banco, nunca do código) ===
  isAdmin: boolean = false;

  // === CONFIRMAÇÃO DE E-MAIL ===
  emailVerificado: boolean = true;   // assume verificado até o perfil dizer o contrário
  reenviandoVerificacao: boolean = false;
  avisoVerificacaoFechado: boolean = false;
  msgVerificacao: string = '';

  // === 2FA (autenticação de dois fatores) ===
  twoFAEnabled: boolean = false;
  twoFASetup: { qrCode: string; secret: string } | null = null;
  twoFACode: string = '';
  twoFADisablePwd: string = '';
  twoFADisableCode: string = '';
  twoFABusy: boolean = false;
  twoFAMsg: string = '';
  twoFAMsgError: boolean = false;
  twoFABackupCodes: string[] = []; // mostrados UMA vez após ativar

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
    this.load2FAStatus();
    this.initDarkMode();
    this.loadProfileFromServer();
    this.handlePaymentReturn();
    this.iniciarRelogioDeUrgencia();
    this.loadScratchpad();
    this.loadNotes();
    this.availableColors.forEach(c => this.stackIndices[c] = 0);
  }

  ngOnDestroy(): void {
    this.openNotes.forEach(note => { if (note.editor) note.editor.destroy(); });
    if (this.relogio) clearInterval(this.relogio);
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

  subscribeToPlan(plan: UserPlan, periodo: 'mensal' | 'anual' = 'mensal') {
    if (plan.id === this.currentPlanId || this.planActionInProgress) return;
    this.planActionInProgress = true;
    this.planMsg = '';

    // Plano pago: cria a cobrança e envia o usuário ao checkout do Mercado Pago.
    // O plano só ativa quando o pagamento for confirmado pelo servidor.
    if (plan.price > 0) {
      this.subscriptionService.checkout(plan.id, periodo).subscribe({
        next: res => { window.location.href = res.checkoutUrl; },
        error: err => {
          this.planActionInProgress = false;
          this.planMsgError = true;
          this.planMsg = err?.error?.error?.message || 'Não foi possível iniciar o pagamento.';
          this.cdr.detectChanges();
        }
      });
      return;
    }

    // Voltar para o Gratuito (sem pagamento)
    this.subscriptionService.upgrade(plan.id).subscribe({
      next: sub => {
        this.currentSub = sub;
        this.planActionInProgress = false;
        this.planMsgError = false;
        this.planMsg = 'Plano alterado para Gratuito.';
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

  // Retorno do checkout do Mercado Pago (?pagamento=sucesso&payment_id=...)
  private handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('pagamento');
    if (!status) return;

    const paymentId = params.get('payment_id') || params.get('collection_id');
    window.history.replaceState({}, '', '/dashboard'); // limpa a URL

    if (status === 'sucesso' && paymentId) {
      this.isDrawerOpen = true;
      this.activeDrawerTab = 'plans';
      this.planMsg = 'Confirmando seu pagamento...';
      this.subscriptionService.confirmPayment(paymentId).subscribe({
        next: res => {
          this.planMsgError = false;
          this.planMsg = res.activated ? 'Pagamento aprovado! Plano ativado. 🎉' : `Pagamento em processamento (${res.status}). O plano ativa assim que aprovar.`;
          this.loadSubscription();
          this.cdr.detectChanges();
        },
        error: err => {
          this.planMsgError = true;
          this.planMsg = err?.error?.error?.message || 'Não foi possível confirmar o pagamento. Se você pagou, o plano ativa em instantes.';
          this.cdr.detectChanges();
        }
      });
    } else if (status === 'falha') {
      this.isDrawerOpen = true;
      this.activeDrawerTab = 'plans';
      this.planMsgError = true;
      this.planMsg = 'Pagamento não concluído. Nenhum valor foi cobrado.';
    } else if (status === 'pendente') {
      this.isDrawerOpen = true;
      this.activeDrawerTab = 'plans';
      this.planMsgError = false;
      this.planMsg = 'Pagamento pendente (ex.: Pix aguardando). O plano ativa quando compensar.';
    }
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
  // 2FA — AUTENTICAÇÃO DE DOIS FATORES
  // ==========================================
  load2FAStatus() {
    this.authService.get2FAStatus().subscribe({
      next: s => { this.twoFAEnabled = s.enabled; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  start2FASetup() {
    if (this.twoFABusy) return;
    this.twoFABusy = true; this.twoFAMsg = '';
    this.authService.setup2FA().subscribe({
      next: res => { this.twoFASetup = res; this.twoFACode = ''; this.twoFABusy = false; this.cdr.detectChanges(); },
      error: err => {
        this.twoFABusy = false; this.twoFAMsgError = true;
        this.twoFAMsg = err?.error?.error?.message || 'Erro ao gerar o QR code.';
        this.cdr.detectChanges();
      }
    });
  }

  confirm2FA() {
    if (this.twoFACode.length !== 6 || this.twoFABusy) return;
    this.twoFABusy = true; this.twoFAMsg = '';
    this.authService.enable2FA(this.twoFACode).subscribe({
      next: (res) => {
        this.twoFABusy = false; this.twoFAEnabled = true; this.twoFASetup = null;
        this.twoFABackupCodes = res.backupCodes || [];
        this.twoFAMsgError = false; this.twoFAMsg = '2FA ativado! Guarde os códigos de backup abaixo. ✓';
        this.cdr.detectChanges();
      },
      error: err => {
        this.twoFABusy = false; this.twoFAMsgError = true;
        this.twoFAMsg = err?.error?.error?.message || 'Código incorreto.';
        this.cdr.detectChanges();
      }
    });
  }

  cancel2FASetup() { this.twoFASetup = null; this.twoFACode = ''; this.twoFAMsg = ''; }

  copyBackupCodes() {
    navigator.clipboard?.writeText(this.twoFABackupCodes.join('\n')).then(() => alert('Códigos copiados! Guarde em local seguro.'));
  }

  dismissBackupCodes() {
    if (confirm('Você salvou os códigos? Eles NÃO serão mostrados de novo.')) this.twoFABackupCodes = [];
  }

  disable2FA() {
    if (!this.twoFADisablePwd || this.twoFADisableCode.length !== 6 || this.twoFABusy) return;
    if (!confirm('Desativar a verificação em duas etapas? Sua conta ficará menos protegida.')) return;
    this.twoFABusy = true; this.twoFAMsg = '';
    this.authService.disable2FA(this.twoFADisablePwd, this.twoFADisableCode).subscribe({
      next: () => {
        this.twoFABusy = false; this.twoFAEnabled = false;
        this.twoFADisablePwd = ''; this.twoFADisableCode = '';
        this.twoFAMsgError = false; this.twoFAMsg = '2FA desativado.';
        this.cdr.detectChanges();
      },
      error: err => {
        this.twoFABusy = false; this.twoFAMsgError = true;
        this.twoFAMsg = err?.error?.error?.message || 'Não foi possível desativar.';
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
  // Admin (flag no banco) enxerga o app como plano pago completo
  get isFreePlan(): boolean { return !this.isAdmin && this.currentPlanId === 'free'; }

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

  // ==========================================
  // CONFIRMAÇÃO DE E-MAIL
  // ==========================================
  get precisaConfirmarEmail(): boolean {
    return !this.emailVerificado && !this.avisoVerificacaoFechado;
  }

  fecharAvisoVerificacao() { this.avisoVerificacaoFechado = true; }

  reenviarVerificacao() {
    if (this.reenviandoVerificacao) return;
    this.reenviandoVerificacao = true;
    this.msgVerificacao = '';
    this.authService.reenviarVerificacao().subscribe({
      next: () => {
        this.reenviandoVerificacao = false;
        this.msgVerificacao = 'Enviamos um novo link. Confira sua caixa de entrada (e o spam).';
        this.cdr.detectChanges();
      },
      error: err => {
        this.reenviandoVerificacao = false;
        this.msgVerificacao = err?.error?.error?.message || 'Não foi possível enviar agora. Tente mais tarde.';
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // FOTO DE PERFIL (arquivo do computador)
  // ==========================================
  fotoProcessando: boolean = false;
  fotoErro: string = '';

  /**
   * Recebe o arquivo escolhido, reduz para 256x256 e converte em JPEG.
   * Reduzir no navegador evita mandar uma foto de 5 MB para o servidor — e, de
   * quebra, o redesenho descarta os metadados da imagem (data, modelo da câmera
   * e localização de GPS, que fotos de celular costumam carregar).
   */
  onFotoSelecionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    this.fotoErro = '';

    if (!arquivo.type.startsWith('image/')) {
      this.fotoErro = 'Escolha um arquivo de imagem (JPG, PNG ou WEBP).';
      input.value = '';
      return;
    }
    if (arquivo.size > 10 * 1024 * 1024) {
      this.fotoErro = 'Imagem muito grande (máximo 10 MB).';
      input.value = '';
      return;
    }

    this.fotoProcessando = true;
    const leitor = new FileReader();

    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const LADO = 256;
        const canvas = document.createElement('canvas');
        canvas.width = LADO;
        canvas.height = LADO;
        const ctx = canvas.getContext('2d')!;

        // Recorta o centro da foto para o quadrado não distorcer
        const menorLado = Math.min(img.width, img.height);
        const x = (img.width - menorLado) / 2;
        const y = (img.height - menorLado) / 2;
        ctx.drawImage(img, x, y, menorLado, menorLado, 0, 0, LADO, LADO);

        this.userProfile.avatarUrl = canvas.toDataURL('image/jpeg', 0.85);
        this.fotoProcessando = false;
        input.value = '';
        this.cdr.detectChanges();
      };
      img.onerror = () => {
        this.fotoProcessando = false;
        this.fotoErro = 'Não foi possível ler esta imagem.';
        input.value = '';
        this.cdr.detectChanges();
      };
      img.src = leitor.result as string;
    };

    leitor.onerror = () => {
      this.fotoProcessando = false;
      this.fotoErro = 'Falha ao abrir o arquivo.';
      this.cdr.detectChanges();
    };

    leitor.readAsDataURL(arquivo);
  }

  removerFoto() {
    this.userProfile.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userProfile.name || 'User')}&background=6200ea&color=fff`;
    this.fotoErro = '';
  }

  get fotoEhArquivo(): boolean {
    return (this.userProfile.avatarUrl || '').startsWith('data:');
  }

  // Perfil agora vive no SERVIDOR (localStorage vira só cache)
  loadProfileFromServer(): void {
    this.authService.getPerfil().subscribe({
      next: p => {
        this.isAdmin = !!p.isAdmin;
        this.emailVerificado = p.emailVerificado !== false;
        if (p.nome) { this.userProfile.name = p.nome; this.userName = p.nome; }
        if (p.bio != null) this.userProfile.bio = p.bio;
        if (p.avatarUrl) this.userProfile.avatarUrl = p.avatarUrl;
        this.cdr.detectChanges();
      },
      error: () => {} // sem conexão: fica com o cache local
    });
  }

  saveProfile(): void {
    if (!this.userProfile.avatarUrl?.trim()) {
      this.userProfile.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userProfile.name || 'User')}&background=6200ea&color=fff`;
    }
    const data = {
      nome: this.userProfile.name,
      bio: this.userProfile.bio,
      avatarUrl: this.userProfile.avatarUrl
    };
    this.authService.updatePerfil(data).subscribe({
      next: () => {},
      error: () => alert('Perfil salvo apenas neste navegador (sem conexão com o servidor).')
    });
    localStorage.setItem(this.getProfileKey(), JSON.stringify({ name: data.nome, bio: data.bio, avatarUrl: data.avatarUrl }));
    this.userName = this.userProfile.name;
    this.cdr.detectChanges();
    this.closeDrawer();
  }

  // Confirmação de saída em modal próprio.
  // O confirm() do navegador é engolido quando o usuário marca "impedir que esta
  // página crie caixas de diálogo" — aí ele devolve false e o botão parece morto.
  mostrarConfirmSaida: boolean = false;

  logout() { this.mostrarConfirmSaida = true; }
  cancelarSaida() { this.mostrarConfirmSaida = false; }
  confirmarSaida() {
    this.mostrarConfirmSaida = false;
    this.authService.logout();
  }

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
          this.todasAsNotas = notes;
          this.agora = Date.now();
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
      this.reordenarPorUrgencia();
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

  // ==========================================
  // URGÊNCIA DOS LEMBRETES
  // ==========================================

  /** Quanto falta (ou faz) em milissegundos. null = nota sem lembrete. */
  private prazoDe(note: Note): number | null {
    if (!note?.dataLembrete) return null;
    const t = new Date(note.dataLembrete).getTime();
    return Number.isNaN(t) ? null : t - this.agora;
  }

  /** Classifica a nota para colorir e ordenar: quanto menor o número, mais urgente. */
  urgenciaDe(note: Note): 'vencida' | 'agora' | 'hoje' | 'semana' | null {
    const falta = this.prazoDe(note);
    if (falta === null) return null;
    if (falta < 0) return 'vencida';
    if (falta <= 2 * this.UMA_HORA) return 'agora';   // menos de 2h
    if (falta <= this.UM_DIA) return 'hoje';
    if (falta <= 7 * this.UM_DIA) return 'semana';
    return null;
  }

  private pesoUrgencia(note: Note): number {
    const u = this.urgenciaDe(note);
    return u === 'vencida' ? 0 : u === 'agora' ? 1 : u === 'hoje' ? 2 : u === 'semana' ? 3 : 4;
  }

  /** Texto curto para o card: "faltam 3h", "vencida há 2 dias". */
  tempoRestante(note: Note): string {
    const falta = this.prazoDe(note);
    if (falta === null) return '';
    const venceu = falta < 0;
    const ms = Math.abs(falta);
    const dias = Math.floor(ms / this.UM_DIA);
    const horas = Math.floor(ms / this.UMA_HORA);
    const min = Math.floor(ms / 60000);

    let quanto: string;
    if (dias >= 1) quanto = `${dias} dia${dias > 1 ? 's' : ''}`;
    else if (horas >= 1) quanto = `${horas}h`;
    else quanto = `${Math.max(min, 1)} min`;

    return venceu ? `vencida há ${quanto}` : `faltam ${quanto}`;
  }

  /** Um grupo (cor) fica marcado se qualquer nota dele estiver em alerta. */
  grupoTemUrgencia(group: any): boolean {
    return group?.notes?.some((n: Note) => ['vencida', 'agora'].includes(this.urgenciaDe(n) as string));
  }

  /** Relógio: reavalia os prazos de tempo em tempo, sem recarregar a página. */
  private iniciarRelogioDeUrgencia() {
    this.relogio = setInterval(() => {
      this.agora = Date.now();
      this.reordenarPorUrgencia();
      this.checkAlerts(this.todasAsNotas);
      this.cdr.detectChanges();
    }, 30000);
  }

  private todasAsNotas: Note[] = [];

  /** Ordena as urgentes primeiro — dentro de cada cor e entre as cores. */
  private reordenarPorUrgencia() {
    this.noteGroups.forEach(g => {
      g.notes.sort((a: Note, b: Note) => {
        const d = this.pesoUrgencia(a) - this.pesoUrgencia(b);
        if (d !== 0) return d;
        const pa = this.prazoDe(a), pb = this.prazoDe(b);
        if (pa !== null && pb !== null) return pa - pb;   // prazo mais próximo primeiro
        if (pa !== null) return -1;
        if (pb !== null) return 1;
        return 0;
      });
      // o card em destaque do deck volta a ser o primeiro (o mais urgente)
      if (this.grupoTemUrgencia(g)) g.activeIndex = 0;
    });

    // grupos com nota urgente aparecem antes
    this.noteGroups.sort((a, b) => {
      const ua = Math.min(...a.notes.map((n: Note) => this.pesoUrgencia(n)));
      const ub = Math.min(...b.notes.map((n: Note) => this.pesoUrgencia(n)));
      return ua - ub;
    });
  }

  // Enquanto true, o relógio não reabre o aviso — o usuário já o viu e fechou
  private alertaDispensado: boolean = false;

  checkAlerts(notes: Note[]) {
      // Entram no aviso as vencidas E as que estão a menos de 2 horas do prazo —
      // antes só aparecia depois de estourar, quando já não dava para agir.
      const alertas = notes.filter(n => ['vencida', 'agora'].includes(this.urgenciaDe(n) as string));

      if (alertas.length === 0) {
        this.showUrgentModal = false;
        this.alertaDispensado = false;
        return;
      }

      // Não interrompe quem está no meio de outra coisa: o aviso cobre a tela inteira
      // e reabri-lo sozinho travaria o uso das configurações, da lixeira ou do desbloqueio.
      if (this.alertaDispensado || this.isDrawerOpen || this.isTrashOpen || this.unlockTarget) return;

      if (this.alertManager.deveAbrirModal()) {
        this.criticalNotes = alertas;
        this.showUrgentModal = true;
      }
  }

  fecharAlerta() {
    this.showUrgentModal = false;
    this.alertaDispensado = true;
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
  snoozeTask() { this.alertManager.snooze(); this.fecharAlerta(); }
  // Busca no SERVIDOR com debounce (não baixa mais todas as notas)
  private searchTimer: any = null;
  onSearch(event: any) {
    const t = event.target.value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.noteService.getNotes(t).subscribe(notes => {
        if (!t) this.totalNotes = notes.length;
        this.organizeNotes(notes);
        this.cdr.detectChanges();
      });
    }, 300);
  }

  // ==========================================
  // MODO ESCURO
  // ==========================================
  isDarkMode: boolean = false;

  initDarkMode() {
    this.isDarkMode = localStorage.getItem('bnotas_dark') === '1';
    document.body.classList.toggle('dark-theme', this.isDarkMode);
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('bnotas_dark', this.isDarkMode ? '1' : '0');
    document.body.classList.toggle('dark-theme', this.isDarkMode);
  }

  // ==========================================
  // EXPORTAR NOTAS (.md)
  // ==========================================
  private htmlToMarkdown(html: string): string {
    let s = html || '';
    s = s.replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
         .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')
         .replace(/<u>(.*?)<\/u>/gi, '_$1_')
         .replace(/<li[^>]*data-checked="true"[^>]*>/gi, '\n- [x] ')
         .replace(/<li[^>]*data-checked="false"[^>]*>/gi, '\n- [ ] ')
         .replace(/<li[^>]*>/gi, '\n- ')
         .replace(/<\/p>|<br\s*\/?>/gi, '\n');
    const div = document.createElement('div');
    div.innerHTML = s;
    return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  private downloadFile(nome: string, conteudo: string) {
    const blob = new Blob([conteudo], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  exportNote(n: any) {
    if (this.isFreePlan) { alert('Exportar notas é um recurso dos planos pagos. Faça upgrade na aba Planos. 🚀'); return; }
    const md = `# ${n.titulo || 'Sem título'}\n\n${this.htmlToMarkdown(n.conteudo)}\n`;
    this.downloadFile(`${(n.titulo || 'nota').replace(/[^\w\sà-ú-]/gi, '')}.md`, md);
  }

  // O arquivo é gerado pelo SERVIDOR, que valida o plano — a tela só baixa o resultado
  exportAllNotes() {
    this.noteService.exportNotes().subscribe({
      next: md => this.downloadFile('minhas-notas-bnotasweb.md', md),
      error: err => alert(err?.error?.error?.message || 'Exportar notas é um recurso dos planos pagos. Faça upgrade na aba Planos. 🚀')
    });
  }

  // ==========================================
  // DITADO POR VOZ (plano Pro)
  // ==========================================
  voiceActiveFor: any = null;
  private recognition: any = null;

  toggleVoice(n: any) {
    if (!this.isAdmin && this.currentPlanId !== 'pro') { alert('Ditado por voz é exclusivo do plano Pro. Faça upgrade na aba Planos. 🎤'); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Seu navegador não suporta ditado por voz. Use Chrome ou Edge.'); return; }

    if (this.voiceActiveFor === n) {
      this.recognition?.stop();
      this.voiceActiveFor = null;
      return;
    }
    this.recognition?.stop();

    const r = new SR();
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e: any) => {
      const texto = e.results[e.results.length - 1][0].transcript;
      n.editor?.commands.insertContent(texto + ' ');
      n.conteudo = n.editor?.getHTML();
    };
    r.onerror = () => { this.voiceActiveFor = null; this.cdr.detectChanges(); };
    r.onend = () => { if (this.voiceActiveFor === n) { this.voiceActiveFor = null; this.cdr.detectChanges(); } };
    r.start();
    this.recognition = r;
    this.voiceActiveFor = n;
  }

  // ==========================================
  // COMPARTILHAR POR LINK
  // ==========================================
  shareNote(n: any) {
    if (!n.id) { alert('Salve a nota primeiro.'); return; }
    if (n.protegida) { alert('Notas protegidas por senha não podem ser compartilhadas.'); return; }

    if (n.shareToken) {
      const copiar = confirm('Esta nota já tem um link público.\n\nOK = copiar o link novamente\nCancelar = REVOGAR o link (ninguém mais acessa)');
      if (copiar) {
        this.copyShareLink(n.shareToken);
      } else {
        this.noteService.unshareNote(n.id).subscribe(() => { n.shareToken = undefined; this.loadNotes(); alert('Link revogado. A nota voltou a ser privada.'); });
      }
      return;
    }

    this.noteService.shareNote(n.id).subscribe({
      next: res => { n.shareToken = res.shareToken; this.copyShareLink(res.shareToken); this.loadNotes(); },
      error: err => alert(err?.error?.error?.message || 'Não foi possível gerar o link.')
    });
  }

  private copyShareLink(token: string) {
    const url = `${location.origin}/n/${token}`;
    navigator.clipboard?.writeText(url).then(
      () => alert('Link copiado! 🔗\n\nQualquer pessoa com este link pode LER a nota (sem editar):\n' + url),
      () => alert('Link público da nota:\n' + url)
    );
  }
}