import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Orcamento } from '../models/orcamento';
import { supabase } from '../supabase';
import { LoginService } from './login.service';
import { ClientesService } from './clientes.service';
import { AlertaService } from './alerta.service';
import { Produto, ProdutoOrcamento } from '../models/produto';
import { Cliente } from '../models/cliente';
import { GraficosDataService } from './grafico.service';

@Injectable({
  providedIn: 'root',
})
export class OrcamentoService {
  private orcamentoSubject = new BehaviorSubject<Orcamento[]>([]);
  public orcamento$: Observable<Orcamento[]> =
    this.orcamentoSubject.asObservable();

  public produtosOrcamento = new BehaviorSubject<ProdutoOrcamento[]>([]);
  public produtosOrcamento$ = this.produtosOrcamento.asObservable();
  public clienteOrcamento = new BehaviorSubject<Cliente>(new Cliente());
  public clienteOrcamento$ = this.clienteOrcamento.asObservable();

  public orcamentoSelecionado = new BehaviorSubject<Orcamento | null>(null);
  public orcamentoSelecionado$ = this.orcamentoSelecionado.asObservable();

  constructor(
    private injector: Injector,
    private clienteService: ClientesService,
    private alertaService: AlertaService,
    private graficoService: GraficosDataService
  ) {}

  duplicarOrcamento(orcamento: Orcamento) {
    var lista: ProdutoOrcamento[] = [];

    orcamento.produtos?.forEach((produto) => {
      lista.push({ ...produto });
    });
    this.produtosOrcamento.next(lista);
    this.clienteOrcamento.next(orcamento.cliente!);
  }

  addOrcamentoSelecionado(orcamento: Orcamento) {
    this.orcamentoSelecionado.next(orcamento);
  }
  limparOrcamentoSelecionado() {
    this.orcamentoSelecionado.next(null);
  }

  addProdutos(produtos: ProdutoOrcamento[]) {
    this.produtosOrcamento.next(produtos);
  }
  addCliente(cliente: Cliente) {
    this.clienteOrcamento.next(cliente);
  }
  limparOrcamento() {
    this.produtosOrcamento.next([]);
    this.clienteOrcamento.next(new Cliente());
  }

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

    await this.graficoService.atualizarDados();
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
    await this.graficoService.atualizarDados();
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

  async buscarPorCliente(id: number): Promise<Orcamento[] | null> {
    const userId = this.loginService.getUserLogado();
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('idCliente', id)
      .eq('idUser', userId);

    if (error) {
      console.error('Erro ao buscar orçamento por ID:', error.message);
      return null;
    }

    return data as Orcamento[];
  }

  qtdOrcamentos(): Observable<number> {
    return new Observable<number>((observer) => {
      this.orcamento$.subscribe((orcamentos) => {
        observer.next(orcamentos.length);
      });
    });
  }

  enviarOrcamentoWhatsApp(orcamento: Orcamento) {
    const cliente = orcamento.cliente;
    const produtos = orcamento
      .produtos!.map(
        (p) =>
          `• ${p.quantidade}x ${p.nome} - R$ ${(p.valor ?? 0)
            .toFixed(2)
            .replace('.', ',')}`
      )
      .join('\n');

    const total = (orcamento.valor ?? 0).toFixed(2).replace('.', ',');
    const valorCredito = (orcamento.valorCredito ?? 0)
      .toFixed(2)
      .replace('.', ',');

    var mensagem = '';
    if (orcamento.desconto != 0) {
      mensagem = `
  *🐭✨ Resumo da sua compra: ✨🐭*
  
  *🛍️ Produtos:*
  ${produtos}
  
  📦 *Frete:* R$ ${orcamento.frete?.toFixed(2).replace('.', ',') || '0,00'}
  💝 *Descontinho:* R$ ${
    orcamento.desconto?.toFixed(2).replace('.', ',') || '0,00'
  }
  
  💳 *Total no pix:* R$ ${total}
  💳 *Total parcelado:* R$ ${valorCredito}
  
  Qual a forma de pagamento? 💰🫶🏻
  `;
    } else {
      mensagem = `
  *🐭✨ Resumo da sua compra: ✨🐭*
  
  *🛍️ Produtos:*
  ${produtos}
  
  📦 *Frete:* R$ ${orcamento.frete?.toFixed(2).replace('.', ',') || '0,00'}
  
  💳 *Total no pix:* R$ ${total}
  💳 *Total parcelado:* R$ ${valorCredito}
  
  Qual a forma de pagamento? 💰🫶🏻
  `;
    }

    const telefone = cliente?.telefone!.replace(/\D/g, ''); // remove símbolos
    const url = `https://api.whatsapp.com/send?phone=55${telefone}&text=${encodeURIComponent(
      mensagem
    )}`;

    window.open(url, '_blank');
  }

  private get loginService(): LoginService {
    return this.injector.get(LoginService);
  }
}
