import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Chamado } from '../types';
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInMinutes, max, min } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [historyRange, setHistoryRange] = useState(30);

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

  // 1. First apply date range filter
  const dateFilteredChamados = chamados.filter(c => {
    if (!dateRange.start && !dateRange.end) return true;
    
    const openingDate = parseISO(c.data_abertura);
    const closingDate = c.data_fechamento ? parseISO(c.data_fechamento) : new Date();
    const start = dateRange.start ? startOfDay(parseISO(dateRange.start)) : null;
    const end = dateRange.end ? endOfDay(parseISO(dateRange.end)) : null;

    // Determine overlap boundaries for filtering only
    const overlapStart = start ? max([openingDate, start]) : openingDate;
    const overlapEnd = end ? min([closingDate, end]) : closingDate;

    // Check if there's an actual overlap
    return overlapStart <= overlapEnd;
  });

  // 2. Apply interactive filters (Power BI style)
  const filteredForStatusChart = dateFilteredChamados.filter(c => {
    const matchesSector = !selectedSector || (c as any).setores?.nome === selectedSector;
    const matchesType = !selectedType || c.tipo === selectedType;
    const matchesDate = !selectedDate || c.data_abertura.startsWith(selectedDate);
    return matchesSector && matchesType && matchesDate;
  });

  const filteredForSectorChart = dateFilteredChamados.filter(c => {
    const matchesStatus = !selectedStatus || c.status === selectedStatus;
    const matchesType = !selectedType || c.tipo === selectedType;
    const matchesDate = !selectedDate || c.data_abertura.startsWith(selectedDate);
    return matchesStatus && matchesType && matchesDate;
  });

  const filteredForTypeChart = dateFilteredChamados.filter(c => {
    const matchesStatus = !selectedStatus || c.status === selectedStatus;
    const matchesSector = !selectedSector || (c as any).setores?.nome === selectedSector;
    const matchesDate = !selectedDate || c.data_abertura.startsWith(selectedDate);
    return matchesStatus && matchesSector && matchesDate;
  });

  const filteredForHistoryChart = dateFilteredChamados.filter(c => {
    const matchesStatus = !selectedStatus || c.status === selectedStatus;
    const matchesSector = !selectedSector || (c as any).setores?.nome === selectedSector;
    const matchesType = !selectedType || c.tipo === selectedType;
    return matchesStatus && matchesSector && matchesType;
  });

  const periodChamados = dateFilteredChamados.filter(c => {
    const matchesStatus = !selectedStatus || c.status === selectedStatus;
    const matchesSector = !selectedSector || (c as any).setores?.nome === selectedSector;
    const matchesType = !selectedType || c.tipo === selectedType;
    const matchesDate = !selectedDate || c.data_abertura.startsWith(selectedDate);
    return matchesStatus && matchesSector && matchesType && matchesDate;
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

  // Average Time (All resolved in period)
  const totalMinutes = resolvedChamados.reduce((acc, c) => acc + (c.tempo_gasto || 0), 0);
  const avgMinutes = resolvedChamados.length > 0 ? totalMinutes / resolvedChamados.length : 0;

  // New History Data with adjustable range
  const historyDays = Array.from({ length: historyRange }, (_, i) => {
    const d = subDays(new Date(), (historyRange - 1) - i);
    return format(d, 'yyyy-MM-dd');
  });

  const historicalData = historyDays.map(dateStr => {
    const date = parseISO(dateStr);
    const dayChamados = filteredForHistoryChart.filter(c => c.data_abertura.startsWith(dateStr));
    const daysMap = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    return {
      name: format(date, 'dd/MM'),
      fullDate: dateStr,
      day: daysMap[date.getDay()],
      total: dayChamados.length,
      incidente: dayChamados.filter(c => c.tipo === 'Incidente').length,
      melhoria: dayChamados.filter(c => c.tipo === 'Melhoria').length,
      solicitacao: dayChamados.filter(c => c.tipo === 'Solicitação').length,
    };
  });

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Carregando métricas...</div>;

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
          {(dateRange.start || dateRange.end || selectedStatus || selectedSector || selectedType || selectedDate) && (
            <button 
              onClick={() => {
                setDateRange({ start: '', end: '' });
                setSelectedStatus(null);
                setSelectedSector(null);
                setSelectedType(null);
                setSelectedDate(null);
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

        {/* Volume por Setor */}
        <ChartContainer 
          title="Volume por Setor"
          onClear={() => setSelectedSector(null)}
          isActive={!!selectedSector}
          indicatorColor="bg-blue-600"
          className="lg:col-span-2"
        >
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={sectorData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    setSelectedSector(prev => prev === data.activeLabel ? null : data.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fontWeight: 700 }} 
                  stroke="#64748b" 
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis tick={{ fontSize: 11, fontWeight: 700 }} stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [value, 'Chamados']}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
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

        {/* History Chart */}
        <ChartContainer 
          title="Chamados Abertos" 
          indicatorColor="bg-indigo-600"
          className="lg:col-span-2"
          onClear={() => setSelectedDate(null)}
          isActive={!!selectedDate}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período de Visualização</span>
              {selectedDate && (
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1 animate-pulse">
                  Filtrado por: {format(parseISO(selectedDate), 'dd/MM/yyyy')}
                </span>
              )}
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <select 
                value={historyRange}
                onChange={(e) => setHistoryRange(Number(e.target.value))}
                className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-300 px-2 cursor-pointer"
              >
                {Array.from({ length: 17 }, (_, i) => 10 + i * 5).map(val => (
                  <option key={val} value={val} className="bg-slate-100 dark:bg-slate-800">{val} Dias</option>
                ))}
              </select>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={historicalData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    const dateStr = data.activePayload[0].payload.fullDate;
                    setSelectedDate(prev => prev === dateStr ? null : dateStr);
                  }
                }}
              >
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const data = historicalData[payload.index];
                    if (!data) return null;
                    const isSelected = selectedDate === data.fullDate;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={0} y={0} dy={16} textAnchor="middle" fill={isSelected ? "#3b82f6" : "#94a3b8"} fontSize={10} fontWeight={isSelected ? 900 : 700}>
                          {data.name}
                        </text>
                        <text x={0} y={0} dy={28} textAnchor="middle" fill={isSelected ? "#3b82f6" : "#64748b"} fontSize={9} fontWeight={isSelected ? 700 : 500} className="uppercase opacity-70">
                          {data.day}
                        </text>
                      </g>
                    );
                  }}
                  stroke="#94a3b8" 
                  tickLine={false}
                  axisLine={false}
                  interval={historyRange > 45 ? 4 : historyRange > 20 ? 2 : 0}
                  height={50}
                />
                <YAxis 
                  tick={{ fontSize: 10, fontWeight: 600 }} 
                  stroke="#94a3b8"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar 
                  name="Total" 
                  dataKey="total" 
                  fill="#94a3b8" 
                  radius={[4, 4, 0, 0]} 
                  barSize={historyRange > 60 ? 6 : historyRange > 30 ? 12 : 20}
                  opacity={0.6}
                  cursor="pointer"
                >
                  {historicalData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={selectedDate === entry.fullDate ? '#3b82f6' : '#94a3b8'}
                      fillOpacity={!selectedDate || selectedDate === entry.fullDate ? 0.6 : 0.2}
                    />
                  ))}
                </Bar>
                <Line 
                  name="Incidente" 
                  type="monotone" 
                  dataKey="incidente" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  strokeOpacity={!selectedDate ? 1 : 0.4}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  cursor="pointer"
                />
                <Line 
                  name="Solicitação" 
                  type="monotone" 
                  dataKey="solicitacao" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  strokeOpacity={!selectedDate ? 1 : 0.4}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  cursor="pointer"
                />
                <Line 
                  name="Melhoria" 
                  type="monotone" 
                  dataKey="melhoria" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  strokeOpacity={!selectedDate ? 1 : 0.4}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  cursor="pointer"
                />
              </ComposedChart>
            </ResponsiveContainer>
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
  className?: string; // Added className
}> = ({ title, children, onClear, isActive, indicatorColor = "bg-blue-600", className = "" }) => (
  <div className={`bg-white dark:bg-slate-900 p-8 rounded-3xl border transition-all ${isActive ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'} shadow-sm ${className}`}>
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
