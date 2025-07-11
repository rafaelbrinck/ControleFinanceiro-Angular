import { Injectable } from '@angular/core';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class ValidacaoService {
  login(token: string) {
    localStorage.setItem('token', token);
  }

  async logout() {
    localStorage.removeItem('token');
    await supabase.auth.signOut();
  }

  async confirmaAutenticacao(): Promise<boolean> {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  }

  async getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }
}
