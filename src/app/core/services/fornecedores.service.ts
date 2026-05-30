import { Injectable } from '@angular/core';
import { Fornecedor } from '@app/shared/models/fornecedor';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from '@app/core/auth/services/login.service';
import { AlertaService } from '@app/core/services/alerta.service';
import { supabase } from '@app/core/data/supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class FornecedoresService {
  private fornecedoresSubject = new BehaviorSubject<Fornecedor[]>([]);
  public fornecedores$: Observable<Fornecedor[]> =
    this.fornecedoresSubject.asObservable();

  // O nosso Lock de Performance
  private fetchPromise: Promise<void> | null = null;

  constructor(
    private loginService: LoginService,
    private alertaService: AlertaService,
  ) {}

  async carregarFornecedores(): Promise<void> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return;

    if (this.fornecedoresSubject.getValue().length > 0) return;
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this._executarCarga(userId);
    await this.fetchPromise;
    this.fetchPromise = null;
  }

  private async _executarCarga(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('idUser', userId)
      .order('nome', { ascending: true });

    if (error || !data) {
      console.error('Erro ao carregar fornecedores:', error?.message);
      this.fornecedoresSubject.next([]);
      return;
    }
    this.fornecedoresSubject.next(data as Fornecedor[]);
  }

  async salvar(fornecedor: Fornecedor): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    let error;

    if (!fornecedor.nome?.trim()) {
      this.alertaService.info('Atenção', 'O nome do fornecedor é obrigatório.');
      return false;
    }

    if (fornecedor.id) {
      const res = await supabase
        .from('fornecedores')
        .update({ nome: fornecedor.nome, cnpj: fornecedor.cnpj })
        .eq('id', fornecedor.id)
        .eq('idUser', userId);
      error = res.error;
    } else {
      const res = await supabase
        .from('fornecedores')
        .insert([
          { nome: fornecedor.nome, cnpj: fornecedor.cnpj, idUser: userId },
        ]);
      error = res.error;
    }

    if (error) {
      this.alertaService.erro('Erro', error.message);
      return false;
    }

    this.fornecedoresSubject.next([]); // Limpa cache
    await this.carregarFornecedores();
    return true;
  }

  async deletar(id: number): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    const { error } = await supabase
      .from('fornecedores')
      .delete()
      .eq('id', id)
      .eq('idUser', userId);

    if (error) {
      this.alertaService.erro('Erro', error.message);
      return false;
    }
    this.fornecedoresSubject.next([]);
    await this.carregarFornecedores();
    return true;
  }

  getFornecedoresSnapshot(): Fornecedor[] {
    return this.fornecedoresSubject.getValue();
  }

  validarCampos(fornecedor: Fornecedor) {
    if (fornecedor.nome?.trim() === '') {
      this.alertaService.info(
        'Campo Obrigatório',
        'O nome do fornecedor é obrigatório.',
      );
      return false;
    }
    return true;
  }
}
