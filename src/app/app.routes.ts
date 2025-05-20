import { Routes } from '@angular/router';
import { TabelaFinanceiroComponent } from './tabela-financeiro/tabela-financeiro.component';
import { FormularioComponent } from './formulario/formulario.component';
import { RelatorioComponent } from './relatorio/relatorio.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { FormCategoriaComponent } from './form-categoria/form-categoria.component';
import { LoginComponent } from './login/login.component';
import { ValidacaoGuard } from './validacao.guard';
import { LoginGuard } from './login.guard';

export const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full' },
  { path: '', component: LoginComponent, canActivate: [LoginGuard] },

  {
    path: 'tabela',
    component: TabelaFinanceiroComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'edit/:id',
    component: FormularioComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'novo',
    component: FormularioComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'inicio',
    component: RelatorioComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'form-categoria',
    component: FormCategoriaComponent,
    canActivate: [ValidacaoGuard],
  },
  { path: '**', component: PageNotFoundComponent },
];
