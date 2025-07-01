import { Injectable } from '@angular/core';
import { User, UserLogado } from '../models/user';
import { ValidacaoService } from './validacao.service';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase';
import * as bcrypt from 'bcryptjs';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  public idUserLogadoSubject = new BehaviorSubject<number>(0);
  public idUserLogado$ = this.idUserLogadoSubject.asObservable();

  private userSubject = new BehaviorSubject<UserLogado | undefined>(undefined);
  public user$ = this.userSubject.asObservable();

  constructor(private validacao: ValidacaoService) {}

  getUserLogado(): number {
    return this.idUserLogadoSubject.getValue();
  }

  setUserLogado(id: number): void {
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
      this.userSubject.next(data); // 🔁 força o emit
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

    const senhaCriptografada = bcrypt.hashSync(user.password, 10);
    const { error } = await supabase.from('usuarios').insert([
      {
        username: user.username,
        password: senhaCriptografada,
      },
    ]);

    if (error) {
      alert('Erro ao registrar usuário!');
      return false;
    }
    return true;
  }

  async logar(user: User): Promise<boolean> {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', user.username)
      .single();

    if (!usuario || !bcrypt.compareSync(user.password!, usuario.password)) {
      alert('Usuário ou senha inválidos');
      return false;
    }

    const token =
      Math.random().toString(25).substring(2) + Date.now().toString(25);

    this.validacao.login(token);
    this.setUserLogado(usuario.id);
    this.userSubject.next(usuario); // <- armazena usuário logado

    return true;
  }

  logout() {
    this.validacao.logout();
    this.setUserLogado(0);
    this.userSubject.next(undefined); // limpa o usuário
  }

  async deletar(id?: number) {
    if (!id) return;

    const { error } = await supabase.from('usuarios').delete().eq('id', id);

    if (error) {
      console.error('Erro ao deletar usuário:', error.message);
      alert('Erro ao deletar usuário.');
    } else {
      alert('Usuário deletado com sucesso!');
    }
  }
}
