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
});
