import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgxMaskDirective } from 'ngx-mask';
import { LoginService } from '@app/core/auth/services/login.service';
import { UserLogado } from '@app/shared/models/user';
import { AlertaService } from '@app/core/services/alerta.service';
import { PerfilService } from '@app/core/services/perfil.service';
import { DadosEmpresaService } from '@app/core/services/dados-empresa.service';
import { DadosEmpresa } from '@app/shared/models/dados-empresa';

type AbaPerfil = 'pessoal' | 'empresa';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NgxMaskDirective,
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css'],
})
export class PerfilComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly alertaService = inject(AlertaService);
  private readonly perfilService = inject(PerfilService);
  private readonly dadosEmpresaService = inject(DadosEmpresaService);
  private readonly destroyRef = inject(DestroyRef);

  usuario?: UserLogado;
  username?: string = '';
  fotoUrl: string = '';
  userId?: string;

  novaFoto?: File;
  novaFotoPreview: string = '';

  readonly abaAtiva = signal<AbaPerfil>('pessoal');
  readonly onboarding = signal(false);
  readonly salvandoEmpresa = signal(false);
  readonly carregandoEmpresa = this.dadosEmpresaService.carregando;
  readonly qrcodePix = signal('');

  readonly formEmpresa = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    razao_social: ['', Validators.required],
    cnpj: ['', Validators.required],
    email_contato: ['', [Validators.required, Validators.email]],
    telefone_contato: ['', Validators.required],
    slogan: [''],
    endereco_completo: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loginService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user) {
          this.usuario = user;
          this.username = user.username;
          this.fotoUrl = user.logo || '';
          this.userId = user.id;
          this.qrcodePix.set(user.qrcode_pix || '');

          if (!this.novaFoto) {
            this.novaFotoPreview = '';
          }
        }
      });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.abaAtiva.set(params.get('aba') === 'empresa' ? 'empresa' : 'pessoal');
        this.onboarding.set(params.get('onboarding') === '1');
      });

    void this.carregarEmpresa();
  }

  selecionarAba(aba: AbaPerfil): void {
    this.abaAtiva.set(aba);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba },
      queryParamsHandling: 'merge',
    });
  }

  selecionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.novaFoto = input.files[0];

    const reader = new FileReader();
    reader.onload = () => {
      this.novaFotoPreview = reader.result as string;
    };
    reader.readAsDataURL(this.novaFoto);
  }

  cancelarFoto(): void {
    this.novaFoto = undefined;
    this.novaFotoPreview = '';
  }

  async salvarFoto(): Promise<void> {
    if (!this.novaFoto || !this.userId) return;
    const novaUrl = await this.perfilService.salvarFoto(this.novaFoto);
    if (!novaUrl) {
      this.alertaService.erro('Erro', 'Não foi possível atualizar a foto.');
      return;
    }
    this.fotoUrl = novaUrl;
    this.cancelarFoto();
    this.alertaService.sucesso('Sucesso', 'Foto atualizada com sucesso!');
  }

  async salvarEmpresa(): Promise<void> {
    if (this.formEmpresa.invalid) {
      this.formEmpresa.markAllAsTouched();
      this.alertaService.info(
        'Campos obrigatórios',
        'Preencha os dados da empresa para continuar.',
      );
      return;
    }

    this.salvandoEmpresa.set(true);
    const salvo = await this.dadosEmpresaService.salvar(this.formEmpresa.getRawValue());
    this.salvandoEmpresa.set(false);

    if (!salvo) {
      this.alertaService.erro(
        'Erro',
        'Não foi possível salvar os dados da empresa.',
      );
      return;
    }

    this.alertaService.sucesso('Sucesso', 'Dados da empresa salvos.');

    if (this.onboarding()) {
      await this.router.navigate(['/negocios']);
    }
  }

  campoInvalido(campo: keyof typeof this.formEmpresa.controls): boolean {
    const control = this.formEmpresa.controls[campo];
    return control.invalid && control.touched;
  }

  private async carregarEmpresa(): Promise<void> {
    const empresa = await this.dadosEmpresaService.carregar();
    this.patchFormEmpresa(empresa);
  }

  private patchFormEmpresa(empresa: DadosEmpresa | null): void {
    this.formEmpresa.reset({
      nome: empresa?.nome ?? '',
      razao_social: empresa?.razao_social ?? '',
      cnpj: empresa?.cnpj ?? '',
      email_contato: empresa?.email_contato ?? '',
      telefone_contato: empresa?.telefone_contato ?? '',
      slogan: empresa?.slogan ?? '',
      endereco_completo: empresa?.endereco_completo ?? '',
    });
  }
}
