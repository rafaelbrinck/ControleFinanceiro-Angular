import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Fornecedor } from '@app/shared/models/fornecedor';
import { FornecedoresService } from '@app/core/services/fornecedores.service';
import { TransacaoService } from '@app/core/services/transacao.service';
import { AlertaService } from '@app/core/services/alerta.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

declare var bootstrap: any;

@Component({
  selector: 'app-fornecedores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fornecedores.component.html',
  styleUrls: ['./fornecedores.component.css'],
})
export class FornecedoresComponent implements OnInit {
  fornecedores: Fornecedor[] = [];
  fornecedorEmEdicao: Fornecedor = new Fornecedor();
  modalInstancia: any;

  // Paleta de cores para os ícones das empresas
  cores = [
    'text-primary bg-primary-subtle',
    'text-success bg-success-subtle',
    'text-warning bg-warning-subtle',
    'text-danger bg-danger-subtle',
    'text-info bg-info-subtle',
  ];

  constructor(
    private fornecedoresService: FornecedoresService,
    private transacaoService: TransacaoService,
    private alertaService: AlertaService,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit() {
    await this.fornecedoresService.carregarFornecedores();
    await this.transacaoService.carregarTransacoes();

    this.fornecedoresService.fornecedores$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lista) => {
        this.fornecedores = JSON.parse(JSON.stringify(lista));
        this.calcularGastos();
      });

    this.transacaoService.transacoes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.fornecedores.length > 0) this.calcularGastos();
      });
  }

  calcularGastos() {
    const transacoes = this.transacaoService.getTransacoesSnapshot();

    this.fornecedores.forEach((forn) => {
      // Soma todas as saídas atreladas a este fornecedor
      // Nota: Certifique-se de que o seu modelo 'Transacao' tem a propriedade 'fornecedor_id'
      forn.totalGasto = transacoes
        .filter((t) => t.fornecedor_id === forn.id && t.tipo === 'Saida')
        .reduce((acc, curr) => acc + (curr.valor || 0), 0);
    });
  }

  getCor(index: number): string {
    return this.cores[index % this.cores.length];
  }

  abrirModal(fornecedor?: Fornecedor) {
    this.fornecedorEmEdicao = fornecedor ? { ...fornecedor } : new Fornecedor();
    const modalEl = document.getElementById('modalFornecedor');
    this.modalInstancia = new bootstrap.Modal(modalEl);
    this.modalInstancia.show();
  }

  fecharModal() {
    this.modalInstancia?.hide();
  }

  async salvarFornecedor() {
    const sucesso = await this.fornecedoresService.salvar(
      this.fornecedorEmEdicao,
    );
    if (sucesso) {
      this.alertaService.sucesso('Sucesso', 'Fornecedor guardado!');
      this.fecharModal();
    }
  }

  excluirFornecedor(id: number) {
    this.alertaService.confirmar(
      'Excluir',
      'Tem a certeza que deseja excluir este fornecedor?',
      async (res) => {
        if (res) {
          const sucesso = await this.fornecedoresService.deletar(id);
          if (sucesso)
            this.alertaService.sucesso('Sucesso', 'Fornecedor excluído.');
        }
      },
    );
  }
}
