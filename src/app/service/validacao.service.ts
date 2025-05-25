import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ValidacaoService {
  private tokenPadrao = '';

  login(token: string) {
    localStorage.setItem(this.tokenPadrao, token);
  }
  logout() {
    localStorage.removeItem(this.tokenPadrao);
  }
  confirmaAutenticacao(): boolean {
    return !!localStorage.getItem(this.tokenPadrao);
  }
}
