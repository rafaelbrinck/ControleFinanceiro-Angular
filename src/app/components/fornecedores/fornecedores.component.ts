import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Fornecedor } from '../../models/fornecedor';
import { FornecedoresService } from '../../service/fornecedores.service';

@Component({
  selector: 'app-fornecedores',
  imports: [CommonModule, BuscadorPipe, FormsModule, RouterModule],
  templateUrl: './fornecedores.component.html',
  styleUrl: './fornecedores.component.css',
})
export class FornecedoresComponent implements OnInit {
  nomePesquisa?: string;
  listaFornecedores: Fornecedor[] = [];
  fornecedorSelecionado?: Fornecedor;

  constructor(private fornecedorService: FornecedoresService) {}

  ngOnInit(): void {
    this.fornecedorService.fornecedores$.subscribe(async (fornecedores) => {
      if (fornecedores.length == 0) {
        await this.fornecedorService.carregarFornecedores();
      }
    });
  }
  deletar(arg0: string | undefined) {
    throw new Error('Method not implemented.');
  }
}
