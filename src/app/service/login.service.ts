import { Injectable } from '@angular/core';
import { User, UserLogado } from '../models/user';
import { ValidacaoService } from './validacao.service';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase';
import { AlertaService } from './alerta.service';
import { CategoriaService } from './categoria.service';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  public idUserLogadoSubject = new BehaviorSubject<string>(''); // ← agora string (id do supabase)
  public idUserLogado$ = this.idUserLogadoSubject.asObservable();

  private userSubject = new BehaviorSubject<UserLogado | undefined>(undefined);
  public user$ = this.userSubject.asObservable();

  constructor(
    private validacao: ValidacaoService,
    private alertaService: AlertaService
  ) {}

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
      this.alertaService.info(
        'Obrigatório',
        'Usuário e senha são obrigatórios'
      );
      return false;
    }

    const { data: userExistente } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', user.username)
      .single();
    if (userExistente) {
      this.alertaService.erro(
        'Usuário já existe',
        'Por favor, escolha outro nome de usuário.'
      );
      return false;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: user.username,
      password: user.password,
    });

    if (authError) {
      this.alertaService.erro('Erro', 'Erro ao registrar usuário');
      return false;
    }

    const { error } = await supabase.from('usuarios').insert([
      {
        id: data.user?.id,
        username: user.username,
      },
    ]);

    if (error) {
      this.alertaService.erro(
        'Erro ao salvar usuário',
        'Erro ao salvar usuário no banco de dados'
      );
      return false;
    }
    this.insertVendas(data.user?.id!);
    this.alertaService.sucesso(
      'Sucesso',
      'Usuário registrado com sucesso! Verifique seu e-mail.'
    );
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
      this.alertaService.info(
        'E-mail não confirmado',
        'Por favor, verifique sua caixa de entrada para confirmar seu e-mail.'
      );
      return false;
    }

    if (error || !data.user) {
      this.alertaService.info(
        'Erro de login',
        'E-mail ou senha inválidos. Por favor, tente novamente.'
      );
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

  async insertVendas(id: string) {
    if (!id) {
      console.error(
        'ID do usuário não fornecido para inserir categoria de vendas.'
      );
      return;
    }
    const { error } = await supabase
      .from('categoria')
      .insert({ nome: 'Vendas', userId: id, tipo: 'Transacao' });
    if (error) {
      console.error('Erro ao inserir categoria de vendas:', error.message);
    }
  }
}
