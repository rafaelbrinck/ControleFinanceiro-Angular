import { Injectable } from '@angular/core';
import { Transacao } from '../models/trasacao';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from './login.service';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TransacaoService {
  private transacoesSubject = new BehaviorSubject<Transacao[]>([]);
  public transacoes$: Observable<Transacao[]> = this.transacoesSubject
    .asObservable()
    .pipe(
      map((transacoes) => {
        const userId = this.loginService.getUserLogado();
        return transacoes.filter((transacao) => transacao.idUser === userId);
      })
    );

  private nextId = 5;
  private listaTransacao: Transacao[] = [
    {
      id: 1,
      descricao: 'Zaffari',
      valor: 25,
      tipo: 'Saida',
      categoria: 'Mercado',
      data: new Date('2025-01-20'),
      idUser: 1,
    },
    {
      id: 2,
      descricao: 'Salario',
      valor: 1000,
      tipo: 'Entrada',
      categoria: 'Salário',
      data: new Date('2025-02-05'),
      idUser: 1,
    },
    {
      id: 3,
      descricao: 'Comida para pet',
      valor: 350,
      categoria: 'Pet',
      tipo: 'Saida',
      data: new Date('2025-02-15'),
      idUser: 1,
    },
    {
      id: 4,
      descricao: 'Tudo pelo social',
      valor: 250,
      categoria: 'Mercado',
      tipo: 'Saida',
      data: new Date('2025-03-20'),
      idUser: 1,
    },
    {
      id: 5,
      descricao: 'Salário',
      valor: 10000,
      categoria: 'Bonificação',
      tipo: 'Entrada',
      data: new Date('2025-03-20'),
      idUser: 2,
    },
    {
      id: 6,
      descricao: 'Don Vitto',
      valor: 550,
      categoria: 'Restaurante',
      tipo: 'Saida',
      data: new Date('2025-02-15'),
      idUser: 2,
    },
    {
      id: 7,
      descricao: 'Gramado Palace',
      valor: 2500,
      categoria: 'Restaurante',
      tipo: 'Saida',
      data: new Date('2025-03-20'),
      idUser: 2,
    },
  ];

  constructor(private loginService: LoginService) {
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

  listar(id: number): Transacao[] {
    const transacoes = this.listaTransacao.filter(
      (transacao) => transacao.idUser == id
    );
    return transacoes;
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
