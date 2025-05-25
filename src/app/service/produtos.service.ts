import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { LoginService } from './login.service';
import { Produto } from '../models/produto';

@Injectable({
  providedIn: 'root',
})
export class ProdutosService {
  private produtosSubject = new BehaviorSubject<Produto[]>([]);
  public produtos$: Observable<Produto[]> = this.produtosSubject
    .asObservable()
    .pipe(
      map((produtos) => {
        return produtos.filter(
          (produto) => produto.idUser === this.loginService.getUserLogado()
        );
      })
    );
  private listaProdutos: Produto[] = [
    {
      id: 1,
      nome: 'Produto 1',
      categoria: 'Redes',
      valor: 20,
      idUser: 1,
    },
    {
      id: 2,
      nome: 'Testando',
      categoria: 'Tocas',
      valor: 250,
      idUser: 1,
    },
  ];

  constructor(private loginService: LoginService) {
    this.atualizarStream();
  }

  private atualizarStream() {
    this.produtosSubject.next([...this.listaProdutos]);
  }

  listar(id: number) {
    return this.listaProdutos.filter((produto) => produto.idUser === id);
  }

  inserir(produto: Produto) {
    produto.id = this.listaProdutos.length + 1;
    produto.idUser = this.loginService.getUserLogado();
    if (this.validarCampos(produto)) {
      this.listaProdutos.push(produto);
      this.atualizarStream();
      return true;
    }
    return alert('Problema em inserir um produto.');
  }

  buscarId(id: number): Produto {
    const produto = this.listaProdutos.find((produto) => produto.id === id);
    return produto ? Object.assign({}, produto) : new Produto();
  }

  deletar(id?: number) {
    const index = this.buscarIndice(id);
    if (index >= 0) {
      this.listaProdutos.splice(index, 1);
      this.atualizarStream();
    }
  }

  editar(id: number, produto: Produto) {
    const index = this.buscarIndice(id);
    if (index >= 0) {
      this.listaProdutos[index] = produto;
      this.atualizarStream();
    }
  }

  private validarCampos(produto: Produto) {
    if (produto.nome == undefined) {
      return alert('Nome do produto é obrigatório');
    }
    if (produto.valor == undefined) {
      return alert('Valor do produto é obrigatório');
    }
    if (produto.valor <= 0) {
      return alert('Valor deve ser maior do que zero');
    }
    return true;
  }
  private buscarIndice(id?: number) {
    return this.listaProdutos.findIndex((produto) => produto.id == id);
  }
}
