export interface Note {
  id?: number;
  titulo: string;
  conteudo: string;
  favorita: boolean;
  dataCriacao?: string;
  dataModificacao?: string;
  cor?: string;
  isCollapsed?: boolean;
}