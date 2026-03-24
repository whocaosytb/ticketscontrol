import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Chamado } from '../types';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInHours } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle, XCircle, List } from 'lucide-react';
import { formatVisualId, minutesToFormat } from '../lib/utils';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

export const Dashboard: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  
  // Power BI style filters
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

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

  const filteredChamados = chamados;

  // 1. First apply date filter
  const dateFilteredChamados = filteredChamados.filter(c => {
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

  // 2. Apply interactive filters (Power BI style)
  const filteredForStatusChart = dateFilteredChamados.filter(c => {
    const matchesSector = !selectedSector || (c as any).setores?.nome === selectedSector;
    const matchesType = !selectedType || c.tipo === selectedType;
    return matchesSector && matchesType;
  });

  const filteredForSectorChart = dateFilteredChamados.filter(c => {
    const matchesStatus = !selectedStatus || c.status === selectedStatus;
    const matchesType = !selectedType || c.tipo === selectedType;
    return matchesStatus && matchesType;
  });

  const filteredForTypeChart = dateFilteredChamados.filter(c => {
    const matchesStatus = !selectedStatus || c.status === selectedStatus;
    const matchesSector = !selectedSector || (c as any).setores?.nome === selectedSector;
    return matchesStatus && matchesSector;
  });

  const periodChamados = dateFilteredChamados.filter(c => {
    const matchesStatus = !selectedStatus || c.status === selectedStatus;
    const matchesSector = !selectedSector || (c as any).setores?.nome === selectedSector;
    const matchesType = !selectedType || c.tipo === selectedType;
    return matchesStatus && matchesSector && matchesType;
  });

  // Stats by Status
  const statusData = [
    { name: 'Aberto', value: filteredForStatusChart.filter(c => c.status === 'Aberto').length },
    { name: 'Aguardando', value: filteredForStatusChart.filter(c => c.status === 'Aguardando').length },
    { name: 'Resolvido', value: filteredForStatusChart.filter(c => c.status === 'Resolvido').length },
    { name: 'Fechado', value: filteredForStatusChart.filter(c => c.status === 'Fechado').length },
    { name: 'Cancelado', value: filteredForStatusChart.filter(c => c.status === 'Cancelado').length },
  ];

  // Stats by Type
  const typeData = [
    { name: 'Incidente', value: filteredForTypeChart.filter(c => c.tipo === 'Incidente').length },
    { name: 'Solicitação', value: filteredForTypeChart.filter(c => c.tipo === 'Solicitação').length },
    { name: 'Melhoria', value: filteredForTypeChart.filter(c => c.tipo === 'Melhoria').length },
  ];

  // Stats by Sector
  const sectorCounts: Record<string, number> = {};
  filteredForSectorChart.forEach(c => {
    const name = (c as any).setores?.nome || 'Sem Setor';
    sectorCounts[name] = (sectorCounts[name] || 0) + 1;
  });
  const sectorData = Object.entries(sectorCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // SLA Metrics
  const resolvedChamados = periodChamados.filter(c => c.status === 'Resolvido' || c.status === 'Fechado');
  const withinSLA = resolvedChamados.filter(c => {
    if (!c.data_fechamento) return false;
    return new Date(c.data_fechamento) <= new Date(c.sla_atual);
  }).length;
  const slaPercentage = resolvedChamados.length > 0 ? (withinSLA / resolvedChamados.length) * 100 : 0;

  // Average Time (All resolved)
  const totalMinutes = resolvedChamados.reduce((acc, c) => acc + (c.tempo_gasto || 0), 0);
  const avgMinutes = resolvedChamados.length > 0 ? totalMinutes / resolvedChamados.length : 0;

  // Reduced List for SLA
  const slaList = periodChamados
    .filter(c => c.status === 'Aberto' || c.status === 'Aguardando')
    .sort((a, b) => new Date(a.sla_atual).getTime() - new Date(b.sla_atual).getTime())
    .slice(0, 5);

  if (loading) return <div className="p-8 text-center">Carregando métricas...</div>;

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Dashboard</h1>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-sla-alert'))}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all shadow-sm border border-amber-200 dark:border-amber-800 cursor-pointer"
          >
            <AlertTriangle size={16} />
            Alertas SLA
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-slate-400 text-xs font-black uppercase tracking-widest">até</span>
            <input 
              type="date" 
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          {(dateRange.start || dateRange.end || selectedStatus || selectedSector || selectedType) && (
            <button 
              onClick={() => {
                setDateRange({ start: '', end: '' });
                setSelectedStatus(null);
                setSelectedSector(null);
                setSelectedType(null);
              }}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2"
            >
              <XCircle size={16} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardStatCard 
          label="Total de Chamados" 
          value={periodChamados.length} 
          icon={<List />} 
          color="blue"
        />
        <DashboardStatCard 
          label="Resolvidos / Fechados" 
          value={resolvedChamados.length} 
          icon={<CheckCircle />} 
          color="emerald"
        />
        <DashboardStatCard 
          label="Conformidade SLA" 
          value={`${slaPercentage.toFixed(1)}%`} 
          icon={<AlertTriangle />} 
          color="amber"
        />
        <DashboardStatCard 
          label="Tempo Médio" 
          value={minutesToFormat(Math.round(avgMinutes)) || '00h00'} 
          icon={<Clock />} 
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Chart */}
        <ChartContainer 
          title="Distribuição por Status"
          onClear={() => setSelectedStatus(null)}
          isActive={!!selectedStatus}
          indicatorColor="bg-emerald-600"
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  nameKey="name"
                  onClick={(data) => {
                    if (data && data.name) {
                      setSelectedStatus(prev => prev === data.name ? null : data.name);
                    }
                  }}
                  cursor="pointer"
                >
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      fillOpacity={!selectedStatus || selectedStatus === entry.name ? 1 : 0.3}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [value, 'Chamados']} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        {/* Type Chart */}
        <ChartContainer 
          title="Chamados por Tipo"
          onClear={() => setSelectedType(null)}
          isActive={!!selectedType}
          indicatorColor="bg-purple-600"
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  nameKey="name"
                  onClick={(data) => {
                    if (data && data.name) {
                      setSelectedType(prev => prev === data.name ? null : data.name);
                    }
                  }}
                  cursor="pointer"
                >
                  {typeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === 'Solicitação' ? '#3b82f6' : 
                        entry.name === 'Incidente' ? '#f59e0b' : 
                        '#10b981'
                      } 
                      fillOpacity={!selectedType || selectedType === entry.name ? 1 : 0.3}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [value, 'Chamados']} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        {/* Sector Chart */}
        <ChartContainer 
          title="Volume por Setor"
          onClear={() => setSelectedSector(null)}
          isActive={!!selectedSector}
          indicatorColor="bg-blue-600"
        >
          <div style={{ height: Math.max(300, sectorData.length * 32) + 'px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={sectorData} 
                layout="vertical"
                margin={{ left: 20, right: 30 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    setSelectedSector(prev => prev === data.activeLabel ? null : data.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120} 
                  tick={{ fontSize: 11, fontWeight: 700 }} 
                  stroke="#64748b" 
                  interval={0}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [value, 'Chamados']}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  cursor="pointer"
                >
                  {sectorData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={selectedSector === entry.name ? '#2563eb' : '#3b82f6'} 
                      fillOpacity={!selectedSector || selectedSector === entry.name ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        {/* SLA List */}
        <ChartContainer title="Próximos Vencimentos SLA" indicatorColor="bg-amber-600">
          <div className="space-y-4">
            {slaList.map(c => (
              <div key={c.uuid} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatVisualId(c.id_visual)}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">{c.titulo}</span>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                    new Date(c.sla_atual) < new Date() ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {format(new Date(c.sla_atual), 'dd/MM HH:mm')}
                  </span>
                </div>
              </div>
            ))}
            {slaList.length === 0 && <p className="text-center text-slate-500 py-8 font-medium">Nenhum chamado pendente.</p>}
          </div>
        </ChartContainer>
      </div>
    </div>
  );
};

const DashboardStatCard: React.FC<{ 
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
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-4 mb-3">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          {React.cloneElement(icon as React.ReactElement, { size: 24 })}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</span>
      </div>
      <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</div>
    </div>
  );
};

const ChartContainer: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  onClear?: () => void; 
  isActive?: boolean;
  indicatorColor?: string;
}> = ({ title, children, onClear, isActive, indicatorColor = "bg-blue-600" }) => (
  <div className={`bg-white dark:bg-slate-900 p-8 rounded-3xl border transition-all ${isActive ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'} shadow-sm`}>
    <div className="flex justify-between items-center mb-8">
      <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
        <div className={`w-2 h-6 ${indicatorColor} rounded-full`} />
        {title}
      </h3>
      {isActive && onClear && (
        <button 
          onClick={onClear}
          className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full transition-colors"
        >
          Limpar
        </button>
      )}
    </div>
    {children}
  </div>
);
