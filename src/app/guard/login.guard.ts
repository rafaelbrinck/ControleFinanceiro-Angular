import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { ValidacaoService } from '../service/validacao.service';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class LoginGuard implements CanActivate {
  constructor(private validacao: ValidacaoService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const { data } = await supabase.auth.getSession();

    // Se a sessão está ativa, redireciona para /inicio
    if (data.session) {
      return this.router.parseUrl('/inicio');
    }

    return true; // Sessão inexistente, permite acessar /login
  }
}
