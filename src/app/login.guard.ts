import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ValidacaoService } from './validacao.service';

@Injectable({
  providedIn: 'root',
})
export class LoginGuard implements CanActivate {
  constructor(private validacao: ValidacaoService, private router: Router) {}

  canActivate(): boolean {
    if (this.validacao.confirmaAutenticacao()) {
      this.router.navigate(['/inicio']);
      return false;
    }
    return true;
  }
}
