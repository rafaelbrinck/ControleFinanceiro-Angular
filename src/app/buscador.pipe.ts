import { Pipe, PipeTransform } from '@angular/core';
import { Transacao } from './trasacao';

@Pipe({
  name: 'buscador',
})
export class BuscadorPipe implements PipeTransform {
  transform(
    listaTransacao: Transacao[],
    nomePesquisa: string | undefined
  ): Transacao[] {
    if (!nomePesquisa || nomePesquisa.length < 2) {
      return listaTransacao;
    }

    return listaTransacao.filter((transacao) => {
      return transacao.descricao
        ?.toLocaleLowerCase()
        .includes(nomePesquisa.toLocaleLowerCase());
    });
  }
}
