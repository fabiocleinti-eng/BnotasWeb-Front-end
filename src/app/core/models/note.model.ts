export interface Note {
  id?: number;
  titulo: string;
  conteudo: string;
  favorita: boolean;
  cor?: string;
  dataCriacao?: string | Date;
  dataModificacao?: string | Date;
  dataLembrete?: string | null;
  qtdReagendamentos?: number;
  isCollapsed?: boolean;
  isDateEditing?: boolean;
  tags?: string[]; // Sistema de Tags
  deletado?: boolean; // Para lixeira
  dataExclusao?: Date; // Data de exclusão
  senha?: string; // Para notas protegidas (funcionalidade paga)
  protegida?: boolean; // Indica nota protegida (conteúdo só vem após verificar a senha)
  shareToken?: string; // Token do link público (se compartilhada)
}