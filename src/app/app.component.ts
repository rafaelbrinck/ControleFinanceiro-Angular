import { Component, OnInit } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { ValidacaoService } from './validacao.service';
import { CommonModule } from '@angular/common';
import { LoginService } from './login.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'Controle Financeiro';

  validaNavBar = true;
  constructor(
    private validacao: ValidacaoService,
    private router: Router,
    private loginService: LoginService
  ) {
    this.loginService.logout();
    if (!this.validacao.confirmaAutenticacao()) {
      router.navigate(['']);
    }
  }

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        this.validaNavBar = !url.includes('login');
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
