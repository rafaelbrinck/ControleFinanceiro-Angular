import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Orcamento } from '../models/orcamento';
import { supabase } from '../supabase';
import { LoginService } from './login.service';
import { ClientesService } from './clientes.service';
import { AlertaService } from './alerta.service';

@Injectable({
  providedIn: 'root',
})
export class OrcamentoService {
  private orcamentoSubject = new BehaviorSubject<Orcamento[]>([]);
  public orcamento$: Observable<Orcamento[]> =
    this.orcamentoSubject.asObservable();

  constructor(
    private loginService: LoginService,
    private clienteService: ClientesService,
    private alertaService: AlertaService
  ) {}

  async carregarOrcamentos() {
    const userId = this.loginService.getUserLogado();
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('idUser', userId)
      .order('id', { ascending: false });

    if (error) {
      console.error('Erro ao carregar orçamentos:', error.message);
      return;
    }
    await this.clienteService.carregarClientes();

    this.clienteService.clientes$
      .subscribe((clientes) => {
        data.forEach((orcamento) => {
          orcamento.cliente = clientes.find(
            (cliente) => cliente.id === orcamento.idCliente
          ) || { nome: 'Cliente não encontrado', cpf: '' };
          orcamento.nomeCliente =
            orcamento.cliente?.nome || 'Cliente não encontrado';
        });
        this.orcamentoSubject.next(data as Orcamento[]);
      })
      .unsubscribe();
  }

  async inserir(orcamento: Orcamento) {
    orcamento.idUser = this.loginService.getUserLogado();

    const { error } = await supabase.from('orcamentos').insert([
      {
        idCliente: orcamento.cliente?.id,
        produtos: orcamento.produtos,
        valorCredito: orcamento.valorCredito,
        valor: orcamento.valor,
        status: orcamento.status,
        formaPagamento: orcamento.formaPagamento,
        idUser: orcamento.idUser,
        frete: orcamento.frete,
        desconto: orcamento.desconto,
      },
    ]);

    if (error) {
      console.error('Erro ao inserir orçamento:', error.message);
      this.alertaService.erro(
        'Erro ao inserir orçamento',
        'Por favor, tente novamente mais tarde.'
      );
      return false;
    }

    await this.carregarOrcamentos();
    return true;
  }

  async atualizar(orcamento: Orcamento) {
    const userId = this.loginService.getUserLogado();

    const { error } = await supabase
      .from('orcamentos')
      .update({
        status: orcamento.status,
        formaPagamento: orcamento.formaPagamento,
        updated_at: orcamento.updated_at,
      })
      .eq('id', orcamento.id)
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao editar orçamento:', error.message);
      this.alertaService.erro(
        'Erro ao editar orçamento',
        'Por favor, tente novamente mais tarde.'
      );
      return false;
    }
    await this.carregarOrcamentos();
    return true;
  }

  async buscarPorId(id: number): Promise<Orcamento | null> {
    const userId = this.loginService.getUserLogado();
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('id', id)
      .eq('idUser', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar orçamento por ID:', error.message);
      return null;
    }

    return data as Orcamento;
  }
}
