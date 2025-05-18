import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'moeda',
})
export class MoedaPipe implements PipeTransform {
  transform(valor: number | undefined): string {
    if (!valor) {
      return '';
    }
    const valorDecimal = valor.toFixed(2);
    const valorBr = valorDecimal.replace('.', ',');
    const valorMoeda = `R$ ${valorBr}`;
    return valorMoeda;
  }
}
