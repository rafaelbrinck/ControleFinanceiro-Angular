import { Injectable } from '@angular/core';
import { Fornecedor } from '../models/fornecedor';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from './login.service';
import { AlertaService } from './alerta.service';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class FornecedoresService {
  private fornecedoresSubject = new BehaviorSubject<Fornecedor[]>([]);
  public fornecedores$: Observable<Fornecedor[]> =
    this.fornecedoresSubject.asObservable();

  constructor(
    private loginService: LoginService,
    private alertaService: AlertaService
  ) {}

  async carregarFornecedores() {
    const userId = this.loginService.getUserLogado();
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao carregar fornecedores:', error.message);
      return;
    }
    if (data) {
      this.fornecedoresSubject.next(data);
    }
  }

  async listar(): Promise<Fornecedor[]> {
    await this.carregarFornecedores();
    return this.fornecedoresSubject.getValue();
  }

  async insert(fornecedor: Fornecedor): Promise<boolean> {
    fornecedor.idUser = this.loginService.getUserLogado();

    if (!this.validarCampos(fornecedor)) return Promise.resolve(false);

    return supabase
      .from('fornecedores')
      .insert([
        {
          nome: fornecedor.nome,
          cnpj: fornecedor.cnpj,
          idUser: fornecedor.idUser,
        },
      ])
      .then(({ error }) => {
        if (error) {
          console.error('Erro ao inserir fornecedor:', error.message);
          this.alertaService.erro('Erro ao inserir fornecedor', error.message);
          return false;
        }
        this.carregarFornecedores();
        return true;
      });
  }

  async deletar(id: string): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    const { error } = await supabase
      .from('fornecedores')
      .delete()
      .eq('id', id)
      .eq('idUser', userId);
    if (error) {
      console.error('Erro ao deletar fornecedor:', error.message);
      this.alertaService.erro('Erro ao deletar fornecedor', error.message);
      return false;
    }
    await this.carregarFornecedores();
    return true;
  }

  async editar(fornecedor: Fornecedor): Promise<boolean> {
    const idUser = this.loginService.getUserLogado();
    const { error } = await supabase
      .from('fornecedores')
      .update(fornecedor)
      .eq('id', fornecedor.id)
      .eq('idUser', idUser);
    if (error) {
      console.error('Erro ao editar fornecedor:', error.message);
      return false;
    }
    await this.carregarFornecedores();
    return true;
  }

  validarCampos(fornecedor: Fornecedor) {
    if (fornecedor.nome?.trim() === '') {
      this.alertaService.info(
        'Campo Obrigatório',
        'O nome do fornecedor é obrigatório.'
      );
      return false;
    }
    return true;
  }
}
