import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { ValidacaoService } from '../service/validacao.service';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class ValidacaoGuard implements CanActivate {
  constructor(private valid: ValidacaoService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const session = await supabase.auth.getSession();

    // Se não há sessão válida
    if (!session.data.session) {
      this.valid.logout(); // limpa localStorage e supabase
      return this.router.parseUrl('/login');
    }

    return true; // sessão válida, acesso permitido
  }
}
