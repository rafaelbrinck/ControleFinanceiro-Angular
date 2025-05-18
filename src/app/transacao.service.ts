import { Injectable } from '@angular/core';
import { Transacao } from './trasacao';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TransacaoService {
  private transacoesSubject = new BehaviorSubject<Transacao[]>([]);
  public transacoes$: Observable<Transacao[]> =
    this.transacoesSubject.asObservable();

  private nextId = 5;
  private listaTransacao: Transacao[] = [
    {
      id: 1,
      descricao: 'Mercado',
      valor: 25,
      tipo: 'Saida',
      data: new Date('2025-01-20'),
    },
    {
      id: 2,
      descricao: 'Salario',
      valor: 1000,
      tipo: 'Entrada',
      data: new Date('2025-02-05'),
    },
    {
      id: 3,
      descricao: 'Comida para pet',
      valor: 350,
      tipo: 'Saida',
      data: new Date('2025-02-15'),
    },
    {
      id: 4,
      descricao: 'Mercado',
      valor: 250,
      tipo: 'Saida',
      data: new Date('2025-03-20'),
    },
  ];

  constructor() {
    this.atualizarStream();
  }

  private atualizarStream() {
    this.transacoesSubject.next([...this.listaTransacao]);
  }

  inserir(transacao: Transacao) {
    transacao.id = this.listaTransacao.length + 1;
    if (!transacao.data) {
      transacao.data = new Date();
    }
    this.listaTransacao.push(transacao);
    this.atualizarStream();
  }

  listar() {
    return this.listaTransacao;
  }

  buscarId(id: number) {
    const transacao = this.listaTransacao.find(
      (transacao) => transacao.id == id
    );
    return transacao ? Object.assign({}, transacao) : new Transacao();
  }

  editar(id: number, transacao: Transacao) {
    const index = this.buscarIndice(id);
    if (index >= 0) {
      this.listaTransacao[index] = transacao;
      this.atualizarStream();
    }
  }

  deletar(id?: number) {
    const index = this.buscarIndice(id);
    if (index >= 0) {
      this.listaTransacao.splice(index, 1);
      this.atualizarStream();
    }
  }

  private buscarIndice(id?: number) {
    return this.listaTransacao.findIndex((transacao) => transacao.id == id);
  }
}
