import { Component, DestroyRef } from '@angular/core';
import { Produto, ProdutoOrcamento } from '../../models/produto';
import { ProdutosService } from '../../service/produtos.service';
import { CommonModule } from '@angular/common';
import { LoginService } from '../../service/login.service';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Cliente } from '../../models/cliente';
import { ClientesService } from '../../service/clientes.service';
import { Orcamento } from '../../models/orcamento';
import { OrcamentoService } from '../../service/orcamento.service';
import { AlertaService } from '../../service/alerta.service';
import { Variacao } from '../../models/variacoes';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-orcamento',
  imports: [CommonModule, BuscadorPipe, MoedaPipe, FormsModule, RouterModule],
  templateUrl: './orcamento.component.html',
  styleUrl: './orcamento.component.css',
})
export class OrcamentoComponent {
  freteFormatado: string = '';
  frete: number = 0;

  // Controle de Descontos
  tipoDesconto: 'valor' | 'porcentagem' = 'valor';
  descontoFormatado: string = '';
  desconto: number = 0;
  descontoPorcFormatado: string = '';
  descontoPorcentagem: number = 0;

  nomePesquisa?: string;
  clientePesquisa?: string;
  clienteSelecionado: Cliente = new Cliente();
  listaClientes: Cliente[] = [];
  listaProdutos: Produto[] = [];
  produtosOrcamento: ProdutoOrcamento[] = [];
  mostrarDetalhes = false;
  mostrarClientes = false;
  expandedRow: number | null = null;

  constructor(
    private loginService: LoginService,
    private produtoService: ProdutosService,
    private clienteService: ClientesService,
    private orcamentoService: OrcamentoService,
    private alertaService: AlertaService,
    private router: Router,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit(): Promise<void> {
    this.mostrarClientes = false;
    if (this.produtoService.getProdutosSnapshot().length === 0) {
      await this.produtoService.carregarProdutos();
    }
    if (this.clienteService.getClientesSnapshot().length === 0) {
      await this.clienteService.carregarClientes();
    }

    this.produtoService.produtos$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((produtos) => {
        this.listaProdutos = produtos;
      });
    this.clienteService.clientes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clientes) => {
        this.listaClientes = clientes;
      });
    this.orcamentoService.produtosOrcamento$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((produtos) => {
        this.produtosOrcamento = produtos;
      });
    this.orcamentoService.clienteOrcamento$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cliente) => {
        this.clienteSelecionado = cliente;
      });
  }

  limparCarrinho() {
    this.alertaService.confirmar(
      'Limpar Carrinho',
      'Deseja esvaziar o carrinho?',
      (resultado) => {
        if (resultado) {
          this.orcamentoService.limparOrcamento();
          this.produtosOrcamento = [];
          this.clienteSelecionado = new Cliente();
          this.resetarDescontoEFrete();
        }
      },
    );
  }

  async adicionarProduto(id?: number, variacao?: Variacao) {
    if (!id) return;

    var produto = await this.produtoService.buscarId(id);

    if (produto) {
      if (variacao) {
        produto.nome = produto.nome! + ' - ' + variacao.variacao;
        produto.valor = variacao.valor;
      }
      const prodLista = this.produtosOrcamento.find(
        (prod) => prod.nome === produto?.nome,
      );
      if (prodLista) {
        prodLista.quantidade = (prodLista.quantidade ?? 0) + 1;
      } else {
        const prod: ProdutoOrcamento = {
          id: produto.id,
          nome: produto.nome,
          valor: produto.valor ?? 0,
          quantidade: 1,
          qtd_gancho: produto.qtd_gancho,
        };
        this.produtosOrcamento.push(prod);
        this.orcamentoService.addProdutos(this.produtosOrcamento);
      }
    }
  }

  get totalProdutosCarrinho() {
    return (
      this.produtosOrcamento.reduce(
        (soma, p) => soma + (p.quantidade ?? 0),
        0,
      ) || 0
    );
  }

  // Subtotal apenas dos produtos (sem frete e descontos)
  get subtotalProdutos() {
    return (
      this.produtosOrcamento.reduce(
        (soma, p) => soma + (p.quantidade ?? 0) * (p.valor ?? 0),
        0,
      ) || 0
    );
  }

  // Calcula o valor em reais que será descontado (independente de ser $ ou %)
  get valorDescontoCalculado() {
    if (this.tipoDesconto === 'valor') {
      return this.desconto || 0;
    } else {
      return this.subtotalProdutos * ((this.descontoPorcentagem || 0) / 100);
    }
  }

  get total() {
    const totalComDesconto =
      this.subtotalProdutos - this.valorDescontoCalculado;
    const totalComFrete = totalComDesconto + this.frete;
    return totalComFrete > 0 ? totalComFrete : 0; // Evita total negativo
  }

  get totalParcelamento() {
    // Para o parcelamento, aplica-se o desconto ANTES da taxa, depois soma frete
    const totalComDesconto =
      this.subtotalProdutos - this.valorDescontoCalculado;
    const totalBaseParaTaxa = totalComDesconto + this.frete;
    const taxaTotal = 4.98 + 8.66;
    const totalComTaxa = totalBaseParaTaxa / (1 - taxaTotal / 100);
    return totalComTaxa > 0 ? totalComTaxa : 0;
  }

  get calculoGanchos() {
    var totalGanchos = 0;
    this.produtosOrcamento.forEach((prod) => {
      var calculo = 0;
      if (prod.quantidade > 1) {
        calculo = prod.qtd_gancho! * prod.quantidade;
        totalGanchos += calculo;
      } else {
        totalGanchos += prod.qtd_gancho || 0;
      }
    });
    return totalGanchos;
  }

  async carregarClientes() {
    const clientes = await firstValueFrom(this.clienteService.clientes$);
    if (clientes.length === 0) {
      await this.clienteService.carregarClientes();
    }
  }

  removerProduto(id?: number) {
    if (!id) return;

    const prodLista = this.produtosOrcamento.find((prod) => prod.id === id);
    if (prodLista?.quantidade == 1) {
      this.produtosOrcamento = this.produtosOrcamento.filter(
        (p) => p.id !== id,
      );
    } else {
      prodLista!.quantidade = (prodLista!.quantidade ?? 0) - 1;
    }
  }

  adicionarCliente(cliente: Cliente) {
    this.clienteSelecionado = cliente;
    this.orcamentoService.addCliente(cliente);
  }

  // Troca entre dinheiro e porcentagem
  mudarTipoDesconto(tipo: 'valor' | 'porcentagem') {
    this.tipoDesconto = tipo;
    this.desconto = 0;
    this.descontoFormatado = '';
    this.descontoPorcentagem = 0;
    this.descontoPorcFormatado = '';
  }

  resetarDescontoEFrete() {
    this.frete = 0;
    this.freteFormatado = '';
    this.desconto = 0;
    this.descontoFormatado = '';
    this.descontoPorcentagem = 0;
    this.descontoPorcFormatado = '';
    this.tipoDesconto = 'valor';
  }

  async finalizarOrcamento() {
    if (!this.validarOrcamento()) return;

    const orcamento: Orcamento = {
      cliente: this.clienteSelecionado,
      produtos: this.produtosOrcamento,
      valorCredito: this.totalParcelamento,
      valor: this.total,
      status: 'Aberto',
      idUser: this.loginService.getUserLogado(),
      frete: this.frete,
      desconto: this.valorDescontoCalculado, // Salva o valor real em reais no banco
    };

    await this.orcamentoService.inserir(orcamento).then((success) => {
      if (success) {
        this.orcamentoService.limparOrcamento();
        this.produtosOrcamento = [];
        this.clienteSelecionado = new Cliente();
        this.mostrarDetalhes = false;
        this.mostrarClientes = false;
        this.resetarDescontoEFrete();

        this.alertaService.sucesso(
          'Orçamento Finalizado',
          'O orçamento foi salvo com sucesso!',
        );
        if (orcamento.cliente?.telefone) {
          this.alertaService.confirmar(
            'Deseja enviar o orçamento pelo WhatsApp?',
            'Você pode enviar o orçamento para o cliente via WhatsApp.',
            (resultado) => {
              if (resultado) {
                this.enviarOrcamentoWhatsApp(orcamento);
                this.paginaOrcamentos();
              }
              this.paginaOrcamentos();
            },
          );
        }
      } else {
        this.alertaService.erro(
          'Erro ao Finalizar Orçamento',
          'Ocorreu um erro ao finalizar o orçamento. Tente novamente.',
        );
      }
    });
  }

  validarOrcamento(): boolean {
    if (this.produtosOrcamento.length === 0) {
      this.alertaService.info(
        'Orçamento Vazio',
        'Você precisa adicionar pelo menos um produto ao orçamento.',
      );
      return false;
    }
    if (!this.clienteSelecionado.id) {
      this.alertaService.info(
        'Cliente Não Selecionado',
        'Você precisa selecionar um cliente para o orçamento.',
      );
      this.mostrarClientes = true;
      return false;
    }
    if (this.frete < 0) {
      this.alertaService.info(
        'Frete Inválido',
        'O valor do frete não pode ser negativo.',
      );
      return false;
    }
    if (this.valorDescontoCalculado < 0) {
      this.alertaService.info(
        'Desconto Inválido',
        'O valor do desconto não pode ser negativo.',
      );
      return false;
    }
    if (this.total < 0) {
      this.alertaService.info(
        'Valor Total Inválido',
        'O valor total do orçamento não pode ficar negativo. Verifique o desconto aplicado.',
      );
      return false;
    }

    return true;
  }

  paginaOrcamentos() {
    this.router.navigate(['/lista-orcamentos']);
  }

  // NOVA ABORDAGEM: Reativa 100% com o Angular
  mascaraValorModel(
    valorStr: string,
    campo: 'frete' | 'desconto' | 'desconto_porc',
  ) {
    if (!valorStr) valorStr = '0';

    const numeros = String(valorStr).replace(/\D/g, '');
    let somenteNumeros = parseFloat(numeros) / 100 || 0;

    // Se for porcentagem, trava o máximo em 100%
    if (campo === 'desconto_porc' && somenteNumeros > 100) {
      somenteNumeros = 100;
    }

    const formatado = somenteNumeros.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Atualiza os valores matemáticos
    if (campo === 'frete') {
      this.frete = somenteNumeros;
      this.freteFormatado = formatado;
    } else if (campo === 'desconto') {
      this.desconto = somenteNumeros;
      this.descontoFormatado = formatado;
    } else if (campo === 'desconto_porc') {
      this.descontoPorcentagem = somenteNumeros;
      this.descontoPorcFormatado = formatado;
    }
  }

  enviarOrcamentoWhatsApp(orcamento: Orcamento) {
    this.orcamentoService.enviarOrcamentoWhatsApp(orcamento);
  }

  toggleExpand(index: number, prod: Produto) {
    if (prod.variacoes.length > 0) {
      this.expandedRow = this.expandedRow === index ? null : index;
    }
  }

  toggleCarrinho() {
    this.mostrarDetalhes = !this.mostrarDetalhes;
    if (this.mostrarDetalhes) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}
