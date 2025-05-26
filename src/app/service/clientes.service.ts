import { Injectable } from '@angular/core';
import { Cliente } from '../models/cliente';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { LoginService } from './login.service';

@Injectable({
  providedIn: 'root',
})
export class ClientesService {
  private clientesSubject = new BehaviorSubject<Cliente[]>([]);
  public clientes$: Observable<Cliente[]> = this.clientesSubject
    .asObservable()
    .pipe(
      map((clientes) => {
        return clientes.filter(
          (cliente) => cliente.idUser == this.loginService.getUserLogado()
        );
      })
    );
  private listaCliente: Cliente[] = [
    {
      id: 1,
      nome: 'Rafael',
      cpf: '525.319.350-29',
      cep: '91060350',
      endereco: 'Rua José Mauricio',
      endNumero: 76,
      endComplemento: 'ap 650',
      cidade: 'Porto Alegre',
      uf: 'RS',
      bairro: 'São Sebastião',
      telefone: '51999999999',
      instaUser: 'admin',
      idUser: 1,
    },
  ];
  constructor(private loginService: LoginService) {
    this.atualizarStream();
  }

  listar() {
    return this.listaCliente.filter(
      (cliente) => cliente.idUser === this.loginService.getUserLogado()
    );
  }

  insert(cliente: Cliente) {
    cliente.id = this.listaCliente.length + 1;
    cliente.idUser = this.loginService.getUserLogado();
    if (this.validarCampos(cliente)) {
      this.listaCliente.push(cliente);
      this.atualizarStream();
      return true;
    }
    return alert('Problema ao inserir um cliente');
  }

  buscarId(id: number): Cliente {
    const cliente = this.listaCliente.find((cliente) => cliente.id === id);
    return cliente ? Object.assign({}, cliente) : new Cliente();
  }

  deletar(id?: number) {
    const index = this.buscarIndice(id);
    if (index >= 0) {
      this.listaCliente.splice(index, 1);
      this.atualizarStream();
    }
  }

  editar(id: number, cliente: Cliente) {
    const index = this.buscarIndice(id);
    if (index >= 0) {
      this.listaCliente[index] = cliente;
      this.atualizarStream();
    }
  }

  private validarCampos(cliente: Cliente) {
    if (cliente.nome == undefined) {
      return alert('Nome obrigatório!');
    }
    return true;
  }

  private buscarIndice(id?: number) {
    return this.listaCliente.findIndex((cliente) => cliente.id == id);
  }
  private atualizarStream() {
    this.clientesSubject.next([...this.listaCliente]);
  }
}
