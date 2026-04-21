import { Component } from '@angular/core';
import { User } from '@app/shared/models/user';
import { LoginService } from '@app/core/auth/services/login.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertaService } from '@app/core/services/alerta.service';
import { OrcamentoService } from '@app/core/services/orcamento.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  usuario = new User();
  registrar = false;
  loading = false; // NOVA VARIÁVEL: Controla o estado de carregamento

  constructor(
    private loginService: LoginService,
    private router: Router,
    private alertaService: AlertaService,
    private orcamentoService: OrcamentoService,
  ) {}

  async inserir() {
    if (this.validaCampos()) {
      this.loading = true; // Trava o botão

      try {
        const sucesso = await this.loginService.inserir(this.usuario);
        if (sucesso) {
          this.alertaService.sucesso(
            'Usuário Registrado',
            'O usuário foi registrado com sucesso!',
          );
          this.usuario = new User();
          this.registrar = false;
        } else {
          this.alertaService.erro(
            'Erro ao Registrar Usuário',
            'Ocorreu um erro ao registrar o usuário. Tente novamente.',
          );
        }
      } finally {
        this.loading = false; // Libera o botão independente do resultado (sucesso ou erro)
      }
    }
  }

  async logar() {
    this.loading = true; // Trava o botão

    try {
      const sucesso = await this.loginService.logar(this.usuario);
      if (sucesso) {
        this.usuario = new User();
        this.orcamentoService.limparOrcamento();
        this.router.navigate(['/inicio']);
      }
    } finally {
      this.loading = false; // Libera o botão se o login falhar
    }
  }

  private validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  private validaCampos() {
    if (
      !this.usuario.username ||
      !this.usuario.password ||
      !this.usuario.validaPassword ||
      !this.usuario.nome
    ) {
      this.alertaService.info(
        'Campos Obrigatórios',
        'Todos os campos são obrigatórios.',
      );
      return false;
    }
    if (!this.validarEmail(this.usuario.username)) {
      this.alertaService.info(
        'E-mail Inválido',
        'Por favor, informe um e-mail válido.',
      );
      return false;
    }
    if (this.usuario.password.length < 5) {
      this.alertaService.info(
        'Senha Inválida',
        'A senha deve conter no mínimo 5 caracteres.',
      );
      return false;
    }
    if (this.usuario.password !== this.usuario.validaPassword) {
      this.alertaService.info(
        'Senhas Incompatíveis',
        'As senhas informadas não coincidem.',
      );
      return false;
    }
    return true;
  }
}
