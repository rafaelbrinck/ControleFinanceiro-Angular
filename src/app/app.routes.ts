import { Routes } from '@angular/router';
import { TabelaFinanceiroComponent } from './components/tabela-financeiro/tabela-financeiro.component';
import { FormularioComponent } from './components/formulario/formulario.component';
import { RelatorioComponent } from './components/relatorio/relatorio.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { FormCategoriaComponent } from './components/form-categoria/form-categoria.component';
import { LoginComponent } from './components/login/login.component';
import { ValidacaoGuard } from './guard/validacao.guard';
import { LoginGuard } from './guard/login.guard';
import { ProdutosComponent } from './components/produtos/produtos.component';

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
  {
    path: 'produtos',
    component: ProdutosComponent,
    canActivate: [ValidacaoGuard],
  },
  { path: '**', component: PageNotFoundComponent },
];
