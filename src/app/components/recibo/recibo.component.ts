import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Orcamento } from '../../models/orcamento';
import { OrcamentoService } from '../../service/orcamento.service';
import { CommonModule } from '@angular/common';
import { TelefonePipe } from '../../pipes/telefone.pipe';
import { CpfPipe } from '../../pipes/cpf.pipe';
import { UserLogado } from '../../models/user';
import { LoginService } from '../../service/login.service';

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
  ) {}

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.loginService.user$.subscribe((user) => {
        this.userLogado = user;
      });

      // Como o orcamentoService trabalha com observables, buscamos a lista e filtramos o ID
      this.orcamentoService.orcamento$.subscribe((orcamentos) => {
        this.orcamento = orcamentos.find((o) => o.id === Number(idParam));

        // Dá um pequeno atraso de 500ms para o Angular desenhar a tabela antes de chamar a impressora
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
