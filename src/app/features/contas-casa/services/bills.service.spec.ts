import { ContaDetalhada } from '@app/shared/models/conta';
import { BillsService } from './bills.service';

describe('BillsService – lógica de datas (QA)', () => {
  let service: BillsService;

  beforeEach(() => {
    service = new BillsService();
  });

  it('deve calcular mês anterior corretamente (virada de ano)', () => {
    expect(service.mesAnterior(1, 2026)).toEqual({ mes: 12, ano: 2025 });
    expect(service.mesAnterior(3, 2026)).toEqual({ mes: 2, ano: 2026 });
  });

  it('deve preservar o dia ao importar para outro mês', () => {
    expect(service.ajustarDataParaMes('2025-01-15', 3, 2025)).toBe(
      '2025-03-15',
    );
  });

  it('deve ajustar dia 31 para o último dia de fevereiro', () => {
    expect(service.ajustarDataParaMes('2025-01-31', 2, 2025)).toBe(
      '2025-02-28',
    );
    expect(service.ajustarDataParaMes('2024-01-31', 2, 2024)).toBe(
      '2024-02-29',
    );
  });

  it('deve gerar chave estável de conta fixa', () => {
    expect(
      service.chaveContaFixa({
        id_categoria: 1,
        descricao: '  Aluguel  ',
      }),
    ).toBe('1|aluguel');
  });

  it('deve filtrar apenas fixas ainda não lançadas no mês', () => {
    const templates = [
      {
        id: 1,
        id_familia: 1,
        id_criador: 1,
        valor: 100,
        data_vencimento: '2026-01-10',
        descricao: 'Aluguel',
        id_categoria: 2,
        pago: false,
        is_fixa: true,
      },
      {
        id: 2,
        id_familia: 1,
        id_criador: 1,
        valor: 50,
        data_vencimento: '2026-01-05',
        descricao: 'Internet',
        id_categoria: 3,
        pago: false,
        is_fixa: true,
      },
    ];
    const doMes = [
      {
        id: 10,
        id_familia: 1,
        id_criador: 1,
        valor: 100,
        data_vencimento: '2026-02-10',
        descricao: 'Aluguel',
        id_categoria: 2,
        pago: false,
        is_fixa: true,
      },
    ] as ContaDetalhada[];

    const pendentes = service.filtrarFixasPendentes(templates, doMes);
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0]?.descricao).toBe('Internet');
  });
});
