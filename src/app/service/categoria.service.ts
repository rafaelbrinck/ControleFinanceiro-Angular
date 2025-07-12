import { Injectable } from '@angular/core';
import { Categoria } from '../models/categoria';
import { BehaviorSubject, Observable } from 'rxjs';
import { supabase } from '../supabase';
import { LoginService } from './login.service';

@Injectable({
  providedIn: 'root',
})
export class CategoriaService {
  private categoriaSubject = new BehaviorSubject<Categoria[]>([]);
  public categorias$: Observable<Categoria[]> =
    this.categoriaSubject.asObservable();

  constructor(private loginService: LoginService) {}

  async retornarVenda(): Promise<Categoria | null> {
    const userId = this.loginService.getUserLogado();
    const { data, error } = await supabase
      .from('categoria')
      .select('*')
      .eq('userId', userId)
      .eq('nome', 'Vendas')
      .single();
    if (error) {
      console.error('Erro ao buscar categoria de vendas:', error.message);
      return null;
    }
    return data as Categoria;
  }

  async carregarCategorias() {
    const userId = this.loginService.getUserLogado();
    const { data, error } = await supabase
      .from('categoria')
      .select('*')
      .eq('userId', userId);

    if (error) {
      console.error('Erro ao carregar categorias:', error.message);
      return;
    }

    if (data) {
      this.categoriaSubject.next(data);
    }
  }

  async inserir(categoria: Categoria) {
    categoria.userId = this.loginService.getUserLogado();

    if (!categoria.nome) {
      alert('Obrigatório preencher o nome.');
      return;
    }

    const { error } = await supabase.from('categoria').insert([
      {
        nome: categoria.nome,
        userId: categoria.userId,
        tipo: categoria.tipo,
      },
    ]);

    if (error) {
      console.error('Erro ao inserir categoria:', error.message);
    } else {
      this.carregarCategorias();
    }
  }

  async listar(tipo: string): Promise<Categoria[]> {
    const userId = this.loginService.getUserLogado();

    const { data, error } = await supabase
      .from('categoria')
      .select('*')
      .eq('userId', userId)
      .eq('tipo', tipo);

    if (error) {
      console.error('Erro ao listar categorias:', error.message);
      return [];
    }

    return data || [];
  }

  async listarTudo(): Promise<Categoria[]> {
    const userId = this.loginService.getUserLogado();

    const { data, error } = await supabase
      .from('categoria')
      .select('*')
      .eq('userId', userId);

    if (error) {
      console.error('Erro ao listar todas as categorias:', error.message);
      return [];
    }

    return data || [];
  }

  async buscarNome(nome: string): Promise<boolean> {
    const userId = this.loginService.getUserLogado();

    const { data, error } = await supabase
      .from('categoria')
      .select('*')
      .eq('userId', userId)
      .eq('nome', nome);

    if (error) {
      console.error('Erro ao buscar nome:', error.message);
      return true; // Retorna true por segurança
    }

    return !data || data.length === 0;
  }

  async buscarId(id: number): Promise<Categoria | null> {
    const userId = this.loginService.getUserLogado();

    const { data, error } = await supabase
      .from('categoria')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar categoria por ID:', error.message);
      return null;
    }

    return data || null;
  }

  async deletar(id: number) {
    const { error } = await supabase.from('categoria').delete().eq('id', id);

    if (error) {
      console.error('Erro ao deletar categoria:', error.message);
    } else {
      this.carregarCategorias();
    }
  }
}
