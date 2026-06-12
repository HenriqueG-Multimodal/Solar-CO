import React, { useState, useEffect } from 'react';

export default function AppDebug() {
  const [status, setStatus] = useState('Carregando...');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setStatus('Testando importação de módulos...');
        
        // Teste 1: Importar supabase
        setStatus('Importando supabase...');
        const supabaseModule = await import('./lib/supabase');
        setStatus('Supabase importado com sucesso');
        console.log('[v0] Supabase:', supabaseModule);
        
        // Teste 2: Buscar dados
        setStatus('Buscando dados do Supabase...');
        const items = await supabaseModule.fetchLogisticsItems();
        setStatus(`Sucesso! ${items.length} itens carregados`);
        setData(items);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setStatus(`Erro: ${errorMsg}`);
        console.error('[v0] Erro:', err);
        setData({ error: errorMsg });
      }
    })();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Debug da Aplicação</h1>
      <div style={{
        padding: '16px',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        marginBottom: '16px',
        minHeight: '100px'
      }}>
        <h3>Status:</h3>
        <p style={{ fontSize: '18px', color: '#333' }}>{status}</p>
      </div>
      
      {data && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f9f9f9',
          border: '1px solid #ddd',
          borderRadius: '8px',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          <h3>Dados:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
