export interface Note {
  id?: number;
  titulo: string;
  conteudo: string;
  favorita: boolean;
  cor?: string;
  dataCriacao?: string | Date;
  dataModificacao?: string | Date;
  dataLembrete?: string | null;
  qtdReagendamentos?: number; // <--- AGORA É NÚMERO
  isCollapsed?: boolean;
  isDateEditing?: boolean;
}