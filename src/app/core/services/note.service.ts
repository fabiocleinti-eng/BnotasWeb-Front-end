import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Note } from '../models/note.model';
import { API_URL } from '../api.config';

@Injectable({
  providedIn: 'root' // <--- ISSO É O QUE O ANGULAR PRECISA PARA FUNCIONAR
})
export class NoteService {

  constructor(private http: HttpClient) { }

  // Busca feita no SERVIDOR quando q é informado
  getNotes(q?: string): Observable<Note[]> {
    const params = q && q.trim() ? { params: { q: q.trim() } } : {};
    return this.http.get<Note[]>(`${API_URL}/anotacoes`, params);
  }

  // === COMPARTILHAR POR LINK ===
  shareNote(id: number): Observable<{ shareToken: string }> {
    return this.http.post<{ shareToken: string }>(`${API_URL}/anotacoes/${id}/share`, {});
  }

  unshareNote(id: number): Observable<{ shareToken: null }> {
    return this.http.delete<{ shareToken: null }>(`${API_URL}/anotacoes/${id}/share`);
  }

  getPublicNote(token: string): Observable<{ titulo: string; cor: string; dataModificacao: string; conteudo: string }> {
    return this.http.get<any>(`${API_URL}/public/anotacoes/${token}`);
  }

  createNote(note: Partial<Note> & { titulo: string; conteudo: string; favorita: boolean }): Observable<Note> {
    const body = {
      titulo: note.titulo,
      conteudo: note.conteudo,
      favorita: note.favorita ?? false,
      cor: note.cor ?? undefined,
      dataLembrete: note.dataLembrete ?? undefined
    };
    return this.http.post<Note>(`${API_URL}/anotacoes`, body);
  }

  updateNote(id: number, note: Partial<Note>): Observable<Note> {
    return this.http.put<Note>(`${API_URL}/anotacoes/${id}`, note);
  }

  // Move para a lixeira (soft delete no servidor)
  deleteNote(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/anotacoes/${id}`);
  }

  // === NOTAS PROTEGIDAS ===
  // Verifica a senha; se correta, o servidor devolve a nota completa (com conteúdo)
  verifyNotePassword(id: number, senha: string): Observable<{ valid: boolean; note?: Note }> {
    return this.http.post<{ valid: boolean; note?: Note }>(`${API_URL}/anotacoes/${id}/verify-password`, { senha });
  }

  // === LIXEIRA ===
  getTrash(): Observable<Note[]> {
    return this.http.get<Note[]>(`${API_URL}/anotacoes/trash`);
  }

  restoreNote(id: number): Observable<Note> {
    return this.http.post<Note>(`${API_URL}/anotacoes/${id}/restore`, {});
  }

  deletePermanently(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/anotacoes/${id}/permanent`);
  }
}