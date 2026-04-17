import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginService } from './service/login.service';
import { UserLogado } from './models/user';
import { AlertaComponent } from './components/shared/alerta/alerta.component';
import { AlertaService } from './service/alerta.service';
import { OrcamentoService } from './service/orcamento.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// 1. Importações do PWA adicionadas aqui

import { filter } from 'rxjs/operators';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';

declare var bootstrap: any;

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
    private router: Router,
    private loginService: LoginService,
    private alertaService: AlertaService,
    private orcamentoService: OrcamentoService,
    private swUpdate: SwUpdate, // 2. SwUpdate injetado no construtor
    private destroyRef: DestroyRef,
  ) {}

  ngAfterViewInit(): void {
    this.alertaService.registrar(this.alertaGlobal);
  }

  async ngOnInit(): Promise<void> {
    // 3. Lógica do PWA: Fica escutando atualizações da Vercel
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter(
            (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY',
          ),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => {
          // Mantive o confirm nativo do navegador pois ele trava a tela e força a resposta do usuário,
          // mas você pode trocar pelo seu 'alertaService' no futuro se preferir um visual mais limpo.
          if (
            confirm(
              'Nova versão do sistema disponível! Deseja atualizar agora?',
            )
          ) {
            window.location.reload();
          }
        });
    }

    // ✅ Restaura sessão se existir ao carregar o app
    await this.loginService.restaurarSessao();
    this.loginService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.usuario = user;
      });

    // ✅ Detecta troca de rota e atualiza apenas a navbar
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.validaNavBar = !event.urlAfterRedirects.includes('login');
      }
    });
  }

  async logout() {
    await this.loginService.logout();
    this.usuario = undefined;
    this.orcamentoService.limparOrcamento();
    this.router.navigate(['/login']);
  }

  get estaLogado(): boolean {
    return !!this.usuario;
  }

  fecharNavbar() {
    const navbar = document.getElementById('mainNavbar');
    if (navbar?.classList.contains('show')) {
      const bsCollapse = new bootstrap.Collapse(navbar, {
        toggle: false,
      });
      bsCollapse.hide();
    }
  }
}
