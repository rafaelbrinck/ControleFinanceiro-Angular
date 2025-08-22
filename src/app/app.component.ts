import {
  Component,
  HostListener,
  OnInit,
  ViewChild,
  viewChild,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { ValidacaoService } from './service/validacao.service';
import { CommonModule } from '@angular/common';
import { LoginService } from './service/login.service';
import { UserLogado } from './models/user';
import { AlertaComponent } from './components/shared/alerta/alerta.component';
import { AlertaService } from './service/alerta.service';
import { OrcamentoService } from './service/orcamento.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, AlertaComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'Controle Financeiro';
  usuario: UserLogado | undefined;
  validaNavBar = true;

  @ViewChild('alertaGlobal', { static: false })
  alertaGlobal!: AlertaComponent;

  // Captura qualquer dblclick no app inteiro
  @HostListener('document:dblclick', ['$event'])
  blockDoubleClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    console.log('Duplo clique bloqueado 🚫');
  }

  constructor(
    private validacao: ValidacaoService,
    private router: Router,
    private loginService: LoginService,
    private alertaService: AlertaService,
    private orcamentoService: OrcamentoService
  ) {}

  ngAfterViewInit(): void {
    this.alertaService.registrar(this.alertaGlobal);
  }

  async ngOnInit(): Promise<void> {
    // ✅ Restaura sessão se existir ao carregar o app
    await this.loginService.restaurarSessao();
    this.usuario = await this.loginService.getUser();

    // ✅ Detecta troca de rota e atualiza a navbar e sessão
    this.router.events.subscribe(async (event) => {
      if (event instanceof NavigationEnd) {
        this.validaNavBar = !event.urlAfterRedirects.includes('login');

        const autenticado = await this.validacao.confirmaAutenticacao();
        if (autenticado) {
          this.usuario = await this.loginService.getUser();
        } else {
          this.usuario = undefined;
        }
      }
    });
  }

  async logout() {
    await this.loginService.logout();
    this.usuario = undefined;
    this.orcamentoService.limparOrcamento();
    this.router.navigate(['']);
  }

  get estaLogado(): boolean {
    return !!this.usuario;
  }
}
