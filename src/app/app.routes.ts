import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ValidacaoGuard } from './guard/validacao.guard';
import { LoginGuard } from './guard/login.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },

  // Rotas mais pesadas primeiro: dashboard (gráficos/estatísticas)
  // e telas operacionais com bastante lógica e dependências.
  {
    path: 'inicio',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'transacoes',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/tabela-financeiro/tabela-financeiro.component').then(
        (m) => m.TabelaFinanceiroComponent,
      ),
  },
  {
    path: 'edit/:id',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/formulario/formulario.component').then(
        (m) => m.FormularioComponent,
      ),
  },
  {
    path: 'novo',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/formulario/formulario.component').then(
        (m) => m.FormularioComponent,
      ),
  },
  {
    path: 'form-categoria',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/form-categoria/form-categoria.component').then(
        (m) => m.FormCategoriaComponent,
      ),
  },
  {
    path: 'form-produto',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/form-produto/form-produto.component').then(
        (m) => m.FormProdutoComponent,
      ),
  },
  {
    path: 'form-produto/:id',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/form-produto/form-produto.component').then(
        (m) => m.FormProdutoComponent,
      ),
  },
  {
    path: 'produtos',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/produtos/produtos.component').then(
        (m) => m.ProdutosComponent,
      ),
  },
  {
    path: 'clientes',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/clientes/clientes.component').then(
        (m) => m.ClientesComponent,
      ),
  },
  {
    path: 'form-cliente',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/form-cliente/form-cliente.component').then(
        (m) => m.FormClienteComponent,
      ),
  },
  {
    path: 'form-cliente/:id',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/form-cliente/form-cliente.component').then(
        (m) => m.FormClienteComponent,
      ),
  },
  {
    path: 'orcamento',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/orcamento/orcamento.component').then(
        (m) => m.OrcamentoComponent,
      ),
  },
  {
    path: 'perfil',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/perfil/perfil.component').then(
        (m) => m.PerfilComponent,
      ),
  },
  {
    path: 'lista-orcamentos',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/lista-orcamentos/lista-orcamentos.component').then(
        (m) => m.ListaOrcamentosComponent,
      ),
  },
  {
    path: 'fornecedores',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/fornecedores/fornecedores.component').then(
        (m) => m.FornecedoresComponent,
      ),
  },
  {
    path: 'recibo/:id',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./components/recibo/recibo.component').then(
        (m) => m.ReciboComponent,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./components/page-not-found/page-not-found.component').then(
        (m) => m.PageNotFoundComponent,
      ),
  },
];
