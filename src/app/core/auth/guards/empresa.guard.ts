import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { DadosEmpresaService } from '@app/core/services/dados-empresa.service';

@Injectable({
  providedIn: 'root',
})
export class EmpresaGuard implements CanActivate {
  constructor(
    private dadosEmpresaService: DadosEmpresaService,
    private router: Router,
  ) {}

  async canActivate(): Promise<boolean | UrlTree> {
    await this.dadosEmpresaService.carregar();

    if (this.dadosEmpresaService.temEmpresa()) {
      return true;
    }

    return this.router.parseUrl('/perfil?aba=empresa&onboarding=1');
  }
}
