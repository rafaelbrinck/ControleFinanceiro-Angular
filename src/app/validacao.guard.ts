import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ValidacaoService } from './validacao.service';

@Injectable({
  providedIn: 'root',
})
export class ValidacaoGuard implements CanActivate {
  constructor(private valid: ValidacaoService, private router: Router) {}

  canActivate(): boolean {
    if (!this.valid.confirmaAutenticacao()) {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}
