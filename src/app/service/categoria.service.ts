import { Injectable } from '@angular/core';
import { Categoria } from '../models/categoria';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { LoginService } from './login.service';

@Injectable({
  providedIn: 'root',
})
export class CategoriaService {
  private categoriaSubject = new BehaviorSubject<Categoria[]>([]);
  public categorias$: Observable<Categoria[]> = this.categoriaSubject
    .asObservable()
    .pipe(
      map((transacoes) => {
        const userId = this.loginService.getUserLogado();
        return transacoes.filter((transacao) => transacao.userId === userId);
      })
    );

  private listaCategorias: Categoria[] = [
    { id: 1, nome: 'Salário', userId: 1, tipo: 'Transacao' },
    { id: 2, nome: 'Mercado', userId: 1, tipo: 'Transacao' },
    { id: 3, nome: 'Pet', userId: 1, tipo: 'Transacao' },
    { id: 4, nome: 'Restaurante', userId: 2, tipo: 'Transacao' },
    { id: 5, nome: 'Bonificação', userId: 2, tipo: 'Transacao' },
    { id: 6, nome: 'Redes', userId: 1, tipo: 'Produto' },
    { id: 7, nome: 'Tocas', userId: 1, tipo: 'Produto' },
  ];

  constructor(private loginService: LoginService) {
    this.atualizarStream();
  }

  private atualizarStream() {
    this.categoriaSubject.next([...this.listaCategorias]);
  }
  inserir(categoria: Categoria) {
    categoria.id = this.listaCategorias.length + 1;
    if (!categoria.nome) {
      return alert('Obrigatório preencher o nome.');
    }
    categoria.userId = this.loginService.getUserLogado();
    this.listaCategorias.push(categoria);
    this.atualizarStream();
  }

  listar(id: number, tipo: string) {
    return this.listaCategorias.filter(
      (transacao) => transacao.userId === id && transacao.tipo == tipo
    );
  }
  listarTudo(id: number) {
    return this.listaCategorias.filter((transacao) => transacao.userId === id);
  }
  buscarNome(nome?: string) {
    const categoria = this.listaCategorias.find((cat) => cat.nome === nome);
    if (categoria) {
      return false;
    }
    return true;
  }

  buscarId(id: number) {
    const categoria = this.listaCategorias.find(
      (categoria) => categoria.id == id
    );
    return categoria ? Object.assign({}, categoria) : new Categoria();
  }

  deletar(id?: number) {
    const index = this.buscarIndice(id);
    if (index >= 0) {
      this.listaCategorias.splice(index, 1);
      this.atualizarStream();
    }
  }

  private buscarIndice(id?: number) {
    return this.listaCategorias.findIndex((categoria) => categoria.id == id);
  }
}
