import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserPlan, UserSubscription } from '../models/user-plan.model';
import { API_URL } from '../api.config';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {

  constructor(private http: HttpClient) { }

  getPlans(): Observable<UserPlan[]> {
    return this.http.get<UserPlan[]>(`${API_URL}/subscriptions/plans`);
  }

  getCurrentSubscription(): Observable<UserSubscription> {
    return this.http.get<UserSubscription>(`${API_URL}/subscriptions/current`);
  }

  upgrade(planId: string): Observable<UserSubscription> {
    return this.http.post<UserSubscription>(`${API_URL}/subscriptions/upgrade`, { planId });
  }

  cancel(): Observable<UserSubscription> {
    return this.http.post<UserSubscription>(`${API_URL}/subscriptions/cancel`, {});
  }

  // === PAGAMENTO (Mercado Pago) ===
  checkout(planId: string, periodo: 'mensal' | 'anual'): Observable<{ checkoutUrl: string; valor: number }> {
    return this.http.post<{ checkoutUrl: string; valor: number }>(`${API_URL}/payments/checkout`, { planId, periodo });
  }

  confirmPayment(paymentId: string): Observable<{ activated: boolean; planId?: string; status?: string }> {
    return this.http.post<any>(`${API_URL}/payments/confirm`, { paymentId });
  }
}
