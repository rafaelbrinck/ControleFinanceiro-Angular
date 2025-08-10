import { Component, OnInit } from '@angular/core';
import { Cliente } from '../../models/cliente';
import { ClientesService } from '../../service/clientes.service';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TelefonePipe } from '../../pipes/telefone.pipe';
import { InstagramPipe } from '../../pipes/insta.pipe';
import { CepPipe } from '../../pipes/cep.pipe';
import { CpfPipe } from '../../pipes/cpf.pipe';
import { AlertaService } from '../../service/alerta.service';
import { Orcamento } from '../../models/orcamento';
import { OrcamentoService } from '../../service/orcamento.service';
import { ListaOrcamentosComponent } from '../lista-orcamentos/lista-orcamentos.component';

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
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.clienteService.clientes$.subscribe(async (clientes) => {
      if (clientes.length == 0) {
        await this.clienteService.carregarClientes();
      }
    });
    this.clienteService.clientes$.subscribe(
      (clientes) => (this.listaClientes = clientes)
    );
  }

  redirecionarOrcamento(orcamento: Orcamento) {
    orcamento.cliente = this.clienteSelecionado;
    this.orcamentoService.addOrcamentoSelecionado(orcamento);
    this.router.navigate(['/lista-orcamentos']);
  }

  async abrirModal(cliente: Cliente) {
    this.clienteSelecionado = cliente;
    console.log('Cliente selecionado:', this.clienteSelecionado);
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
