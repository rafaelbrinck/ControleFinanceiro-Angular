import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from './login.service';
import { Produto } from '../models/produto';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class ProdutosService {
  private produtosSubject = new BehaviorSubject<Produto[]>([]);
  public produtos$: Observable<Produto[]> = this.produtosSubject.asObservable();

  constructor(private loginService: LoginService) {}

  async carregarProdutos() {
    const userId = this.loginService.getUserLogado();

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao carregar produtos:', error.message);
      return;
    }

    this.produtosSubject.next(data as Produto[]);
  }

  async inserir(produto: Produto) {
    produto.idUser = this.loginService.getUserLogado();

    if (!this.validarCampos(produto)) return;

    const { error } = await supabase.from('produtos').insert([
      {
        nome: produto.nome,
        valor: produto.valor,
        categoria: produto.categoria,
        idUser: produto.idUser,
      },
    ]);

    if (error) {
      console.error('Erro ao inserir produto:', error.message);
      alert('Erro ao inserir produto.');
      return false;
    }

    await this.carregarProdutos();
    return true;
  }

  async editar(id: number, produto: Produto) {
    const userId = this.loginService.getUserLogado();

    const { error } = await supabase
      .from('produtos')
      .update(produto)
      .eq('id', id)
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao editar produto:', error.message);
      return alert('Erro ao editar produto.');
    }

    await this.carregarProdutos();
  }

  async deletar(id?: number) {
    const userId = this.loginService.getUserLogado();

    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao deletar produto:', error.message);
      return alert('Erro ao deletar produto.');
    }

    await this.carregarProdutos();
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

    return data as Produto;
  }

  private validarCampos(produto: Produto): boolean {
    if (!produto.nome) {
      alert('Nome do produto é obrigatório');
      return false;
    }
    if (produto.valor == null || produto.valor <= 0) {
      alert('Valor deve ser maior que zero');
      return false;
    }
    return true;
  }
}
