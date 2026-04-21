import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';

@Pipe({
  name: 'buscador',
})
export class BuscadorPipe implements PipeTransform {
  transform<T>(
    lista: T[],
    nomePesquisa: string | undefined,
    chaves: (keyof T | string)[] = ['nome']
  ): T[] {
    if (!nomePesquisa || nomePesquisa.length < 1) {
      return lista;
    }

    const pesquisa = nomePesquisa.toLowerCase();

    return lista.filter((item) =>
      chaves.some((chave) => {
        let valor = (item as any)[chave];

        if (valor === null || valor === undefined) return false;

        if (valor instanceof Date) {
          valor = formatDate(valor, 'dd/MM/yyyy', 'pt-BR');
        } else if (
          typeof valor === 'string' &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(valor)
        ) {
          valor = formatDate(new Date(valor), 'dd/MM/yyyy', 'pt-BR');
        }

        return valor.toString().toLowerCase().includes(pesquisa);
      })
    );
  }
}
