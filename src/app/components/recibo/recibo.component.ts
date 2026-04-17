import { Component, DestroyRef, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Orcamento } from '../../models/orcamento';
import { OrcamentoService } from '../../service/orcamento.service';
import { CommonModule } from '@angular/common';
import { TelefonePipe } from '../../pipes/telefone.pipe';
import { CpfPipe } from '../../pipes/cpf.pipe';
import { UserLogado } from '../../models/user';
import { LoginService } from '../../service/login.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-recibo',
  standalone: true,
  imports: [CommonModule, TelefonePipe, CpfPipe],
  templateUrl: './recibo.component.html',
  styleUrls: ['./recibo.component.css'],
})
export class ReciboComponent implements OnInit {
  orcamento?: Orcamento;
  dataAtual = new Date();
  userLogado?: UserLogado;

  constructor(
    private route: ActivatedRoute,
    private orcamentoService: OrcamentoService,
    private router: Router,
    private loginService: LoginService,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.loginService.user$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((user) => {
          this.userLogado = user;
        });

      // Como o orcamentoService trabalha com observables, buscamos a lista e filtramos o ID
      if (this.orcamentoService.getOrcamentosSnapshot().length === 0) {
        await this.orcamentoService.carregarOrcamentos();
      }

      this.orcamentoService.orcamento$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((orcamentos) => {
          this.orcamento = orcamentos.find((o) => o.id === Number(idParam));

          if (this.orcamento) {
            setTimeout(() => {
              window.print();
            }, 500);
          }
        });
    }
  }

  // Este evento escuta quando a janela de impressão do Windows é fechada (seja imprimindo ou cancelando)
  @HostListener('window:afterprint')
  onafterprint() {
    this.router.navigate(['/lista-orcamentos']);
  }
}
