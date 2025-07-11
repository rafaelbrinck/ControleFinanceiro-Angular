import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Orcamento } from '../models/orcamento';
import { supabase } from '../supabase';
import { LoginService } from './login.service';
import { ClientesService } from './clientes.service';

@Injectable({
  providedIn: 'root',
})
export class OrcamentoService {
  private orcamentoSubject = new BehaviorSubject<Orcamento[]>([]);
  public orcamento$: Observable<Orcamento[]> =
    this.orcamentoSubject.asObservable();

  constructor(
    private loginService: LoginService,
    private clienteService: ClientesService
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

    // Obter a lista de clientes assinando o observable uma vez
    this.clienteService.clientes$
      .subscribe((clientes) => {
        // Mapear os dados para incluir o cliente associado
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
      alert('Erro ao inserir orçamento.');
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
      alert('Erro ao editar orçamento.');
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
