import { Injectable } from '@angular/core';
import { Transacao } from '../models/trasacao';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from './login.service';
import { supabase } from '../supabase';
import { CategoriaService } from './categoria.service';

@Injectable({
  providedIn: 'root',
})
export class TransacaoService {
  private transacoesSubject = new BehaviorSubject<Transacao[]>([]);
  public transacoes$: Observable<Transacao[]> =
    this.transacoesSubject.asObservable();

  constructor(
    private loginService: LoginService,
    private categoriaService: CategoriaService
  ) {}

  async carregarTransacoes(): Promise<void> {
    const userId = this.loginService.getUserLogado();
    const { data, error } = await supabase
      .from('transacao')
      .select('*')
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao listar transações:', error.message);
      return;
    }

    if (data) {
      await this.categoriaService.carregarCategorias();
      this.categoriaService.categorias$.subscribe((categorias) => {
        data.forEach((transacao) => {
          const categoria = categorias.find(
            (cat) => cat.id === transacao.categoria
          );
          transacao.cat = categoria
            ? categoria.nome
            : 'Categoria não encontrada';
        });
      });
      this.transacoesSubject.next(data);
    }
  }

  async inserir(transacao: Transacao): Promise<boolean> {
    const userId = this.loginService.getUserLogado();

    const { error } = await supabase.from('transacao').insert([
      {
        nome: transacao.nome,
        valor: transacao.valor,
        tipo: transacao.tipo,
        categoria: transacao.categoria,
        idUser: userId,
        data: transacao.data,
      },
    ]);

    if (error) {
      console.error('Erro ao inserir transação:', error.message);
      return false;
    } else {
      await this.carregarTransacoes();
      return true;
    }
  }

  async buscarId(id: number): Promise<Transacao> {
    const userId = this.loginService.getUserLogado();

    const { data, error } = await supabase
      .from('transacao')
      .select('*')
      .eq('idUser', userId)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar transação por ID:', error.message);
      return new Transacao();
    }

    return data as Transacao;
  }

  async editar(id: number, transacao: Transacao): Promise<boolean> {
    const userId = this.loginService.getUserLogado();

    const { error } = await supabase
      .from('transacao')
      .update([
        {
          nome: transacao.nome,
          valor: transacao.valor,
          tipo: transacao.tipo,
          categoria: transacao.categoria,
          idUser: userId,
          data: transacao.data,
        },
      ])
      .eq('id', id)
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao editar transação:', error.message);
      return false;
    } else {
      await this.carregarTransacoes();
      return true;
    }
  }

  async deletar(id: number): Promise<void> {
    const userId = this.loginService.getUserLogado();

    const { error } = await supabase
      .from('transacao')
      .delete()
      .eq('id', id)
      .eq('userId', userId);

    if (error) {
      console.error('Erro ao deletar transação:', error.message);
    } else {
      await this.carregarTransacoes();
    }
  }
}
