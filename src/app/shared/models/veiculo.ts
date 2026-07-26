export type TipoVeiculo = 'carro' | 'moto' | 'caminhao' | 'outro';

export interface Veiculo {
  id: number;
  id_usuario: string;
  nome: string;
  tipo: TipoVeiculo | string;
  marca?: string | null;
  modelo?: string | null;
  placa?: string | null;
  ano?: number | null;
  odometro_base?: number | null;
}

export interface VeiculoCreate {
  id_usuario: string;
  nome: string;
  tipo: TipoVeiculo | string;
  marca?: string | null;
  modelo?: string | null;
  placa?: string | null;
  ano?: number | null;
  odometro_base?: number | null;
}

export type VeiculoUpdate = Partial<Omit<VeiculoCreate, 'id_usuario'>>;

export interface Abastecimento {
  id: number;
  id_veiculo: number;
  data: string;
  odometro: number;
  valor_total: number;
  valor_litro: number;
  litros: number;
  completou_tanque: boolean;
  posto_combustivel?: string | null;
}

export interface AbastecimentoCreate {
  id_veiculo: number;
  data: string;
  odometro: number;
  valor_total: number;
  valor_litro: number;
  litros: number;
  completou_tanque?: boolean;
  posto_combustivel?: string | null;
}

export type AbastecimentoUpdate = Partial<Omit<AbastecimentoCreate, 'id_veiculo'>>;

export interface TipoServico {
  id: number;
  nome: string;
}

export interface ManutencaoServico {
  id_manutencao: number;
  id_tipo_servico: number;
  valor_servico: number;
  tipo_servico?: Pick<TipoServico, 'id' | 'nome'>;
}

export interface Manutencao {
  id: number;
  id_veiculo: number;
  data: string;
  odometro: number;
  valor_total: number;
  oficina?: string | null;
  observacoes?: string | null;
}

export interface ManutencaoDetalhada extends Manutencao {
  servicos?: ManutencaoServico[];
}

export interface ManutencaoCreate {
  id_veiculo: number;
  data: string;
  odometro: number;
  valor_total: number;
  oficina?: string | null;
  observacoes?: string | null;
  servicos: Array<{
    id_tipo_servico: number;
    valor_servico: number;
  }>;
}

export type TipoEventoTimeline = 'abastecimento' | 'manutencao';

export interface EventoTimeline {
  id: string;
  tipo: TipoEventoTimeline;
  data: string;
  odometro: number;
  valor_total: number;
  titulo: string;
  subtitulo?: string;
  refId: number;
  raw: Abastecimento | ManutencaoDetalhada;
}

export interface ResumoGastosMes {
  total: number;
  abastecimentos: number;
  manutencoes: number;
  litros: number;
  mediaLitro: number;
}

export interface TrechoConsumo {
  de: string;
  ate: string;
  km: number;
  litros: number;
  kmPorLitro: number;
  custoPorKm: number;
}

export interface RelatorioCombustivel {
  totalGasto: number;
  totalLitros: number;
  mediaPrecoLitro: number;
  qtdAbastecimentos: number;
  /** Média ponderada dos trechos com tanque cheio. */
  consumoMedioKmL: number | null;
  custoMedioPorKm: number | null;
  melhorConsumo: TrechoConsumo | null;
  piorConsumo: TrechoConsumo | null;
  trechos: TrechoConsumo[];
  kmPercorridosEstimados: number;
}

export interface GastoPorCategoria {
  id_tipo_servico: number;
  nome: string;
  total: number;
  percentual: number;
  quantidade: number;
}

export interface RelatorioManutencao {
  totalGasto: number;
  qtdServicos: number;
  qtdManutencoes: number;
  porCategoria: GastoPorCategoria[];
}

export interface RelatorioVeiculo {
  combustivel: RelatorioCombustivel;
  manutencao: RelatorioManutencao;
  totalGeral: number;
}

