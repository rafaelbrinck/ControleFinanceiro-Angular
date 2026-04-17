import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { LoginService } from '../service/login.service';

@Injectable({
  providedIn: 'root',
})
export class LoginGuard implements CanActivate {
  constructor(private loginService: LoginService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const hasSession = await this.loginService.hasActiveSession();

    // Se a sessão está ativa, redireciona para /inicio
    if (hasSession) {
      return this.router.parseUrl('/inicio');
    }

    return true; // Sessão inexistente, permite acessar /login
  }
}
