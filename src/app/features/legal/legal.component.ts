import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <h1>Termos de Uso e Política de Privacidade</h1>
        <p class="legal-updated">Última atualização: 07 de julho de 2026</p>

        <h2>1. O serviço</h2>
        <p>O BnotasWeb é um bloco de notas online. Ao criar uma conta, você concorda com estes termos.
        O serviço é fornecido "como está"; fazemos o possível para mantê-lo disponível e seguro,
        mas recomendamos que você mantenha cópias de informações críticas.</p>

        <h2>2. Sua conta</h2>
        <p>Você é responsável por manter sua senha em sigilo. Use uma senha forte e não a reutilize
        de outros serviços. Podemos encerrar contas que violem estes termos ou usem o serviço
        para fins ilegais.</p>

        <h2>3. Dados que coletamos (LGPD)</h2>
        <ul>
          <li><b>Dados de cadastro:</b> nome, sobrenome, e-mail e telefone (opcional) — usados para autenticação e comunicação sobre a sua conta.</li>
          <li><b>Conteúdo:</b> suas notas, cores, tags e lembretes — usados apenas para prestar o serviço. Não lemos, vendemos nem compartilhamos seu conteúdo.</li>
          <li><b>E-mails de lembrete:</b> enviados apenas quando você define uma data de lembrete em uma nota.</li>
        </ul>

        <h2>4. Seus direitos (LGPD — Lei 13.709/2018)</h2>
        <ul>
          <li><b>Acesso e correção:</b> você pode ver e editar seus dados no próprio aplicativo.</li>
          <li><b>Eliminação:</b> você pode excluir sua conta e todos os seus dados a qualquer momento em Configurações → Segurança → Excluir minha conta. A exclusão é imediata e irreversível.</li>
          <li><b>Portabilidade:</b> em breve você poderá exportar suas notas.</li>
        </ul>

        <h2>5. Pagamentos</h2>
        <p>Os planos pagos são cobrados de forma recorrente e podem ser cancelados a qualquer momento
        em Configurações → Planos. Ao cancelar, sua conta volta ao plano gratuito ao fim do período pago.</p>

        <h2>6. Contato</h2>
        <p>Dúvidas sobre estes termos ou sobre seus dados: <b>fabioclein.ti&#64;gmail.com</b></p>

        <a routerLink="/login" class="legal-back">← Voltar ao login</a>
      </div>
    </div>
  `,
  styles: [`
    .legal-page { min-height: 100vh; background: #f8f9fa; padding: 40px 20px; font-family: 'Segoe UI', sans-serif; }
    .legal-container { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    h1 { color: #6200ea; font-size: 1.6rem; margin-top: 0; }
    .legal-updated { color: #999; font-size: 0.85rem; }
    h2 { color: #333; font-size: 1.1rem; margin-top: 24px; }
    p, li { color: #555; font-size: 0.95rem; line-height: 1.7; }
    ul { padding-left: 20px; }
    .legal-back { display: inline-block; margin-top: 24px; color: #6200ea; font-weight: 600; text-decoration: none; }
    .legal-back:hover { text-decoration: underline; }
  `]
})
export class LegalComponent {}
