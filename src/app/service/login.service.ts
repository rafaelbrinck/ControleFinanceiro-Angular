import { Injectable } from '@angular/core';
import { User } from '../models/user';
import { ValidacaoService } from './validacao.service';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private listaUsuarios: User[] = [
    { id: 1, username: 'admin', password: 'admin' },
    { id: 2, username: 'teste', password: 'teste' },
    { id: 3, username: 'o', password: 'o' },
  ];

  public idUserLogadoSubject = new BehaviorSubject<number>(0);
  public idUserLogado$ = this.idUserLogadoSubject.asObservable();

  constructor(private validacao: ValidacaoService) {}

  getUserLogado(): number {
    return this.idUserLogadoSubject.getValue();
  }
  setUserLogado(id: number): void {
    this.idUserLogadoSubject.next(id);
  }

  async listar() {
    const { data, error } = await supabase.from('usuarios').select('*');
    if (error) {
      alert(error.message);
      return [error.cause, error.message];
    }
    return data || [];
  }

  async inserir(user: User): Promise<boolean> {
    if (!user.username || !user.password) {
      alert('Usuário e senha são obrigatórios');
      return false;
    }
    const { data: userExistente } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', user.username)
      .single();
    if (userExistente) {
      alert('Username já existe!');
      return false;
    }

    /*
    const usuario = this.listaUsuarios.find(
      (userExistente) => user.username == userExistente.username
    );
    if (usuario) {
      return alert('Username já existe!');
    }
    user.id = this.listaUsuarios.length + 1;
    if (!user.username || !user.password) {
      return alert('Username e senha são obrigatórios.');
    }
    this.listaUsuarios.push(user);
    return true;*/
  }

  logar(user: User) {
    const usuario = this.listaUsuarios.find(
      (cliente) => cliente.username == user.username
    );
    if (!usuario || user.password != usuario?.password) {
      return alert('Usuário ou Senha inválida');
    }
    const token =
      Math.random().toString(25).substring(2) + Date.now().toString(25);
    this.validacao.login(token);
    if (usuario.id != undefined) {
      this.setUserLogado(usuario.id);
    }
    return true;
  }

  logout() {
    this.validacao.logout();
    this.setUserLogado(0);
  }

  buscarUsername(username: string) {
    const user = this.listaUsuarios.find(
      (usuario) => usuario.username === username
    );
    if (!user) {
      return false;
    }
    return true;
  }

  deletar(id?: number) {
    const index = this.buscarIndice(id);
    if (index >= 0) {
      this.listaUsuarios.splice(index, 1);
    }
  }

  private buscarIndice(id?: number) {
    return this.listaUsuarios.findIndex((user) => user.id == id);
  }
}
