import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { supabase } from '@app/core/data/supabase/supabase.client';
import { LoginService } from '@app/core/auth/services/login.service';
import {
  CategoriaFamilia,
  CategoriaFamiliaCreate,
  CategoriaFamiliaUpdate,
  Familia,
  FamiliaCreate,
  MembroFamilia,
  MembroFamiliaCreate,
  MembroFamiliaDetalhado,
  MembroFamiliaUpdate,
  UsuarioFamilia,
} from '@app/shared/models/familia';

@Injectable({
  providedIn: 'root',
})
export class FamilyService {
  private familiaSubject = new BehaviorSubject<Familia | null>(null);
  public familia$: Observable<Familia | null> =
    this.familiaSubject.asObservable();

  private membrosSubject = new BehaviorSubject<MembroFamiliaDetalhado[]>([]);
  public membros$: Observable<MembroFamiliaDetalhado[]> =
    this.membrosSubject.asObservable();

  private categoriasSubject = new BehaviorSubject<CategoriaFamilia[]>([]);
  public categorias$: Observable<CategoriaFamilia[]> =
    this.categoriasSubject.asObservable();

  readonly familiaAtual = signal<Familia | null>(null);
  readonly membros = signal<MembroFamiliaDetalhado[]>([]);
  readonly categorias = signal<CategoriaFamilia[]>([]);
  readonly membroLogado = signal<MembroFamiliaDetalhado | null>(null);
  readonly carregando = signal(false);

  readonly ehAdmin = computed(() => {
    const userId = this.loginService.getUserLogado();
    const familia = this.familiaAtual();
    const membro = this.membroLogado();

    if (!userId || !familia) return false;
    if (familia.adm_id === userId) return true;
    return membro?.role === 'admin';
  });

  private familiaCachePronto = false;
  private membrosCacheFamiliaId: number | null = null;
  private categoriasCacheFamiliaId: number | null = null;

  constructor(private loginService: LoginService) {}

  getFamiliaSnapshot(): Familia | null {
    return this.familiaSubject.getValue();
  }

  getMembrosSnapshot(): MembroFamiliaDetalhado[] {
    return this.membrosSubject.getValue();
  }

  getCategoriasSnapshot(): CategoriaFamilia[] {
    return this.categoriasSubject.getValue();
  }

  /**
   * Carrega a família do usuário logado (via MembrosFamilia),
   * membros com join em usuarios e categorias da família.
   * Usa cache em memória; passe `forceRefresh` para forçar nova consulta.
   */
  async carregarFamiliaDoUsuario(forceRefresh = false): Promise<Familia | null> {
    if (
      !forceRefresh &&
      this.familiaCachePronto &&
      this.familiaAtual()
    ) {
      return this.familiaAtual();
    }

    const userId = this.loginService.getUserLogado();
    if (!userId) return null;

    this.carregando.set(true);

    try {
      const { data: membro, error: erroMembro } = await supabase
        .from('MembrosFamilia')
        .select('*, Familias(*)')
        .eq('id_membro', userId)
        .limit(1)
        .maybeSingle();

      if (erroMembro) {
        console.error('Erro ao buscar vínculo familiar:', erroMembro.message);
        this.atualizarFamilia(null);
        this.membroLogado.set(null);
        this.familiaCachePronto = false;
        return null;
      }

      if (!membro?.Familias) {
        this.atualizarFamilia(null);
        this.atualizarMembros([]);
        this.atualizarCategorias([]);
        this.membroLogado.set(null);
        this.familiaCachePronto = true;
        return null;
      }

      const familiaRaw = membro.Familias as Familia | Familia[];
      const familia = (
        Array.isArray(familiaRaw) ? familiaRaw[0] : familiaRaw
      ) as Familia;

      if (!familia?.id) {
        this.atualizarFamilia(null);
        this.membroLogado.set(null);
        this.familiaCachePronto = false;
        return null;
      }

      this.atualizarFamilia(familia);
      this.membroLogado.set(
        this.normalizarMembro(membro as Record<string, unknown>),
      );

      await Promise.all([
        this.buscarMembros(familia.id, forceRefresh),
        this.buscarCategorias(familia.id, forceRefresh),
      ]);

      this.familiaCachePronto = true;
      return familia;
    } finally {
      this.carregando.set(false);
    }
  }

  async criarFamilia(nome: string): Promise<Familia | null> {
    const userId = this.loginService.getUserLogado();
    if (!userId || !nome.trim()) return null;

    const payload: FamiliaCreate = {
      nome: nome.trim(),
      adm_id: userId,
    };

    const { data: familia, error } = await supabase
      .from('Familias')
      .insert({
        nome: payload.nome,
        adm_id: payload.adm_id,
      })
      .select('*')
      .single();

    if (error || !familia) {
      console.error('Erro ao criar família:', error?.message);
      return null;
    }

    const membroPayload: MembroFamiliaCreate = {
      id_membro: userId,
      id_familia: familia.id,
      role: 'admin',
    };

    const { error: erroMembro } = await supabase
      .from('MembrosFamilia')
      .insert(membroPayload);

    if (erroMembro) {
      console.error('Erro ao vincular admin à família:', erroMembro.message);
      return null;
    }

    await this.carregarFamiliaDoUsuario(true);
    return familia as Familia;
  }

  // ─── Membros ───────────────────────────────────────────────

  async buscarMembros(
    idFamilia: number,
    forceRefresh = false,
  ): Promise<MembroFamiliaDetalhado[]> {
    if (!forceRefresh && this.membrosCacheFamiliaId === idFamilia) {
      return this.membros();
    }

    const { data, error } = await supabase
      .from('MembrosFamilia')
      .select(
        `
        id,
        created_at,
        id_membro,
        id_familia,
        role,
        usuarios (
          id,
          nome,
          qrcode_pix,
          logo,
          username
        )
      `,
      )
      .eq('id_familia', idFamilia)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar membros:', error.message);
      this.atualizarMembros([]);
      this.membrosCacheFamiliaId = null;
      return [];
    }

    const membros = (data ?? []).map((m) =>
      this.normalizarMembro(m as Record<string, unknown>),
    );
    this.atualizarMembros(membros);
    this.membrosCacheFamiliaId = idFamilia;

    const userId = this.loginService.getUserLogado();
    if (userId) {
      this.membroLogado.set(
        membros.find((m) => m.id_membro === userId) ?? null,
      );
    }

    return membros;
  }

  async buscarUsuarioPorUsername(
    username: string,
  ): Promise<UsuarioFamilia | null> {
    const termo = username.trim();
    if (!termo) return null;

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, username, nome, logo, qrcode_pix')
      .ilike('username', termo)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar usuário:', error.message);
      return null;
    }

    return (data as UsuarioFamilia) ?? null;
  }

  async adicionarMembro(
    payload: MembroFamiliaCreate,
  ): Promise<{ ok: boolean; mensagem?: string; membro?: MembroFamilia }> {
    if (!this.garantirAdmin()) {
      return {
        ok: false,
        mensagem: 'Apenas o administrador pode gerenciar membros.',
      };
    }

    const jaExiste = this.getMembrosSnapshot().some(
      (m) => m.id_membro === payload.id_membro,
    );
    if (jaExiste) {
      return { ok: false, mensagem: 'Este usuário já é membro da família.' };
    }

    const { data, error } = await supabase
      .from('MembrosFamilia')
      .insert([payload])
      .select(
        `
        id,
        created_at,
        id_membro,
        id_familia,
        role,
        usuarios (
          id,
          nome,
          qrcode_pix,
          logo,
          username
        )
      `,
      )
      .single();

    if (error || !data) {
      console.error('Erro ao adicionar membro:', error?.message);
      return { ok: false, mensagem: 'Não foi possível adicionar o membro.' };
    }

    const membro = this.normalizarMembro(data as Record<string, unknown>);
    this.atualizarMembros([...this.membros(), membro]);
    this.membrosCacheFamiliaId = payload.id_familia;
    return { ok: true, membro };
  }

  async atualizarMembro(
    id: number,
    payload: MembroFamiliaUpdate,
  ): Promise<{ ok: boolean; mensagem?: string }> {
    if (!this.garantirAdmin()) {
      return {
        ok: false,
        mensagem: 'Apenas o administrador pode editar membros.',
      };
    }

    const familia = this.getFamiliaSnapshot();
    const membro = this.getMembrosSnapshot().find((m) => m.id === id);
    if (!familia || !membro) {
      return { ok: false, mensagem: 'Membro não encontrado.' };
    }

    if (
      payload.role &&
      payload.role !== 'admin' &&
      membro.id_membro === familia.adm_id
    ) {
      return {
        ok: false,
        mensagem: 'Não é possível alterar o papel do administrador titular.',
      };
    }

    if (
      payload.role &&
      payload.role !== 'admin' &&
      this.seriaUltimoAdmin(membro)
    ) {
      return {
        ok: false,
        mensagem: 'Não é possível remover o único administrador da família.',
      };
    }

    const { error } = await supabase
      .from('MembrosFamilia')
      .update(payload)
      .eq('id', id)
      .eq('id_familia', familia.id);

    if (error) {
      console.error('Erro ao atualizar membro:', error.message);
      return { ok: false, mensagem: 'Não foi possível atualizar o membro.' };
    }

    this.atualizarMembros(
      this.membros().map((m) =>
        m.id === id ? { ...m, ...payload } : m,
      ),
    );
    const userId = this.loginService.getUserLogado();
    if (userId) {
      this.membroLogado.set(
        this.membros().find((m) => m.id_membro === userId) ?? null,
      );
    }
    return { ok: true };
  }

  async removerMembro(id: number): Promise<{ ok: boolean; mensagem?: string }> {
    if (!this.garantirAdmin()) {
      return {
        ok: false,
        mensagem: 'Apenas o administrador pode remover membros.',
      };
    }

    const familia = this.getFamiliaSnapshot();
    const membro = this.getMembrosSnapshot().find((m) => m.id === id);
    if (!familia || !membro) {
      return { ok: false, mensagem: 'Membro não encontrado.' };
    }

    if (membro.id_membro === familia.adm_id) {
      return {
        ok: false,
        mensagem: 'Não é possível remover o administrador titular da família.',
      };
    }

    if (this.seriaUltimoAdmin(membro)) {
      return {
        ok: false,
        mensagem: 'Não é possível remover o único administrador da família.',
      };
    }

    const { error } = await supabase
      .from('MembrosFamilia')
      .delete()
      .eq('id', id)
      .eq('id_familia', familia.id);

    if (error) {
      console.error('Erro ao remover membro:', error.message);
      return { ok: false, mensagem: 'Não foi possível remover o membro.' };
    }

    this.atualizarMembros(this.membros().filter((m) => m.id !== id));
    return { ok: true };
  }

  // ─── Categorias ────────────────────────────────────────────

  async buscarCategorias(
    idFamilia: number,
    forceRefresh = false,
  ): Promise<CategoriaFamilia[]> {
    if (!forceRefresh && this.categoriasCacheFamiliaId === idFamilia) {
      return this.categorias();
    }

    const { data, error } = await supabase
      .from('CategoriasFamilias')
      .select('*')
      .eq('id_familia', idFamilia)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar categorias:', error.message);
      this.atualizarCategorias([]);
      this.categoriasCacheFamiliaId = null;
      return [];
    }

    const categorias = (data ?? []) as CategoriaFamilia[];
    this.atualizarCategorias(categorias);
    this.categoriasCacheFamiliaId = idFamilia;
    return categorias;
  }

  async criarCategoria(
    payload: CategoriaFamiliaCreate,
  ): Promise<{ ok: boolean; mensagem?: string; categoria?: CategoriaFamilia }> {
    if (!this.garantirAdmin()) {
      return {
        ok: false,
        mensagem: 'Apenas o administrador pode gerenciar categorias.',
      };
    }

    const { data, error } = await supabase
      .from('CategoriasFamilias')
      .insert([payload])
      .select('*')
      .single();

    if (error || !data) {
      console.error('Erro ao criar categoria:', error?.message);
      return { ok: false, mensagem: 'Não foi possível criar a categoria.' };
    }

    const categoria = data as CategoriaFamilia;
    this.atualizarCategorias(
      [...this.categorias(), categoria].sort((a, b) =>
        a.nome.localeCompare(b.nome),
      ),
    );
    this.categoriasCacheFamiliaId = payload.id_familia;
    return { ok: true, categoria };
  }

  async atualizarCategoria(
    id: number,
    payload: CategoriaFamiliaUpdate,
  ): Promise<{ ok: boolean; mensagem?: string }> {
    if (!this.garantirAdmin()) {
      return {
        ok: false,
        mensagem: 'Apenas o administrador pode editar categorias.',
      };
    }

    const familia = this.getFamiliaSnapshot();
    if (!familia) {
      return { ok: false, mensagem: 'Família não encontrada.' };
    }

    const { error } = await supabase
      .from('CategoriasFamilias')
      .update(payload)
      .eq('id', id)
      .eq('id_familia', familia.id);

    if (error) {
      console.error('Erro ao atualizar categoria:', error.message);
      return { ok: false, mensagem: 'Não foi possível atualizar a categoria.' };
    }

    this.atualizarCategorias(
      this.categorias()
        .map((c) => (c.id === id ? { ...c, ...payload } : c))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    );
    return { ok: true };
  }

  async removerCategoria(
    id: number,
  ): Promise<{ ok: boolean; mensagem?: string }> {
    if (!this.garantirAdmin()) {
      return {
        ok: false,
        mensagem: 'Apenas o administrador pode excluir categorias.',
      };
    }

    const familia = this.getFamiliaSnapshot();
    if (!familia) {
      return { ok: false, mensagem: 'Família não encontrada.' };
    }

    const { error } = await supabase
      .from('CategoriasFamilias')
      .delete()
      .eq('id', id)
      .eq('id_familia', familia.id);

    if (error) {
      console.error('Erro ao remover categoria:', error.message);
      return {
        ok: false,
        mensagem:
          'Não foi possível excluir. Verifique se não há contas vinculadas.',
      };
    }

    this.atualizarCategorias(this.categorias().filter((c) => c.id !== id));
    return { ok: true };
  }

  /** Retorna o registro de MembrosFamilia do usuário logado na família atual. */
  async obterMembroLogado(): Promise<MembroFamiliaDetalhado | null> {
    const local = this.membroLogado();
    if (local) return local;

    const userId = this.loginService.getUserLogado();
    const familia = this.getFamiliaSnapshot();
    if (!userId || !familia) return null;

    const daLista = this.getMembrosSnapshot().find(
      (m) => m.id_membro === userId,
    );
    if (daLista) {
      this.membroLogado.set(daLista);
      return daLista;
    }

    const { data, error } = await supabase
      .from('MembrosFamilia')
      .select('*')
      .eq('id_membro', userId)
      .eq('id_familia', familia.id)
      .maybeSingle();

    if (error || !data) {
      console.error('Erro ao obter membro logado:', error?.message);
      return null;
    }

    const membro = data as MembroFamiliaDetalhado;
    this.membroLogado.set(membro);
    return membro;
  }

  /** Limpa cache reativo (ex.: logout / troca de usuário). */
  limparEstado(): void {
    this.familiaCachePronto = false;
    this.membrosCacheFamiliaId = null;
    this.categoriasCacheFamiliaId = null;
    this.atualizarFamilia(null);
    this.atualizarMembros([]);
    this.atualizarCategorias([]);
    this.membroLogado.set(null);
    this.carregando.set(false);
  }

  private garantirAdmin(): boolean {
    return this.ehAdmin();
  }

  private seriaUltimoAdmin(membro: MembroFamiliaDetalhado): boolean {
    if (membro.role !== 'admin') return false;
    const admins = this.getMembrosSnapshot().filter((m) => m.role === 'admin');
    return admins.length <= 1;
  }

  private normalizarMembro(
    raw: Record<string, unknown>,
  ): MembroFamiliaDetalhado {
    const usuario = raw['usuarios'] ?? raw['usuario'];
    return {
      id: raw['id'] as number,
      created_at: raw['created_at'] as string | undefined,
      id_membro: raw['id_membro'] as string,
      id_familia: raw['id_familia'] as number,
      role: raw['role'] as string,
      usuario: (Array.isArray(usuario) ? usuario[0] : usuario) as
        | MembroFamiliaDetalhado['usuario']
        | undefined,
    };
  }

  private atualizarFamilia(familia: Familia | null): void {
    this.familiaSubject.next(familia);
    this.familiaAtual.set(familia);
  }

  private atualizarMembros(membros: MembroFamiliaDetalhado[]): void {
    this.membrosSubject.next(membros);
    this.membros.set(membros);
  }

  private atualizarCategorias(categorias: CategoriaFamilia[]): void {
    this.categoriasSubject.next(categorias);
    this.categorias.set(categorias);
  }
}
