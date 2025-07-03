import { Component, OnInit } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { ValidacaoService } from './service/validacao.service';
import { CommonModule } from '@angular/common';
import { LoginService } from './service/login.service';
import { UserLogado } from './models/user';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'Controle Financeiro';
  usuario: UserLogado | undefined;

  validaNavBar = true;
  constructor(
    private validacao: ValidacaoService,
    private router: Router,
    private loginService: LoginService
  ) {
    this.loginService.logout();
    router.navigate(['']);
  }

  async ngOnInit(): Promise<void> {
    this.router.events.subscribe(async (event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        this.validaNavBar = !url.includes('login');

        if (this.validacaoLogin()) {
          this.usuario = await this.loginService.getUser(); // <- pega logo
        }
      }
    });
  }

  validacaoLogin(): boolean {
    return this.validacao.confirmaAutenticacao();
  }

  logout() {
    this.validacao.logout();
    this.router.navigate(['']);
  }
}
