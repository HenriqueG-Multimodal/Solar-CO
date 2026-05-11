export interface LogisticsItem {
  id: string;
  fornecedor: string;
  regiao: string;
  status: string;
  aging: number;
  agingBucket: 'Até 15 dias' | '16 a 29 dias' | 'Até 60 dias';
}

export const RAW_DATA: LogisticsItem[] = [
  // MONSTER - MARACANAU
  ...Array(16).fill(null).map((_, i) => ({
    id: `m-mar-t1-${i}`,
    fornecedor: 'MONSTER',
    regiao: 'MARACANAÚ',
    status: 'Em Trânsito' as const,
    aging: 5,
    agingBucket: 'Até 15 dias' as const
  })),
  { id: 'm-mar-aa-c1', fornecedor: 'MONSTER', regiao: 'MARACANAÚ', status: 'Ag. Agenda' as const, aging: 45, agingBucket: 'Até 60 dias' as const },
  { id: 'm-mar-aa-c2', fornecedor: 'MONSTER', regiao: 'MARACANAÚ', status: 'Ag. Agenda' as const, aging: 35, agingBucket: 'Até 60 dias' as const },
  { id: 'm-mar-aa-c3', fornecedor: 'MONSTER', regiao: 'MARACANAÚ', status: 'Ag. Agenda' as const, aging: 32, agingBucket: 'Até 60 dias' as const },
  ...Array(6).fill(null).map((_, i) => ({
    id: `m-mar-vu1-${i}`,
    fornecedor: 'MONSTER',
    regiao: 'MARACANAÚ',
    status: 'Veículo na Unidade' as const,
    aging: 2,
    agingBucket: 'Até 15 dias' as const
  })),

  // MONSTER - MANAUS
  ...Array(27).fill(null).map((_, i) => ({
    id: `m-man-t1-${i}`,
    fornecedor: 'MONSTER',
    regiao: 'MANAUS',
    status: 'Em Trânsito' as const,
    aging: 10,
    agingBucket: 'Até 15 dias' as const
  })),
  ...Array(12).fill(null).map((_, i) => ({
    id: `m-man-aa1-${i}`,
    fornecedor: 'MONSTER',
    regiao: 'MANAUS',
    status: 'Ag. Agenda' as const,
    aging: 18,
    agingBucket: '16 a 29 dias' as const
  })),

  // OWENS ILINOIS - MANAUS
  { id: 'oi-man-aa-c1', fornecedor: 'OWENS ILINOIS', regiao: 'MANAUS', status: 'Ag. Agenda' as const, aging: 40, agingBucket: 'Até 60 dias' as const },

  // SALVADOR - MONSTER
  ...Array(24).fill(null).map((_, i) => ({
    id: `m-sal-t1-${i}`,
    fornecedor: 'MONSTER',
    regiao: 'SALVADOR',
    status: 'Em Trânsito' as const,
    aging: 12,
    agingBucket: 'Até 15 dias' as const
  })),
  ...Array(9).fill(null).map((_, i) => ({
    id: `m-sal-aa1-${i}`,
    fornecedor: 'MONSTER',
    regiao: 'SALVADOR',
    status: 'Ag. Agenda' as const,
    aging: 20,
    agingBucket: '16 a 29 dias' as const
  })),

  // SUAPE
  ...Array(30).fill(null).map((_, i) => ({
    id: `m-sua-t1-${i}`,
    fornecedor: 'MONSTER',
    regiao: 'SUAPE',
    status: 'Em Trânsito' as const,
    aging: 8,
    agingBucket: 'Até 15 dias' as const
  })),

  // ADES, KAPO, POTY etc placeholders to reach ~171
  ...Array(30).fill(null).map((_, i) => ({
    id: `oth-t1-${i}`,
    fornecedor: i % 2 === 0 ? 'ADES' : 'KAPO',
    regiao: 'SUAPE',
    status: 'Em Trânsito' as const,
    aging: 5,
    agingBucket: 'Até 15 dias' as const
  })),
  ...Array(7).fill(null).map((_, i) => ({
    id: `sch-t1-${i}`,
    fornecedor: 'POTY',
    regiao: 'MANAUS',
    status: 'Agendado' as const,
    aging: 3,
    agingBucket: 'Até 15 dias' as const
  })),
  ...Array(2).fill(null).map((_, i) => ({
    id: `vu-man-t1-${i}`,
    fornecedor: 'KAPO',
    regiao: 'MANAUS',
    status: 'Veículo na Unidade' as const,
    aging: 1,
    agingBucket: 'Até 15 dias' as const
  }))
];
