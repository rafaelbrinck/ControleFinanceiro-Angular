import { Injectable } from '@angular/core';
import { User, UserLogado } from '../models/user';
import { ValidacaoService } from './validacao.service';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  public idUserLogadoSubject = new BehaviorSubject<string>(''); // ← agora string (id do supabase)
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

    const { data: userExistente } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', user.username)
      .single();
    if (userExistente) {
      alert('Username já existe!');
      return false;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: user.username,
      password: user.password,
    });

    if (authError) {
      alert('Erro ao registrar usuário!');
      return false;
    }

    const { error } = await supabase.from('usuarios').insert([
      {
        id: data.user?.id,
        username: user.username,
        password: 'protegido',
      },
    ]);

    if (error) {
      alert('Erro ao salvar usuário no banco!');
      return false;
    }

    alert('Usuário registrado com sucesso! Verifique seu e-mail.');
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

    if (error?.code === 'email_not_confirmed') {
      alert('E-mail não confirmado! Verifique sua caixa de entrada.');
      return false;
    }

    if (error || !data.user) {
      alert('E-mail ou senha inválidos');
      return false;
    }

    this.validacao.login(data.session?.access_token || 'token');
    this.setUserLogado(data.user.id);

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, username, logo, nome')
      .eq('id', data.user.id)
      .single();

    if (usuario) {
      this.userSubject.next(usuario);
    }

    return true;
  }

  async restaurarSessao(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;

    if (!session?.user) return;

    this.setUserLogado(session.user.id);

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, username, logo, nome')
      .eq('id', session.user.id)
      .single();

    if (usuario) {
      this.userSubject.next(usuario);
    }
  }

  async logout(): Promise<void> {
    await this.validacao.logout();
    this.setUserLogado('');
    this.userSubject.next(undefined);
  }
}
