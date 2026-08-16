import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModuleSidebarService {
  private static readonly STORAGE_KEY = 'module-sidebar-collapsed';

  private readonly _collapsed = signal(this.lerEstadoInicial());

  readonly collapsed = this._collapsed.asReadonly();

  /** Largura da sidebar no desktop (para CSS vars / overlays). */
  readonly widthPx = computed(() => (this._collapsed() ? 72 : 260));

  toggle(): void {
    this._collapsed.update((atual) => {
      const proximo = !atual;
      try {
        localStorage.setItem(
          ModuleSidebarService.STORAGE_KEY,
          String(proximo),
        );
      } catch {
        /* ignore quota / private mode */
      }
      return proximo;
    });
  }

  private lerEstadoInicial(): boolean {
    try {
      return (
        localStorage.getItem(ModuleSidebarService.STORAGE_KEY) === 'true'
      );
    } catch {
      return false;
    }
  }
}
