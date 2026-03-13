import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { supabase } from '../supabase';
import { LoginService } from './login.service';

export interface Venda {
  produto_nome: string;
  total_vendido: number;
  cliente_id: number;
  cliente_nome: string;
  total_compras: number;
  updated_at: string; // <-- A propriedade nova para o filtro funcionar!
}

@Injectable({
  providedIn: 'root',
})
export class GraficosDataService {
  private vendasSubject = new BehaviorSubject<Venda[]>([]);
  vendas$: Observable<Venda[]> = this.vendasSubject.asObservable();

  constructor(private loginService: LoginService) {}

  async carregarDados() {
    const userId = this.loginService.getUserLogado();

    // <-- Chamando a função NOVA aqui
    const { data, error } = await supabase.rpc('get_vendas_com_data', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Erro ao carregar dados:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('Nenhum dado encontrado.');
      this.vendasSubject.next([]);
      return;
    }

    // Passamos os dados garantindo que eles seguem a interface Venda
    this.vendasSubject.next(data as Venda[]);
  }

  async atualizarDados() {
    await this.carregarDados();
  }
}
