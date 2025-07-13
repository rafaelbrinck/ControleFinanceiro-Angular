import { Injectable } from '@angular/core';
import { Variacoes } from '../models/variacoes';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from './login.service';
import { supabase } from '../supabase';
import { AlertaService } from './alerta.service';

@Injectable({
  providedIn: 'root',
})
export class VariacoesService {
  private variacoesSubject = new BehaviorSubject<Variacoes[]>([]);
  public variacoes$: Observable<Variacoes[]> =
    this.variacoesSubject.asObservable();

  constructor(
    private loginService: LoginService,
    private alertaService: AlertaService
  ) {}

  async carregarVariacoes() {
    const userId = this.loginService.getUserLogado();

    const { data, error } = await supabase
      .from('variacoes')
      .select('*')
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao carregar variações:', error.message);
      this.alertaService.erro('Erro ao carregar variações', error.message);
      return;
    }

    this.variacoesSubject.next(data as Variacoes[]);
  }

  async inserir(variacao: Variacoes) {
    variacao.idUser = this.loginService.getUserLogado();

    if (!this.validarCampos(variacao)) return;

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
      this.alertaService.erro('Erro ao inserir variação', error.message);
      return false;
    }
    await this.carregarVariacoes();
    return true;
  }

  async editar(variacao: Variacoes) {
    const { error } = await supabase
      .from('variacoes')
      .update({
        variacao: variacao.variacao,
        valor: variacao.valor,
      })
      .eq('id', variacao.id);

    if (error) {
      console.error('Erro ao editar variação:', error.message);
      this.alertaService.erro('Erro ao editar variação', error.message);
      return false;
    }
    await this.carregarVariacoes();
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
      this.alertaService.erro('Erro ao deletar variação', error.message);
      return false;
    }
    await this.carregarVariacoes();
    return true;
  }

  private validarCampos(variacao: Variacoes): boolean {
    if (!variacao.variacao || !variacao.valor || !variacao.idProd) {
      this.alertaService.erro(
        'Campos inválidos',
        'Por favor, preencha todos os campos obrigatórios.'
      );
      return false;
    }
    return true;
  }
}
