import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'data',
})
export class DataPipe implements PipeTransform {
  transform(
    valor: string | Date | null | undefined,
    formato: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  ): string {
    if (!valor) return '';
    const data = new Date(valor);
    return new Intl.DateTimeFormat('pt-BR', formato).format(data);
  }
}
