import { Component, OnInit } from '@angular/core';
import { Cliente } from '../../models/cliente';
import { ClientesService } from '../../service/clientes.service';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TelefonePipe } from '../../pipes/telefone.pipe';
import { InstagramPipe } from '../../pipes/insta.pipe';
import { CepPipe } from '../../pipes/cep.pipe';
import { CpfPipe } from '../../pipes/cpf.pipe';

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

  constructor(private clienteService: ClientesService) {}

  async ngOnInit(): Promise<void> {
    await this.clienteService.carregarClientes();
    this.clienteService.clientes$.subscribe(
      (clientes) => (this.listaClientes = clientes)
    );
  }

  abrirModal(cliente: Cliente) {
    this.clienteSelecionado = cliente;
  }

  fecharModal() {
    this.clienteSelecionado = undefined;
  }

  async deletar(id?: number) {
    const cliente = await this.clienteService.buscarId(id!);
    if (cliente && confirm(`Deseja deletar ${cliente.nome}?`)) {
      await this.clienteService.deletar(id);
      alert(`Cliente ${cliente.nome} removido com sucesso!`);
    }
  }
}
