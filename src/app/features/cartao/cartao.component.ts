import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cartao } from '@app/shared/models/cartao';
import { TransacaoService } from '@app/core/services/transacao.service';
import { AlertaService } from '@app/core/services/alerta.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartoesService } from '@app/core/services/cartao.service';

declare var bootstrap: any;

@Component({
  selector: 'app-cartoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cartao.component.html',
  styleUrls: ['./cartao.component.css'],
})
export class CartoesComponent implements OnInit {
  cartoes: Cartao[] = [];
  cartaoEmEdicao: Cartao = new Cartao();
  modalInstancia: any;

  // Arrays de cores para os cartões ficarem bonitos e variados
  gradients = [
    'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', // Black
    'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', // Indigo
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Pink
    'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', // Sky
    'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // Amber
  ];

  constructor(
    private cartoesService: CartoesService,
    private transacaoService: TransacaoService,
    private alertaService: AlertaService,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit() {
    await this.cartoesService.carregarCartoes();
    await this.transacaoService.carregarTransacoes();

    // Fica a ouvir os cartões
    this.cartoesService.cartoes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lista) => {
        this.cartoes = JSON.parse(JSON.stringify(lista)); // Deep copy
        this.calcularFaturas();
      });

    // Se houver uma nova transação, recalcula as faturas automaticamente!
    this.transacaoService.transacoes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.cartoes.length > 0) this.calcularFaturas();
      });
  }

  calcularFaturas() {
    const transacoes = this.transacaoService.getTransacoesSnapshot();
    const dataAtual = new Date();
    const mesAtual = dataAtual.getMonth();
    const anoAtual = dataAtual.getFullYear();

    this.cartoes.forEach((cartao) => {
      // Soma todas as saídas deste cartão no mês atual
      const gasto = transacoes
        .filter(
          (t) =>
            t.cartao_id === cartao.id &&
            t.tipo === 'Saida' &&
            new Date(t.data!).getMonth() === mesAtual &&
            new Date(t.data!).getFullYear() === anoAtual,
        )
        .reduce((acc, curr) => acc + (curr.valor ?? 0), 0);

      cartao.faturaAtual = gasto;
      cartao.limiteDisponivel = cartao.limite - gasto;
      cartao.percentualUso =
        cartao.limite > 0 ? (gasto / cartao.limite) * 100 : 0;

      // Trava em 100% caso o limite estoure
      if (cartao.percentualUso > 100) cartao.percentualUso = 100;
    });
  }

  getGradient(index: number): string {
    return this.gradients[index % this.gradients.length];
  }

  abrirModal(cartao?: Cartao) {
    this.cartaoEmEdicao = cartao ? { ...cartao } : new Cartao();
    const modalEl = document.getElementById('modalCartao');
    this.modalInstancia = new bootstrap.Modal(modalEl);
    this.modalInstancia.show();
  }

  fecharModal() {
    this.modalInstancia?.hide();
  }

  async salvarCartao() {
    if (!this.cartaoEmEdicao.nome || this.cartaoEmEdicao.limite <= 0) {
      this.alertaService.info('Atenção', 'Preencha o nome e um limite válido.');
      return;
    }

    const sucesso = await this.cartoesService.salvar(this.cartaoEmEdicao);
    if (sucesso) {
      this.alertaService.sucesso('Sucesso', 'Cartão guardado com sucesso!');
      this.fecharModal();
    } else {
      this.alertaService.erro('Erro', 'Não foi possível guardar o cartão.');
    }
  }

  excluirCartao(id: number) {
    this.alertaService.confirmar(
      'Excluir Cartão',
      'Tem a certeza que deseja excluir este cartão?',
      async (res) => {
        if (res) {
          const sucesso = await this.cartoesService.deletar(id);
          if (sucesso)
            this.alertaService.sucesso('Sucesso', 'Cartão excluído.');
        }
      },
    );
  }
}
