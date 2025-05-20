import { Component, NgModule } from '@angular/core';
import { User } from '../user';
import { LoginService } from '../login.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  usuario = new User();
  listaUsuarios: User[] = [];
  registrar = false;

  constructor(private loginService: LoginService, private router: Router) {
    this.listaUsuarios = loginService.listar();
  }

  inserir() {
    if (this.validaCampos()) {
      this.loginService.inserir(this.usuario);
      alert('User inserido com sucesso!');
      this.usuario = new User();
      this.registrar = false;
    }
  }

  logar() {
    if (this.loginService.logar(this.usuario)) {
      this.usuario = new User();
      this.router.navigate(['/inicio']);
    }
  }

  private validaCampos() {
    if (
      !this.usuario.username ||
      !this.usuario.password ||
      !this.usuario.validaPassword
    ) {
      return alert('Obrigatório preencher todos os campos');
    }
    if (this.usuario.username?.length! < 3) {
      return alert('Usuário deve ter pelo menos 3 caracteres');
    }
    if (this.usuario.password?.length! < 5) {
      return alert('Senha deve conter no mínimo 5 caracteres');
    }
    if (this.usuario.password != this.usuario.validaPassword) {
      return alert('Senhas incompátiveis!');
    }
    return true;
  }
}
