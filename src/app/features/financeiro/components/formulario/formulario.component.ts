import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Transacao } from '@app/shared/models/transacao';
import { TransacaoService } from '@app/core/services/transacao.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Categoria } from '@app/shared/models/categoria';
import { CategoriaService } from '@app/core/services/categoria.service';
import { LoginService } from '@app/core/auth/services/login.service';
import { AlertaService } from '@app/core/services/alerta.service';

// Novos imports
import { Cartao } from '@app/shared/models/cartao';
import { Fornecedor } from '@app/shared/models/fornecedor';
import { FornecedoresService } from '@app/core/services/fornecedores.service';
import { CartoesService } from '@app/core/services/cartao.service';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formulario.component.html',
  styleUrl: './formulario.component.css',
})
export class FormularioComponent implements OnInit {
  valorFormatado: string = '';
  transacao = new Transacao();
  id?: number;
  botao = 'Cadastrar';

  listaCategorias: Categoria[] = [];
  listaCartoes: Cartao[] = [];
  listaFornecedores: Fornecedor[] = [];

  constructor(
    private transacaoService: TransacaoService,
    private categoriaService: CategoriaService,
    private cartoesService: CartoesService,
    private fornecedoresService: FornecedoresService,
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private alertaService: AlertaService,
  ) {}

  async ngOnInit() {
    this.listaCategorias = await this.categoriaService.listar('Transacao');

    await this.cartoesService.carregarCartoes();
    this.listaCartoes = this.cartoesService.getCartoesSnapshot();

    await this.fornecedoresService.carregarFornecedores();
    this.listaFornecedores = this.fornecedoresService.getFornecedoresSnapshot();

    this.id = +this.route.snapshot.params['id'];
    if (this.id) {
      this.botao = 'Editar';
      this.transacao = await this.transacaoService.buscarId(this.id);
      if (this.transacao.valor != null) {
        this.valorFormatado = this.transacao.valor.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
    }
  }

  async salvar() {
    if (!this.validarInfos()) return;

    // Regra de Negócio: Limpar IDs secundários se for uma "Entrada"
    if (this.transacao.tipo === 'Entrada') {
      this.transacao.cartao_id = null;
      this.transacao.fornecedor_id = null;
    }

    if (this.id) {
      if (await this.transacaoService.editar(this.id, this.transacao)) {
        this.alertaService.sucesso('Sucesso', 'Transação editada com sucesso!');
        this.voltar();
      } else {
        this.alertaService.erro('Erro', 'Problema ao editar a transação!');
      }
    } else {
      this.transacao.idUser = this.loginService.getUserLogado();
      this.transacaoService.inserir(this.transacao);
      this.alertaService.sucesso(
        'Sucesso',
        'Transação cadastrada com sucesso!',
      );
      this.transacao = new Transacao();
      this.voltar();
    }
  }

  validaValor(valor: number) {
    return valor > 0;
  }

  mascaraValor(event: Event) {
    const input = event.target as HTMLInputElement;
    const numeros = input.value.replace(/\D/g, '');
    const somenteNumeros = parseFloat(numeros) / 100;
    this.transacao.valor = somenteNumeros;
    this.valorFormatado = somenteNumeros.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  voltar() {
    this.router.navigate(['/transacoes']);
  }

  conferirCategoria(valor: string) {
    if (valor === 'nova') {
      this.alertaService.confirmar(
        'Nova Categoria',
        'Deseja adicionar uma nova categoria?',
        (res) => {
          if (res) this.router.navigate(['/form-categoria']);
        },
      );
    }
  }

  validarInfos(): boolean {
    if (!this.transacao.nome) {
      this.alertaService.info('Obrigatório', 'Nome obrigatório!');
      return false;
    }
    if (!this.transacao.valor || Number.isNaN(this.transacao.valor)) {
      this.alertaService.info('Obrigatório', 'Valor obrigatório!');
      return false;
    }
    if (!this.validaValor(this.transacao.valor)) {
      this.alertaService.info(
        'Obrigatório',
        'Valor tem que ser maior do que zero',
      );
      return false;
    }
    if (!this.transacao.tipo) {
      this.alertaService.info('Obrigatório', 'Tipo de transação obrigatório!');
      return false;
    }
    return true;
  }

  getDataHoje(): string {
    return new Date().toISOString().split('T')[0];
  }
  // Agrupa as filhas debaixo das mães
  get categoriasAgrupadas() {
    let resultado: any[] = [];
    const principais = this.listaCategorias.filter((c) => !c.categoria_mae);
    principais.forEach((pai) => {
      resultado.push({ ...pai, isFilha: false });
      const filhas = this.listaCategorias.filter(
        (c) => c.categoria_mae === pai.id,
      );
      filhas.forEach((filha) => {
        resultado.push({ ...filha, isFilha: true, nomeMae: pai.nome });
      });
    });
    return resultado;
  }

  // Getters para os textos dos botões principais
  getNomeCategoria(): string {
    const cat = this.listaCategorias.find(
      (c) => c.id === this.transacao.categoria,
    );
    return cat ? cat.nome! : '';
  }
  getNomeFornecedor(): string {
    const forn = this.listaFornecedores.find(
      (c) => c.id === this.transacao.fornecedor_id,
    );
    return forn ? forn.nome! : '';
  }
  getNomeCartao(): string {
    const cartao = this.listaCartoes.find(
      (c) => c.id === this.transacao.cartao_id,
    );
    return cartao ? cartao.nome! : '';
  }

  // Setters ao clicar nas opções
  selecionarCategoria(id: any) {
    if (id === 'nova') this.conferirCategoria('nova');
    else this.transacao.categoria = id;
  }
  selecionarFornecedor(id: any) {
    this.transacao.fornecedor_id = id;
  }
  selecionarCartao(id: any) {
    this.transacao.cartao_id = id;
  }
}
