import { Component, DestroyRef, OnInit } from '@angular/core';
import { Cliente } from '@app/shared/models/cliente';
import { ClientesService } from '@app/core/services/clientes.service';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '@app/shared/pipes/buscador.pipe';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TelefonePipe } from '@app/shared/pipes/telefone.pipe';
import { InstagramPipe } from '@app/shared/pipes/insta.pipe';
import { CepPipe } from '@app/shared/pipes/cep.pipe';
import { CpfPipe } from '@app/shared/pipes/cpf.pipe';
import { AlertaService } from '@app/core/services/alerta.service';
import { Orcamento } from '@app/shared/models/orcamento';
import { OrcamentoService } from '@app/core/services/orcamento.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule,
    BuscadorPipe,
    FormsModule,
    RouterModule,
    TelefonePipe,
    InstagramPipe,
    CepPipe,
    CpfPipe,
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.css',
})
export class ClientesComponent implements OnInit {
  nomePesquisa?: string;
  listaClientes: Cliente[] = [];
  clienteSelecionado?: Cliente;

  listaOrcamentos: Orcamento[] = [];

  constructor(
    private clienteService: ClientesService,
    private alertaService: AlertaService,
    private orcamentoService: OrcamentoService,
    private router: Router,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.clienteService.getClientesSnapshot().length === 0) {
      await this.clienteService.carregarClientes();
    }
    this.clienteService.clientes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clientes) => (this.listaClientes = clientes));
  }

  redirecionarOrcamento(orcamento: Orcamento) {
    orcamento.cliente = this.clienteSelecionado;
    this.orcamentoService.addOrcamentoSelecionado(orcamento);
    this.router.navigate(['/lista-orcamentos']);
  }

  async abrirModal(cliente: Cliente) {
    this.clienteSelecionado = cliente;
    const orcamentos = await this.orcamentoService.buscarPorCliente(
      cliente.id!
    );
    this.listaOrcamentos = orcamentos ?? [];
  }

  fecharModal() {
    this.clienteSelecionado = undefined;
  }

  async deletar(id?: number) {
    const cliente = await this.clienteService.buscarId(id!);
    this.alertaService.confirmar(
      'Confirmação',
      `Deseja deletar o cliente ${cliente?.nome}?`,
      async (resultado) => {
        if (cliente && resultado) {
          await this.clienteService.deletar(id);
          this.alertaService.sucesso(
            'Sucesso',
            `Cliente ${cliente.nome} removido com sucesso!`
          );
        }
      }
    );
  }
}
