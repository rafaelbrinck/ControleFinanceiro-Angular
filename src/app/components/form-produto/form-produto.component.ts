import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Produto } from '../../models/produto';
import { Variacao, VariacoesDTO } from '../../models/variacoes';
import { ActivatedRoute, Router } from '@angular/router';
import { ProdutosService } from '../../service/produtos.service';
import { LoginService } from '../../service/login.service';
import { Categoria } from '../../models/categoria';
import { CategoriaService } from '../../service/categoria.service';
import { AlertaService } from '../../service/alerta.service';
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { VariacoesService } from '../../service/variacoes.service';

@Component({
  selector: 'app-form-produto',
  standalone: true,
  imports: [CommonModule, FormsModule, MoedaPipe],
  templateUrl: './form-produto.component.html',
  styleUrl: './form-produto.component.css', // Mantenha .css ou .scss conforme seu projeto
})
export class FormProdutoComponent implements OnInit {
  valorFormatado: string = '';
  produto = new Produto();
  id?: number;
  botao = 'Cadastrar';
  listaCategorias: Categoria[] = [];

  mostrarVariacao: boolean = false;
  variacao = new Variacao();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private produtoService: ProdutosService,
    private loginService: LoginService,
    private categoriaService: CategoriaService,
    private alertaService: AlertaService,
    private variacaoService: VariacoesService
  ) {}

  async ngOnInit() {
    this.listaCategorias = await this.categoriaService.listar('Produto');

    this.id = +this.route.snapshot.params['id'];
    if (this.id) {
      this.botao = 'Editar';
      const produtoBuscado = await this.produtoService.buscarId(this.id);

      if (produtoBuscado) {
        this.produto = produtoBuscado;
        // Garante que variacoes seja um array
        this.produto.variacoes = this.produto.variacoes || [];

        // Se tiver valor único, formata
        if (this.produto.valor != null && this.produto.variacoes.length === 0) {
          this.valorFormatado = this.produto.valor.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        }

        // Se tiver variações carregadas (dependendo de como seu backend retorna)
        // Se precisar buscar separado:
        this.variacaoService.variacoes$.subscribe((variacoes) => {
          const varia = variacoes.filter((v) => v.idProd === this.produto.id);
          // Só substitui se o produto não trouxe variações no buscarId
          if (this.produto.variacoes.length === 0 && varia.length > 0) {
            this.produto.variacoes = varia;
          }
        });
      }
    }
  }

  // Chamado pelo botão "Confirmar Item" (A nova lógica)
  adicionarVariacaoNaListaLocalSeHouverLogica() {
    // 1. Validações
    if (!this.variacao.variacao || this.variacao.variacao.trim() === '') {
      this.alertaService.info(
        'Atenção',
        'Digite o nome da variação (ex: Tamanho G)'
      );
      return;
    }

    if (!this.variacao.valor || this.variacao.valor <= 0) {
      this.alertaService.info(
        'Atenção',
        'O valor da variação deve ser maior que zero.'
      );
      return;
    }

    // 2. Prepara o objeto
    this.variacao.variacao = this.variacao.variacao.toUpperCase();

    // 3. Adiciona à lista local (visual)
    this.produto.variacoes.push(this.variacao);

    // 4. Limpa o form de variação para adicionar a próxima
    this.variacao = new Variacao();
    this.valorFormatado = ''; // Limpa o input de valor da variação

    // Opcional: focar no input de nome novamente se possível
  }

  // Chamado pelo Switch ou botão "Adicionar outra variação"
  adicionarVariacao() {
    this.mostrarVariacao = true;
    this.variacao = new Variacao();
    this.valorFormatado = ''; // Limpa para o usuário digitar o valor da variação

    // Ao ativar variação, zeramos o valor do produto principal para evitar confusão
    this.produto.valor = 0;
  }

  // Chamado ao desligar o Switch
  fecharVariacoes() {
    this.alertaService.confirmar(
      'Remover Variações?',
      'Isso removerá todas as variações adicionadas. Deseja continuar?',
      (confirmou) => {
        if (confirmou) {
          this.mostrarVariacao = false;
          this.variacao = new Variacao();
          this.produto.variacoes = []; // Limpa a lista
          this.valorFormatado = ''; // Limpa o input
        } else {
          // Se cancelou, mantém o switch ligado (na view precisaria de two-way binding no switch para reverter visualmente,
          // ou apenas não fazemos nada e o usuário clica de novo se quiser)
        }
      }
    );
  }

  async removerVariacao(variacao: VariacoesDTO) {
    // Se o produto já existe e a variação tem ID, deleta do banco
    if (this.id && variacao.id) {
      await this.variacaoService.deletar(variacao.id);
    }

    // Remove da lista local
    this.produto.variacoes = this.produto.variacoes.filter(
      (v) => v !== variacao
    );

    // Se removeu tudo, talvez queira voltar a mostrar o campo de adicionar?
    if (this.produto.variacoes.length === 0) {
      // Opcional: this.mostrarVariacao = true;
    }
  }

  async salvar() {
    // Se tiver preenchido dados no form de variação mas esqueceu de clicar em "Confirmar Item"
    if (
      this.mostrarVariacao &&
      this.variacao.variacao &&
      this.variacao.valor &&
      this.variacao.valor > 0
    ) {
      this.adicionarVariacaoNaListaLocalSeHouverLogica();
    }

    if (this.validarCampos()) {
      // Define ID do usuário
      this.produto.idUser = this.loginService.getUserLogado();

      if (this.id) {
        await this.produtoService.editar(this.id, this.produto);

        // Se tiver variações novas (sem ID), precisa salvá-las agora ou o backend trata?
        // Assumindo que seu backend ao salvar o produto já salva as variações (Cascade):
        this.alertaService.sucesso('Sucesso', 'Produto editado com sucesso!');
        this.voltar();
      } else {
        const sucesso = await this.produtoService.inserir(this.produto);
        if (sucesso) {
          this.alertaService.sucesso(
            'Sucesso',
            'Produto cadastrado com sucesso!'
          );
          this.voltar();
        }
      }
    }
  }

  voltar() {
    this.router.navigate(['produtos']);
  }

  mascaraValor(event: Event) {
    const input = event.target as HTMLInputElement;
    const valorRaw = input.value;

    const numeros = valorRaw.replace(/\D/g, '');
    const valorNumerico = parseFloat(numeros) / 100;

    // Atualiza o formato visual
    this.valorFormatado = valorNumerico.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Atualiza o modelo correto dependendo do estado
    if (this.mostrarVariacao) {
      // Estamos editando o valor de uma NOVA variação
      this.variacao.valor = valorNumerico;
    } else {
      // Estamos editando o valor do Produto Único
      this.produto.valor = valorNumerico;
    }
  }

  conferirCategoria(valor: any) {
    if (valor === 'nova') {
      this.alertaService.confirmar(
        'Nova Categoria',
        'Deseja ir para a tela de cadastro de categorias?',
        (resultado) => {
          if (resultado) {
            this.router.navigate(['/form-categoria']);
          } else {
            this.produto.categoria = undefined; // Reseta seleção
          }
        }
      );
    }
  }

  private validarCampos() {
    if (!this.produto.nome || this.produto.nome.trim() === '') {
      this.alertaService.info('Obrigatório', 'Preencha o nome do produto.');
      return false;
    }

    if (!this.produto.categoria) {
      this.alertaService.info('Obrigatório', 'Selecione uma categoria.');
      return false;
    }
    if (!this.produto.qtd_gancho || this.produto.qtd_gancho < 0) {
      this.alertaService.info(
        'Obrigatório',
        'A quantidade de ganchos não pode ser menor que 0.'
      );
      return false;
    }
    // Validação de Variações vs Valor Único
    const temVariacoes = this.produto.variacoes.length > 0;

    if (temVariacoes) {
      // Se tem variações, o valor do produto é irrelevante (ou calculado no backend)
      return true;
    } else {
      // Se não tem variações, precisa do valor único
      if (!this.produto.valor || this.produto.valor <= 0) {
        this.alertaService.info(
          'Obrigatório',
          'Informe o valor do produto ou adicione variações.'
        );
        return false;
      }
    }

    return true;
  }
}
