import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cartao } from '@app/shared/models/cartao';
import { supabase } from '@app/core/data/supabase/supabase.client';
import { LoginService } from '@app/core/auth/services/login.service';

@Injectable({
  providedIn: 'root',
})
export class CartoesService {
  private cartoesSubject = new BehaviorSubject<Cartao[]>([]);
  public cartoes$: Observable<Cartao[]> = this.cartoesSubject.asObservable();

  private fetchPromise: Promise<void> | null = null;

  constructor(private loginService: LoginService) {}

  async carregarCartoes(): Promise<void> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return;

    if (this.cartoesSubject.getValue().length > 0) return;
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this._executarCarga(userId);
    await this.fetchPromise;
    this.fetchPromise = null;
  }

  private async _executarCarga(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('cartoes')
      .select('*')
      .eq('id_user', userId)
      .order('id', { ascending: true });

    if (error || !data) {
      console.error('Erro ao carregar cartões:', error?.message);
      this.cartoesSubject.next([]);
      return;
    }

    this.cartoesSubject.next(data as Cartao[]);
  }

  async salvar(cartao: Cartao): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    let error;

    if (cartao.id) {
      // Editar
      const res = await supabase
        .from('cartoes')
        .update({
          nome: cartao.nome,
          limite: cartao.limite,
          dia_pagamento: cartao.dia_pagamento,
        })
        .eq('id', cartao.id)
        .eq('id_user', userId);
      error = res.error;
    } else {
      // Inserir
      const res = await supabase.from('cartoes').insert([
        {
          nome: cartao.nome,
          limite: cartao.limite,
          dia_pagamento: cartao.dia_pagamento,
          id_user: userId,
        },
      ]);
      error = res.error;
    }

    if (error) return false;

    this.cartoesSubject.next([]); // Limpa cache
    await this.carregarCartoes(); // Recarrega atualizado
    return true;
  }

  async deletar(id: number): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    const { error } = await supabase
      .from('cartoes')
      .delete()
      .eq('id', id)
      .eq('id_user', userId);

    if (error) return false;
    this.cartoesSubject.next([]);
    await this.carregarCartoes();
    return true;
  }

  getCartoesSnapshot(): Cartao[] {
    return this.cartoesSubject.getValue();
  }
}
