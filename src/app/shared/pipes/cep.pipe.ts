import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cep',
})
export class CepPipe implements PipeTransform {
  transform(value: string | number): string {
    const numeros = value.toString().replace(/\D/g, '');
    if (numeros.length !== 8) return value.toString();
    return numeros.replace(/(\d{5})(\d{3})$/, '$1-$2');
  }
}
