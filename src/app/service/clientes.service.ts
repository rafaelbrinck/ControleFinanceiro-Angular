import { Injectable } from '@angular/core';
import { Cliente } from '../models/cliente';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from './login.service';
import { supabase } from '../supabase';
import { AlertaService } from './alerta.service';

@Injectable({
  providedIn: 'root',
})
export class ClientesService {
  private clientesSubject = new BehaviorSubject<Cliente[]>([]);
  public clientes$: Observable<Cliente[]> = this.clientesSubject.asObservable();

  constructor(
    private loginService: LoginService,
    private alertaService: AlertaService
  ) {}

  async carregarClientes() {
    const userId = this.loginService.getUserLogado();
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao carregar clientes:', error.message);
      return;
    }

    if (data) {
      this.clientesSubject.next(data);
    }
  }

  async listar(): Promise<Cliente[]> {
    await this.carregarClientes();
    return this.clientesSubject.getValue();
  }

  async insert(cliente: Cliente): Promise<boolean> {
    cliente.idUser = this.loginService.getUserLogado();
    cliente.instaUser = cliente.instaUser?.toLowerCase();

    if (!this.validarCampos(cliente)) return false;

    const { error } = await supabase.from('clientes').insert([
      {
        nome: cliente.nome,
        cpf: cliente.cpf,
        cep: cliente.cep,
        endereco: cliente.endereco,
        endNumero: cliente.endNumero,
        endComplemento: cliente.endComplemento,
        cidade: cliente.cidade,
        uf: cliente.uf,
        bairro: cliente.bairro,
        telefone: cliente.telefone,
        instaUser: cliente.instaUser,
        idUser: cliente.idUser,
      },
    ]);

    if (error) {
      console.error('Erro ao inserir cliente:', error.message);
      return false;
    }

    await this.carregarClientes();
    return true;
  }

  async buscarId(id: number): Promise<Cliente | null> {
    const userId = this.loginService.getUserLogado();
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('idUser', userId)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar cliente:', error.message);
      return null;
    }

    return data || null;
  }

  async deletar(id?: number): Promise<void> {
    const userId = this.loginService.getUserLogado();
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao deletar cliente:', error.message);
    }

    await this.carregarClientes();
  }

  async editar(id: number, cliente: Cliente): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    cliente.instaUser = cliente.instaUser?.toLowerCase();

    const { error } = await supabase
      .from('clientes')
      .update(cliente)
      .eq('id', id)
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao editar cliente:', error.message);
      return false;
    }

    await this.carregarClientes();
    return true;
  }

  private validarCampos(cliente: Cliente): boolean {
    if (!cliente.nome || cliente.nome.trim() === '') {
      this.alertaService.info('Obrigário', 'Nome é obrigatório!');
      return false;
    }
    return true;
  }
}
