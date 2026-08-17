import { createClient } from '@supabase/supabase-js';

// O build publicado usa as variáveis NEXT_PUBLIC_*; o Vite local usa VITE_*.
const env = import.meta.env as ImportMetaEnv & {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
};

const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('As variáveis públicas do Supabase não estão configuradas.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LogisticsItemDB {
  id: string;
  nf: string | null;
  fornecedor: string;
  regiao: string;
  status: string;
  aging: number;
  aging_bucket: string;
  data_coleta: string | null;
  data_chegada: string | null;
  created_at?: string;
  updated_at?: string;
}

// Buscar todos os itens do banco
export async function fetchLogisticsItems(): Promise<LogisticsItemDB[]> {
  const { data, error } = await supabase
    .from('logistics_items')
    .select('*')
    .order('aging', { ascending: false });

  if (error) {
    console.error('[v0] Error fetching logistics items:', error);
    throw new Error(`Não foi possível carregar os dados salvos: ${error.message}`);
  }

  return data || [];
}

// Salva a nova importação sem apagar a base antes de confirmar a gravação.
export async function saveLogisticsItems(items: LogisticsItemDB[]): Promise<boolean> {
  if (items.length === 0) return false;

  const { error: upsertError } = await supabase
    .from('logistics_items')
    .upsert(items, { onConflict: 'id' });

  if (upsertError) {
    console.error('[v0] Error upserting items:', upsertError);
    throw new Error(`Não foi possível salvar a planilha: ${upsertError.message}`);
  }

  const importedIds = items.map((item) => item.id);
  const { data: currentItems, error: readError } = await supabase
    .from('logistics_items')
    .select('id');

  if (readError) {
    throw new Error(`A planilha foi gravada, mas não pôde ser confirmada: ${readError.message}`);
  }

  const staleIds = (currentItems || [])
    .map((item) => item.id as string)
    .filter((id) => !importedIds.includes(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('logistics_items')
      .delete()
      .in('id', staleIds);

    if (deleteError) {
      throw new Error(`A planilha foi gravada, mas os registros antigos não foram removidos: ${deleteError.message}`);
    }
  }

  return true;
}

// Limpar todos os dados do banco
export async function clearLogisticsItems(): Promise<boolean> {
  const { error } = await supabase
    .from('logistics_items')
    .delete()
    .neq('id', '');

  if (error) {
    console.error('[v0] Error clearing items:', error);
    return false;
  }

  return true;
}

// Salvar data da última importação
export async function saveLastImportDate(): Promise<boolean> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ 
      key: 'last_import_date', 
      value: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('[v0] Error saving last import date:', error);
    return false;
  }

  return true;
}

// Buscar data da última importação
export async function fetchLastImportDate(): Promise<Date | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'last_import_date')
    .single();

  if (error || !data) {
    return null;
  }

  return new Date(data.value);
}
