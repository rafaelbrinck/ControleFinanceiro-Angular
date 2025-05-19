import { Injectable } from '@angular/core';
import { Categoria } from './categoria';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CategoriaService {
  private categoriaSubject = new BehaviorSubject<Categoria[]>([]);
  public categorias$: Observable<Categoria[]> =
    this.categoriaSubject.asObservable();

  private listaCategorias: Categoria[] = [
    { id: 1, nome: 'Salário' },
    { id: 2, nome: 'Mercado' },
    { id: 3, nome: 'Pet' },
    { id: 4, nome: 'Restaurante' },
    { id: 5, nome: 'Bonificação' },
  ];

  constructor() {
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
    this.listaCategorias.push(categoria);
    this, this.atualizarStream();
  }

  listar() {
    return this.listaCategorias;
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
