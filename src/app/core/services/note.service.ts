import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Note } from '../models/note.model';

const API_URL = 'http://localhost:3000/api';

@Injectable({
  providedIn: 'root' // <--- ISSO É O QUE O ANGULAR PRECISA PARA FUNCIONAR
})
export class NoteService {

  constructor(private http: HttpClient) { }

  getNotes(): Observable<Note[]> {
    return this.http.get<Note[]>(`${API_URL}/anotacoes`);
  }

  createNote(note: { titulo: string; conteudo: string; favorita: boolean }): Observable<Note> {
    return this.http.post<Note>(`${API_URL}/anotacoes`, note);
  }

  updateNote(id: number, note: Partial<Note>): Observable<Note> {
    return this.http.put<Note>(`${API_URL}/anotacoes/${id}`, note);
  }

  deleteNote(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/anotacoes/${id}`);
  }
}