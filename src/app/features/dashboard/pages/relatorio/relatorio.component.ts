import { Component, DestroyRef, OnInit } from '@angular/core';
import { Relatorio } from '@app/shared/models/relatorio';
import { TransacaoService } from '@app/core/services/transacao.service';
import { Transacao } from '@app/shared/models/transacao';
import { CommonModule, NgClass } from '@angular/common';
import { MoedaPipe } from '@app/shared/pipes/moeda.pipe';
import { CategoriaService } from '@app/core/services/categoria.service';
import { Router } from '@angular/router';
import { Categoria } from '@app/shared/models/categoria';
import { LoginService } from '@app/core/auth/services/login.service';
import { supabase } from '@app/core/data/supabase/supabase.client';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-relatorio',
  standalone: true,
  imports: [NgClass, CommonModule, MoedaPipe],
  templateUrl: './relatorio.component.html',
  styleUrls: ['./relatorio.component.css'],
})
export class RelatorioComponent implements OnInit {
  relatorio = new Relatorio(0, 0, 0);
  listaTransacoes: Transacao[] = [];

  mostrarCategorias: boolean = false;
  categorias: Categoria[] = [];

  mostrarDetalhes: boolean = false;
  tipoDetalhe: 'Entrada' | 'Saida' | undefined;

  constructor(
    private transacaoService: TransacaoService,
    private categoriaService: CategoriaService,
    private router: Router,
    private loginService: LoginService,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit(): Promise<void> {
    const userId = this.loginService.getUserLogado();

    if (userId) {
      await this.categoriaService.carregarCategorias();
      await this.transacaoService.carregarTransacoes();
    }

    this.transacaoService.transacoes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((transacoes) => {
        this.listaTransacoes = transacoes;
      });
    await this.carregarRelatorioViaEdge();
    this.categoriaService.categorias$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cats) => {
        this.categorias = cats;
      });
  }

  exibirDetalhes(tipo: 'Entrada' | 'Saida') {
    this.tipoDetalhe = tipo;
    this.mostrarDetalhes = true;
  }

  fecharDetalhes() {
    this.tipoDetalhe = undefined;
    this.mostrarDetalhes = false;
    this.mostrarCategorias = false;
  }

  get transacoesFiltradas(): Transacao[] {
    return this.listaTransacoes.filter(
      (transacao) => transacao.tipo === this.tipoDetalhe
    );
  }

  async carregarRelatorioViaEdge() {
    try {
      const idUser = this.loginService.getUserLogado();

      const { data, error } = await supabase.functions.invoke('relatorio', {
        body: { userId: idUser },
      });

      if (error) {
        console.error('Erro da função:', error);
        alert(
          'Erro ao carregar relatório via função: ' +
            (error.message || JSON.stringify(error))
        );
        return;
      }

      this.relatorio.entradas = data.entradas;
      this.relatorio.saidas = data.saidas;
      this.relatorio.resultado = data.resultado;
    } catch (e) {
      console.error('Erro inesperado:', e);
    }
  }

  navegarParaCategorias() {
    this.router.navigate(['/form-categoria']);
  }

  mostrar() {
    return this.relatorio;
  }
}
