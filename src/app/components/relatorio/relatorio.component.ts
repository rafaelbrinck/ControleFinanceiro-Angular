import { Component, OnInit } from '@angular/core';
import { Relatorio } from '../../models/relatorio';
import { TransacaoService } from '../../service/transacao.service';
import { Transacao } from '../../models/trasacao';
import { CommonModule, NgClass } from '@angular/common';
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { CategoriaService } from '../../service/categoria.service';
import { Router } from '@angular/router';
import { Categoria } from '../../models/categoria';
import { LoginService } from '../../service/login.service';
import { supabase } from '../../supabase';

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
    private loginService: LoginService
  ) {}

  async ngOnInit(): Promise<void> {
    const userId = this.loginService.getUserLogado();

    // Só carrega os dados se o usuário estiver logado
    if (userId) {
      // Carregar categorias e transações do Supabase
      await this.categoriaService.carregarCategorias();
      await this.transacaoService.carregarTransacoes();
    }

    // Sempre que a lista de transações mudar, atualiza o relatório
    this.transacaoService.transacoes$.subscribe((transacoes) => {
      this.listaTransacoes = transacoes;
    });
    await this.carregarRelatorioViaEdge();
    // Sempre que as categorias forem atualizadas, guarda localmente
    this.categoriaService.categorias$.subscribe((cats) => {
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
      console.log('Chamando Edge Function com userId:', idUser);

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

      console.log('Resposta da função:', data);
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
