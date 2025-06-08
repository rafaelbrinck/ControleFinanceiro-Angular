import { Component } from '@angular/core';
import { User } from '../../models/user';
import { LoginService } from '../../service/login.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  usuario = new User();
  listaUsuarios: User[] = [];
  registrar = false;

  constructor(private loginService: LoginService, private router: Router) {
    this.listarUsuarios();
  }

  async listarUsuarios() {
    this.listaUsuarios = await this.loginService.listar();
  }

  async inserir() {
    if (this.validaCampos()) {
      const sucesso = await this.loginService.inserir(this.usuario);
      if (sucesso) {
        alert('Usuário inserido com sucesso!');
        this.usuario = new User();
        this.registrar = false;
        this.listarUsuarios();
      } else {
        alert('Erro ao registrar usuário (talvez já exista).');
      }
    }
  }

  async logar() {
    const sucesso = await this.loginService.logar(this.usuario);
    if (sucesso) {
      this.usuario = new User();
      this.router.navigate(['/inicio']);
    } else {
      alert('Usuário ou senha inválidos.');
    }
  }

  private validaCampos() {
    if (
      !this.usuario.username ||
      !this.usuario.password ||
      !this.usuario.validaPassword
    ) {
      alert('Obrigatório preencher todos os campos');
      return false;
    }
    if (this.usuario.username.length < 3) {
      alert('Usuário deve ter pelo menos 3 caracteres');
      return false;
    }
    if (this.usuario.password.length < 5) {
      alert('Senha deve conter no mínimo 5 caracteres');
      return false;
    }
    if (this.usuario.password !== this.usuario.validaPassword) {
      alert('Senhas incompatíveis!');
      return false;
    }
    return true;
  }
}
