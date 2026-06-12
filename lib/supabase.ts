import { createClient } from '@supabase/supabase-js';

// Suporta tanto variáveis Vite quanto Next.js/Vercel
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

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
    return [];
  }

  return data || [];
}

// Salvar itens no banco (substitui todos os dados existentes)
export async function saveLogisticsItems(items: LogisticsItemDB[]): Promise<boolean> {
  try {
    // Primeiro, deleta todos os itens existentes
    const { error: deleteError } = await supabase
      .from('logistics_items')
      .delete()
      .neq('id', ''); // Deleta tudo

    if (deleteError) {
      console.error('[v0] Error deleting old items:', deleteError);
      return false;
    }

    // Depois, insere os novos itens
    if (items.length > 0) {
      const { error: insertError } = await supabase
        .from('logistics_items')
        .insert(items);

      if (insertError) {
        console.error('[v0] Error inserting items:', insertError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('[v0] Error saving logistics items:', err);
    return false;
  }
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
