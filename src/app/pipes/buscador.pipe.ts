import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'buscador',
})
export class BuscadorPipe implements PipeTransform {
  transform<T>(
    lista: T[],
    nomePesquisa: string | undefined,
    chaves: (keyof T)[] = ['descricao'] as (keyof T)[]
  ): T[] {
    if (!nomePesquisa || nomePesquisa.length < 2) {
      return lista;
    }

    return lista.filter((item) => {
      return chaves.some((chave) => {
        const valor = item[chave];
        if (typeof valor === 'string') {
          return valor
            .toLocaleLowerCase()
            .includes(nomePesquisa.toLocaleLowerCase());
        }
        return false;
      });
    });
  }
}
