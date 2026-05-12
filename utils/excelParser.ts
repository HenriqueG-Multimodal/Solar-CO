import * as XLSX from 'xlsx';
import type { LogisticsItem } from '../data';

/**
 * Função para calcular a diferença de dias entre hoje e uma data
 */
function calculateAgingFromDate(dateValue: any): number {
  if (!dateValue || String(dateValue).trim() === '') return 0;

  let date: Date;

  // Se for número (formato Excel serial date)
  if (typeof dateValue === 'number') {
    date = new Date((dateValue - 25569) * 86400 * 1000);
  } else {
    // Tenta tratar strings comuns (DD/MM/AAAA ou DD/MM)
    const str = String(dateValue).trim();
    const parts = str.split(/[\/\-.]/);
    
    if (parts.length >= 2) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parts.length === 3 ? parseInt(parts[2]) : new Date().getFullYear();
      // Corrige ano com 2 dígitos
      const fullYear = year < 100 ? 2000 + year : year;
      date = new Date(fullYear, month, day);
    } else {
      date = new Date(dateValue);
    }
  }

  if (isNaN(date.getTime())) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Helper function to calculate aging bucket
 */
function getAgingBucket(aging: number): LogisticsItem['agingBucket'] {
  if (aging >= 30) return 'Até 60 dias';
  if (aging >= 16) return '16 a 29 dias';
  return 'Até 15 dias';
}

/**
 * Função para limpar e separar Fornecedor de Região
 */
function extractFornecedorRegiao(rawOrigem: string, rawDestino: string = '') {
  const fornecedor = String(rawOrigem || '').trim().toUpperCase();
  const regiao = String(rawDestino || '').trim().toUpperCase() || fornecedor;
  return { fornecedor, regiao };
}

/**
 * Processa uma linha individual (Formato Detalhado)
 */
function processDetailedRow(row: any[]): Partial<LogisticsItem> | null {
  const rawFornecedor = String(row[0] || '').trim();
  const container = String(row[1] || '').trim();
  const rawDestino = String(row[4] || '').trim();
  const rawStatus = String(row[15] || '').trim();
  const rawDateChegada = row[11];

  // Ignora se for o cabeçalho exato ou se a linha estiver totalmente vazia
  if (rawFornecedor.toLowerCase() === 'fornecedor' || (!rawFornecedor && !container)) return null;
  
  // Ignora linhas de resumo/total do Excel
  if (rawFornecedor.toLowerCase().includes('total geral') || rawFornecedor.toLowerCase().includes('resumo')) return null;

  // Ignora status "Descarga Finalizada"
  if (rawStatus.toLowerCase().includes('descarga finalizada')) return null;

  const { fornecedor, regiao } = extractFornecedorRegiao(rawFornecedor, rawDestino);
  
  let aging = 0;
  let agingBucket: LogisticsItem['agingBucket'] = 'Até 15 dias';

  if (!rawDateChegada || String(rawDateChegada).trim() === '') {
    aging = 0;
    agingBucket = 'Até 15 dias';
  } else {
    aging = calculateAgingFromDate(rawDateChegada);
    agingBucket = getAgingBucket(aging);
  }

  return {
    id: container || `${Math.random()}-${Date.now()}`,
    fornecedor, 
    regiao: regiao || 'DIVERSOS',
    status: rawStatus || 'Em Trânsito', 
    aging,
    agingBucket
  };
}

/**
 * Processa uma linha de resumo (Formato Antigo/Pivot)
 */
function processSummaryRow(row: any[]): Partial<LogisticsItem>[] {
  const items: Partial<LogisticsItem>[] = [];
  const rawOrigem = String(row[0] || '').trim();
  const { fornecedor, regiao } = extractFornecedorRegiao(rawOrigem);

  const countTransito = parseInt(String(row[1] || 0)) || 0;
  const countAgAgenda = parseInt(String(row[2] || 0)) || 0;
  const countAgendado = parseInt(String(row[3] || 0)) || 0;
  const countPatio = parseInt(String(row[4] || 0)) || 0;

  const count29 = parseInt(String(row[6] || 0)) || 0;
  const count60 = parseInt(String(row[7] || 0)) || 0;

  addItems(items, fornecedor, regiao, 'Em Trânsito', 'Até 15 dias', countTransito);
  addItems(items, fornecedor, regiao, 'Ag. Agenda', count60 > 0 ? 'Até 60 dias' : (count29 > 0 ? '16 a 29 dias' : 'Até 15 dias'), countAgAgenda);
  addItems(items, fornecedor, regiao, 'Agendado', 'Até 15 dias', countAgendado);
  addItems(items, fornecedor, regiao, 'Veículo na Unidade', 'Até 15 dias', countPatio);

  return items;
}

function addItems(list: Partial<LogisticsItem>[], f: string, r: string, s: string, b: LogisticsItem['agingBucket'], qty: number) {
  // Limite de segurança para evitar travar o navegador com dados sujos
  const safeQty = Math.min(qty, 500); 
  for (let i = 0; i < safeQty; i++) {
    list.push({
      id: `${f}-${r}-${s}-${b}-${i}-${Math.random()}`,
      fornecedor: f,
      regiao: r,
      status: s,
      aging: b === 'Até 60 dias' ? 45 : (b === '16 a 29 dias' ? 22 : 5),
      agingBucket: b
    });
  }
}

/**
 * Parse Excel file (.xlsx, .xls)
 */
export function parseExcelFile(buffer: ArrayBuffer): Partial<LogisticsItem>[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const items: Partial<LogisticsItem>[] = [];
  
  // Percorre todas as abas da planilha
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    
    let lastSeenFornecedor = '';
    let lastSeenRegiao = '';
    
    // Detectar formato: Detailed tem muitas colunas
    const headerRow = String(rows[0]?.join('') || '').toLowerCase();
    const isDetailed = rows.length > 0 && (rows[0].length > 10 || headerRow.includes('status') || headerRow.includes('container') || headerRow.includes('booking'));

    rows.forEach((row) => {
      if (!row || row.length < 2) return;
      
      const firstCell = String(row[0]).trim().toLowerCase();
      // Pula cabeçalhos
      if (firstCell === 'fornecedor' || firstCell === 'origem' || firstCell === 'fornecedores') return;
      if (firstCell.includes('total geral')) return;

      if (isDetailed) {
        const item = processDetailedRow(row);
        if (item) {
          // Lógica de Preenchimento para Células Mescladas
          if (item.fornecedor === '') {
            item.fornecedor = lastSeenFornecedor || 'DIVERSOS';
            item.regiao = lastSeenRegiao || 'DIVERSOS';
          } else {
            lastSeenFornecedor = item.fornecedor || '';
            lastSeenRegiao = item.regiao || '';
          }
          items.push(item);
        }
      } else {
        if (String(row[0]).trim()) {
          const summaryItems = processSummaryRow(row);
          items.push(...summaryItems);
        }
      }
    });
  });

  return items;
}

/**
 * Parse data pasted from Excel
 */
export function parseExcelPaste(text: string): Partial<LogisticsItem>[] {
  const lines = text.trim().split('\n');
  const items: Partial<LogisticsItem>[] = [];
  let lastSeenFornecedor = '';
  let lastSeenRegiao = '';
  
  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  const isDetailed = firstLine.split('\t').length > 10 || firstLine.includes('status') || firstLine.includes('container');

  lines.forEach((line) => {
    const cells = line.split('\t');
    if (cells.length < 2) return;
    
    const firstCell = cells[0].trim().toLowerCase();
    if (firstCell === 'fornecedor' || firstCell === 'origem') return;
    if (firstCell.includes('total geral')) return;

    if (isDetailed) {
      const item = processDetailedRow(cells);
      if (item) {
        if (item.fornecedor === '') {
          item.fornecedor = lastSeenFornecedor || 'DIVERSOS';
          item.regiao = lastSeenRegiao || 'DIVERSOS';
        } else {
          lastSeenFornecedor = item.fornecedor || '';
          lastSeenRegiao = item.regiao || '';
        }
        items.push(item);
      }
    } else {
      if (cells[0].trim()) {
        const summaryItems = processSummaryRow(cells);
        items.push(...summaryItems);
      }
    }
  });

  return items;
}

/**
 * Parse CSV data from PapaParse
 */
export function parseCSVData(results: { data: any[] }): Partial<LogisticsItem>[] {
  const items: Partial<LogisticsItem>[] = [];
  const rows = results.data;
  if (!rows.length) return [];

  const isDetailed = rows.length > 1 && String(rows[1]?.[1] || '').length > 5;

  rows.forEach((row: any) => {
    const values = Array.isArray(row) ? row : Object.values(row);
    if (values.length < 2) return;

    if (isDetailed) {
      const item = processDetailedRow(values);
      if (item) items.push(item);
    } else {
      const summaryItems = processSummaryRow(values);
      items.push(...summaryItems);
    }
  });

  return items;
}
