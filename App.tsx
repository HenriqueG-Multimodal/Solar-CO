import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Truck, 
  Clock, 
  CalendarCheck, 
  MapPin, 
  AlertCircle, 
  ChevronRight,
  Filter,
  BarChart3,
  Search,
  Package,
  TrendingDown,
  Upload,
  X,
  FileSpreadsheet,
  FileText,
  PieChart as PieChartIcon,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LabelList
} from 'recharts';
import Papa from 'papaparse';
import { RAW_DATA, LogisticsItem } from './data';
import { parseExcelPaste, parseCSVData, parseExcelFile } from './utils/excelParser';

const STORAGE_KEY = 'inbound-radar-data';

export default function App() {
  // Inicializa com dados do localStorage ou RAW_DATA como fallback
  const [data, setData] = useState<LogisticsItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return RAW_DATA;
        }
      }
    }
    return RAW_DATA;
  });
  
  // Salva dados no localStorage sempre que mudam
  useEffect(() => {
    if (data.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('Todos');
  const [selectedRegiao, setSelectedRegiao] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Import Modal State
  const [showImport, setShowImport] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract unique values for filters
  const fornecedores = useMemo(() => 
    ['Todos', ...new Set(data.map(i => i.fornecedor))].sort(), 
  [data]);
  
  const regioes = useMemo(() => 
    ['Todos', ...new Set(data.map(i => i.regiao))].sort(), 
  [data]);

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchFornecedor = selectedFornecedor === 'Todos' || item.fornecedor === selectedFornecedor;
      const matchRegiao = selectedRegiao === 'Todos' || item.regiao === selectedRegiao;
      const matchSearch = item.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.regiao.toLowerCase().includes(searchTerm.toLowerCase());
      return matchFornecedor && matchRegiao && matchSearch;
    });
  }, [data, selectedFornecedor, selectedRegiao, searchTerm]);

  // Helper para categorizar status dinâmicos para os cards de KPI
  const categorizeStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('descarga') || s.includes('unidade') || s.includes('finalizada')) return 'Veículo na Unidade';
    if (s.includes('agendado')) return 'Agendado';
    if (s.includes('agenda')) return 'Ag. Agenda';
    return 'Em Trânsito';
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = filteredData.length;
    const emTransito = filteredData.filter(i => categorizeStatus(i.status) === 'Em Trânsito').length;
    const agAgenda = filteredData.filter(i => categorizeStatus(i.status) === 'Ag. Agenda').length;
    const agendado = filteredData.filter(i => categorizeStatus(i.status) === 'Agendado').length;
    const noPatio = filteredData.filter(i => categorizeStatus(i.status) === 'Veículo na Unidade').length;
    
    const critico = filteredData.filter(i => i.agingBucket === 'Até 60 dias').length;
    const atencao = filteredData.filter(i => i.agingBucket === '16 a 29 dias').length;

    return { total, emTransito, agAgenda, agendado, noPatio, critico, atencao };
  }, [filteredData]);

  // Matrix Data (Region vs Status)
  const matrixData = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    const targetRegioes = selectedRegiao === 'Todos' ? regioes.filter(r => r !== 'Todos') : [selectedRegiao];
    
    targetRegioes.forEach(reg => {
      const itemsInRegion = filteredData.filter(i => i.regiao === reg);
      const maxAging = itemsInRegion.length > 0 ? Math.max(...itemsInRegion.map(i => i.aging)) : 0;
      
      result[reg] = {
        'Ag. Agenda': filteredData.filter(i => i.regiao === reg && categorizeStatus(i.status) === 'Ag. Agenda').length,
        'Veículo na Unidade': filteredData.filter(i => i.regiao === reg && categorizeStatus(i.status) === 'Veículo na Unidade').length,
        'maxAging': maxAging,
      };
    });
    return result;
  }, [filteredData, regioes, selectedRegiao]);

  // Função para determinar a ação sugerida baseada no aging máximo
  const getAcaoSugerida = (maxAging: number) => {
    if (maxAging > 15) {
      return { label: 'Ação Imediata', style: 'bg-red-100 text-red-700 border-red-200' };
    } else if (maxAging >= 10) {
      return { label: 'Crítico', style: 'bg-orange-100 text-orange-700 border-orange-200' };
    } else if (maxAging >= 5) {
      return { label: 'Atenção', style: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: 'Fluxo Normal', style: 'bg-slate-100 text-slate-500 border-slate-200' };
  };

  const criticalItems = useMemo(() => {
    return filteredData
      .filter(i => i.agingBucket === 'Até 60 dias' || (categorizeStatus(i.status) === 'Ag. Agenda' && i.aging > 15))
      .sort((a, b) => b.aging - a.aging);
  }, [filteredData]);

  // Analytical Calculations
  const chartDataStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(item => {
      const status = categorizeStatus(item.status);
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const chartDataFornecedor = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(item => {
      counts[item.fornecedor] = (counts[item.fornecedor] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  const supplierPerformance = useMemo(() => {
    const perf: Record<string, { total: number, agingAvg: number, critical: number }> = {};
    filteredData.forEach(item => {
      if (!perf[item.fornecedor]) {
        perf[item.fornecedor] = { total: 0, agingAvg: 0, critical: 0 };
      }
      perf[item.fornecedor].total++;
      perf[item.fornecedor].agingAvg += item.aging;
      if (item.agingBucket === 'Até 60 dias') perf[item.fornecedor].critical++;
    });

    return Object.entries(perf).map(([name, stats]) => ({
      name,
      total: stats.total,
      agingAvg: Math.round(stats.agingAvg / stats.total),
      critical: stats.critical
    })).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const CHART_COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#64748b', '#ec4899', '#8b5cf6'];

  const handleImport = () => {
    if (!pasteData.trim()) return;
    const parsed = parseExcelPaste(pasteData);
    if (parsed.length > 0) {
      setData(parsed as LogisticsItem[]);
      setShowImport(false);
      setPasteData('');
      setSelectedFornecedor('Todos');
      setSelectedRegiao('Todos');
      alert(`${parsed.length} unidades carregadas com sucesso!`);
    } else {
      alert("Nenhum dado válido encontrado. Certifique-se de copiar as colunas corretamente do Excel.");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = parseCSVData(results);
          if (parsed.length > 0) {
            setData(parsed as LogisticsItem[]); 
            setShowImport(false);
            setSelectedFornecedor('Todos');
            setSelectedRegiao('Todos');
            alert(`${parsed.length} unidades carregadas do CSV!`);
          } else {
            alert("Nenhum dado válido encontrado no CSV.");
          }
        },
        error: (error) => {
          console.error("Erro no CSV:", error);
          alert("Erro ao processar o arquivo CSV.");
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result;
        if (buffer instanceof ArrayBuffer) {
          try {
            const parsed = parseExcelFile(buffer);
            if (parsed.length > 0) {
              setData(parsed as LogisticsItem[]);
              setShowImport(false);
              setSelectedFornecedor('Todos');
              setSelectedRegiao('Todos');
              alert(`${parsed.length} unidades carregadas do Excel!`);
            } else {
              alert("Nenhum dado válido encontrado no Excel. Verifique o mapeamento das colunas.");
            }
          } catch (err) {
            console.error(err);
            alert("Erro ao processar arquivo Excel.");
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Import Modal */}
      <AnimatePresence>
        {showImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImport(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Alimentação de Dados</h3>
                    <p className="text-xs text-slate-500">Importe sua planilha (.xlsx, .xls, .csv)</p>
                  </div>
                </div>
                <button onClick={() => setShowImport(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="bg-slate-100 p-3 rounded-full group-hover:bg-white transition-colors">
                      <FileText className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-700 block">Carregar Planilha</span>
                      <span className="text-[10px] text-slate-400">XLSX, XLS ou CSV</span>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={handleFileUpload}
                    />
                  </button>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Mapeamento Sugerido:</p>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      Coluna A: <span className="font-bold">Fornecedor</span><br />
                      Coluna B: <span className="font-bold">Container</span><br />
                      Coluna E: <span className="font-bold">Destino</span><br />
                      Coluna L: <span className="font-bold">Data Chegada (Aging)</span><br />
                      Coluna P: <span className="font-bold">Status Atual</span><br />
                      <span className="mt-2 block text-indigo-600 font-bold italic">* Use a planilha padrão do sistema</span>
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-slate-500 font-medium italic text-[10px] uppercase tracking-widest">Ou cole do Excel</span>
                  </div>
                </div>
                
                <textarea 
                  className="w-full h-40 mt-4 p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  placeholder="Selecione as colunas no Excel e cole aqui..."
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                />
                
                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={handleImport}
                    className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Processar e Atualizar Painel
                  </button>
                  <button 
                    onClick={() => setShowImport(false)}
                    className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.png" 
              alt="União Multimodal" 
              className="h-10 w-auto"
            />
            <div className="h-8 w-px bg-slate-700" />
            <img 
              src="/logo-solar.png" 
              alt="Solar BR Coca-Cola" 
              className="h-10 w-auto bg-white rounded px-2 py-1"
            />
            <div className="h-8 w-px bg-slate-700" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Inbound Radar</h1>
              <p className="text-xs text-slate-400 font-medium">Gestão de Pátio & Chegadas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Excel</span>
            </button>

            <div className="hidden sm:flex items-center bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Buscar fornecedor ou região..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-48"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filtros */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-600 mr-2">Filtros:</span>
            
            <div className="flex gap-2">
              <select 
                value={selectedFornecedor}
                onChange={(e) => setSelectedFornecedor(e.target.value)}
                className="text-sm border-none focus:ring-0 cursor-pointer bg-slate-50 rounded-md py-1"
              >
                {fornecedores.map(f => <option key={f} value={f}>{f === 'Todos' ? 'Fornecedor: Todos' : f}</option>)}
              </select>

              <select 
                value={selectedRegiao}
                onChange={(e) => setSelectedRegiao(e.target.value)}
                className="text-sm border-none focus:ring-0 cursor-pointer bg-slate-50 rounded-md py-1"
              >
                {regioes.map(r => <option key={r} value={r}>{r === 'Todos' ? 'Região: Todas' : r}</option>)}
              </select>
            </div>
          </div>

          <button 
            onClick={() => { setSelectedFornecedor('Todos'); setSelectedRegiao('Todos'); setSearchTerm(''); }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            Limpar filtros
          </button>

          <button 
            onClick={() => { 
              if (confirm('Deseja limpar os dados salvos e voltar aos dados de exemplo?')) {
                localStorage.removeItem(STORAGE_KEY);
                setData(RAW_DATA);
                setSelectedFornecedor('Todos');
                setSelectedRegiao('Todos');
              }
            }}
            className="text-xs font-medium text-red-500 hover:text-red-700"
          >
            Resetar dados
          </button>
        </div>

        {/* Pipeline / Funil de Chegada */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800">Pipeline de Chegada</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard 
              title="Em Trânsito" 
              value={stats.emTransito} 
              icon={<Truck className="w-5 h-5" />} 
              color="indigo"
              description="A caminho da unidade"
            />
            <KPICard 
              title="Ag. Agenda" 
              value={stats.agAgenda} 
              icon={<Clock className="w-5 h-5" />} 
              color="amber"
              description="Aguardando marcação"
              urgent={stats.agAgenda > 20}
            />
            <KPICard 
              title="Agendado" 
              value={stats.agendado} 
              icon={<CalendarCheck className="w-5 h-5" />} 
              color="emerald"
              description="Programado para hoje"
            />
            <KPICard 
              title="No Pátio" 
              value={stats.noPatio} 
              icon={<MapPin className="w-5 h-5" />} 
              color="slate"
              description="Veículo descarregando"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Próximas Ações (Aging) - Expandido */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Próximas Ações (Aging)
                </h3>
                <span className="text-xs text-slate-500">{criticalItems.length} itens críticos</span>
              </div>
              
              <div className="p-0 overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-white">
                      <th className="px-4 py-3 border-b">Container</th>
                      <th className="px-4 py-3 border-b">Fornecedor</th>
                      <th className="px-4 py-3 border-b">Destino</th>
                      <th className="px-4 py-3 border-b text-center">Data Coleta</th>
                      <th className="px-4 py-3 border-b text-center">Aging</th>
                      <th className="px-4 py-3 border-b text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criticalItems.length > 0 ? (
                      criticalItems.slice(0, 15).map(item => {
                        const acao = getAcaoSugerida(item.aging);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-bold text-slate-700">{item.id.split('-')[0] || item.id}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-semibold text-slate-600 uppercase">{item.fornecedor}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-slate-600">{item.regiao}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs text-slate-500 font-medium">
                                {item.dataColeta || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${item.aging > 30 ? 'bg-red-100 text-red-600' : item.aging > 15 ? 'bg-orange-100 text-orange-600' : 'bg-amber-100 text-amber-600'}`}>
                                {item.aging} dias
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${acao.style}`}>
                                {acao.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center">
                          <div className="flex flex-col items-center justify-center opacity-40">
                            <Package className="w-8 h-8 mb-2" />
                            <p className="text-xs font-bold uppercase tracking-widest">Tudo em dia!</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {criticalItems.length > 15 && (
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-500 text-center">
                    Exibindo 15 de {criticalItems.length} itens críticos
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Side Alerts */}
          <div className="flex flex-col gap-6">
            {/* Aging Distribution */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
              <h3 className="text-sm font-bold opacity-60 uppercase mb-4 tracking-widest">Distribuição de Aging</h3>
              <div className="space-y-4">
                <AgingBar 
                  label="Até 15 dias" 
                  count={filteredData.filter(i => i.agingBucket === 'Até 15 dias').length} 
                  total={filteredData.length}
                  color="bg-emerald-400"
                />
                <AgingBar 
                  label="16 a 29 dias" 
                  count={filteredData.filter(i => i.agingBucket === '16 a 29 dias').length} 
                  total={filteredData.length}
                  color="bg-amber-400"
                />
                <AgingBar 
                  label="Até 60 dias" 
                  count={filteredData.filter(i => i.agingBucket === 'Até 60 dias').length} 
                  total={filteredData.length}
                  color="bg-red-400"
                />
              </div>
            </div>

            {/* Resumo por Status */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Resumo por Status
              </h3>
              <div className="space-y-3">
                {Object.entries(
                  filteredData.reduce((acc, item) => {
                    const cat = categorizeStatus(item.status);
                    acc[cat] = (acc[cat] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">{status}</span>
                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Painel Gerencial & Analítico */}
        <section className="mt-16 pt-8 border-t border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-lg">
                <LayoutDashboard className="text-white w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Painel Gerencial & Analítico</h2>
                <p className="text-sm text-slate-500 font-medium">Insights estratégicos e performance de fornecedores</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Status Distribution Chart */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-2 mb-8">
                <PieChartIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">Distribuição de Status Atual</h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                      fontSize={9}
                    >
                      {chartDataStatus.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Supplier Volume Chart */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-2 mb-8">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">Top 10 Fornecedores (Volume)</h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataFornecedor} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={120} 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList 
                        dataKey="value" 
                        position="right" 
                        style={{ fontSize: 11, fontWeight: 'bold', fill: '#334155' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Supplier Performance Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-12">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-800">Ranking de Performance por Fornecedor</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b">
                      <th className="px-8 py-4">Fornecedor</th>
                      <th className="px-8 py-4 text-center">Volume Total</th>
                      <th className="px-8 py-4 text-center">Aging Médio</th>
                      <th className="px-8 py-4 text-center">Itens Críticos</th>
                      <th className="px-8 py-4 text-center">Status Saúde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {supplierPerformance.slice(0, 15).map((sup) => (
                      <tr key={sup.name} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-4 text-sm font-bold text-slate-700">{sup.name}</td>
                        <td className="px-8 py-4 text-center text-sm font-medium text-slate-600">{sup.total}</td>
                        <td className="px-8 py-4 text-center">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${sup.agingAvg > 25 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {sup.agingAvg} dias
                          </span>
                        </td>
                        <td className="px-8 py-4 text-center">
                           <span className={`text-xs font-bold ${sup.critical > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {sup.critical}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-center">
                          {sup.agingAvg < 15 && sup.critical === 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase border border-emerald-100 bg-emerald-50 px-2.5 py-1 rounded-full">Excelente</span>
                          ) : sup.agingAvg > 30 || sup.critical > 5 ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase border border-red-100 bg-red-50 px-2.5 py-1 rounded-full">Crítico</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-600 uppercase border border-amber-100 bg-amber-50 px-2.5 py-1 rounded-full">Em Atenção</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Tabela de Dados Detalhada */}
        <section className="mt-16 pt-8 border-t border-slate-200 pb-20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <FileText className="text-white w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detalhamento das Unidades</h2>
                <p className="text-sm text-slate-500 font-medium">Lista completa filtrada por fornecedor e região</p>
              </div>
            </div>
            <div className="px-4 py-2 bg-slate-100 rounded-full">
              <span className="text-xs font-bold text-slate-500">{filteredData.length} registros encontrados</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b bg-slate-50/50">
                    <th className="px-8 py-4">ID / Container</th>
                    <th className="px-8 py-4">Fornecedor</th>
                    <th className="px-8 py-4">Destino</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-center">Aging</th>
                    <th className="px-8 py-4 text-right">Faixa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.slice(0, 50).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 py-4 text-xs font-mono font-medium text-slate-400">
                        {item.id.split('-')[0]}
                      </td>
                      <td className="px-8 py-4 text-sm font-bold text-slate-700">
                        {item.fornecedor}
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500">
                        {item.regiao}
                      </td>
                      <td className="px-8 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          categorizeStatus(item.status) === 'Veículo na Unidade' ? 'bg-indigo-100 text-indigo-700' :
                          categorizeStatus(item.status) === 'Agendado' ? 'bg-emerald-100 text-emerald-700' :
                          categorizeStatus(item.status) === 'Ag. Agenda' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className={`text-sm font-black ${item.aging > 20 ? 'text-red-500' : 'text-slate-700'}`}>
                          {item.aging}d
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.agingBucket === 'Até 60 dias' ? 'bg-red-50 text-red-600' :
                          item.agingBucket === '16 a 29 dias' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {item.agingBucket}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length > 50 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-6 text-center text-sm text-slate-400 italic bg-slate-50/30">
                        Mostrando os primeiros 50 registros de {filteredData.length}. Use os filtros no topo para refinar sua busca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function KPICard({ title, value, icon, color, description, urgent }: { title: string, value: number, icon: React.ReactNode, color: string, description: string, urgent?: boolean }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}
    >
      {urgent && <div className="absolute top-0 right-0 w-0 h-0 border-t-[30px] border-l-[30px] border-t-red-500 border-l-transparent" />}
      
      <div className="flex items-center gap-4 mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-500">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-slate-800">{value}</span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">UNIDADES</span>
      </div>
      <p className="text-[10px] text-slate-400 mt-2 font-medium">{description}</p>
    </motion.div>
  );
}

function AgingBar({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold mb-1 uppercase opacity-80">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}

function getHeatmapStyle(value: number, threshold: number) {
  if (value === 0) return 'text-slate-300 font-normal';
  if (value >= threshold) return 'bg-red-50 text-red-700 font-black';
  if (value >= threshold / 2) return 'bg-amber-50 text-amber-700 font-bold';
  return 'text-slate-600 font-semibold';
}
