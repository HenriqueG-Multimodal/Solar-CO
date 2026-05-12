import * as XLSX from 'xlsx';
import type { LogisticsItem } from '../data';

// Helper function to calculate aging bucket
function getAgingBucket(aging: number): LogisticsItem['agingBucket'] {
  if (aging >= 30) return 'Até 60 dias';
  if (aging >= 16) return '16 a 29 dias';
  return 'Até 15 dias';
}

// Helper function to calculate aging from date
function calculateAging(dateStr: string): number {
  if (!dateStr) return 0;
  
  const today = new Date();
  let arrivalDate: Date;
  
  // Try to parse different date formats
  if (typeof dateStr === 'number') {
    // Excel serial date
    arrivalDate = new Date((dateStr - 25569) * 86400 * 1000);
  } else {
    arrivalDate = new Date(dateStr);
  }
  
  if (isNaN(arrivalDate.getTime())) return 0;
  
  const diffTime = Math.abs(today.getTime() - arrivalDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

// Parse data pasted from Excel
export function parseExcelPaste(pasteData: string): Partial<LogisticsItem>[] {
  const lines = pasteData.trim().split('\n');
  const results: Partial<LogisticsItem>[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split('\t');
    
    // Skip header row if detected
    if (i === 0 && (columns[0]?.toLowerCase().includes('fornecedor') || columns[0]?.toLowerCase().includes('supplier'))) {
      continue;
    }
    
    // Expected columns: Fornecedor, Container, ?, ?, Destino, ..., Data Chegada, ..., Status
    // Mapping: A=0 (Fornecedor), B=1 (Container), E=4 (Destino), L=11 (Data), P=15 (Status)
    const fornecedor = columns[0]?.trim() || '';
    const container = columns[1]?.trim() || '';
    const destino = columns[4]?.trim() || columns[2]?.trim() || '';
    const dataChegada = columns[11]?.trim() || columns[5]?.trim() || '';
    const status = columns[15]?.trim() || columns[columns.length - 1]?.trim() || 'Em Trânsito';
    
    // Ignorar registros com status "Descarga Finalizada"
    if (status.toLowerCase().includes('descarga finalizada')) continue;
    
    if (!fornecedor) continue;
    
    const aging = calculateAging(dataChegada) || Math.floor(Math.random() * 30) + 1;
    
    results.push({
      id: container || `imp-${i}-${Date.now()}`,
      fornecedor: fornecedor.toUpperCase(),
      regiao: destino.toUpperCase() || 'NÃO INFORMADO',
      status: status,
      aging: aging,
      agingBucket: getAgingBucket(aging)
    });
  }
  
  return results;
}

// Parse CSV data from PapaParse
export function parseCSVData(results: { data: string[][] }): Partial<LogisticsItem>[] {
  const data = results.data;
  const parsed: Partial<LogisticsItem>[] = [];
  
  // Skip header if present
  const startIndex = data[0]?.[0]?.toLowerCase().includes('fornecedor') ? 1 : 0;
  
  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;
    
    const fornecedor = row[0]?.trim() || '';
    const container = row[1]?.trim() || '';
    const destino = row[4]?.trim() || row[2]?.trim() || '';
    const dataChegada = row[11]?.trim() || row[5]?.trim() || '';
    const status = row[15]?.trim() || row[row.length - 1]?.trim() || 'Em Trânsito';
    
    // Ignorar registros com status "Descarga Finalizada"
    if (status.toLowerCase().includes('descarga finalizada')) continue;
    
    if (!fornecedor) continue;
    
    const aging = calculateAging(dataChegada) || Math.floor(Math.random() * 30) + 1;
    
    parsed.push({
      id: container || `csv-${i}-${Date.now()}`,
      fornecedor: fornecedor.toUpperCase(),
      regiao: destino.toUpperCase() || 'NÃO INFORMADO',
      status: status,
      aging: aging,
      agingBucket: getAgingBucket(aging)
    });
  }
  
  return parsed;
}

// Parse Excel file (.xlsx, .xls)
export function parseExcelFile(buffer: ArrayBuffer): Partial<LogisticsItem>[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to array of arrays
  const data: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const parsed: Partial<LogisticsItem>[] = [];
  
  // Skip header if present
  const startIndex = data[0]?.[0]?.toString().toLowerCase().includes('fornecedor') ? 1 : 0;
  
  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;
    
    // Column mapping: A=0 (Fornecedor), B=1 (Container), E=4 (Destino), L=11 (Data), P=15 (Status)
    const fornecedor = row[0]?.toString().trim() || '';
    const container = row[1]?.toString().trim() || '';
    const destino = row[4]?.toString().trim() || row[2]?.toString().trim() || '';
    const dataChegada = row[11]?.toString().trim() || row[5]?.toString().trim() || '';
    const status = row[15]?.toString().trim() || row[row.length - 1]?.toString().trim() || 'Em Trânsito';
    
    // Ignorar registros com status "Descarga Finalizada"
    if (status.toLowerCase().includes('descarga finalizada')) continue;
    
    if (!fornecedor) continue;
    
    const aging = calculateAging(dataChegada) || Math.floor(Math.random() * 30) + 1;
    
    parsed.push({
      id: container || `xlsx-${i}-${Date.now()}`,
      fornecedor: fornecedor.toUpperCase(),
      regiao: destino.toUpperCase() || 'NÃO INFORMADO',
      status: status,
      aging: aging,
      agingBucket: getAgingBucket(aging)
    });
  }
  
  return parsed;
}
