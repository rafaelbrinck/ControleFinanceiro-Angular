import { Injectable } from '@angular/core';
import { Transacao } from '@app/shared/models/transacao';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { LoginService } from '@app/core/auth/services/login.service';
import { supabase } from '@app/core/data/supabase/supabase.client';
import { CategoriaService } from './categoria.service';
import { FornecedoresService } from './fornecedores.service';
import { CartoesService } from './cartao.service';

@Injectable({
  providedIn: 'root',
})
export class TransacaoService {
  private transacoesSubject = new BehaviorSubject<Transacao[]>([]);
  public transacoes$: Observable<Transacao[]> =
    this.transacoesSubject.asObservable();

  private fetchPromise: Promise<void> | null = null;

  constructor(
    private loginService: LoginService,
    private categoriaService: CategoriaService,
    private cartoesService: CartoesService,
    private fornecedoresService: FornecedoresService,
  ) {}

  async carregarTransacoes(): Promise<void> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return;

    if (this.transacoesSubject.getValue().length > 0) return;
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this._executarCarga(userId);
    await this.fetchPromise;
    this.fetchPromise = null;
  }

  private async _executarCarga(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('transacao')
      .select('*')
      .eq('idUser', userId)
      .order('data', { ascending: false });

    if (error || !data) {
      console.error('Erro ao listar transações:', error?.message);
      this.transacoesSubject.next([]);
      return;
    }

    // Carrega dependências em paralelo para máxima velocidade
    await Promise.all([
      this.categoriaService.carregarCategorias(),
      this.cartoesService.carregarCartoes(),
      this.fornecedoresService.carregarFornecedores(),
    ]);

    const categorias = this.categoriaService.getCategoriasSnapshot();
    const cartoes = this.cartoesService.getCartoesSnapshot();
    const fornecedores = this.fornecedoresService.getFornecedoresSnapshot();

    data.forEach((t) => {
      t.cat =
        categorias.find((c) => c.id === t.categoria)?.nome || 'Sem Categoria';
      t.cartao_nome = cartoes.find((c) => c.id === t.cartao_id)?.nome || null;
      t.fornecedor_nome =
        fornecedores.find((f) => f.id === t.fornecedor_id)?.nome || null;
    });

    this.transacoesSubject.next(data as Transacao[]);
  }

  async inserir(transacao: Transacao): Promise<boolean> {
    const userId = this.loginService.getUserLogado();

    const { error } = await supabase.from('transacao').insert([
      {
        nome: transacao.nome,
        valor: transacao.valor,
        tipo: transacao.tipo,
        categoria: transacao.categoria,
        cartao_id: transacao.cartao_id || null,
        fornecedor_id: transacao.fornecedor_id || null,
        idUser: userId,
        data: transacao.data || new Date(),
      },
    ]);

    if (error) return false;

    this.transacoesSubject.next([]);
    await this.carregarTransacoes();
    return true;
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
          cartao_id: transacao.cartao_id || null,
          fornecedor_id: transacao.fornecedor_id || null,
          data: transacao.data,
        },
      ])
      .eq('id', id)
      .eq('idUser', userId);

    if (error) return false;

    this.transacoesSubject.next([]);
    await this.carregarTransacoes();
    return true;
  }

  async deletar(id: number): Promise<void> {
    const userId = this.loginService.getUserLogado();
    await supabase.from('transacao').delete().eq('id', id).eq('idUser', userId);
    this.transacoesSubject.next([]);
    await this.carregarTransacoes();
  }

  getTransacoesSnapshot(): Transacao[] {
    return this.transacoesSubject.getValue();
  }

  async buscarId(id: number): Promise<Transacao> {
    const userId = this.loginService.getUserLogado();
    const { data } = await supabase
      .from('transacao')
      .select('*')
      .eq('id', id)
      .eq('idUser', userId)
      .single();
    return (data as Transacao) || new Transacao();
  }
}
