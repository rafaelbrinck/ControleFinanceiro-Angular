import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { ValidacaoGuard } from '@app/core/auth/guards/validacao.guard';
import { LoginGuard } from '@app/core/auth/guards/login.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'hub', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },

  {
    path: 'hub',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/hub/pages/hub/hub.component').then((m) => m.HubComponent),
  },

  {
    path: 'perfil',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/perfil/pages/perfil/perfil.component').then(
        (m) => m.PerfilComponent,
      ),
  },

  // --- Negócios ---
  {
    path: 'negocios',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/negocios/layouts/negocios-layout.component').then(
        (m) => m.NegociosLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'produtos', pathMatch: 'full' },
      {
        path: 'produtos',
        loadComponent: () =>
          import('./features/produtos/pages/produtos/produtos.component').then(
            (m) => m.ProdutosComponent,
          ),
      },
      {
        path: 'form-produto',
        loadComponent: () =>
          import(
            './features/produtos/components/form-produto/form-produto.component'
          ).then((m) => m.FormProdutoComponent),
      },
      {
        path: 'form-produto/:id',
        loadComponent: () =>
          import(
            './features/produtos/components/form-produto/form-produto.component'
          ).then((m) => m.FormProdutoComponent),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/pages/clientes/clientes.component').then(
            (m) => m.ClientesComponent,
          ),
      },
      {
        path: 'form-cliente',
        loadComponent: () =>
          import(
            './features/clientes/components/form-cliente/form-cliente.component'
          ).then((m) => m.FormClienteComponent),
      },
      {
        path: 'form-cliente/:id',
        loadComponent: () =>
          import(
            './features/clientes/components/form-cliente/form-cliente.component'
          ).then((m) => m.FormClienteComponent),
      },
      {
        path: 'orcamento',
        loadComponent: () =>
          import('./features/orcamentos/pages/orcamento/orcamento.component').then(
            (m) => m.OrcamentoComponent,
          ),
      },
      {
        path: 'lista-orcamentos',
        loadComponent: () =>
          import(
            './features/orcamentos/pages/lista-orcamentos/lista-orcamentos.component'
          ).then((m) => m.ListaOrcamentosComponent),
      },
      {
        path: 'recibo/:id',
        loadComponent: () =>
          import('./features/orcamentos/pages/recibo/recibo.component').then(
            (m) => m.ReciboComponent,
          ),
      },
      {
        path: 'fornecedores',
        loadComponent: () =>
          import(
            './features/fornecedores/pages/fornecedores/fornecedores.component'
          ).then((m) => m.FornecedoresComponent),
      },
    ],
  },

  // --- Financeiro ---
  {
    path: 'financeiro',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/financeiro/layouts/financeiro-layout.component').then(
        (m) => m.FinanceiroLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/pages/home/home.component').then(
            (m) => m.HomeComponent,
          ),
      },
      {
        path: 'transacoes',
        loadComponent: () =>
          import(
            './features/financeiro/components/tabela-financeiro/tabela-financeiro.component'
          ).then((m) => m.TabelaFinanceiroComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import(
            './features/financeiro/components/formulario/formulario.component'
          ).then((m) => m.FormularioComponent),
      },
      {
        path: 'novo',
        loadComponent: () =>
          import(
            './features/financeiro/components/formulario/formulario.component'
          ).then((m) => m.FormularioComponent),
      },
      {
        path: 'form-categoria',
        loadComponent: () =>
          import(
            './features/financeiro/components/form-categoria/form-categoria.component'
          ).then((m) => m.FormCategoriaComponent),
      },
      {
        path: 'cartoes',
        loadComponent: () =>
          import('./features/cartao/cartao.component').then(
            (m) => m.CartoesComponent,
          ),
      },
    ],
  },

  // --- Casa ---
  {
    path: 'contas-casa',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/contas-casa/layouts/casa-layout.component').then(
        (m) => m.CasaLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import(
            './features/contas-casa/pages/dashboard/dashboard.component'
          ).then((m) => m.ContasCasaDashboardComponent),
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import(
            './features/contas-casa/pages/categorias-familia/categorias-familia.component'
          ).then((m) => m.CategoriasFamiliaComponent),
      },
      {
        path: 'membros',
        loadComponent: () =>
          import(
            './features/contas-casa/pages/membros-familia/membros-familia.component'
          ).then((m) => m.MembrosFamiliaComponent),
      },
      {
        path: 'relatorios',
        loadComponent: () =>
          import(
            './features/contas-casa/pages/relatorios/relatorios.component'
          ).then((m) => m.RelatoriosComponent),
      },
    ],
  },

  // --- Veículos ---
  {
    path: 'veiculos',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/veiculos/layouts/veiculos-layout.component').then(
        (m) => m.VeiculosLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/veiculos/pages/dashboard/dashboard.component').then(
            (m) => m.VeiculosDashboardComponent,
          ),
      },
      {
        path: 'abastecimentos',
        loadComponent: () =>
          import('./features/veiculos/pages/dashboard/dashboard.component').then(
            (m) => m.VeiculosDashboardComponent,
          ),
      },
      {
        path: 'manutencoes',
        loadComponent: () =>
          import('./features/veiculos/pages/dashboard/dashboard.component').then(
            (m) => m.VeiculosDashboardComponent,
          ),
      },
      // Compat: jornada saiu deste módulo — redireciona para o layout isolado
      { path: 'jornada', redirectTo: '/jornada', pathMatch: 'full' },
    ],
  },

  // --- Jornada (módulo isolado) ---
  {
    path: 'jornada',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/jornada/layouts/jornada-layout.component').then(
        (m) => m.JornadaLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/jornada/pages/jornada/jornada.component').then(
            (m) => m.JornadaComponent,
          ),
      },
    ],
  },

  // --- Compatibilidade com URLs antigas ---
  { path: 'inicio', redirectTo: 'financeiro', pathMatch: 'full' },
  { path: 'transacoes', redirectTo: 'financeiro/transacoes', pathMatch: 'full' },
  { path: 'novo', redirectTo: 'financeiro/novo', pathMatch: 'full' },
  { path: 'edit/:id', redirectTo: 'financeiro/edit/:id' },
  {
    path: 'form-categoria',
    redirectTo: 'financeiro/form-categoria',
    pathMatch: 'full',
  },
  { path: 'cartoes', redirectTo: 'financeiro/cartoes', pathMatch: 'full' },
  { path: 'produtos', redirectTo: 'negocios/produtos', pathMatch: 'full' },
  {
    path: 'form-produto',
    redirectTo: 'negocios/form-produto',
    pathMatch: 'full',
  },
  { path: 'form-produto/:id', redirectTo: 'negocios/form-produto/:id' },
  { path: 'clientes', redirectTo: 'negocios/clientes', pathMatch: 'full' },
  {
    path: 'form-cliente',
    redirectTo: 'negocios/form-cliente',
    pathMatch: 'full',
  },
  { path: 'form-cliente/:id', redirectTo: 'negocios/form-cliente/:id' },
  { path: 'orcamento', redirectTo: 'negocios/orcamento', pathMatch: 'full' },
  {
    path: 'lista-orcamentos',
    redirectTo: 'negocios/lista-orcamentos',
    pathMatch: 'full',
  },
  { path: 'recibo/:id', redirectTo: 'negocios/recibo/:id' },
  {
    path: 'fornecedores',
    redirectTo: 'negocios/fornecedores',
    pathMatch: 'full',
  },

  {
    path: '**',
    loadComponent: () =>
      import('./features/common/page-not-found/page-not-found.component').then(
        (m) => m.PageNotFoundComponent,
      ),
  },
];
