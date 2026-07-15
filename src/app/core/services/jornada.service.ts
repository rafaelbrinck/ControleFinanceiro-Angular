import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from '@app/core/auth/services/login.service';
import { supabase } from '@app/core/data/supabase/supabase.client';
import { Jornada, TipoJornada } from '@app/shared/models/jornada';

@Injectable({
  providedIn: 'root',
})
export class JornadaService {
  private registrosSubject = new BehaviorSubject<Jornada[]>([]);
  public registros$: Observable<Jornada[]> =
    this.registrosSubject.asObservable();

  private fetchPromise: Promise<void> | null = null;

  constructor(private loginService: LoginService) {}

  getRegistrosSnapshot(): Jornada[] {
    return this.registrosSubject.getValue();
  }

  async carregarRegistros(force = false): Promise<void> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return;

    if (!force && this.registrosSubject.getValue().length > 0) return;
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this._executarCarga(userId);
    try {
      await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async _executarCarga(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('controle_jornada')
      .select('*')
      .eq('id_user', userId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.error('Erro ao carregar jornada:', error?.message);
      this.registrosSubject.next([]);
      return;
    }

    this.registrosSubject.next(data as Jornada[]);
  }

  async registrarPonto(tipo: TipoJornada): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return false;

    const { error } = await supabase.from('controle_jornada').insert([
      {
        tipo,
        id_user: userId,
      },
    ]);

    if (error) {
      console.error('Erro ao registrar ponto:', error.message);
      return false;
    }

    this.registrosSubject.next([]);
    await this.carregarRegistros(true);
    return true;
  }

  async deletar(id: string): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return false;

    const { error } = await supabase
      .from('controle_jornada')
      .delete()
      .eq('id', id)
      .eq('id_user', userId);

    if (error) {
      console.error('Erro ao deletar ponto:', error.message);
      return false;
    }

    this.registrosSubject.next([]);
    await this.carregarRegistros(true);
    return true;
  }
}
