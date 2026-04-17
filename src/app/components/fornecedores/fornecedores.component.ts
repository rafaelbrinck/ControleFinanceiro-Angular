import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Fornecedor } from '../../models/fornecedor';
import { FornecedoresService } from '../../service/fornecedores.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

  constructor(
    private fornecedorService: FornecedoresService,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.fornecedorService.getFornecedoresSnapshot().length === 0) {
      await this.fornecedorService.carregarFornecedores();
    }
    this.fornecedorService.fornecedores$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((fornecedores) => {
        this.listaFornecedores = fornecedores;
      });
  }

  async deletar(id: string | undefined) {
    if (!id) return;

    const confirmar = window.confirm(
      'Deseja realmente deletar este fornecedor?',
    );
    if (!confirmar) return;

    await this.fornecedorService.deletar(id);
  }
}
