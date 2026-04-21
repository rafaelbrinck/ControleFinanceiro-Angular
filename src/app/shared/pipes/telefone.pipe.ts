import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'telefone',
})
export class TelefonePipe implements PipeTransform {
  transform(value: string | number): string {
    const numeros = value.toString().replace(/\D/g, '');
    if (numeros.length < 10) return value.toString();
    return numeros
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
}
