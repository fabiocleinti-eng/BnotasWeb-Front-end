export interface Note {
  id?: number;
  titulo: string;
  conteudo: string;
  favorita: boolean;
  cor?: string;
  dataCriacao?: string | Date;
  dataModificacao?: string | Date;
  dataLembrete?: string | null; // <--- CAMPO NOVO
  isCollapsed?: boolean; // Controle visual (não vai pro banco)
}