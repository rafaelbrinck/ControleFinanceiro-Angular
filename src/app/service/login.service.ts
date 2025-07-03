import { Injectable } from '@angular/core';
import { User, UserLogado } from '../models/user';
import { ValidacaoService } from './validacao.service';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  public idUserLogadoSubject = new BehaviorSubject<string>('');
  public idUserLogado$ = this.idUserLogadoSubject.asObservable();

  private userSubject = new BehaviorSubject<UserLogado | undefined>(undefined);
  public user$ = this.userSubject.asObservable();

  constructor(private validacao: ValidacaoService) {}

  getUserLogado(): string {
    return this.idUserLogadoSubject.getValue();
  }

  setUserLogado(id: string): void {
    this.idUserLogadoSubject.next(id);
  }

  async getUser(): Promise<UserLogado> {
    const userId = this.getUserLogado();
    const { data } = await supabase
      .from('usuarios')
      .select('id, username, logo')
      .eq('id', userId)
      .single();
    return data as UserLogado;
  }

  async recarregarUsuario(): Promise<void> {
    const userId = this.getUserLogado();
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, username, logo')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao recarregar usuário:', error.message);
      return;
    }

    if (data) {
      this.userSubject.next(data);
    }
  }

  async listar() {
    const { data, error } = await supabase.from('usuarios').select('*');
    if (error) {
      alert(error.message);
      return [error.cause, error.message];
    }
    return data || [];
  }

  async inserir(user: User): Promise<boolean> {
    if (!user.username || !user.password) {
      alert('Usuário e senha são obrigatórios');
      return false;
    }

    // Registra no sistema de autenticação do Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.username, // usando email como username
      password: user.password,
    });

    if (authError || !authData.user) {
      alert('Erro ao registrar autenticação: ' + authError?.message);
      return false;
    }

    // Salva os dados adicionais na tabela de usuários
    const { error: dbError } = await supabase.from('usuarios').insert([
      {
        id: authData.user.id, // salva o ID do auth como ID do usuário
        username: user.username,
      },
    ]);

    if (dbError) {
      alert('Erro ao registrar dados do usuário!');
      return false;
    }

    return true;
  }

  async logar(user: User): Promise<boolean> {
    if (!user.username || !user.password) {
      alert('Email e senha são obrigatórios');
      return false;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.username,
      password: user.password!,
    });

    if (error?.code == 'email_not_confirmed') {
      alert('E-mail não confirmado! Conferir caixa de entrada do e-mail.');
      return false;
    }

    if (error || !data.user) {
      alert('E-mail ou senha inválidos');
      return false;
    }

    this.validacao.login(data.session?.access_token || 'token');
    this.setUserLogado(data.user.id);

    // Pega dados do usuário no banco
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, username, logo')
      .eq('id', data.user.id)
      .single();

    if (usuario) {
      this.userSubject.next(usuario);
    }

    return true;
  }

  logout() {
    this.validacao.logout();
    this.setUserLogado('');
    this.userSubject.next(undefined);
    supabase.auth.signOut();
  }
}
