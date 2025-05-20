import { Injectable } from '@angular/core';
import { User } from './user';
import { ValidacaoService } from './validacao.service';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private listaUsuarios: User[] = [
    { id: 1, username: 'admin', password: 'admin' },
  ];

  constructor(private validacao: ValidacaoService) {}

  listar() {
    return this.listaUsuarios;
  }
  inserir(user: User) {
    user.id = this.listaUsuarios.length + 1;
    if (!user.username || !user.password) {
      return alert('Username e senha são obrigatórios.');
    }
    this.listaUsuarios.push(user);
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

    /* REMOVER */
    console.log(token);

    this.validacao.login(token);
    return true;
  }

  logout() {
    this.validacao.logout();
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
