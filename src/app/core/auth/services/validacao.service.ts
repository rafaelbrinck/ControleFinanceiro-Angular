import { Injectable } from '@angular/core';
import { supabase } from '@app/core/data/supabase/supabase.client';

@Injectable({
  providedIn: 'root',
})
export class ValidacaoService {
  login(token: string) {
    localStorage.setItem('token', token);
  }

  async logout() {
    localStorage.removeItem('token');
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao efetuar logout:', error);
    }
  }

  async confirmaAutenticacao(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Erro ao confirmar autenticação:', error.message);
        return false;
      }
      return !!data.session;
    } catch (error) {
      console.error('Erro inesperado ao confirmar autenticação:', error);
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Erro ao obter token da sessão:', error.message);
        return null;
      }
      return data.session?.access_token ?? null;
    } catch (error) {
      console.error('Erro inesperado ao obter token:', error);
      return null;
    }
  }
}
