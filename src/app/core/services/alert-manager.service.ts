import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AlertManagerService {
  private temUrgenciaSource = new BehaviorSubject<boolean>(false);
  temUrgencia$ = this.temUrgenciaSource.asObservable();

  constructor() { }

  ativarAlerta(status: boolean) {
    this.temUrgenciaSource.next(status);
  }

  deveAbrirModal(): boolean {
    const ultimoSnooze = localStorage.getItem('bnotas_snooze_time');
    if (!ultimoSnooze) return true; 

    const agora = new Date().getTime();
    const tempoIgnorado = parseInt(ultimoSnooze, 10);
    const diferencaMinutos = (agora - tempoIgnorado) / (1000 * 60);

    return diferencaMinutos >= 5;
  }

  snooze() {
    localStorage.setItem('bnotas_snooze_time', new Date().getTime().toString());
  }

  limpar() {
    this.temUrgenciaSource.next(false);
    localStorage.removeItem('bnotas_snooze_time');
  }
}