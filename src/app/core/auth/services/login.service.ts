import { Injectable, Injector } from '@angular/core';
import { User, UserLogado } from '@app/shared/models/user';
import { ValidacaoService } from './validacao.service';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '@app/core/data/supabase/supabase.client';
import { AlertaService } from '@app/core/services/alerta.service';
import { OrcamentoService } from '@app/core/services/orcamento.service';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  public idUserLogadoSubject = new BehaviorSubject<string>('');
  public idUserLogado$ = this.idUserLogadoSubject.asObservable();

  private userSubject = new BehaviorSubject<UserLogado | undefined>(undefined);
  public user$ = this.userSubject.asObservable();
  private restaurandoSessao: Promise<void> | null = null;

  constructor(
    private injector: Injector,
    private validacao: ValidacaoService,
    private alertaService: AlertaService,
  ) {}

  getUserLogado(): string {
    return this.idUserLogadoSubject.getValue();
  }

  setUserLogado(id: string): void {
    this.idUserLogadoSubject.next(id);
  }

  async getUser(): Promise<UserLogado | undefined> {
    const userCache = this.userSubject.getValue();
    if (userCache) return userCache;

    const userId = this.getUserLogado();
    if (!userId) return undefined;

    return this.buscarUsuarioPorId(userId);
  }

  async recarregarUsuario(): Promise<void> {
    const userId = this.getUserLogado();
    if (!userId) {
      return;
    }

    const user = await this.buscarUsuarioPorId(userId);
    this.userSubject.next(user);
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
        'Usuário e senha são obrigatórios',
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
        'Por favor, escolha outro nome de usuário.',
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
        'Erro ao salvar usuário no banco de dados',
      );
      return false;
    }
    this.insertVendas(data.user?.id!);
    this.alertaService.sucesso(
      'Sucesso',
      'Usuário registrado com sucesso! Verifique seu e-mail.',
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
        'Por favor, verifique sua caixa de entrada para confirmar seu e-mail.',
      );
      return false;
    }

    if (error || !data.user) {
      this.alertaService.info(
        'Erro de login',
        'E-mail ou senha inválidos. Por favor, tente novamente.',
      );
      return false;
    }

    this.validacao.login(data.session?.access_token || 'token');
    this.setUserLogado(data.user.id);

    const usuario = await this.buscarUsuarioPorId(data.user.id);
    this.userSubject.next(usuario);
    this.orcamentoService.limparOrcamento();
    return true;
  }

  async restaurarSessao(): Promise<void> {
    if (this.restaurandoSessao) {
      return this.restaurandoSessao;
    }

    this.restaurandoSessao = this.restaurarSessaoInterno();
    await this.restaurandoSessao.finally(() => {
      this.restaurandoSessao = null;
    });
  }

  async logout(): Promise<void> {
    await this.validacao.logout();
    this.setUserLogado('');
    this.userSubject.next(undefined);
    this.orcamentoService.limparOrcamento();
  }

  async insertVendas(id: string) {
    if (!id) {
      console.error(
        'ID do usuário não fornecido para inserir categoria de vendas.',
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

  async hasActiveSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Erro ao validar sessão:', error.message);
        return false;
      }
      return !!data.session;
    } catch (error) {
      console.error('Erro inesperado ao validar sessão:', error);
      return false;
    }
  }

  private get orcamentoService(): OrcamentoService {
    return this.injector.get(OrcamentoService);
  }

  private async restaurarSessaoInterno(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Erro ao restaurar sessão:', error.message);
        this.userSubject.next(undefined);
        this.setUserLogado('');
        return;
      }

      const session = data?.session;

      if (!session?.user) {
        this.userSubject.next(undefined);
        this.setUserLogado('');
        return;
      }

      this.setUserLogado(session.user.id);
      const usuario = await this.buscarUsuarioPorId(session.user.id);
      this.userSubject.next(usuario);
    } catch (error) {
      console.error('Erro inesperado ao restaurar sessão:', error);
      this.userSubject.next(undefined);
      this.setUserLogado('');
    }
  }

  private async buscarUsuarioPorId(userId: string): Promise<UserLogado | undefined> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, username, logo, nome, qrcode_pix')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar usuário logado:', error.message);
      return undefined;
    }

    return data ?? undefined;
  }
}
