// src/app/services/variacoes.service.ts

import { Injectable } from '@angular/core';
import { VariacoesDTO } from '@app/shared/models/variacoes';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from '@app/core/auth/services/login.service';
import { supabase } from '@app/core/data/supabase/supabase.client';
import { AlertaService } from '@app/core/services/alerta.service';

@Injectable({
  providedIn: 'root',
})
export class VariacoesService {
  private variacoesSubject = new BehaviorSubject<VariacoesDTO[]>([]);
  public variacoes$: Observable<VariacoesDTO[]> =
    this.variacoesSubject.asObservable();

  constructor(
    private loginService: LoginService,
    private alertaService: AlertaService,
  ) {}

  async carregarVariacoes() {
    const userId = this.loginService.getUserLogado();
    const { data, error } = await supabase
      .from('variacoes')
      .select('*')
      .eq('idUser', userId)
      .order('valor', { ascending: true });

    if (error) {
      console.error('Erro ao carregar variações:', error.message);
      return;
    }
    this.variacoesSubject.next(data as VariacoesDTO[]);
  }

  async inserir(variacao: VariacoesDTO) {
    variacao.idUser = this.loginService.getUserLogado();
    if (!this.validarCampos(variacao)) return false;

    const { error } = await supabase.from('variacoes').insert([
      {
        variacao: variacao.variacao,
        valor: variacao.valor,
        idUser: variacao.idUser,
        idProd: variacao.idProd,
      },
    ]);

    if (error) {
      console.error('Erro ao inserir variação:', error.message);
      return false;
    }
    // Não chamamos carregarVariacoes aqui para evitar múltiplas chamadas em loops
    return true;
  }

  async editar(variacao: VariacoesDTO) {
    const { error } = await supabase
      .from('variacoes')
      .update({
        variacao: variacao.variacao,
        valor: variacao.valor,
      })
      .eq('id', variacao.id);

    if (error) {
      console.error('Erro ao editar variação:', error.message);
      return false;
    }
    return true;
  }

  async deletar(id: number) {
    const idUser = this.loginService.getUserLogado();
    const { error } = await supabase
      .from('variacoes')
      .delete()
      .eq('id', id)
      .eq('idUser', idUser);

    if (error) {
      console.error('Erro ao deletar variação:', error.message);
      return false;
    }
    return true;
  }

  private validarCampos(variacao: VariacoesDTO): boolean {
    return !!(variacao.variacao && variacao.valor && variacao.idProd);
  }
}
