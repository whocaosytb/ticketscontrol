import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Chamado, Setor } from '../types';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  parseISO,
  subDays
} from 'date-fns';
import { 
  FileText, 
  Printer, 
  Calendar as CalendarIcon
} from 'lucide-react';
import { formatVisualId, minutesToFormat } from '../lib/utils';

export const Reports: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('chamados').select('*, setores(nome)').order('data_abertura', { ascending: false });
    if (data) setChamados(data);
    setLoading(false);
  };

  // Filter data by date range
  const reportData = chamados.filter(c => {
    const openingDate = parseISO(c.data_abertura);
    const start = startOfDay(parseISO(dateRange.start));
    const end = endOfDay(parseISO(dateRange.end));
    return isWithinInterval(openingDate, { start, end });
  });

  const totalTickets = reportData.length;

  // Summary by sector for the footer (Print only)
  const sectorSummary = reportData.reduce((acc, c) => {
    const sectorName = (c as any).setores?.nome || 'Sem Setor';
    if (!acc[sectorName]) {
      acc[sectorName] = { count: 0, time: 0 };
    }
    acc[sectorName].count += 1;
    acc[sectorName].time += c.tempo_gasto || 0;
    return acc;
  }, {} as Record<string, { count: number, time: number }>);

  const summaryEntries = (Object.entries(sectorSummary) as [string, { count: number, time: number }][])
    .sort((a, b) => b[1].count - a[1].count);
  const totalSummaryTickets = summaryEntries.reduce((sum, [_, data]) => sum + data.count, 0);
  const totalSummaryTime = summaryEntries.reduce((sum, [_, data]) => sum + data.time, 0);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Gerando relatório...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Header - Hidden on Print */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="text-blue-600" size={32} />
            Relatório de Atendimento
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Análise de performance e volume de chamados</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <CalendarIcon size={18} className="text-slate-400 ml-2" />
            <input 
              type="date" 
              className="bg-transparent border-none text-sm font-bold outline-none dark:text-white"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-slate-300">|</span>
            <input 
              type="date" 
              className="bg-transparent border-none text-sm font-bold outline-none dark:text-white"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-slate-500/20 active:scale-95"
          >
            <Printer size={18} />
            Imprimir PDF
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-8 print:space-y-4">
        {/* Print Header - Only visible on Print */}
        <div className="hidden print:flex justify-between items-center border-b-2 border-slate-900 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Relatório de Atendimento</h1>
              <p className="text-xs text-slate-500 font-bold">Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">Período Selecionado</p>
            <p className="text-lg font-black text-blue-600">{format(parseISO(dateRange.start), 'dd/MM/yy')} — {format(parseISO(dateRange.end), 'dd/MM/yy')}</p>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:shadow-none print:border-slate-300 print:rounded-none">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center print:p-2 print:mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white print:text-sm">Detalhamento dos Chamados</h3>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest print:text-[10px]">{totalTickets} registros</span>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse print:table-fixed">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 print:bg-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:px-2 print:py-2 print:w-[8%]">ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:px-2 print:py-2 print:w-[32%]">Título / Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:px-2 print:py-2 print:w-[15%]">Setor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:px-2 print:py-2 print:w-[12%]">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:px-2 print:py-2 print:w-[11%]">Abertura</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:px-2 print:py-2 print:w-[11%]">Fechamento</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:px-2 print:py-2 print:w-[11%]">Tempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                {reportData.map((c) => {
                  return (
                    <tr key={c.uuid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600 print:px-2 print:py-1.5 print:text-[9px]">{formatVisualId(c.id_visual)}</td>
                      <td className="px-6 py-4 print:px-2 print:py-1.5">
                        <div className="flex flex-col print:flex-row print:items-center print:gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] print:text-[10px] print:max-w-none print:truncate">{c.titulo}</span>
                          <span className="text-[10px] text-slate-400 font-medium print:text-[8px] print:before:content-['('] print:after:content-[')']">{c.tipo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 print:px-2 print:py-1.5 print:text-[9px] print:truncate">{(c as any).setores?.nome}</td>
                      <td className="px-6 py-4 print:px-2 print:py-1.5">
                        <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase print:text-[8px] print:px-1.5 print:py-0.5 ${
                          c.status === 'Resolvido' || c.status === 'Fechado' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'Aberto' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 print:px-2 print:py-1.5 print:text-[9px] whitespace-nowrap">{format(parseISO(c.data_abertura), 'dd/MM/yy')}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 print:px-2 print:py-1.5 print:text-[9px] whitespace-nowrap">
                        {c.data_fechamento ? format(parseISO(c.data_fechamento), 'dd/MM/yy') : '-'}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 print:px-2 print:py-1.5 print:text-[9px] whitespace-nowrap">{minutesToFormat(c.tempo_gasto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Table - Only visible on Print */}
        <div className="hidden print:block mt-12">
          <div className="p-4 border-b-2 border-slate-900 mb-4">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Resumo por Setor</h3>
          </div>
          <table className="w-full border-collapse print:table-fixed">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest border border-slate-300 w-[50%]">Setor</th>
                <th className="px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest border border-slate-300 w-[25%]">Total Chamados</th>
                <th className="px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest border border-slate-300 w-[25%]">Total Horas</th>
              </tr>
            </thead>
            <tbody>
              {summaryEntries.map(([name, data]) => (
                <tr key={name}>
                  <td className="px-4 py-2 text-xs font-bold border border-slate-300">{name}</td>
                  <td className="px-4 py-2 text-xs text-center border border-slate-300">{data.count}</td>
                  <td className="px-4 py-2 text-xs text-center border border-slate-300">{minutesToFormat(data.time)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-black">
                <td className="px-4 py-2 text-xs uppercase border border-slate-300">Total Geral</td>
                <td className="px-4 py-2 text-xs text-center border border-slate-300">{totalSummaryTickets}</td>
                <td className="px-4 py-2 text-xs text-center border border-slate-300">{minutesToFormat(totalSummaryTime)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          /* Reset layout constraints for printing */
          html, body, #root, .flex.h-screen { 
            height: auto !important; 
            overflow: visible !important; 
            display: block !important;
          }
          
          /* Hide non-essential elements */
          nav, aside, button, .print\\:hidden, .fixed, .absolute { 
            display: none !important; 
          }
          
          /* Main content area reset */
          main { 
            padding: 0 !important; 
            margin: 0 !important; 
            overflow: visible !important; 
            width: 100% !important; 
            position: static !important;
            display: block !important;
          }
          
          /* Container reset */
          .max-w-7xl, .max-w-\\[98\\%\\] { 
            max-width: none !important; 
            width: 100% !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Table styling for print */
          .bg-white, .dark\\:bg-slate-900 { background: white !important; }
          .rounded-3xl, .rounded-2xl, .shadow-sm, .shadow-lg { 
            border-radius: 0 !important; 
            box-shadow: none !important; 
          }
          
          .overflow-hidden, .overflow-x-auto { 
            overflow: visible !important; 
          }
          
          table { 
            width: 100% !important; 
            table-layout: fixed !important; 
            border-collapse: collapse !important; 
            page-break-inside: auto;
          }
          
          thead { display: table-header-group !important; }
          
          tr { 
            page-break-inside: avoid !important; 
            page-break-after: auto !important; 
          }
          
          th, td { 
            border: 0.5pt solid #e2e8f0 !important; 
            padding: 4pt !important;
            font-size: 8pt !important;
            color: black !important;
          }
          
          .text-blue-600 { color: #2563eb !important; }
          .text-slate-500, .text-slate-400 { color: #64748b !important; }
          
          @page { 
            size: A4 landscape; 
            margin: 1.5cm; 
          }
        }
      `}</style>
    </div>
  );
};
