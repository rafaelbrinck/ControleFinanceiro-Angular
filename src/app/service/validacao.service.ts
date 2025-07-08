import { Injectable } from '@angular/core';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class ValidacaoService {
  login(token: string) {
    console.log('Sessão iniciada com token:', token);
    // Não precisa salvar no localStorage (Supabase já faz isso)
  }

  async logout() {
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
