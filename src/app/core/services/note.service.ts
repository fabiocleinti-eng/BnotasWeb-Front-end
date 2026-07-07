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

  getNotes(): Observable<Note[]> {
    return this.http.get<Note[]>(`${API_URL}/anotacoes`);
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