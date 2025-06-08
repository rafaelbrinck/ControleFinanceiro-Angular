import { Injectable } from '@angular/core';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class ValidacaoService {
  private readonly tokenPadrao = 'token_app';

  login(token: string) {
    localStorage.setItem(this.tokenPadrao, token);
  }
  logout() {
    localStorage.removeItem(this.tokenPadrao);
    supabase.auth.signOut();
  }
  confirmaAutenticacao(): boolean {
    return !!localStorage.getItem(this.tokenPadrao);
  }
  getToken(): string | null {
    return localStorage.getItem(this.tokenPadrao);
  }
}
