import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Chamado } from '../types';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInHours } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle, XCircle, List } from 'lucide-react';
import { formatVisualId } from '../lib/utils';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

export const Dashboard: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChamados();
  }, []);

  const fetchChamados = async () => {
    const { data, error } = await supabase
      .from('chamados')
      .select('*, setores(nome)');
    
    if (data) setChamados(data);
    setLoading(false);
  };

  const filteredChamados = chamados.filter(c => c.status !== 'Cancelado');

  const periodChamados = filteredChamados.filter(c => {
    if (!dateRange.start && !dateRange.end) return true;
    
    const openingDate = new Date(c.data_abertura);
    const start = dateRange.start ? startOfDay(new Date(dateRange.start)) : null;
    const end = dateRange.end ? endOfDay(new Date(dateRange.end)) : null;

    if (start && end) {
      return isWithinInterval(openingDate, { start, end });
    }
    if (start) {
      return openingDate >= start;
    }
    if (end) {
      return openingDate <= end;
    }
    return true;
  });

  // Stats by Status
  const statusData = [
    { name: 'Aberto', value: periodChamados.filter(c => c.status === 'Aberto').length },
    { name: 'Aguardando', value: periodChamados.filter(c => c.status === 'Aguardando').length },
    { name: 'Resolvido', value: periodChamados.filter(c => c.status === 'Resolvido').length },
    { name: 'Fechado', value: periodChamados.filter(c => c.status === 'Fechado').length },
  ];

  // Stats by Type
  const typeData = [
    { name: 'Incidente', value: periodChamados.filter(c => c.tipo === 'Incidente').length },
    { name: 'Solicitação', value: periodChamados.filter(c => c.tipo === 'Solicitação').length },
    { name: 'Melhoria', value: periodChamados.filter(c => c.tipo === 'Melhoria').length },
  ];

  // Stats by Sector
  const sectorCounts: Record<string, number> = {};
  periodChamados.forEach(c => {
    const name = (c as any).setores?.nome || 'Sem Setor';
    sectorCounts[name] = (sectorCounts[name] || 0) + 1;
  });
  const sectorData = Object.entries(sectorCounts).map(([name, value]) => ({ name, value }));

  // SLA Metrics
  const resolvedChamados = chamados.filter(c => c.status === 'Resolvido');
  const withinSLA = resolvedChamados.filter(c => 
    new Date(c.data_fechamento!) <= new Date(c.sla_atual)
  ).length;
  const outsideSLA = resolvedChamados.length - withinSLA;
  const slaPercentage = resolvedChamados.length > 0 ? (withinSLA / resolvedChamados.length) * 100 : 0;

  // Average Time
  const avgTime = resolvedChamados.length > 0 
    ? resolvedChamados.reduce((acc, c) => acc + differenceInHours(new Date(c.data_fechamento!), new Date(c.data_abertura)), 0) / resolvedChamados.length
    : 0;

  // Reduced List for SLA
  const slaList = filteredChamados
    .filter(c => c.status === 'Aberto' || c.status === 'Aguardando')
    .sort((a, b) => new Date(a.sla_atual).getTime() - new Date(b.sla_atual).getTime())
    .slice(0, 5);

  // Active Status (excluding closed)
  const activeStatusData = [
    { name: 'Aberto', value: chamados.filter(c => c.status === 'Aberto').length },
    { name: 'Aguardando', value: chamados.filter(c => c.status === 'Aguardando').length },
    { name: 'Vencidos', value: chamados.filter(c => (c.status === 'Aberto' || c.status === 'Aguardando') && new Date(c.sla_atual) < new Date()).length },
  ];

  if (loading) return <div className="p-8 text-center">Carregando métricas...</div>;

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none dark:text-white"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-slate-400 text-sm">até</span>
            <input 
              type="date" 
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none dark:text-white"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          {(dateRange.start || dateRange.end) && (
            <button 
              onClick={() => setDateRange({ start: '', end: '' })}
              className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
            >
              <XCircle size={16} />
              Sem Filtro
            </button>
          )}
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Ativos" value={chamados.filter(c => c.status === 'Aberto' || c.status === 'Aguardando').length} icon={<List className="text-blue-500" />} />
        <StatCard title="Vencidos" value={activeStatusData[2].value} icon={<AlertTriangle className="text-red-500" />} />
        <StatCard title="SLA %" value={`${slaPercentage.toFixed(1)}%`} icon={<CheckCircle className="text-emerald-500" />} />
        <StatCard title="Tempo Médio" value={`${avgTime.toFixed(1)}h`} icon={<Clock className="text-amber-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Chart */}
        <ChartContainer title={`Chamados por Status ${dateRange.start || dateRange.end ? '(Período Selecionado)' : '(Total Ativos)'}`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [value, 'Quantidade']}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Type Chart */}
        <ChartContainer title="Chamados por Tipo">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, 'Chamados']} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Sector Chart */}
        <ChartContainer title="Chamados por Setor">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis dataKey="name" type="category" stroke="#64748b" hide={true} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [value, 'Chamados']}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* SLA List */}
        <ChartContainer title="Próximos Vencimentos SLA">
          <div className="space-y-4">
            {slaList.map(c => (
              <div key={c.uuid} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-slate-500">{formatVisualId(c.id_visual)}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px]">{c.titulo}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    new Date(c.sla_atual) < new Date() ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {format(new Date(c.sla_atual), 'dd/MM HH:mm')}
                  </span>
                </div>
              </div>
            ))}
            {slaList.length === 0 && <p className="text-center text-slate-500 py-8">Nenhum chamado pendente.</p>}
          </div>
        </ChartContainer>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{icon}</div>
    </div>
    <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
  </div>
);

const ChartContainer: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{title}</h3>
    {children}
  </div>
);
