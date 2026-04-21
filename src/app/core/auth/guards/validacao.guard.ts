import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { LoginService } from '@app/core/auth/services/login.service';

@Injectable({
  providedIn: 'root',
})
export class ValidacaoGuard implements CanActivate {
  constructor(private loginService: LoginService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const hasSession = await this.loginService.hasActiveSession();

    // Se não há sessão válida
    if (!hasSession) {
      return this.router.parseUrl('/login');
    }

    return true; // sessão válida, acesso permitido
  }
}
