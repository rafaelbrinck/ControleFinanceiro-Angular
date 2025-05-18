import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'moeda',
})
export class MoedaPipe implements PipeTransform {
  transform(valor: number | undefined): string {
    if (!valor) {
      return '';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(valor);
  }
}
