// src/app/services/produtos.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from './login.service';
import { Produto } from '../models/produto';
import { supabase } from '../supabase';
import { AlertaService } from './alerta.service';
import { CategoriaService } from './categoria.service';
import { VariacoesService } from './variacoes.service';

@Injectable({
  providedIn: 'root',
})
export class ProdutosService {
  private produtosSubject = new BehaviorSubject<Produto[]>([]);
  public produtos$: Observable<Produto[]> = this.produtosSubject.asObservable();

  constructor(
    private loginService: LoginService,
    private alertaService: AlertaService,
    private categoriaService: CategoriaService,
    private variacaoService: VariacoesService,
  ) {}

  async carregarProdutos() {
    const userId = this.loginService.getUserLogado();

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('idUser', userId)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao carregar produtos:', error.message);
      return;
    }

    // Carrega categorias e anexa aos produtos
    await this.categoriaService.carregarCategorias();
    this.categoriaService.categorias$.subscribe((categorias) => {
      data.forEach((produto) => {
        const categoria = categorias.find(
          (cat) => cat.id === produto.categoria,
        );
        produto.cat = categoria ? categoria.nome : 'Categoria não encontrada';
      });
    });

    // Carrega variações e anexa aos produtos
    await this.variacaoService.carregarVariacoes();
    this.variacaoService.variacoes$.subscribe((variacoes) => {
      data.forEach((produto: Produto) => {
        produto.variacoes = variacoes.filter((v) => v.idProd == produto.id);
      });
    });

    this.produtosSubject.next(data as Produto[]);
  }

  async inserir(produto: Produto) {
    produto.idUser = this.loginService.getUserLogado();
    if (!this.validarCampos(produto)) return false;

    const { data, error } = await supabase
      .from('produtos')
      .insert([
        {
          nome: produto.nome,
          valor: produto.valor,
          categoria: produto.categoria,
          idUser: produto.idUser,
          qtd_gancho: produto.qtd_gancho,
        },
      ])
      .select();

    if (error) {
      this.alertaService.erro('Erro ao inserir produto', error.message);
      return false;
    }

    const idNovoProduto = data[0].id;

    // Salva variações sequencialmente
    if (produto.variacoes?.length > 0) {
      for (const variacao of produto.variacoes) {
        variacao.idProd = idNovoProduto;
        variacao.idUser = produto.idUser;
        await this.variacaoService.inserir(variacao);
      }
    }

    await this.carregarProdutos();
    return true;
  }

  async editar(id: number, produto: Produto) {
    const userId = this.loginService.getUserLogado();

    // 1. Atualiza dados do produto (apenas colunas da tabela)
    const { error } = await supabase
      .from('produtos')
      .update({
        nome: produto.nome,
        valor: produto.valor,
        categoria: produto.categoria,
        qtd_gancho: produto.qtd_gancho,
      })
      .eq('id', id)
      .eq('idUser', userId);

    if (error) {
      this.alertaService.erro('Erro ao editar produto', error.message);
      return false;
    }

    // 2. Sincronização de Variações: Detectar deletadas
    const { data: doBanco } = await supabase
      .from('variacoes')
      .select('id')
      .eq('idProd', id);

    const idsNoBanco = doBanco?.map((v) => v.id) || [];
    const idsNaTela =
      produto.variacoes?.map((v) => v.id).filter((id) => id != null) || [];

    const idsParaRemover = idsNoBanco.filter((id) => !idsNaTela.includes(id));

    for (const idRemover of idsParaRemover) {
      await this.variacaoService.deletar(idRemover);
    }

    // 3. Sincronização de Variações: Inserir novas ou Atualizar existentes
    if (produto.variacoes?.length > 0) {
      for (const v of produto.variacoes) {
        v.idProd = id;
        v.idUser = userId;

        if (v.id) {
          await this.variacaoService.editar(v);
        } else {
          await this.variacaoService.inserir(v);
        }
      }
    }

    await this.carregarProdutos();
    return true;
  }

  async buscarId(id: number): Promise<Produto | null> {
    const userId = this.loginService.getUserLogado();

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', id)
      .eq('idUser', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar produto por ID:', error.message);
      return null;
    }

    // Se precisar das variações quando buscar direto do banco (F5 na página)
    const { data: variacoes } = await supabase
      .from('variacoes')
      .select('*')
      .eq('idProd', id)
      .eq('idUser', userId);

    if (variacoes) {
      data.variacoes = variacoes;
    } else {
      data.variacoes = [];
    }

    return data as Produto;
  }

  async deletar(id?: number) {
    const userId = this.loginService.getUserLogado();
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)
      .eq('idUser', userId);

    if (error) {
      this.alertaService.erro('Erro ao deletar produto', error.message);
      return;
    }
    await this.carregarProdutos();
  }

  private validarCampos(produto: Produto): boolean {
    if (!produto.nome) {
      this.alertaService.info('Obrigatório', 'Nome do produto é obrigatório');
      return false;
    }
    if (!produto.variacoes?.length && (!produto.valor || produto.valor <= 0)) {
      this.alertaService.info(
        'Obrigatório',
        'Defina um valor ou adicione variações',
      );
      return false;
    }
    return true;
  }
}
