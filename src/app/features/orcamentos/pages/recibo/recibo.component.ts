import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Orcamento } from '@app/shared/models/orcamento';
import { OrcamentoService } from '@app/core/services/orcamento.service';
import { TelefonePipe } from '@app/shared/pipes/telefone.pipe';
import { CpfPipe } from '@app/shared/pipes/cpf.pipe';
import { UserLogado } from '@app/shared/models/user';
import { LoginService } from '@app/core/auth/services/login.service';
import { DadosEmpresaService } from '@app/core/services/dados-empresa.service';
import { AlertaService } from '@app/core/services/alerta.service';

@Component({
  selector: 'app-recibo',
  standalone: true,
  imports: [CommonModule, TelefonePipe, CpfPipe],
  templateUrl: './recibo.component.html',
  styleUrls: ['./recibo.component.css'],
})
export class ReciboComponent implements OnInit {
  @ViewChild('printArea') printArea?: ElementRef<HTMLElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly orcamentoService = inject(OrcamentoService);
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);
  private readonly dadosEmpresaService = inject(DadosEmpresaService);
  private readonly alertaService = inject(AlertaService);
  private readonly destroyRef = inject(DestroyRef);

  orcamento?: Orcamento;
  userLogado?: UserLogado;
  readonly empresa = this.dadosEmpresaService.empresa;
  readonly gerandoPdf = signal(false);
  private imprimindo = false;

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');

    this.loginService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.userLogado = user;
      });

    await this.dadosEmpresaService.carregar();

    if (!idParam) {
      return;
    }

    if (this.orcamentoService.getOrcamentosSnapshot().length === 0) {
      await this.orcamentoService.carregarOrcamentos();
    }

    this.orcamentoService.orcamento$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((orcamentos) => {
        this.orcamento = orcamentos.find((o) => o.id === Number(idParam));
      });
  }

  voltar(): void {
    void this.router.navigate(['/negocios/lista-orcamentos']);
  }

  imprimir(): void {
    this.imprimindo = true;
    window.print();
  }

  async baixarPdf(): Promise<void> {
    const area = this.printArea?.nativeElement;
    if (!area || !this.orcamento) {
      return;
    }

    this.gerandoPdf.set(true);
    try {
      const canvas = await html2canvas(area, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        this.dadosEmpresaService.nomeArquivoOrcamento(
          this.orcamento.id,
          this.orcamento.cliente?.nome,
        ),
      );
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      this.alertaService.erro(
        'Erro',
        'Não foi possível gerar o PDF do orçamento.',
      );
    } finally {
      this.gerandoPdf.set(false);
    }
  }

  @HostListener('window:afterprint')
  onafterprint() {
    if (!this.imprimindo) {
      return;
    }
    this.imprimindo = false;
    this.voltar();
  }
}
