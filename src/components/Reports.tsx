import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Chamado, Setor } from '../types';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  differenceInMinutes,
  parseISO,
  subDays
} from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { formatVisualId, minutesToFormat } from '../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Reports: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
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
    const [chamadosRes, setoresRes] = await Promise.all([
      supabase.from('chamados').select('*, setores(nome)').order('data_abertura', { ascending: false }),
      supabase.from('setores').select('*')
    ]);

    if (chamadosRes.data) setChamados(chamadosRes.data);
    if (setoresRes.data) setSetores(setoresRes.data);
    setLoading(false);
  };

  // Filter data by date range
  const reportData = chamados.filter(c => {
    const openingDate = parseISO(c.data_abertura);
    const start = startOfDay(parseISO(dateRange.start));
    const end = endOfDay(parseISO(dateRange.end));
    return isWithinInterval(openingDate, { start, end });
  });

  // Metrics calculation
  const totalTickets = reportData.length;
  const resolvedTickets = reportData.filter(c => c.status === 'Resolvido' || c.status === 'Fechado');
  const openTickets = reportData.filter(c => c.status === 'Aberto' || c.status === 'Aguardando');
  
  const withinSLA = resolvedTickets.filter(c => {
    if (!c.data_fechamento) return false;
    return parseISO(c.data_fechamento) <= parseISO(c.sla_atual);
  }).length;

  const slaCompliance = resolvedTickets.length > 0 ? (withinSLA / resolvedTickets.length) * 100 : 0;
  
  const totalMinutes = resolvedTickets.reduce((acc, c) => acc + (c.tempo_gasto || 0), 0);
  const avgMinutes = resolvedTickets.length > 0 ? totalMinutes / resolvedTickets.length : 0;

  // Chart Data: Status
  const statusCounts = reportData.reduce((acc: any, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Chart Data: Sector
  const sectorCounts = reportData.reduce((acc: any, c) => {
    const name = (c as any).setores?.nome || 'Sem Setor';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const sectorChartData = Object.entries(sectorCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => (b.value as number) - (a.value as number));

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

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
          <ReportStatCard 
            label="Total de Chamados" 
            value={totalTickets} 
            icon={<TrendingUp className="text-blue-500" />}
            color="blue"
          />
          <ReportStatCard 
            label="Resolvidos / Fechados" 
            value={resolvedTickets.length} 
            icon={<CheckCircle2 className="text-emerald-500" />}
            color="emerald"
          />
          <ReportStatCard 
            label="Conformidade SLA" 
            value={`${slaCompliance.toFixed(1)}%`} 
            icon={<AlertCircle className="text-amber-500" />}
            color="amber"
          />
          <ReportStatCard 
            label="Tempo Médio" 
            value={minutesToFormat(Math.round(avgMinutes))} 
            icon={<Clock className="text-purple-500" />}
            color="purple"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-300">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-blue-600 rounded-full" />
              Volume por Setor
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorChartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-300">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-emerald-600 rounded-full" />
              Distribuição por Status
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detalhamento dos Chamados</h3>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{totalTickets} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Título</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Setor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Abertura</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fechamento</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportData.map((c) => {
                  return (
                    <tr key={c.uuid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{formatVisualId(c.id_visual)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{c.titulo}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{c.tipo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400">{(c as any).setores?.nome}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase ${
                          c.status === 'Resolvido' || c.status === 'Fechado' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'Aberto' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{format(parseISO(c.data_abertura), 'dd/MM/yy')}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {c.data_fechamento ? format(parseISO(c.data_fechamento), 'dd/MM/yy') : '-'}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">{minutesToFormat(c.tempo_gasto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          nav, aside, button, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; overflow: visible !important; }
          .max-w-7xl { max-width: none !important; }
          .rounded-3xl, .rounded-2xl { border-radius: 0 !important; }
          .shadow-sm, .shadow-lg { box-shadow: none !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
};

const ReportStatCard: React.FC<{ 
  label: string; 
  value: string | number; 
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
}> = ({ label, value, icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:border-slate-300">
      <div className="flex items-center gap-4 mb-3">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          {React.cloneElement(icon as React.ReactElement, { size: 24 })}
        </div>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</span>
      </div>
      <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</div>
    </div>
  );
};
